import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.ts';
import {
  classifyRblAnswers,
  IP_RBL_PROVIDERS,
  performRblLookup,
  reverseIpv4,
  reverseIpv6Nibbles,
} from '../src/server/tools/rbl.ts';

describe('rbl lookup utilities', () => {
  it('reverses IPv4 octets and IPv6 nibbles accurately', () => {
    expect(reverseIpv4('1.2.3.4')).toBe('4.3.2.1');
    expect(reverseIpv6Nibbles('2001:4860:4860::8888')).toBe(
      '8.8.8.8.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.6.8.4.0.6.8.4.1.0.0.2',
    );
  });

  it('classifies NXDOMAIN, listed 127.0.0.x, 127.255.255.x blocked, and DNS errors', () => {
    expect(classifyRblAnswers(3, undefined)).toEqual({ status: 'clean', codes: [] });
    expect(classifyRblAnswers(0, [{ type: 1, data: '127.0.0.2' }])).toEqual({
      status: 'listed',
      codes: ['127.0.0.2'],
    });
    expect(classifyRblAnswers(0, [{ type: 1, data: '127.255.255.254' }])).toEqual({
      status: 'blocked',
      codes: ['127.255.255.254'],
    });
    expect(classifyRblAnswers(5, undefined)).toEqual({ status: 'error', codes: [] });
  });

  it('decodes listed hits + TXT reason, rate-limit codes, and batching via performRblLookup', async () => {
    const mockFetch = (async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
      const name = url.searchParams.get('name') ?? '';
      const type = url.searchParams.get('type') ?? 'A';

      if (name.endsWith('bl.spamcop.net')) {
        if (type === 'TXT') {
          return new Response(
            JSON.stringify({
              Status: 0,
              Answer: [{ type: 16, data: '"Blocked - see https://www.spamcop.net/bl.shtml?1.1.1.1"' }],
            }),
          );
        }
        return new Response(JSON.stringify({ Status: 0, Answer: [{ type: 1, data: '127.0.0.2' }] }));
      }

      if (name.endsWith('b.barracudacentral.org')) {
        if (type === 'TXT') {
          return new Response(JSON.stringify({ Status: 3 }));
        }
        return new Response(JSON.stringify({ Status: 0, Answer: [{ type: 1, data: '127.255.255.254' }] }));
      }

      if (name.endsWith('psbl.surriel.com')) {
        return new Response(JSON.stringify({ Status: 2 }));
      }

      return new Response(JSON.stringify({ Status: 3 }));
    }) as typeof fetch;

    const res = await performRblLookup('1.1.1.1', { offset: 0, limit: 5, fetchFn: mockFetch });
    expect(res.resolvedIp).toBe('1.1.1.1');
    expect(res.targetType).toBe('ip');
    expect(res.totalProviders).toBe(IP_RBL_PROVIDERS.length);
    expect(res.checkedCount).toBe(5);
    expect(res.listedCount).toBe(1);
    expect(res.blockedCount).toBe(1);
    expect(res.errorCount).toBe(1);
    expect(res.cleanCount).toBe(2);

    const spamcop = res.results.find((r) => r.zone === 'bl.spamcop.net');
    expect(spamcop?.status).toBe('listed');
    expect(spamcop?.codes).toEqual(['127.0.0.2']);
    expect(spamcop?.reason).toContain('spamcop.net');

    const barracuda = res.results.find((r) => r.zone === 'b.barracudacentral.org');
    expect(barracuda?.status).toBe('blocked');
    expect(barracuda?.reason).toContain('127.255.255.x');
  });

  it('serves /api/rbl batch queries and blocks SSRF targets', async () => {
    const app = createApp({
      fetchImpl: Object.assign(async () => new Response(JSON.stringify({ Status: 3 }), { status: 200 }), {
        preconnect: fetch.preconnect,
      }),
    });

    const okRes = await app.fetch(new Request('http://localhost/api/rbl?target=8.8.4.4&offset=0&limit=4'));
    expect(okRes.status).toBe(200);
    const body = (await okRes.json()) as { checkedCount: number; cleanCount: number; results: Array<{ queryHost: string }> };
    expect(body.checkedCount).toBe(4);
    expect(body.cleanCount).toBe(4);
    expect(body.results[0]?.queryHost).toBe(`4.4.8.8.${IP_RBL_PROVIDERS[0]?.zone}`);

    const loopbackRes = await app.fetch(new Request('http://localhost/api/rbl?target=127.0.0.1'));
    expect(loopbackRes.status).toBe(400);

    const metadataRes = await app.fetch(new Request('http://localhost/api/rbl?target=169.254.169.254'));
    expect(metadataRes.status).toBe(400);
  });
});
