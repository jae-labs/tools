import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.ts';
import { expandSpfMacro, performSpfTest } from '../src/server/tools/spf.ts';

describe('spf policy tester (rfc 7208)', () => {
  it('expands SPF macros including reversed labels and truncations', () => {
    const out = expandSpfMacro('%{ir}.%{v}._spf.%{d}', {
      domain: 'example.com',
      sender: 'alice@sub.example.com',
      helo: 'mail.example.com',
      ip: '198.51.100.42',
    });
    expect(out).toBe('42.100.51.198.in-addr._spf.example.com');

    const v6 = expandSpfMacro('%{l}.%{d2r}', {
      domain: 'a.b.c.example.com',
      sender: 'postmaster@a.b.c.example.com',
      helo: 'mail.example.com',
      ip: '2001:db8::1',
    });
    // Per RFC 7208 §7.3, 'r' reverses labels BEFORE right-most <digit> truncation
    expect(v6).toBe('postmaster.b.a');
  });

  it('evaluates custom SPF record, nested include, lookup counts, and pass/softfail verdicts', async () => {
    const mockFetch = Object.assign(
      async (input: string | URL | Request) => {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
        const name = url.searchParams.get('name') ?? '';
        const type = url.searchParams.get('type') ?? 'TXT';

        if (name === '_spf.partner.test' && type === 'TXT') {
          return new Response(
            JSON.stringify({
              Status: 0,
              Answer: [{ type: 16, data: '"v=spf1 ip4:203.0.113.0/24 ~all"' }],
            }),
          );
        }
        if (name === 'example.com' && type === 'MX') {
          return new Response(JSON.stringify({ Status: 0, Answer: [{ type: 15, data: '10 mx1.example.com.' }] }));
        }
        if (name === 'mx1.example.com' && type === 'A') {
          return new Response(JSON.stringify({ Status: 0, Answer: [{ type: 1, data: '198.51.100.10' }] }));
        }
        return new Response(JSON.stringify({ Status: 3 }));
      },
      { preconnect: fetch.preconnect },
    );

    const passViaInclude = await performSpfTest({
      domain: 'example.com',
      senderIp: '203.0.113.55',
      customRecord: 'v=spf1 mx include:_spf.partner.test -all',
      fetchFn: mockFetch,
    });
    expect(passViaInclude.verdict).toBe('pass');
    expect(passViaInclude.dnsLookups).toBe(2);
    expect(passViaInclude.voidLookups).toBe(0);
    expect(passViaInclude.matchedMechanism).toBe('ip4:203.0.113.0/24');

    const failOtherIp = await performSpfTest({
      domain: 'example.com',
      senderIp: '192.0.2.99',
      customRecord: 'v=spf1 mx include:_spf.partner.test -all',
      fetchFn: mockFetch,
    });
    expect(failOtherIp.verdict).toBe('fail');
    expect(failOtherIp.matchedMechanism).toBe('-all');
  });

  it('enforces 10 DNS lookup limit and multiple-SPF-record PermError', async () => {
    const tooManyIncludes =
      'v=spf1 include:a1.example include:a2.example include:a3.example include:a4.example include:a5.example include:a6.example include:a7.example include:a8.example include:a9.example include:a10.example include:a11.example -all';

    const mockFetch = Object.assign(
      async (input: string | URL | Request) => {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
        const name = url.searchParams.get('name') ?? '';
        if (name === 'dup.example') {
          return new Response(
            JSON.stringify({
              Status: 0,
              Answer: [
                { type: 16, data: '"v=spf1 -all"' },
                { type: 16, data: '"v=spf1 ~all"' },
              ],
            }),
          );
        }
        return new Response(
          JSON.stringify({ Status: 0, Answer: [{ type: 16, data: '"v=spf1 ip4:198.51.100.0/24 ~all"' }] }),
        );
      },
      { preconnect: fetch.preconnect },
    );

    const dupRes = await performSpfTest({ domain: 'dup.example', fetchFn: mockFetch });
    expect(dupRes.verdict).toBe('permerror');
    expect(dupRes.allTxtSpfRecords).toHaveLength(2);

    const limitRes = await performSpfTest({
      domain: 'example.com',
      senderIp: '192.0.2.1',
      customRecord: tooManyIncludes,
      fetchFn: mockFetch,
    });
    expect(limitRes.verdict).toBe('permerror');
    expect(limitRes.dnsLookups).toBeGreaterThan(10);
  });

  it('serves GET and POST /api/spf and blocks reserved local zones', async () => {
    const app = createApp({
      fetchImpl: Object.assign(
        async () =>
          new Response(
            JSON.stringify({
              Status: 0,
              Answer: [{ type: 16, data: '"v=spf1 ip4:198.51.100.0/24 -all"' }],
            }),
          ),
        { preconnect: fetch.preconnect },
      ),
    });

    const getRes = await app.fetch(new Request('http://localhost/api/spf?domain=example.com&ip=198.51.100.5'));
    expect(getRes.status).toBe(200);
    const getBody = (await getRes.json()) as { verdict: string };
    expect(getBody.verdict).toBe('pass');

    const postRes = await app.fetch(
      new Request('http://localhost/api/spf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'example.com',
          senderIp: '198.51.100.5',
          customRecord: 'v=spf1 ip6:2001:db8::/32 ~all',
        }),
      }),
    );
    expect(postRes.status).toBe(200);
    const postBody = (await postRes.json()) as { verdict: string };
    expect(postBody.verdict).toBe('softfail');

    const bad = await app.fetch(new Request('http://localhost/api/spf?domain=mail.local'));
    expect(bad.status).toBe(400);
  });
});
