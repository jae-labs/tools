import net from 'node:net';
import { normalizeIp, sanitizeTargetHost } from '../ip.ts';

export interface WhoisSummary {
  registrar: string | null;
  organization: string | null;
  created: string | null;
  updated: string | null;
  expires: string | null;
  country: string | null;
  netName: string | null;
  cidr: string | null;
  nameServers: string[];
  status: string[];
}

export interface WhoisResult {
  query: string;
  kind: 'ip' | 'domain';
  server: string;
  source: 'whois-tcp' | 'rdap';
  durationMs: number;
  summary: WhoisSummary;
  raw: string;
}

const KNOWN_WHOIS_SERVERS: Record<string, string> = {
  com: 'whois.verisign-grs.com',
  net: 'whois.verisign-grs.com',
  org: 'whois.pir.org',
  io: 'whois.nic.io',
  dev: 'whois.nic.google',
  app: 'whois.nic.google',
  ai: 'whois.nic.ai',
  co: 'whois.nic.co',
  eu: 'whois.eu',
  uk: 'whois.nic.uk',
  de: 'whois.denic.de',
  br: 'whois.registro.br',
  xyz: 'whois.nic.xyz',
  me: 'whois.nic.me',
  gg: 'whois.gg',
  engineer: 'whois.nic.engineer',
  z: 'whois.iana.org',
};

function queryWhoisTcp(server: string, query: string, timeoutMs = 4500): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: server, port: 43 });
    let data = '';
    let settled = false;

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve(data);
    };

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      const payload = server === 'whois.verisign-grs.com' ? `=${query}\r\n` : `${query}\r\n`;
      socket.write(payload);
    });
    socket.on('data', (chunk) => {
      data += chunk.toString('utf8');
      if (data.length > 150_000) {
        finish();
      }
    });
    socket.on('end', () => finish());
    socket.on('timeout', () => finish(new Error(`WHOIS server ${server} timed out.`)));
    socket.on('error', (err) => finish(err));
  });
}

function extractReferralServer(raw: string): string | null {
  const patterns = [
    /^refer:\s*([a-zA-Z0-9.-]+)/im,
    /^whois:\s*([a-zA-Z0-9.-]+)/im,
    /^Registrar WHOIS Server:\s*([a-zA-Z0-9.-]+)/im,
    /^ReferralServer:\s*(?:whois:\/\/)?([a-zA-Z0-9.-]+)/im,
  ];
  for (const re of patterns) {
    const match = re.exec(raw);
    if (match?.[1]) {
      const candidate = match[1].trim().toLowerCase();
      if (candidate && candidate !== 'whois.iana.org') {
        return candidate;
      }
    }
  }
  return null;
}

export function parseWhoisSummary(raw: string): WhoisSummary {
  const matchFirst = (patterns: RegExp[]): string | null => {
    for (const pattern of patterns) {
      const m = pattern.exec(raw);
      if (m?.[1]) {
        const val = m[1].trim();
        if (val) return val;
      }
    }
    return null;
  };

  const nameServers = new Set<string>();
  const status = new Set<string>();

  for (const line of raw.split(/\r?\n/)) {
    const nsMatch = /^(?:Name Server|nserver|nameserver):\s*([^\s]+)/i.exec(line.trim());
    if (nsMatch?.[1]) {
      nameServers.add(nsMatch[1].toLowerCase().replace(/\.$/, ''));
    }
    const statusMatch = /^(?:Domain Status|Status):\s*([^\s(]+)/i.exec(line.trim());
    if (statusMatch?.[1]) {
      status.add(statusMatch[1]);
    }
  }

  return {
    registrar: matchFirst([/^Registrar:\s*(.+)$/im, /^Sponsoring Registrar:\s*(.+)$/im]),
    organization: matchFirst([
      /^Registrant Organization:\s*(.+)$/im,
      /^OrgName:\s*(.+)$/im,
      /^org-name:\s*(.+)$/im,
      /^Organization:\s*(.+)$/im,
      /^descr:\s*(.+)$/im,
    ]),
    created: matchFirst([
      /^Creation Date:\s*(.+)$/im,
      /^Created:\s*(.+)$/im,
      /^RegDate:\s*(.+)$/im,
      /^created:\s*(.+)$/im,
    ]),
    updated: matchFirst([
      /^Updated Date:\s*(.+)$/im,
      /^Last Modified:\s*(.+)$/im,
      /^Updated:\s*(.+)$/im,
      /^changed:\s*(.+)$/im,
    ]),
    expires: matchFirst([
      /^Registry Expiry Date:\s*(.+)$/im,
      /^Registrar Registration Expiration Date:\s*(.+)$/im,
      /^Expiration Date:\s*(.+)$/im,
      /^paid-till:\s*(.+)$/im,
    ]),
    country: matchFirst([/^Country:\s*([A-Z]{2})$/im, /^Registrant Country:\s*(.+)$/im]),
    netName: matchFirst([/^NetName:\s*(.+)$/im, /^netname:\s*(.+)$/im]),
    cidr: matchFirst([/^CIDR:\s*(.+)$/im, /^inetnum:\s*(.+)$/im, /^route:\s*(.+)$/im]),
    nameServers: Array.from(nameServers).slice(0, 10),
    status: Array.from(status).slice(0, 8),
  };
}

interface RdapEvent {
  eventAction?: string;
  eventDate?: string;
}

interface RdapEntity {
  roles?: string[];
  vcardArray?: [string, Array<[string, Record<string, unknown>, string, string | string[]]>];
}

interface RdapResponse {
  ldhName?: string;
  name?: string;
  country?: string;
  status?: string[];
  events?: RdapEvent[];
  nameservers?: Array<{ ldhName?: string }>;
  entities?: RdapEntity[];
  cidr0_cidrs?: Array<{ v4prefix?: string; v6prefix?: string; length?: number }>;
}

async function queryRdap(
  query: string,
  kind: 'ip' | 'domain',
  fetchFn: typeof fetch,
): Promise<{ raw: string; summary: WhoisSummary }> {
  const endpoint =
    kind === 'ip'
      ? `https://rdap.org/ip/${encodeURIComponent(query)}`
      : `https://rdap.org/domain/${encodeURIComponent(query)}`;
  const res = await fetchFn(endpoint, {
    headers: { Accept: 'application/rdap+json, application/json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`RDAP lookup failed with HTTP ${res.status}`);
  }
  const data = (await res.json()) as RdapResponse;

  const findEvent = (action: string) =>
    data.events?.find((e) => e.eventAction?.toLowerCase().includes(action))?.eventDate ?? null;

  const findEntityName = (role: string): string | null => {
    const entity = data.entities?.find((e) => e.roles?.includes(role));
    const fnField = entity?.vcardArray?.[1]?.find((f) => f[0] === 'fn');
    return typeof fnField?.[3] === 'string' ? fnField[3] : null;
  };

  const cidrObj = data.cidr0_cidrs?.[0];
  const cidr = cidrObj
    ? `${cidrObj.v4prefix ?? cidrObj.v6prefix ?? ''}/${cidrObj.length ?? ''}`
    : null;

  const summary: WhoisSummary = {
    registrar: findEntityName('registrar'),
    organization: findEntityName('registrant') ?? findEntityName('administrative') ?? data.name ?? null,
    created: findEvent('registration'),
    updated: findEvent('last changed'),
    expires: findEvent('expiration'),
    country: data.country ?? null,
    netName: data.name ?? null,
    cidr,
    nameServers: (data.nameservers ?? [])
      .map((ns) => ns.ldhName?.toLowerCase())
      .filter((n): n is string => Boolean(n)),
    status: data.status ?? [],
  };

  return {
    raw: JSON.stringify(data, null, 2),
    summary,
  };
}

export async function performWhoisLookup(
  rawQuery: string,
  fetchFn: typeof fetch = fetch,
): Promise<WhoisResult> {
  const started = performance.now();
  const sanitized = sanitizeTargetHost(rawQuery);
  const ip = normalizeIp(sanitized);
  const kind: 'ip' | 'domain' = ip ? 'ip' : 'domain';

  let initialServer = 'whois.iana.org';
  if (kind === 'domain') {
    const tld = sanitized.split('.').pop()?.toLowerCase() ?? '';
    if (KNOWN_WHOIS_SERVERS[tld]) {
      initialServer = KNOWN_WHOIS_SERVERS[tld];
    }
  } else {
    initialServer = 'whois.arin.net';
  }

  try {
    let activeServer = initialServer;
    let raw = await queryWhoisTcp(activeServer, sanitized);
    const referral = extractReferralServer(raw);
    if (referral && referral !== activeServer) {
      try {
        const referredRaw = await queryWhoisTcp(referral, sanitized);
        if (referredRaw.trim().length > 40) {
          activeServer = referral;
          raw = referredRaw;
        }
      } catch {
        // Keep initial WHOIS response if referral server fails
      }
    }

    if (raw.trim().length > 20) {
      return {
        query: sanitized,
        kind,
        server: activeServer,
        source: 'whois-tcp',
        durationMs: Math.round(performance.now() - started),
        summary: parseWhoisSummary(raw),
        raw: raw.trim(),
      };
    }
  } catch {
    // Fall back to RDAP
  }

  const rdap = await queryRdap(sanitized, kind, fetchFn);
  return {
    query: sanitized,
    kind,
    server: 'rdap.org',
    source: 'rdap',
    durationMs: Math.round(performance.now() - started),
    summary: rdap.summary,
    raw: rdap.raw,
  };
}
