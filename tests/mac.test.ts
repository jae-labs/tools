import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.ts';
import {
  bulkLookupMacs,
  lookupMacVendor,
  searchMacByVendor,
} from '../src/server/tools/mac.ts';

describe('MAC vendor / OUI lookup', () => {
  it('resolves MAC addresses in colon, hyphen, Cisco dot, and OUI prefix formats', () => {
    const cisco = lookupMacVendor('00:00:0C:12:34:56');
    expect(cisco.found).toBe(true);
    expect(cisco.vendor).toMatch(/Cisco/i);
    expect(cisco.blockType).toBe('MA-L (24-bit)');
    expect(cisco.formats.colon).toBe('00:00:0C:12:34:56');
    expect(cisco.formats.hyphen).toBe('00-00-0C-12-34-56');
    expect(cisco.formats.cisco).toBe('0000.0c12.3456');
    expect(cisco.flags.unicast).toBe(true);
    expect(cisco.flags.universal).toBe(true);

    const ciscoDot = lookupMacVendor('0000.0c12.3456');
    expect(ciscoDot.vendor).toBe(cisco.vendor);
  });

  it('decodes locally administered (LAA) and multicast flags accurately', () => {
    const docker = lookupMacVendor('02:42:AC:11:00:02');
    expect(docker.flags.locallyAdministered).toBe(true);
    expect(docker.flags.universal).toBe(false);
    expect(docker.flags.unicast).toBe(true);

    const multicast = lookupMacVendor('01:00:5E:00:00:01');
    expect(multicast.flags.multicast).toBe(true);
    expect(multicast.flags.unicast).toBe(false);
  });

  it('searches by vendor name and extracts MACs in bulk from ARP tables', () => {
    const search = searchMacByVendor('Xerox', 10);
    expect(search.totalMatches).toBeGreaterThan(0);
    expect(search.results[0]?.vendor).toMatch(/XEROX/i);

    const bulk = bulkLookupMacs(
      `? (192.168.1.1) at 00:00:0c:12:34:56 on en0\n? (192.168.1.2) at 02:42:ac:11:00:02 on docker0\ndup 00:00:0c:12:34:56`,
    );
    expect(bulk).toHaveLength(2);
    expect(bulk[0]?.vendor).toMatch(/Cisco/i);
    expect(bulk[1]?.flags.locallyAdministered).toBe(true);
  });

  it('exposes /api/mac for single, vendor, bulk, and auto-detected q queries', async () => {
    const app = createApp();

    const r1 = await app.fetch(new Request('http://localhost/api/mac?mac=00:00:0C:12:34:56'));
    expect(r1.status).toBe(200);
    const b1 = (await r1.json()) as { found: boolean; vendor: string };
    expect(b1.found).toBe(true);
    expect(b1.vendor).toMatch(/Cisco/i);

    const r2 = await app.fetch(new Request('http://localhost/api/mac?vendor=Cisco&limit=5'));
    expect(r2.status).toBe(200);
    const b2 = (await r2.json()) as { totalMatches: number; results: unknown[] };
    expect(b2.totalMatches).toBeGreaterThan(0);
    expect(b2.results).toHaveLength(5);

    const r3 = await app.fetch(new Request('http://localhost/api/mac?bulk=00:00:0C:12:34:56,02:42:AC:11:00:02'));
    expect(r3.status).toBe(200);
    const b3 = (await r3.json()) as { count: number };
    expect(b3.count).toBe(2);

    const r4 = await app.fetch(new Request('http://localhost/api/mac?mac=invalid'));
    expect(r4.status).toBe(400);
  });
});
