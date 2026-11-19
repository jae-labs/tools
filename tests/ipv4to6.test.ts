import { describe, expect, it } from 'vitest';
import { compressIpv6Groups, convertIpv4ToIpv6 } from '../src/shared/ipv4to6.ts';

describe('ipv4 to ipv6 converter', () => {
  it('converts IPv4 into mapped, 6to4, NAT64, compatible, ISATAP, decimal, hex, and PTR formats', () => {
    const res = convertIpv4ToIpv6('192.0.2.1');
    expect(res.direction).toBe('ipv4-to-ipv6');
    expect(res.ipv4).toBe('192.0.2.1');
    expect(res.ipv4Decimal).toBe(3221225985);
    expect(res.ipv4Hex).toBe('0xc0000201');
    expect(res.ipv4MappedDotted).toBe('::ffff:192.0.2.1');
    expect(res.ipv4MappedCompressed).toBe('::ffff:c000:201');
    expect(res.ipv4MappedExpanded).toBe('0000:0000:0000:0000:0000:ffff:c000:0201');
    expect(res.sixToFourPrefix).toBe('2002:c000:201::/48');
    expect(res.sixToFourExpanded).toBe('2002:c000:0201:0000:0000:0000:0000:0000');
    expect(res.nat64Dotted).toBe('64:ff9b::192.0.2.1');
    expect(res.nat64Compressed).toBe('64:ff9b::c000:201');
    expect(res.ipv6PtrArpa).toBe(
      '1.0.2.0.0.0.0.c.f.f.f.f.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.ip6.arpa',
    );
  });

  it('extracts embedded IPv4 from ::ffff:, 2002::/16, and 64:ff9b::/96 transition addresses', () => {
    const mapped = convertIpv4ToIpv6('::ffff:8.8.8.8');
    expect(mapped.direction).toBe('ipv6-to-ipv4');
    expect(mapped.ipv4).toBe('8.8.8.8');
    expect(mapped.sourceType).toContain('IPv4-mapped');

    const sixToFour = convertIpv4ToIpv6('2002:0101:0101::/48');
    expect(sixToFour.direction).toBe('ipv6-to-ipv4');
    expect(sixToFour.ipv4).toBe('1.1.1.1');

    const nat64 = convertIpv4ToIpv6('64:ff9b::c000:0201');
    expect(nat64.ipv4).toBe('192.0.2.1');
  });

  it('rejects non-embedded IPv6 or malformed addresses cleanly', () => {
    expect(compressIpv6Groups(['2001', '0db8', '0000', '0000', '0000', '0000', '0000', '0001'])).toBe(
      '2001:db8::1',
    );
    expect(() => convertIpv4ToIpv6('2001:db8::1')).toThrow(/does not embed an IPv4/i);
    expect(() => convertIpv4ToIpv6('999.0.0.1')).toThrow(/Invalid IPv4 or IPv6/i);
  });
});
