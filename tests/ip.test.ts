import { describe, expect, it } from 'vitest';
import { extractClientIp, isPublicIp, normalizeIp, sanitizeTargetHost } from '../src/server/ip.ts';

describe('ip & target validation', () => {
  it('blocks private, loopback, link-local, and metadata IPs from SSRF', () => {
    expect(isPublicIp('127.0.0.1')).toBe(false);
    expect(isPublicIp('10.0.0.1')).toBe(false);
    expect(isPublicIp('172.16.0.1')).toBe(false);
    expect(isPublicIp('192.168.1.1')).toBe(false);
    expect(isPublicIp('169.254.169.254')).toBe(false);
    expect(isPublicIp('100.64.0.1')).toBe(false);
    expect(isPublicIp('::1')).toBe(false);
    expect(isPublicIp('fe80::1')).toBe(false);
    expect(isPublicIp('fc00::1')).toBe(false);

    expect(isPublicIp('1.1.1.1')).toBe(true);
    expect(isPublicIp('8.8.8.8')).toBe(true);
    expect(isPublicIp('2606:4700:4700::1111')).toBe(true);
  });

  it('normalizes mapped IPv4 and strips URL schemes safely', () => {
    expect(normalizeIp('::ffff:1.1.1.1')).toBe('1.1.1.1');
    expect(sanitizeTargetHost('https://Cloudflare.com/path')).toBe('cloudflare.com');
    expect(() => sanitizeTargetHost('foo; rm -rf /')).toThrow();
    expect(() => sanitizeTargetHost('-flag')).toThrow();
  });

  it('extracts client IP from edge headers', () => {
    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.42',
      'x-forwarded-for': '198.51.100.1, 10.0.0.2',
    });
    const info = extractClientIp(headers);
    expect(info.ip).toBe('203.0.113.42');
    expect(info.source).toBe('cf-connecting-ip');
  });
});
