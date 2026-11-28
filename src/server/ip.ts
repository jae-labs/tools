import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export type IpFamily = 'IPv4' | 'IPv6' | 'unknown';

export interface ClientIpInfo {
  ip: string;
  family: IpFamily;
  source: string;
  forwardedChain: string[];
  port: string | null;
}

export interface ResolvedTarget {
  input: string;
  hostname: string | null;
  ip: string;
  family: IpFamily;
}

const HOSTNAME_RE =
  /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.?$/;

export function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim().replace(/^["']|["']$/g, '');
  if (!value || value.toLowerCase() === 'unknown') return null;

  if (value.startsWith('[')) {
    const closeIdx = value.indexOf(']');
    if (closeIdx === -1) return null;
    value = value.slice(1, closeIdx);
  } else {
    const lastColon = value.lastIndexOf(':');
    if (lastColon > -1 && value.indexOf(':') === lastColon && value.includes('.')) {
      value = value.slice(0, lastColon);
    }
  }

  const zoneIdx = value.indexOf('%');
  if (zoneIdx !== -1) {
    value = value.slice(0, zoneIdx);
  }

  if (value.toLowerCase().startsWith('::ffff:')) {
    const mapped = value.slice(7);
    if (isIP(mapped) === 4) {
      value = mapped;
    }
  }

  return isIP(value) !== 0 ? value : null;
}

export function detectIpFamily(ip: string): IpFamily {
  const version = isIP(ip);
  if (version === 4) return 'IPv4';
  if (version === 6) return 'IPv6';
  return 'unknown';
}

export function isPublicIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  if (!normalized) return false;

  const version = isIP(normalized);
  if (version === 4) {
    const parts = normalized.split('.').map(Number);
    if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT 100.64.0.0/10
    if (a === 169 && b === 254) return false; // Link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 192 && b === 0 && (parts[2] === 0 || parts[2] === 2)) return false;
    if (a >= 224) return false; // Multicast / reserved
    return true;
  }

  if (version === 6) {
    const lower = normalized.toLowerCase();
    if (lower === '::' || lower === '::1') return false;
    if (lower.startsWith('fe80:') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
      return false; // Link-local fe80::/10
    }
    if (lower.startsWith('fc') || lower.startsWith('fd')) return false; // Unique local
    if (lower.startsWith('ff')) return false; // Multicast
    return true;
  }

  return false;
}

export function sanitizeTargetHost(raw: string): string {
  let value = raw.trim();
  if (!value) {
    throw new Error('Target host or IP address is required.');
  }
  // Strip protocol/path if user pasted a URL
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      value = parsed.hostname;
    } catch {
      throw new Error('Invalid URL or host target.');
    }
  } else if (value.includes('/')) {
    value = value.split('/')[0];
  }

  value = value.replace(/\.$/, '').trim();
  if (normalizeIp(value)) {
    return normalizeIp(value)!;
  }
  if (!HOSTNAME_RE.test(value) || value.startsWith('-')) {
    throw new Error('Invalid hostname or IP address.');
  }
  return value.toLowerCase();
}

export async function resolvePublicTarget(raw: string): Promise<ResolvedTarget> {
  const sanitized = sanitizeTargetHost(raw);
  const directIp = normalizeIp(sanitized);

  if (directIp) {
    if (!isPublicIp(directIp)) {
      throw new Error(`Target IP "${directIp}" is private, loopback, or reserved and cannot be probed.`);
    }
    return {
      input: sanitized,
      hostname: null,
      ip: directIp,
      family: detectIpFamily(directIp),
    };
  }

  let resolved: { address: string; family: number };
  try {
    resolved = await lookup(sanitized, { verbatim: false });
  } catch {
    throw new Error(`Could not resolve hostname "${sanitized}".`);
  }

  const normalized = normalizeIp(resolved.address);
  if (!normalized || !isPublicIp(normalized)) {
    throw new Error(`Hostname "${sanitized}" resolved to a non-public IP and cannot be probed.`);
  }

  return {
    input: sanitized,
    hostname: sanitized,
    ip: normalized,
    family: detectIpFamily(normalized),
  };
}

function parseForwardedHeader(headerValue: string | null): string[] {
  if (!headerValue) return [];
  const results: string[] = [];
  for (const segment of headerValue.split(',')) {
    for (const part of segment.split(';')) {
      const [key, val] = part.split('=').map((item) => item.trim());
      if (key?.toLowerCase() === 'for' && val) {
        const normalized = normalizeIp(val);
        if (normalized) results.push(normalized);
      }
    }
  }
  return results;
}

function parseXForwardedFor(headerValue: string | null): string[] {
  if (!headerValue) return [];
  return headerValue
    .split(',')
    .map((item) => normalizeIp(item))
    .filter((item): item is string => item !== null);
}

export function extractClientIp(
  headers: Headers,
  socketAddress?: { address?: string | null; port?: number | null } | null,
): ClientIpInfo {
  const xff = parseXForwardedFor(headers.get('x-forwarded-for'));
  const rfcForwarded = parseForwardedHeader(headers.get('forwarded'));
  const forwardedChain = xff.length > 0 ? xff : rfcForwarded;

  const singleHeaders: Array<[string, string | null]> = [
    ['cf-connecting-ip', headers.get('cf-connecting-ip')],
    ['prisma-connecting-ip', headers.get('prisma-connecting-ip')],
    ['true-client-ip', headers.get('true-client-ip')],
    ['x-real-ip', headers.get('x-real-ip')],
    ['x-client-ip', headers.get('x-client-ip')],
  ];

  for (const [source, raw] of singleHeaders) {
    const ip = normalizeIp(raw);
    if (ip) {
      return {
        ip,
        family: detectIpFamily(ip),
        source,
        forwardedChain,
        port: headers.get('x-forwarded-port') ?? (socketAddress?.port ? String(socketAddress.port) : null),
      };
    }
  }

  if (forwardedChain.length > 0) {
    const ip = forwardedChain[0];
    return {
      ip,
      family: detectIpFamily(ip),
      source: xff.length > 0 ? 'x-forwarded-for' : 'forwarded',
      forwardedChain,
      port: headers.get('x-forwarded-port') ?? (socketAddress?.port ? String(socketAddress.port) : null),
    };
  }

  const socketIp = normalizeIp(socketAddress?.address);
  if (socketIp) {
    return {
      ip: socketIp,
      family: detectIpFamily(socketIp),
      source: 'socket',
      forwardedChain: [],
      port: socketAddress?.port ? String(socketAddress.port) : null,
    };
  }

  return {
    ip: '127.0.0.1',
    family: 'IPv4',
    source: 'fallback',
    forwardedChain: [],
    port: null,
  };
}
