import { resolvePublicTarget, sanitizeTargetHost } from '../ip.ts';

export type RblKind = 'ip' | 'domain';

export type RblStatus = 'clean' | 'listed' | 'blocked' | 'error';

export interface RblProvider {
  zone: string;
  name: string;
  category: 'spam' | 'exploit' | 'policy' | 'domain';
  kind: RblKind;
  infoUrl: string;
}

export interface RblCheckResult {
  zone: string;
  name: string;
  category: RblProvider['category'];
  kind: RblKind;
  infoUrl: string;
  queryHost: string;
  status: RblStatus;
  codes: string[];
  reason?: string;
  latencyMs: number;
}

export interface RblResponse {
  target: string;
  resolvedIp: string;
  hostname?: string;
  family: 4 | 6;
  targetType: 'ip' | 'domain';
  offset: number;
  limit: number;
  totalProviders: number;
  checkedCount: number;
  listedCount: number;
  cleanCount: number;
  blockedCount: number;
  errorCount: number;
  elapsedMs: number;
  results: RblCheckResult[];
}

export interface RblOptions {
  offset?: number;
  limit?: number;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export const IP_RBL_PROVIDERS: readonly RblProvider[] = [
  { zone: 'bl.spamcop.net', name: 'SpamCop', category: 'spam', kind: 'ip', infoUrl: 'https://www.spamcop.net/bl.shtml' },
  { zone: 'b.barracudacentral.org', name: 'Barracuda Central', category: 'spam', kind: 'ip', infoUrl: 'https://www.barracudacentral.org/lookups' },
  { zone: 'psbl.surriel.com', name: 'PSBL (Passive Spam)', category: 'spam', kind: 'ip', infoUrl: 'https://psbl.org/' },
  { zone: 'dnsbl-1.uceprotect.net', name: 'UCEPROTECT Level 1', category: 'spam', kind: 'ip', infoUrl: 'https://www.uceprotect.net/' },
  { zone: 'dnsbl-2.uceprotect.net', name: 'UCEPROTECT Level 2', category: 'policy', kind: 'ip', infoUrl: 'https://www.uceprotect.net/' },
  { zone: 'dnsbl-3.uceprotect.net', name: 'UCEPROTECT Level 3', category: 'policy', kind: 'ip', infoUrl: 'https://www.uceprotect.net/' },
  { zone: 'bl.mailspike.net', name: 'Mailspike BL', category: 'spam', kind: 'ip', infoUrl: 'https://mailspike.org/' },
  { zone: 'z.mailspike.net', name: 'Mailspike Z', category: 'spam', kind: 'ip', infoUrl: 'https://mailspike.org/' },
  { zone: 'dnsbl.dronebl.org', name: 'DroneBL', category: 'exploit', kind: 'ip', infoUrl: 'https://dronebl.org/' },
  { zone: 'all.s5h.net', name: 's5h.net RBL', category: 'exploit', kind: 'ip', infoUrl: 'https://www.usenix.org.uk/content/rbl.html' },
  { zone: 'dnsbl.spfbl.net', name: 'SPFBL DNSBL', category: 'spam', kind: 'ip', infoUrl: 'https://spfbl.net/en/dnsbl/' },
  { zone: 'truncate.gbudb.net', name: 'GBUdb Truncate', category: 'spam', kind: 'ip', infoUrl: 'http://www.gbudb.com/' },
  { zone: 'rbl.interserver.net', name: 'InterServer RBL', category: 'spam', kind: 'ip', infoUrl: 'https://rbl.interserver.net/' },
  { zone: 'bl.0spam.org', name: '0spam Project', category: 'spam', kind: 'ip', infoUrl: 'https://www.0spam.org/' },
  { zone: 'bl.blocklist.de', name: 'Blocklist.de', category: 'exploit', kind: 'ip', infoUrl: 'https://www.blocklist.de/' },
  { zone: 'bl.nordspam.com', name: 'NordSpam IPBL', category: 'spam', kind: 'ip', infoUrl: 'https://www.nordspam.com/' },
  { zone: 'bl.spameatingmonkey.net', name: 'Spam Eating Monkey', category: 'spam', kind: 'ip', infoUrl: 'https://spameatingmonkey.com/' },
  { zone: 'bl.suomispam.net', name: 'Suomispam RBL', category: 'spam', kind: 'ip', infoUrl: 'https://suomispam.net/' },
  { zone: 'dnsbl.justspam.org', name: 'JustSpam.org', category: 'spam', kind: 'ip', infoUrl: 'https://www.justspam.org/' },
  { zone: 'dnsbl.kempt.net', name: 'Kempt.net DNSBL', category: 'spam', kind: 'ip', infoUrl: 'https://www.kempt.net/' },
  { zone: 'backscatter.spameatingmonkey.net', name: 'SEM Backscatter', category: 'policy', kind: 'ip', infoUrl: 'https://spameatingmonkey.com/' },
  { zone: 'dnsbl.zapbl.net', name: 'ZapBL', category: 'spam', kind: 'ip', infoUrl: 'https://zapbl.net/' },
  { zone: 'bl.mxrbl.com', name: 'MXRBL', category: 'spam', kind: 'ip', infoUrl: 'https://mxrbl.com/' },
  { zone: 'rbl.metunet.com', name: 'MetuNet RBL', category: 'spam', kind: 'ip', infoUrl: 'https://rbl.metunet.com/' },
  { zone: 'bl.scientificspam.net', name: 'ScientificSpam', category: 'spam', kind: 'ip', infoUrl: 'https://www.scientificspam.net/' },
];

export const DOMAIN_RBL_PROVIDERS: readonly RblProvider[] = [
  { zone: 'multi.surbl.org', name: 'SURBL Multi', category: 'domain', kind: 'domain', infoUrl: 'https://www.surbl.org/' },
  { zone: 'black.uribl.com', name: 'URIBL Black', category: 'domain', kind: 'domain', infoUrl: 'https://uribl.com/' },
  { zone: 'uribl.spameatingmonkey.net', name: 'SEM URIBL', category: 'domain', kind: 'domain', infoUrl: 'https://spameatingmonkey.com/' },
  { zone: 'fresh.spameatingmonkey.net', name: 'SEM Fresh', category: 'domain', kind: 'domain', infoUrl: 'https://spameatingmonkey.com/' },
];

interface DohAnswer {
  type?: number;
  data?: string;
}

interface DohResponse {
  Status?: number;
  Answer?: DohAnswer[];
}

export function reverseIpv4(ip: string): string {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) {
    throw new Error(`Invalid IPv4 address for RBL reversal: ${ip}`);
  }
  return parts.reverse().join('.');
}

export function reverseIpv6Nibbles(ip: string): string {
  const clean = ip.split('%')[0] ?? ip;
  const [leftRaw, rightRaw] = clean.split('::');
  const left = leftRaw ? leftRaw.split(':').filter(Boolean) : [];
  const right = rightRaw !== undefined ? (rightRaw ? rightRaw.split(':').filter(Boolean) : []) : [];

  let groups: string[];
  if (rightRaw !== undefined) {
    const missing = 8 - (left.length + right.length);
    if (missing < 0) {
      throw new Error(`Invalid IPv6 address for RBL reversal: ${ip}`);
    }
    groups = [...left, ...Array<string>(missing).fill('0'), ...right];
  } else {
    groups = left;
  }

  if (groups.length !== 8) {
    throw new Error(`Invalid IPv6 address for RBL reversal: ${ip}`);
  }

  const expanded = groups.map((g) => g.padStart(4, '0')).join('');
  return expanded.split('').reverse().join('.');
}

export function buildRblQueryHost(provider: RblProvider, reversedIp: string, domainName?: string): string {
  if (provider.kind === 'domain') {
    if (!domainName) {
      throw new Error(`Domain RBL ${provider.zone} requires a domain target.`);
    }
    return `${domainName}.${provider.zone}`;
  }
  return `${reversedIp}.${provider.zone}`;
}

export function getProvidersForTarget(targetType: 'ip' | 'domain'): RblProvider[] {
  return targetType === 'domain'
    ? [...IP_RBL_PROVIDERS, ...DOMAIN_RBL_PROVIDERS]
    : [...IP_RBL_PROVIDERS];
}

async function queryDoh(
  name: string,
  rrType: 'A' | 'TXT',
  fetchFn: typeof fetch,
  timeoutMs: number,
): Promise<DohResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${rrType}`;
    const res = await fetchFn(url, {
      headers: { accept: 'application/dns-json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`DoH HTTP ${res.status}`);
    }
    return (await res.json()) as DohResponse;
  } finally {
    clearTimeout(timer);
  }
}

export function classifyRblAnswers(status: number | undefined, answers: DohAnswer[] | undefined): {
  status: RblStatus;
  codes: string[];
} {
  if (status === 3) {
    return { status: 'clean', codes: [] };
  }
  if (status !== 0 && status !== undefined) {
    return { status: 'error', codes: [] };
  }

  const codes = (answers ?? [])
    .filter((a) => a.type === 1 && typeof a.data === 'string' && a.data.startsWith('127.'))
    .map((a) => a.data as string);

  if (codes.length === 0) {
    return { status: 'clean', codes: [] };
  }

  if (codes.some((code) => code.startsWith('127.255.255.'))) {
    return { status: 'blocked', codes };
  }

  return { status: 'listed', codes };
}

function stripTxtQuotes(raw: string): string {
  return raw.replace(/^"+|"+$/g, '').replace(/"\s*"/g, '');
}

async function probeSingleRbl(
  provider: RblProvider,
  queryHost: string,
  fetchFn: typeof fetch,
  timeoutMs: number,
): Promise<RblCheckResult> {
  const started = Date.now();
  try {
    const aRes = await queryDoh(queryHost, 'A', fetchFn, timeoutMs);
    const { status, codes } = classifyRblAnswers(aRes.Status, aRes.Answer);
    let reason: string | undefined;

    if (status === 'listed' || status === 'blocked') {
      try {
        const txtRes = await queryDoh(queryHost, 'TXT', fetchFn, Math.min(timeoutMs, 2500));
        const txts = (txtRes.Answer ?? [])
          .filter((a) => a.type === 16 && typeof a.data === 'string')
          .map((a) => stripTxtQuotes(a.data as string));
        if (txts.length > 0) {
          reason = txts.join(' | ');
        }
      } catch {
        // Optional TXT detail; ignore lookup errors when A record already classified the hit.
      }
      if (!reason && status === 'blocked') {
        reason = 'Query refused or rate-limited by RBL resolver policy (127.255.255.x).';
      }
    } else if (status === 'error') {
      reason = `DNS status ${aRes.Status ?? 'unknown'}`;
    }

    return {
      zone: provider.zone,
      name: provider.name,
      category: provider.category,
      kind: provider.kind,
      infoUrl: provider.infoUrl,
      queryHost,
      status,
      codes,
      reason,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    return {
      zone: provider.zone,
      name: provider.name,
      category: provider.category,
      kind: provider.kind,
      infoUrl: provider.infoUrl,
      queryHost,
      status: 'error',
      codes: [],
      reason: err instanceof Error ? err.message : 'Lookup failed',
      latencyMs: Date.now() - started,
    };
  }
}

export async function performRblLookup(rawTarget: string, options: RblOptions = {}): Promise<RblResponse> {
  const started = Date.now();
  const sanitized = sanitizeTargetHost(rawTarget);
  const resolved = await resolvePublicTarget(sanitized);
  const hostname = resolved.hostname ?? undefined;
  const family: 4 | 6 = resolved.family === 'IPv4' ? 4 : 6;
  const targetType: 'ip' | 'domain' = hostname ? 'domain' : 'ip';
  const reversedIp = family === 4 ? reverseIpv4(resolved.ip) : reverseIpv6Nibbles(resolved.ip);
  const allProviders = getProvidersForTarget(targetType);

  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const rawLimit = options.limit !== undefined ? Math.floor(options.limit) : allProviders.length;
  const limit = Math.max(1, Math.min(allProviders.length, rawLimit));
  const slice = allProviders.slice(offset, offset + limit);
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = Math.max(500, Math.min(10_000, options.timeoutMs ?? 4000));

  const results = await Promise.all(
    slice.map((provider) => {
      const queryHost = buildRblQueryHost(provider, reversedIp, hostname);
      return probeSingleRbl(provider, queryHost, fetchFn, timeoutMs);
    }),
  );

  let listedCount = 0;
  let cleanCount = 0;
  let blockedCount = 0;
  let errorCount = 0;
  for (const r of results) {
    if (r.status === 'listed') listedCount += 1;
    else if (r.status === 'clean') cleanCount += 1;
    else if (r.status === 'blocked') blockedCount += 1;
    else errorCount += 1;
  }

  return {
    target: sanitized,
    resolvedIp: resolved.ip,
    hostname,
    family,
    targetType,
    offset,
    limit,
    totalProviders: allProviders.length,
    checkedCount: results.length,
    listedCount,
    cleanCount,
    blockedCount,
    errorCount,
    elapsedMs: Date.now() - started,
    results,
  };
}
