import net from 'node:net';
import { isPublicIp, normalizeIp, resolvePublicTarget, type IpFamily } from '../ip.ts';
import type { GeoInfo } from '../geo.ts';
import { performReverseLookup } from './dns.ts';

export const COMMON_PORTS: Record<number, string> = {
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  143: 'IMAP',
  443: 'HTTPS',
  465: 'SMTPS',
  587: 'Submission',
  993: 'IMAPS',
  995: 'POP3S',
  1080: 'SOCKS',
  3128: 'Squid Proxy',
  3306: 'MySQL',
  5432: 'PostgreSQL',
  6379: 'Redis',
  8080: 'HTTP-Alt',
  8443: 'HTTPS-Alt',
  8888: 'HTTP-Proxy',
};

export interface SinglePortResult {
  port: number;
  service: string;
  status: 'open' | 'closed' | 'filtered';
  latencyMs: number | null;
  detail: string;
}

export interface PortCheckResult {
  target: string;
  resolvedIp: string;
  family: IpFamily;
  results: SinglePortResult[];
  durationMs: number;
}

export interface ProxyCheckResult {
  ip: string;
  isSelf: boolean;
  localNetwork: boolean;
  verdict: 'clean' | 'proxy-headers' | 'open-proxy-ports' | 'hosting-datacenter';
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
  detectedHeaders: Array<{ header: string; value: string }>;
  openProxyPorts: SinglePortResult[];
  reverseHostnames: string[];
  geo: GeoInfo | null;
  durationMs: number;
}

const PROXY_HEADER_NAMES = [
  'via',
  'x-forwarded-for',
  'forwarded',
  'x-proxy-id',
  'proxy-connection',
  'x-forwarded-host',
  'client-ip',
  'x-real-ip',
];

const PROXY_PORTS = [80, 1080, 3128, 8080, 8888];

const DATACENTER_KEYWORDS = [
  'amazon',
  'aws',
  'google cloud',
  'digitalocean',
  'hetzner',
  'ovh',
  'linode',
  'akamai',
  'vultr',
  'cloudflare',
  'oracle',
  'microsoft',
  'azure',
  'contabo',
  'scaleway',
  'mullvad',
  'nordvpn',
  'proton',
  'tor',
  'proxy',
  'vpn',
  'hosting',
  'datacenter',
];

export function probeTcpPort(
  ip: string,
  port: number,
  timeoutMs = 2500,
): Promise<SinglePortResult> {
  return new Promise((resolve) => {
    const started = performance.now();
    const socket = net.createConnection({ host: ip, port });
    const service = COMMON_PORTS[port] ?? 'Custom';
    let settled = false;

    const finish = (status: SinglePortResult['status'], detail: string, measure = true) => {
      if (settled) return;
      settled = true;
      const latencyMs = measure ? Math.round((performance.now() - started) * 100) / 100 : null;
      socket.destroy();
      resolve({ port, service, status, latencyMs, detail });
    };

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => finish('open', 'TCP handshake succeeded'));
    socket.on('timeout', () => finish('filtered', `No response within ${timeoutMs}ms`, false));
    socket.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ECONNREFUSED') {
        finish('closed', 'Connection refused (RST)');
      } else {
        finish('filtered', err.code ?? err.message, false);
      }
    });
  });
}

export async function performPortCheck(
  rawTarget: string,
  ports: number[],
  timeoutMs = 2500,
): Promise<PortCheckResult> {
  const started = performance.now();
  const target = await resolvePublicTarget(rawTarget);

  const uniquePorts = Array.from(
    new Set(ports.filter((p) => Number.isInteger(p) && p >= 1 && p <= 65535)),
  ).slice(0, 16);

  if (uniquePorts.length === 0) {
    throw new Error('Provide at least one valid TCP port (1–65535).');
  }

  const results = await Promise.all(
    uniquePorts.map((port) => probeTcpPort(target.ip, port, timeoutMs)),
  );

  return {
    target: target.input,
    resolvedIp: target.ip,
    family: target.family,
    results,
    durationMs: Math.round(performance.now() - started),
  };
}

export async function performProxyCheck(
  rawIp: string,
  options: {
    requestHeaders?: Headers;
    isSelf?: boolean;
    lookupGeo?: (ip: string) => Promise<GeoInfo | null>;
  } = {},
): Promise<ProxyCheckResult> {
  const started = performance.now();
  const ip = normalizeIp(rawIp);
  if (!ip) {
    throw new Error('Provide a valid IPv4 or IPv6 address to check.');
  }

  const isSelf = Boolean(options.isSelf);
  const detectedHeaders: Array<{ header: string; value: string }> = [];

  if (isSelf && options.requestHeaders) {
    for (const name of PROXY_HEADER_NAMES) {
      const val = options.requestHeaders.get(name);
      if (val) {
        detectedHeaders.push({ header: name, value: val });
      }
    }
  }

  const isPub = isPublicIp(ip);
  const geo = options.lookupGeo ? await options.lookupGeo(ip) : null;

  if (!isPub) {
    return {
      ip,
      isSelf,
      localNetwork: true,
      verdict: 'clean',
      riskLevel: 'low',
      summary: 'Private or loopback IP address (cannot probe public proxy ports).',
      detectedHeaders,
      openProxyPorts: [],
      reverseHostnames: [],
      geo,
      durationMs: Math.round(performance.now() - started),
    };
  }

  const [portProbes, reverseRes] = await Promise.all([
    Promise.all(PROXY_PORTS.map((port) => probeTcpPort(ip, port, 1500))),
    performReverseLookup(ip).catch(() => ({ hostnames: [] as string[] })),
  ]);

  const openProxyPorts = portProbes.filter((p) => p.status === 'open');
  const reverseHostnames = reverseRes.hostnames;

  const orgText = `${geo?.isp ?? ''} ${geo?.org ?? ''} ${reverseHostnames.join(' ')}`.toLowerCase();
  const isDatacenter = DATACENTER_KEYWORDS.some((kw) => orgText.includes(kw));

  // Ignore standard CDN/platform headers when there's only a single hop x-forwarded-for
  const suspiciousHeaders = detectedHeaders.filter(
    (h) => h.header === 'via' || h.header === 'proxy-connection' || h.header === 'x-proxy-id' || (h.header === 'x-forwarded-for' && h.value.includes(',')),
  );

  let verdict: ProxyCheckResult['verdict'] = 'clean';
  let riskLevel: ProxyCheckResult['riskLevel'] = 'low';
  let summary = 'No open proxy ports or suspicious proxy headers detected.';

  if (openProxyPorts.some((p) => p.port !== 80)) {
    verdict = 'open-proxy-ports';
    riskLevel = 'high';
    summary = `Open proxy-associated port(s) detected: ${openProxyPorts.map((p) => `${p.port} (${p.service})`).join(', ')}.`;
  } else if (suspiciousHeaders.length > 0) {
    verdict = 'proxy-headers';
    riskLevel = 'medium';
    summary = `Proxy forwarding headers detected (${suspiciousHeaders.map((h) => h.header).join(', ')}).`;
  } else if (isDatacenter) {
    verdict = 'hosting-datacenter';
    riskLevel = 'medium';
    summary = 'IP belongs to a cloud, hosting, or VPN/datacenter ASN.';
  }

  return {
    ip,
    isSelf,
    localNetwork: false,
    verdict,
    riskLevel,
    summary,
    detectedHeaders,
    openProxyPorts,
    reverseHostnames,
    geo,
    durationMs: Math.round(performance.now() - started),
  };
}
