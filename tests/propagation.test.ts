import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.ts';
import {
  decodeDnsWireResponse,
  encodeDnsWireQuery,
  GLOBAL_RESOLVER_ENDPOINTS,
  performPropagationCheck,
  validatePropagationTarget,
} from '../src/server/tools/propagation.ts';

function buildWireAnswerPacket(ipOctets: [number, number, number, number]): Uint8Array {
  const query = encodeDnsWireQuery('www.google.com', 'A');
  const answer = new Uint8Array(query.length + 16);
  answer.set(query, 0);
  const view = new DataView(answer.buffer);
  view.setUint16(2, 0x8180); // QR=1, RA=1
  view.setUint16(6, 1); // ANCOUNT=1
  const off = query.length;
  view.setUint16(off, 0xc00c); // pointer to question name at offset 12
  view.setUint16(off + 2, 1); // A
  view.setUint16(off + 4, 1); // IN
  view.setUint32(off + 6, 300); // TTL
  view.setUint16(off + 10, 4); // RDLENGTH
  answer.set(ipOctets, off + 12);
  return answer;
}

describe('dns propagation utilities & endpoint', () => {
  it('converts public PTR IPs to arpa and blocks private or local zones', () => {
    expect(validatePropagationTarget('8.8.4.4', 'PTR').queryName).toBe('4.4.8.8.in-addr.arpa');
    expect(() => validatePropagationTarget('127.0.0.1', 'PTR')).toThrow(/private/i);
    expect(() => validatePropagationTarget('localhost', 'A')).toThrow(/reserved/i);
    expect(() => validatePropagationTarget('db.internal', 'A')).toThrow(/reserved/i);
  });

  it('encodes and decodes RFC 8484 wireformat A record responses', () => {
    const packet = buildWireAnswerPacket([104, 21, 71, 209]);
    const decoded = decodeDnsWireResponse(packet, 'A');
    expect(decoded.rcode).toBe(0);
    expect(decoded.records).toEqual([
      {
        name: 'www.google.com',
        type: 'A',
        ttl: 300,
        data: '104.21.71.209',
      },
    ]);
  });

  it('aggregates consensus, mismatch, missing, and expected checks across batched resolvers', async () => {
    const mockFetch = Object.assign(
      async (input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.includes('doh.opendns.com')) {
          return new Response(buildWireAnswerPacket([104, 21, 71, 209]).buffer as ArrayBuffer, {
            status: 200,
            headers: { 'Content-Type': 'application/dns-message' },
          });
        }
        if (url.includes('dns.google')) {
          return new Response(
            JSON.stringify({
              Status: 0,
              Answer: [{ name: 'www.google.com.', type: 1, TTL: 300, data: '104.21.71.209' }],
            }),
          );
        }
        if (url.includes('doh.cleanbrowsing.org') || url.includes('freedns.controld.com')) {
          return new Response(buildWireAnswerPacket([198, 51, 100, 9]).buffer as ArrayBuffer, { status: 200 });
        }
        if (url.includes('cloudflare-dns.com')) {
          return new Response(JSON.stringify({ Status: 3 }));
        }
        return new Response(JSON.stringify({ Status: 3 }));
      },
      { preconnect: fetch.preconnect },
    );

    const res = await performPropagationCheck('www.google.com', 'A', {
      offset: 6,
      limit: 5,
      fetchFn: mockFetch,
    });

    expect(res.totalCheckpoints).toBe(6 + GLOBAL_RESOLVER_ENDPOINTS.length);
    expect(res.checkedCount).toBe(5);
    expect(res.consensusValues).toEqual(['104.21.71.209']);

    const opendns = res.results.find((r) => r.id === 'resolver-opendns');
    const cleanbrowsing = res.results.find((r) => r.id === 'resolver-cleanbrowsing');
    const cloudflare = res.results.find((r) => r.id === 'resolver-cloudflare');

    expect(opendns?.status).toBe('ok');
    expect(cleanbrowsing?.status).toBe('mismatch');
    expect(cloudflare?.status).toBe('missing');

    const expectedRes = await performPropagationCheck('www.google.com', 'A', {
      offset: 6,
      limit: 4,
      expected: '198.51.100.9',
      fetchFn: mockFetch,
    });
    expect(expectedRes.results.find((r) => r.id === 'resolver-cleanbrowsing')?.status).toBe('ok');
    expect(expectedRes.results.find((r) => r.id === 'resolver-opendns')?.status).toBe('mismatch');
  });

  it('serves /api/propagation with CORS headers and blocks private targets', async () => {
    const app = createApp({
      fetchImpl: Object.assign(
        async (input: string | URL | Request) => {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
          if (url.includes('/api/propagation')) {
            return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
          }
          if (url.includes('/api/dns')) {
            return new Response(
              JSON.stringify({
                resolver: 'cloudflare-doh',
                records: [{ name: 'www.google.com', type: 'A', ttl: 300, data: '104.21.71.209' }],
              }),
            );
          }
          return new Response(JSON.stringify({ Status: 3 }));
        },
        { preconnect: fetch.preconnect },
      ),
    });

    const okRes = await app.fetch(
      new Request('http://localhost/api/propagation?host=www.google.com&type=A&offset=0&limit=3'),
    );
    expect(okRes.status).toBe(200);
    expect(okRes.headers.get('access-control-allow-origin')).toBe('*');
    const body = (await okRes.json()) as { checkedCount: number; matchedCount: number };
    expect(body.checkedCount).toBe(3);
    expect(body.matchedCount).toBe(3);

    const badRes = await app.fetch(new Request('http://localhost/api/propagation?host=10.0.0.1&type=A'));
    expect(badRes.status).toBe(400);
  });
});
