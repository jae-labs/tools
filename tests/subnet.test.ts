import { describe, expect, it } from 'vitest';
import { calculateSubnet, maskToCidr } from '../src/shared/subnet.ts';

describe('subnet calculator', () => {
  it('computes IPv4 /24 network details accurately', () => {
    const res = calculateSubnet('192.168.1.10/24');
    expect(res.version).toBe(4);
    if (res.version === 4) {
      expect(res.networkAddress).toBe('192.168.1.0');
      expect(res.broadcastAddress).toBe('192.168.1.255');
      expect(res.subnetMask).toBe('255.255.255.0');
      expect(res.wildcardMask).toBe('0.0.0.255');
      expect(res.firstUsable).toBe('192.168.1.1');
      expect(res.lastUsable).toBe('192.168.1.254');
      expect(res.totalAddresses).toBe(256);
      expect(res.usableHosts).toBe(254);
      expect(res.scope).toContain('Private');
      expect(res.subnets).toHaveLength(2);
      expect(res.subnets[0].cidr).toBe('192.168.1.0/25');
      expect(res.subnets[1].cidr).toBe('192.168.1.128/25');
    }
  });

  it('supports dotted subnet mask input', () => {
    expect(maskToCidr('255.255.252.0')).toBe(22);
    expect(maskToCidr('255.0.255.0')).toBeNull();
    const res = calculateSubnet('10.0.5.12', '255.255.252.0');
    expect(res.version).toBe(4);
    if (res.version === 4) {
      expect(res.cidr).toBe(22);
      expect(res.networkAddress).toBe('10.0.4.0');
      expect(res.broadcastAddress).toBe('10.0.7.255');
      expect(res.usableHosts).toBe(1022);
    }
  });

  it('handles /32 host routes', () => {
    const res = calculateSubnet('1.1.1.1/32');
    expect(res.version).toBe(4);
    if (res.version === 4) {
      expect(res.usableHosts).toBe(1);
      expect(res.firstUsable).toBe('1.1.1.1');
      expect(res.lastUsable).toBe('1.1.1.1');
      expect(res.scope).toBe('Public Routable');
    }
  });

  it('computes IPv6 /64, /48, link-local, and /128 host route details', () => {
    const res = calculateSubnet('2001:db8::1/64');
    expect(res.version).toBe(6);
    if (res.version === 6) {
      expect(res.cidr).toBe(64);
      expect(res.hostBits).toBe(64);
      expect(res.compressedIp).toBe('2001:db8::1');
      expect(res.compressedNetwork).toBe('2001:db8::');
      expect(res.firstUsable).toBe('2001:db8::1');
      expect(res.lastUsable).toBe('2001:db8::ffff:ffff:ffff:ffff');
      expect(res.networkAddress).toBe('2001:0db8:0000:0000:0000:0000:0000:0000');
      expect(res.lastAddress).toBe('2001:0db8:0000:0000:ffff:ffff:ffff:ffff');
      expect(res.slash64Count).toBe('1');
      expect(res.subnets).toHaveLength(2);
      expect(res.subnets[0]?.cidr).toBe('2001:db8::/65');
      expect(res.subnets[1]?.cidr).toBe('2001:db8:0:0:8000::/65');
      expect(res.scope).toContain('Documentation');
    }

    const p48 = calculateSubnet('2001:4860:4860::', '48');
    expect(p48.version).toBe(6);
    if (p48.version === 6) {
      expect(p48.cidr).toBe(48);
      expect(p48.slash64Count).toBe('65,536');
      expect(p48.scope).toContain('Global Unicast');
    }

    const linkLocal = calculateSubnet('febf::1%eth0/64');
    expect(linkLocal.version).toBe(6);
    if (linkLocal.version === 6) {
      expect(linkLocal.scope).toContain('Link-Local');
    }

    const host = calculateSubnet('::1/128');
    expect(host.version).toBe(6);
    if (host.version === 6) {
      expect(host.totalAddresses).toBe('1');
      expect(host.slash64Count).toBeNull();
      expect(host.subnets).toHaveLength(0);
      expect(host.scope).toContain('Loopback');
    }
  });

  it('throws on invalid IP or prefix', () => {
    expect(() => calculateSubnet('999.999.1.1/24')).toThrow();
    expect(() => calculateSubnet('192.168.1.1/33')).toThrow();
  });
});
