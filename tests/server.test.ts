import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.ts';

describe('tools server routes', () => {
  const mockGeo = async (ip: string) => ({
    ip,
    family: 'IPv4' as const,
    localNetwork: false,
    provider: 'mock',
    city: 'Frankfurt',
    region: 'Hesse',
    country: 'Germany',
    countryCode: 'DE',
    postal: '60311',
    timezone: 'Europe/Berlin',
    isp: 'Mock ISP',
    org: 'Mock Org',
    asn: 'AS13335',
    latitude: 50.1109,
    longitude: 8.6821,
  });

  const mockFetch = (async (input: string | URL) => {
    const url = String(input);
    if (url.includes('cloudflare-dns.com/dns-query')) {
      return Response.json({
        Status: 0,
        Answer: [{ name: 'example.com.', type: 1, TTL: 300, data: '93.184.216.34' }],
      });
    }
    return new Response('Not Found', { status: 404 });
  }) as typeof fetch;

  const app = createApp({
    lookupGeo: mockGeo,
    fetchImpl: mockFetch,
    serveStatic: async (pathname) =>
      pathname === '/'
        ? { body: '<html>ok</html>', contentType: 'text/html', cacheControl: 'no-cache' }
        : null,
  });

  it('returns visitor info on /api/me and /api/info with redacted sensitive headers', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/me', { headers: { 'x-real-ip': '1.1.1.1' } }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { client: { ip: string }; geo: { countryCode: string } };
    expect(body.client.ip).toBe('1.1.1.1');
    expect(body.geo.countryCode).toBe('DE');

    const infoRes = await app.fetch(
      new Request('http://localhost/api/info', {
        headers: { 'x-real-ip': '1.1.1.1', authorization: 'Bearer secret', 'user-agent': 'vitest' },
      }),
    );
    expect(infoRes.status).toBe(200);
    const info = (await infoRes.json()) as {
      connection: { userAgent: string };
      headers: Record<string, string>;
    };
    expect(info.connection.userAgent).toBe('vitest');
    expect(info.headers.authorization).toBe('[REDACTED]');
  });

  it('supports speed test /api/download, POST /api/upload, and local /api/ping probe', async () => {
    const dlRes = await app.fetch(new Request('http://localhost/api/download?bytes=4096'));
    expect(dlRes.status).toBe(200);
    expect((await dlRes.arrayBuffer()).byteLength).toBe(4096);

    const ulRes = await app.fetch(
      new Request('http://localhost/api/upload', {
        method: 'POST',
        body: new Uint8Array(8192),
      }),
    );
    expect(ulRes.status).toBe(200);
    const ul = (await ulRes.json()) as { ok: boolean; bytesReceived: number };
    expect(ul.ok).toBe(true);
    expect(ul.bytesReceived).toBe(8192);

    const pingProbe = await app.fetch(new Request('http://localhost/api/ping?seq=2'));
    expect(pingProbe.status).toBe(200);
    const probeBody = (await pingProbe.json()) as { ok: boolean; seq: string };
    expect(probeBody.ok).toBe(true);
    expect(probeBody.seq).toBe('2');
  });

  it('computes subnet via /api/subnet', async () => {
    const res = await app.fetch(new Request('http://localhost/api/subnet?cidr=10.0.0.5/24'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { networkAddress: string; usableHosts: number };
    expect(body.networkAddress).toBe('10.0.0.0');
    expect(body.usableHosts).toBe(254);
  });

  it('queries DNS via /api/dns', async () => {
    const res = await app.fetch(new Request('http://localhost/api/dns?host=example.com&type=A'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { records: Array<{ data: string; type: string }> };
    expect(body.records).toHaveLength(1);
    expect(body.records[0].data).toBe('93.184.216.34');
  });

  it('streams requested bytes on /api/bandwidth', async () => {
    const res = await app.fetch(new Request('http://localhost/api/bandwidth?bytes=262144'));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-transform');
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBe(262144);
  });

  it('blocks private IP SSRF on /api/ping, /api/traceroute, and /api/port', async () => {
    const pingRes = await app.fetch(new Request('http://localhost/api/ping?host=169.254.169.254&count=1&seq=1'));
    expect(pingRes.status).toBe(400);
    const traceRes = await app.fetch(new Request('http://localhost/api/traceroute?host=10.0.0.1&hop=1'));
    expect(traceRes.status).toBe(400);
    const badHopRes = await app.fetch(new Request('http://localhost/api/traceroute?host=1.1.1.1&hop=99'));
    expect(badHopRes.status).toBe(400);
    const portRes = await app.fetch(new Request('http://localhost/api/port?host=127.0.0.1&ports=22'));
    expect(portRes.status).toBe(400);
  });

  it('rejects POST on /api/me with 405 and serves static root', async () => {
    const postRes = await app.fetch(new Request('http://localhost/api/me', { method: 'POST' }));
    expect(postRes.status).toBe(405);

    const rootRes = await app.fetch(new Request('http://localhost/'));
    expect(rootRes.status).toBe(200);
    expect(await rootRes.text()).toContain('ok');
  });
});
