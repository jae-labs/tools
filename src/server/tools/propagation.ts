import { isIP } from 'node:net';
import { resolveRegionNodes, type RegionNode } from '../../shared/regions.ts';
import { isPublicIp, normalizeIp, sanitizeTargetHost } from '../ip.ts';
import { querySystemDns, type DnsRecordEntry, type DnsRecordType } from './dns.ts';

export type PropagationRecordType = Exclude<DnsRecordType, 'ALL'>;

export type PropagationCheckStatus = 'ok' | 'mismatch' | 'missing' | 'error';

export interface PropagationNodeMeta {
  id: string;
  label: string;
  provider: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  kind: 'prisma-region' | 'global-resolver';
}

export interface PropagationCheckpointResult extends PropagationNodeMeta {
  status: PropagationCheckStatus;
  records: DnsRecordEntry[];
  values: string[];
  ttl: number | null;
  signature: string;
  resolverSource: string;
  latencyMs: number;
  error?: string;
}

export interface PropagationResponse {
  host: string;
  queryName: string;
  recordType: PropagationRecordType;
  expected?: string;
  consensusValues: string[];
  consensusCount: number;
  offset: number;
  limit: number;
  totalCheckpoints: number;
  checkedCount: number;
  matchedCount: number;
  mismatchCount: number;
  missingCount: number;
  errorCount: number;
  elapsedMs: number;
  results: PropagationCheckpointResult[];
}

export interface LocalPropagationResult {
  host: string;
  queryName: string;
  recordType: PropagationRecordType;
  resolverSource: 'region-system-dns' | 'cloudflare-edge-doh';
  records: DnsRecordEntry[];
  latencyMs: number;
}

export interface PropagationOptions {
  offset?: number;
  limit?: number;
  expected?: string;
  localOnly?: boolean;
  currentRegion?: string;
  currentOrigin?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

interface ResolverEndpoint extends PropagationNodeMeta {
  kind: 'global-resolver';
  url: string;
  protocol: 'doh-json' | 'doh-wire';
}

interface DohJsonResponse {
  Status?: number;
  Answer?: Array<{
    name?: string;
    type?: number;
    TTL?: number;
    data?: string;
  }>;
}

export const PROPAGATION_TYPES: readonly PropagationRecordType[] = [
  'A',
  'AAAA',
  'CNAME',
  'MX',
  'NS',
  'TXT',
  'SOA',
  'SRV',
  'CAA',
  'PTR',
] as const;

const DNS_TYPE_TO_CODE: Record<PropagationRecordType, number> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  PTR: 12,
  MX: 15,
  TXT: 16,
  AAAA: 28,
  SRV: 33,
  CAA: 257,
};

const CODE_TO_DNS_TYPE: Record<number, string> = Object.fromEntries(
  Object.entries(DNS_TYPE_TO_CODE).map(([name, code]) => [code, name]),
);

export const GLOBAL_RESOLVER_ENDPOINTS: readonly ResolverEndpoint[] = [
  {
    id: 'resolver-opendns',
    label: 'San Francisco CA, United States',
    provider: 'Cisco OpenDNS',
    city: 'San Francisco',
    country: 'United States',
    countryCode: 'US',
    latitude: 37.7749,
    longitude: -122.4194,
    kind: 'global-resolver',
    url: 'https://doh.opendns.com/dns-query',
    protocol: 'doh-wire',
  },
  {
    id: 'resolver-google',
    label: 'Mountain View CA, United States',
    provider: 'Google Public DNS',
    city: 'Mountain View',
    country: 'United States',
    countryCode: 'US',
    latitude: 37.3861,
    longitude: -122.0839,
    kind: 'global-resolver',
    url: 'https://dns.google/resolve',
    protocol: 'doh-json',
  },
  {
    id: 'resolver-cleanbrowsing',
    label: 'Los Angeles CA, United States',
    provider: 'CleanBrowsing',
    city: 'Los Angeles',
    country: 'United States',
    countryCode: 'US',
    latitude: 34.0522,
    longitude: -118.2437,
    kind: 'global-resolver',
    url: 'https://doh.cleanbrowsing.org/doh/security-filter/',
    protocol: 'doh-wire',
  },
  {
    id: 'resolver-controld',
    label: 'Toronto, Canada',
    provider: 'ControlD',
    city: 'Toronto',
    country: 'Canada',
    countryCode: 'CA',
    latitude: 43.6532,
    longitude: -79.3832,
    kind: 'global-resolver',
    url: 'https://freedns.controld.com/p0',
    protocol: 'doh-wire',
  },
  {
    id: 'resolver-cloudflare',
    label: 'Global Anycast Edge',
    provider: 'Cloudflare 1.1.1.1',
    city: 'Anycast',
    country: 'Global',
    countryCode: 'US',
    latitude: 25.7617,
    longitude: -80.1918,
    kind: 'global-resolver',
    url: 'https://cloudflare-dns.com/dns-query',
    protocol: 'doh-json',
  },
  {
    id: 'resolver-wikimedia',
    label: 'Amsterdam, Netherlands',
    provider: 'Wikimedia DNS',
    city: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    latitude: 52.3676,
    longitude: 4.9041,
    kind: 'global-resolver',
    url: 'https://wikimedia-dns.org/dns-query',
    protocol: 'doh-wire',
  },
  {
    id: 'resolver-dnssb',
    label: 'Frankfurt, Germany',
    provider: 'DNS.SB',
    city: 'Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    latitude: 50.1109,
    longitude: 8.6821,
    kind: 'global-resolver',
    url: 'https://doh.dns.sb/dns-query',
    protocol: 'doh-json',
  },
  {
    id: 'resolver-adguard',
    label: 'Nicosia, Cyprus',
    provider: 'AdGuard DNS',
    city: 'Nicosia',
    country: 'Cyprus',
    countryCode: 'CY',
    latitude: 35.1856,
    longitude: 33.3823,
    kind: 'global-resolver',
    url: 'https://dns.adguard-dns.com/resolve',
    protocol: 'doh-json',
  },
  {
    id: 'resolver-alidns',
    label: 'Hangzhou, China',
    provider: 'AliDNS',
    city: 'Hangzhou',
    country: 'China',
    countryCode: 'CN',
    latitude: 30.2741,
    longitude: 120.1551,
    kind: 'global-resolver',
    url: 'https://dns.alidns.com/resolve',
    protocol: 'doh-json',
  },
] as const;

export function parsePropagationType(rawType = 'A'): PropagationRecordType {
  const upper = rawType.trim().toUpperCase() as PropagationRecordType;
  if ((PROPAGATION_TYPES as readonly string[]).includes(upper)) {
    return upper;
  }
  return 'A';
}

export function validatePropagationTarget(rawHost: string, type: PropagationRecordType): {
  host: string;
  queryName: string;
} {
  const host = sanitizeTargetHost(rawHost);
  const ip = normalizeIp(host);
  if (ip) {
    if (!isPublicIp(ip)) {
      throw new Error(`Target IP "${ip}" is private, loopback, or reserved and cannot be queried.`);
    }
    if (type === 'PTR') {
      const version = isIP(ip);
      if (version === 4) {
        return { host, queryName: `${ip.split('.').reverse().join('.')}.in-addr.arpa` };
      }
      const [head, tail] = ip.toLowerCase().split('::');
      const headParts = head ? head.split(':').filter(Boolean) : [];
      const tailParts = tail !== undefined ? tail.split(':').filter(Boolean) : [];
      const missing = Math.max(0, 8 - headParts.length - tailParts.length);
      const expanded = [...headParts, ...Array<string>(missing).fill('0'), ...tailParts]
        .map((g) => g.padStart(4, '0'))
        .join('');
      return { host, queryName: `${expanded.split('').reverse().join('.')}.ip6.arpa` };
    }
  }

  const lower = host.toLowerCase();
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    throw new Error(`Target hostname "${host}" refers to a reserved or local zone.`);
  }

  return { host, queryName: host };
}

export function encodeDnsWireQuery(name: string, type: PropagationRecordType): Uint8Array {
  const labels = name.replace(/\.$/, '').split('.').filter(Boolean);
  const encoder = new TextEncoder();
  const encodedLabels = labels.map((l) => encoder.encode(l));
  const nameLength = encodedLabels.reduce((sum, b) => sum + 1 + b.length, 0) + 1;

  const packet = new Uint8Array(12 + nameLength + 4);
  const view = new DataView(packet.buffer);
  view.setUint16(0, 0x2026);
  view.setUint16(2, 0x0100);
  view.setUint16(4, 1);

  let offset = 12;
  for (const labelBytes of encodedLabels) {
    packet[offset++] = labelBytes.length;
    packet.set(labelBytes, offset);
    offset += labelBytes.length;
  }
  packet[offset++] = 0;
  view.setUint16(offset, DNS_TYPE_TO_CODE[type]);
  view.setUint16(offset + 2, 1);
  return packet;
}

function readDnsName(buf: Uint8Array, start: number): { name: string; nextOffset: number } {
  const decoder = new TextDecoder();
  let offset = start;
  const labels: string[] = [];
  let jumped = false;
  let nextOffset = start;

  for (let steps = 0; steps < 64 && offset < buf.length; steps++) {
    const len = buf[offset] ?? 0;
    if (len === 0) {
      if (!jumped) nextOffset = offset + 1;
      break;
    }
    if ((len & 0xc0) === 0xc0) {
      if (!jumped) nextOffset = offset + 2;
      offset = ((len & 0x3f) << 8) | (buf[offset + 1] ?? 0);
      jumped = true;
      continue;
    }
    offset += 1;
    labels.push(decoder.decode(buf.subarray(offset, offset + len)));
    offset += len;
  }

  return { name: labels.join('.'), nextOffset };
}

function decodeRdata(buf: Uint8Array, view: DataView, typeCode: number, offset: number, rdlen: number): string {
  const decoder = new TextDecoder();
  if (typeCode === 1 && rdlen === 4) {
    return Array.from(buf.subarray(offset, offset + 4)).join('.');
  }
  if (typeCode === 28 && rdlen === 16) {
    const groups: string[] = [];
    for (let i = 0; i < 16; i += 2) {
      groups.push(view.getUint16(offset + i).toString(16));
    }
    const rawIpv6 = groups.join(':');
    return normalizeIp(rawIpv6) ?? rawIpv6;
  }
  if (typeCode === 2 || typeCode === 5 || typeCode === 12) {
    return readDnsName(buf, offset).name;
  }
  if (typeCode === 15 && rdlen >= 3) {
    const pref = view.getUint16(offset);
    return `${pref} ${readDnsName(buf, offset + 2).name}`;
  }
  if (typeCode === 16) {
    let p = offset;
    const chunks: string[] = [];
    while (p < offset + rdlen) {
      const strLen = buf[p++] ?? 0;
      chunks.push(decoder.decode(buf.subarray(p, p + strLen)));
      p += strLen;
    }
    return chunks.join('');
  }
  if (typeCode === 6) {
    const mname = readDnsName(buf, offset);
    const rname = readDnsName(buf, mname.nextOffset);
    const tail = rname.nextOffset;
    if (tail + 20 <= offset + rdlen) {
      const serial = view.getUint32(tail);
      const refresh = view.getUint32(tail + 4);
      const retry = view.getUint32(tail + 8);
      const expire = view.getUint32(tail + 12);
      const minimum = view.getUint32(tail + 16);
      return `${mname.name} ${rname.name} ${serial} ${refresh} ${retry} ${expire} ${minimum}`;
    }
    return `${mname.name} ${rname.name}`;
  }
  if (typeCode === 33 && rdlen >= 7) {
    const priority = view.getUint16(offset);
    const weight = view.getUint16(offset + 2);
    const port = view.getUint16(offset + 4);
    const target = readDnsName(buf, offset + 6).name;
    return `${priority} ${weight} ${port} ${target}`;
  }
  if (typeCode === 257 && rdlen >= 2) {
    const flags = buf[offset] ?? 0;
    const tagLen = buf[offset + 1] ?? 0;
    const tag = decoder.decode(buf.subarray(offset + 2, offset + 2 + tagLen));
    const value = decoder.decode(buf.subarray(offset + 2 + tagLen, offset + rdlen));
    return `${flags} ${tag} "${value}"`;
  }
  return decoder.decode(buf.subarray(offset, offset + rdlen));
}

export function decodeDnsWireResponse(buf: Uint8Array, fallbackType: PropagationRecordType): {
  rcode: number;
  records: DnsRecordEntry[];
} {
  if (buf.byteLength < 12) {
    throw new Error('Malformed DNS wire response (truncated header).');
  }
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const rcode = view.getUint16(2) & 0x0f;
  const qdCount = view.getUint16(4);
  const anCount = view.getUint16(6);

  let offset = 12;
  for (let i = 0; i < qdCount; i++) {
    offset = readDnsName(buf, offset).nextOffset + 4;
  }

  const records: DnsRecordEntry[] = [];
  for (let i = 0; i < anCount && offset + 10 <= buf.length; i++) {
    const rrName = readDnsName(buf, offset);
    offset = rrName.nextOffset;
    const typeCode = view.getUint16(offset);
    const ttl = view.getUint32(offset + 4);
    const rdlen = view.getUint16(offset + 8);
    offset += 10;
    if (offset + rdlen > buf.length) break;

    const data = decodeRdata(buf, view, typeCode, offset, rdlen);
    records.push({
      name: rrName.name,
      type: CODE_TO_DNS_TYPE[typeCode] ?? fallbackType,
      ttl,
      data,
    });
    offset += rdlen;
  }

  return { rcode, records };
}

function cleanRecordData(raw: string): string {
  return raw.trim().replace(/^"+|"+$/g, '').replace(/\.$/, '');
}

function computeSignature(values: string[]): string {
  return values.map((v) => v.toLowerCase()).sort().join('|');
}

function extractMatchingValues(records: DnsRecordEntry[], type: PropagationRecordType): {
  matching: DnsRecordEntry[];
  values: string[];
  ttl: number | null;
} {
  const matching = records.filter((r) => r.type.toUpperCase() === type);
  const pool = matching.length > 0 ? matching : records;
  const seen = new Set<string>();
  const values: string[] = [];
  let minTtl: number | null = null;

  for (const r of pool) {
    const val = cleanRecordData(r.data);
    if (val && !seen.has(val)) {
      seen.add(val);
      values.push(val);
    }
    if (typeof r.ttl === 'number' && (minTtl === null || r.ttl < minTtl)) {
      minTtl = r.ttl;
    }
  }

  return { matching: pool, values, ttl: minTtl };
}

async function queryJsonDoh(
  urlBase: string,
  queryName: string,
  type: PropagationRecordType,
  fetchFn: typeof fetch,
  timeoutMs: number,
): Promise<DnsRecordEntry[]> {
  const res = await fetchFn(
    `${urlBase}?name=${encodeURIComponent(queryName)}&type=${encodeURIComponent(type)}`,
    {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const body = (await res.json()) as DohJsonResponse;
  if (body.Status !== undefined && body.Status !== 0 && body.Status !== 3) {
    throw new Error(`DNS status ${body.Status}`);
  }
  return (body.Answer ?? [])
    .filter((a): a is Required<Pick<NonNullable<DohJsonResponse['Answer']>[number], 'name' | 'data'>> & NonNullable<DohJsonResponse['Answer']>[number] =>
      Boolean(a.name && a.data),
    )
    .map((a) => ({
      name: a.name.replace(/\.$/, ''),
      type: (a.type ? CODE_TO_DNS_TYPE[a.type] : undefined) ?? type,
      ttl: typeof a.TTL === 'number' ? a.TTL : null,
      data: a.data,
    }));
}

async function queryWireDoh(
  url: string,
  queryName: string,
  type: PropagationRecordType,
  fetchFn: typeof fetch,
  timeoutMs: number,
): Promise<DnsRecordEntry[]> {
  const packet = encodeDnsWireQuery(queryName, type);
  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/dns-message',
      Accept: 'application/dns-message',
    },
    body: packet as unknown as BodyInit,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const { rcode, records } = decodeDnsWireResponse(bytes, type);
  if (rcode !== 0 && rcode !== 3) {
    throw new Error(`DNS rcode ${rcode}`);
  }
  return records;
}

export async function performLocalPropagationLookup(
  rawHost: string,
  rawType = 'A',
  fetchFn: typeof fetch = fetch,
  timeoutMs = 3500,
): Promise<LocalPropagationResult> {
  const started = performance.now();
  const recordType = parsePropagationType(rawType);
  const { host, queryName } = validatePropagationTarget(rawHost, recordType);

  let records = await querySystemDns(queryName, recordType);
  let resolverSource: LocalPropagationResult['resolverSource'] = 'region-system-dns';

  if (records.length === 0) {
    try {
      const edgeRecords = await queryJsonDoh(
        'https://cloudflare-dns.com/dns-query',
        queryName,
        recordType,
        fetchFn,
        timeoutMs,
      );
      if (edgeRecords.length > 0) {
        records = edgeRecords;
        resolverSource = 'cloudflare-edge-doh';
      }
    } catch {
      // Keep empty system-dns result when edge DoH fallback also yields nothing or fails.
    }
  }

  return {
    host,
    queryName,
    recordType,
    resolverSource,
    records,
    latencyMs: Math.max(1, Math.round(performance.now() - started)),
  };
}

function buildRegionMeta(node: RegionNode): PropagationNodeMeta {
  return {
    id: `region-${node.id}`,
    label: `${node.city}, ${node.country}`,
    provider: `Prisma Compute (${node.shortCode})`,
    city: node.city,
    country: node.country,
    countryCode: node.countryCode,
    latitude: node.latitude,
    longitude: node.longitude,
    kind: 'prisma-region',
  };
}

async function probeRegionNode(
  node: RegionNode,
  host: string,
  queryName: string,
  recordType: PropagationRecordType,
  isSelf: boolean,
  fetchFn: typeof fetch,
  timeoutMs: number,
): Promise<Omit<PropagationCheckpointResult, 'status'>> {
  const meta = buildRegionMeta(node);
  const started = performance.now();

  try {
    if (isSelf || !node.url) {
      const local = await performLocalPropagationLookup(host, recordType, fetchFn, timeoutMs);
      const extracted = extractMatchingValues(local.records, recordType);
      return {
        ...meta,
        records: extracted.matching,
        values: extracted.values,
        ttl: extracted.ttl,
        signature: computeSignature(extracted.values),
        resolverSource: local.resolverSource,
        latencyMs: local.latencyMs,
      };
    }

    const propagationUrl = `${node.url}/api/propagation?host=${encodeURIComponent(host)}&type=${encodeURIComponent(recordType)}&local=1`;
    let res = await fetchFn(propagationUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });

    let resolverSource = 'region-system-dns';
    if (res.status === 404) {
      // Seamless fallback if a regional container has not yet received the /api/propagation route
      const legacyUrl = `${node.url}/api/dns?host=${encodeURIComponent(queryName)}&type=${encodeURIComponent(recordType)}`;
      res = await fetchFn(legacyUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      resolverSource = 'region-dns-api';
    }

    if (!res.ok) {
      throw new Error(`Region HTTP ${res.status}`);
    }

    const body = (await res.json()) as {
      records?: DnsRecordEntry[];
      resolverSource?: string;
      resolver?: string;
    };
    const extracted = extractMatchingValues(body.records ?? [], recordType);
    return {
      ...meta,
      records: extracted.matching,
      values: extracted.values,
      ttl: extracted.ttl,
      signature: computeSignature(extracted.values),
      resolverSource: body.resolverSource ?? body.resolver ?? resolverSource,
      latencyMs: Math.max(1, Math.round(performance.now() - started)),
    };
  } catch (err) {
    return {
      ...meta,
      records: [],
      values: [],
      ttl: null,
      signature: '',
      resolverSource: 'unreachable',
      latencyMs: Math.max(1, Math.round(performance.now() - started)),
      error: err instanceof Error ? err.message : 'Region query failed',
    };
  }
}

async function probeGlobalResolver(
  ep: ResolverEndpoint,
  queryName: string,
  recordType: PropagationRecordType,
  fetchFn: typeof fetch,
  timeoutMs: number,
): Promise<Omit<PropagationCheckpointResult, 'status'>> {
  const started = performance.now();
  const meta: PropagationNodeMeta = {
    id: ep.id,
    label: ep.label,
    provider: ep.provider,
    city: ep.city,
    country: ep.country,
    countryCode: ep.countryCode,
    latitude: ep.latitude,
    longitude: ep.longitude,
    kind: ep.kind,
  };
  try {
    const records =
      ep.protocol === 'doh-wire'
        ? await queryWireDoh(ep.url, queryName, recordType, fetchFn, timeoutMs)
        : await queryJsonDoh(ep.url, queryName, recordType, fetchFn, timeoutMs);
    const extracted = extractMatchingValues(records, recordType);
    return {
      ...meta,
      records: extracted.matching,
      values: extracted.values,
      ttl: extracted.ttl,
      signature: computeSignature(extracted.values),
      resolverSource: ep.protocol,
      latencyMs: Math.max(1, Math.round(performance.now() - started)),
    };
  } catch (err) {
    return {
      ...meta,
      records: [],
      values: [],
      ttl: null,
      signature: '',
      resolverSource: ep.protocol,
      latencyMs: Math.max(1, Math.round(performance.now() - started)),
      error: err instanceof Error ? err.message : 'Resolver lookup failed',
    };
  }
}

export async function performPropagationCheck(
  rawHost: string,
  rawType = 'A',
  options: PropagationOptions = {},
): Promise<PropagationResponse> {
  const started = performance.now();
  const recordType = parsePropagationType(rawType);
  const { host, queryName } = validatePropagationTarget(rawHost, recordType);
  const expected = options.expected?.trim() || undefined;
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = Math.max(800, Math.min(8000, options.timeoutMs ?? 4500));

  const nodes = resolveRegionNodes({
    currentOrigin: options.currentOrigin ?? null,
    currentRegion: options.currentRegion ?? null,
  });

  type TaskSpec =
    | { kind: 'region'; node: RegionNode }
    | { kind: 'resolver'; ep: ResolverEndpoint };

  const allTasks: TaskSpec[] = [
    ...nodes.map((node) => ({ kind: 'region' as const, node })),
    ...GLOBAL_RESOLVER_ENDPOINTS.map((ep) => ({ kind: 'resolver' as const, ep })),
  ];

  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const rawLimit = options.limit !== undefined ? Math.floor(options.limit) : allTasks.length;
  const limit = Math.max(1, Math.min(allTasks.length, rawLimit));
  const slice = allTasks.slice(offset, offset + limit);

  const rawResults = await Promise.all(
    slice.map((task) => {
      if (task.kind === 'region') {
        const isSelf = Boolean(options.currentRegion && options.currentRegion === task.node.id);
        return probeRegionNode(task.node, host, queryName, recordType, isSelf, fetchFn, timeoutMs);
      }
      return probeGlobalResolver(task.ep, queryName, recordType, fetchFn, timeoutMs);
    }),
  );

  // Determine consensus signature from checkpoints returning records (or expected filter)
  const counts = new Map<string, { count: number; values: string[] }>();
  for (const r of rawResults) {
    if (!r.signature) continue;
    const prev = counts.get(r.signature);
    if (prev) prev.count += 1;
    else counts.set(r.signature, { count: 1, values: r.values });
  }

  let consensusSignature = '';
  let consensusValues: string[] = [];
  let consensusCount = 0;
  for (const [sig, entry] of counts.entries()) {
    if (entry.count > consensusCount) {
      consensusSignature = sig;
      consensusValues = entry.values;
      consensusCount = entry.count;
    }
  }

  const normalizedExpected = expected ? cleanRecordData(expected).toLowerCase() : null;

  let matchedCount = 0;
  let mismatchCount = 0;
  let missingCount = 0;
  let errorCount = 0;

  const results: PropagationCheckpointResult[] = rawResults.map((r) => {
    let status: PropagationCheckStatus;
    if (r.error) {
      status = 'error';
      errorCount += 1;
    } else if (r.values.length === 0) {
      status = 'missing';
      missingCount += 1;
    } else if (normalizedExpected) {
      const hasMatch = r.values.some((v) => v.toLowerCase() === normalizedExpected);
      status = hasMatch ? 'ok' : 'mismatch';
      if (hasMatch) matchedCount += 1;
      else mismatchCount += 1;
    } else if (!consensusSignature || r.signature === consensusSignature) {
      status = 'ok';
      matchedCount += 1;
    } else {
      status = 'mismatch';
      mismatchCount += 1;
    }

    return {
      ...r,
      status,
    };
  });

  return {
    host,
    queryName,
    recordType,
    expected,
    consensusValues,
    consensusCount,
    offset,
    limit,
    totalCheckpoints: allTasks.length,
    checkedCount: results.length,
    matchedCount,
    mismatchCount,
    missingCount,
    errorCount,
    elapsedMs: Math.max(1, Math.round(performance.now() - started)),
    results,
  };
}
