import dns from 'node:dns/promises';
import { isIP } from 'node:net';
import { normalizeIp, sanitizeTargetHost } from '../ip.ts';

export const SUPPORTED_DNS_TYPES = [
  'ALL',
  'A',
  'AAAA',
  'MX',
  'NS',
  'TXT',
  'CNAME',
  'SOA',
  'CAA',
  'SRV',
  'PTR',
] as const;

export type DnsRecordType = (typeof SUPPORTED_DNS_TYPES)[number];

export interface DnsRecordEntry {
  name: string;
  type: string;
  ttl: number | null;
  data: string;
}

export interface DnsLookupResult {
  host: string;
  queryType: DnsRecordType;
  resolver: 'cloudflare-doh' | 'system-dns';
  durationMs: number;
  records: DnsRecordEntry[];
  warnings: string[];
}

export interface ReverseLookupResult {
  ip: string;
  family: 'IPv4' | 'IPv6';
  arpaName: string;
  hostnames: string[];
  forwardConfirmed: Array<{
    hostname: string;
    resolvedIps: string[];
    matches: boolean;
  }>;
  durationMs: number;
}

interface DohAnswer {
  name?: string;
  type?: number;
  TTL?: number;
  data?: string;
}

interface DohResponse {
  Status?: number;
  Answer?: DohAnswer[];
}

const DNS_TYPE_NUMBERS: Record<number, string> = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  6: 'SOA',
  12: 'PTR',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
  33: 'SRV',
  257: 'CAA',
};

export function toArpaName(ip: string): string {
  const version = isIP(ip);
  if (version === 4) {
    return `${ip.split('.').reverse().join('.')}.in-addr.arpa`;
  }
  if (version === 6) {
    const [head, tail] = ip.toLowerCase().split('::');
    const headParts = head ? head.split(':').filter(Boolean) : [];
    const tailParts = tail !== undefined ? tail.split(':').filter(Boolean) : [];
    const missing = 8 - headParts.length - tailParts.length;
    const full = [
      ...headParts,
      ...Array.from({ length: Math.max(0, missing) }, () => '0'),
      ...tailParts,
    ]
      .map((g) => g.padStart(4, '0'))
      .join('');
    return `${full.split('').reverse().join('.')}.ip6.arpa`;
  }
  throw new Error('Invalid IP address for reverse lookup.');
}

async function queryDoh(
  host: string,
  type: Exclude<DnsRecordType, 'ALL'>,
  fetchFn: typeof fetch,
): Promise<DnsRecordEntry[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${encodeURIComponent(type)}`;
  const res = await fetchFn(url, {
    headers: { Accept: 'application/dns-json' },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    throw new Error(`DoH query failed with status ${res.status}`);
  }
  const body = (await res.json()) as DohResponse;
  const answers = body.Answer ?? [];
  return answers
    .filter((a): a is Required<Pick<DohAnswer, 'name' | 'data'>> & DohAnswer => Boolean(a.name && a.data))
    .map((a) => ({
      name: a.name.replace(/\.$/, ''),
      type: (a.type ? DNS_TYPE_NUMBERS[a.type] : undefined) ?? type,
      ttl: typeof a.TTL === 'number' ? a.TTL : null,
      data: a.data,
    }));
}

export async function querySystemDns(
  host: string,
  type: Exclude<DnsRecordType, 'ALL'>,
): Promise<DnsRecordEntry[]> {
  const records: DnsRecordEntry[] = [];
  try {
    switch (type) {
      case 'A': {
        const res = await dns.resolve4(host, { ttl: true });
        for (const r of res) records.push({ name: host, type: 'A', ttl: r.ttl, data: r.address });
        break;
      }
      case 'AAAA': {
        const res = await dns.resolve6(host, { ttl: true });
        for (const r of res) records.push({ name: host, type: 'AAAA', ttl: r.ttl, data: r.address });
        break;
      }
      case 'MX': {
        const res = await dns.resolveMx(host);
        for (const r of res) {
          records.push({ name: host, type: 'MX', ttl: null, data: `${r.priority} ${r.exchange}` });
        }
        break;
      }
      case 'NS': {
        const res = await dns.resolveNs(host);
        for (const r of res) records.push({ name: host, type: 'NS', ttl: null, data: r });
        break;
      }
      case 'TXT': {
        const res = await dns.resolveTxt(host);
        for (const r of res) records.push({ name: host, type: 'TXT', ttl: null, data: r.join('') });
        break;
      }
      case 'CNAME': {
        const res = await dns.resolveCname(host);
        for (const r of res) records.push({ name: host, type: 'CNAME', ttl: null, data: r });
        break;
      }
      case 'SOA': {
        const r = await dns.resolveSoa(host);
        records.push({
          name: host,
          type: 'SOA',
          ttl: r.minttl,
          data: `${r.nsname} ${r.hostmaster} ${r.serial} ${r.refresh} ${r.retry} ${r.expire} ${r.minttl}`,
        });
        break;
      }
      case 'CAA': {
        const res = await dns.resolveCaa(host);
        for (const r of res) {
          const tag = r.issue
            ? `issue "${r.issue}"`
            : r.issuewild
              ? `issuewild "${r.issuewild}"`
              : r.iodef
                ? `iodef "${r.iodef}"`
                : JSON.stringify(r);
          records.push({ name: host, type: 'CAA', ttl: null, data: `${r.critical} ${tag}` });
        }
        break;
      }
      case 'SRV': {
        const res = await dns.resolveSrv(host);
        for (const r of res) {
          records.push({
            name: host,
            type: 'SRV',
            ttl: null,
            data: `${r.priority} ${r.weight} ${r.port} ${r.name}`,
          });
        }
        break;
      }
      case 'PTR': {
        const res = await dns.resolvePtr(host);
        for (const r of res) records.push({ name: host, type: 'PTR', ttl: null, data: r });
        break;
      }
    }
  } catch {
    // NXDOMAIN / NODATA for specific record type returns empty array
  }
  return records;
}

export async function performDnsLookup(
  rawHost: string,
  rawType = 'ALL',
  fetchFn: typeof fetch = fetch,
): Promise<DnsLookupResult> {
  const started = performance.now();
  const host = sanitizeTargetHost(rawHost);
  const upperType = rawType.trim().toUpperCase() as DnsRecordType;
  const queryType: DnsRecordType = (SUPPORTED_DNS_TYPES as readonly string[]).includes(upperType)
    ? upperType
    : 'ALL';

  const typesToQuery: Array<Exclude<DnsRecordType, 'ALL'>> =
    queryType === 'ALL'
      ? ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'CAA']
      : [queryType];

  const warnings: string[] = [];
  let resolver: 'cloudflare-doh' | 'system-dns' = 'cloudflare-doh';
  let records: DnsRecordEntry[];

  try {
    const results = await Promise.all(typesToQuery.map((t) => queryDoh(host, t, fetchFn)));
    records = results.flat();
  } catch {
    resolver = 'system-dns';
    warnings.push('Cloudflare DoH unreachable; fell back to system resolver.');
    const results = await Promise.all(typesToQuery.map((t) => querySystemDns(host, t)));
    records = results.flat();
  }

  // Deduplicate identical entries
  const seen = new Set<string>();
  const uniqueRecords = records.filter((rec) => {
    const key = `${rec.type}|${rec.name}|${rec.data}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    host,
    queryType,
    resolver,
    durationMs: Math.round(performance.now() - started),
    records: uniqueRecords,
    warnings,
  };
}

export async function performReverseLookup(
  rawIp: string,
  fetchFn: typeof fetch = fetch,
): Promise<ReverseLookupResult> {
  const started = performance.now();
  const ip = normalizeIp(rawIp);
  if (!ip) {
    throw new Error('Enter a valid IPv4 or IPv6 address for reverse lookup.');
  }

  const version = isIP(ip);
  const family: 'IPv4' | 'IPv6' = version === 6 ? 'IPv6' : 'IPv4';
  const arpaName = toArpaName(ip);

  let hostnames: string[];
  try {
    const dohRecords = await queryDoh(arpaName, 'PTR', fetchFn);
    hostnames = dohRecords.map((r) => r.data.replace(/\.$/, ''));
  } catch {
    try {
      hostnames = await dns.reverse(ip);
    } catch {
      hostnames = [];
    }
  }

  const forwardConfirmed = await Promise.all(
    hostnames.slice(0, 5).map(async (hostname) => {
      try {
        const res = await queryDoh(hostname, family === 'IPv6' ? 'AAAA' : 'A', fetchFn);
        const resolvedIps = res.map((r) => r.data);
        return {
          hostname,
          resolvedIps,
          matches: resolvedIps.some((addr) => normalizeIp(addr) === ip),
        };
      } catch {
        return { hostname, resolvedIps: [], matches: false };
      }
    }),
  );

  return {
    ip,
    family,
    arpaName,
    hostnames,
    forwardConfirmed,
    durationMs: Math.round(performance.now() - started),
  };
}
