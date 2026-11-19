import './styles/main.css';
import L from 'leaflet';
import {
  Activity,
  ArrowDownAZ,
  ArrowLeftRight,
  Binary,
  Calculator,
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  CodeXml,
  Copy,
  EthernetPort,
  FileSearch,
  Fingerprint,
  Gauge,
  Globe,
  Link2,
  MailCheck,
  Network,
  Play,
  Radar,
  RefreshCw,
  Regex,
  Route,
  Search,
  ShieldAlert,
  ShieldCheck,
  Square,
  Timer,
  Type,
  createElement,
} from 'lucide';
import type { GeoInfo } from '../server/geo.ts';
import type { ClientIpInfo } from '../server/ip.ts';
import type { DnsLookupResult, ReverseLookupResult } from '../server/tools/dns.ts';
import type {
  PingResult,
  PingSample,
  SingleTracerouteHopResult,
  TracerouteHop,
} from '../server/tools/ping.ts';
import type { PortCheckResult, ProxyCheckResult } from '../server/tools/port.ts';
import type { SpfTestResult, SpfVerdict } from '../server/tools/spf.ts';
import type { WhoisResult } from '../server/tools/whois.ts';
import {
  buildAsciiArt,
  type AsciiCommentPrefix,
  type AsciiFrame,
  type AsciiStyle,
} from '../shared/ascii.ts';
import { parseCronExpression } from '../shared/cron.ts';
import { evaluateRegex, type RegexMatchEntry } from '../shared/regex.ts';
import {
  decodeBase64Utf8,
  decodeUrlValue,
  encodeBase64Utf8,
  encodeUrlValue,
  inspectUrlQuery,
  type UrlEncodeMode,
} from '../shared/encoders.ts';
import {
  breakdownSeconds,
  convertDateStringToEpoch,
  convertEpochToDate,
  convertHumanPartsToEpoch,
  formatRelativeTime,
  type EpochConversionResult,
  type EpochPrecision,
} from '../shared/epoch.ts';
import { sortJsonString } from '../shared/jsonsort.ts';
import { convertIpv4ToIpv6 } from '../shared/ipv4to6.ts';
import { convertXmlToJson } from '../shared/xml2json.ts';
import {
  COUNTRY_CONFIGS,
  calculateWorkdaysDiff,
  calculateWorkdaysOffset,
  formatIsoDateUtc,
  getCountryConfig,
  type CountryCode,
} from '../shared/workdays.ts';
import { resolveRegionNodes, type PrismaRegion } from '../shared/regions.ts';
import {
  SLA_PRESET_TIERS,
  calculateReverseSla,
  calculateSlaBreakdown,
  compareSlas,
  parseDurationString,
  type SlaPeriodId,
} from '../shared/sla.ts';
import { calculateSubnet, type SubnetResult } from '../shared/subnet.ts';
import {
  BANDWIDTH_UNITS,
  DATA_UNITS,
  convertUnits,
  estimateTransferSeconds,
  formatDuration,
} from '../shared/units.ts';
import { renderThroughputChart, type ChartSample } from './lib/chart.ts';
import { resolveDualStack } from './lib/probe.ts';
import {
  formatBytes,
  formatDuration as formatSpeedDuration,
  formatMbpsNumber,
  formatMbpsTriple,
  formatMsTriple,
} from './lib/speed-format.ts';
import { SpeedTopology3D } from './scene/SpeedTopology3D.ts';
import {
  SpeedTestController,
  type NodeMetrics,
  type SpeedTargetNode,
  type SpeedTestReport,
  type SpeedTestSnapshot,
  type TestSequenceMode,
} from './speedtest/engine.ts';

type ToolId =
  | 'myip'
  | 'ping'
  | 'traceroute'
  | 'dns'
  | 'propagation'
  | 'whois'
  | 'port'
  | 'reverse'
  | 'proxy'
  | 'rbl'
  | 'spf'
  | 'geo'
  | 'bandwidth'
  | 'subnet'
  | 'sla'
  | 'epoch'
  | 'days'
  | 'jsonsort'
  | 'xml2json'
  | 'base64'
  | 'url'
  | 'cron'
  | 'regex'
  | 'ascii'
  | 'ipv4to6'
  | 'units';

interface ToolMeta {
  id: ToolId;
  name: string;
  shortName: string;
  desc: string;
  icon: typeof Activity;
  presets: Array<{ label: string; value: string }>;
  cliTemplate: (origin: string, visitorIp: string) => string;
}

const TOOLS: ToolMeta[] = [
  {
    id: 'myip',
    name: 'What Is My IP',
    shortName: 'What Is My IP',
    desc: 'Inspect your dual-stack IPv4 & IPv6 addresses, ISP, ASN, geolocation, and request headers.',
    icon: Fingerprint,
    presets: [],
    cliTemplate: (origin) => `curl -s "${origin}/api/info"`,
  },
  {
    id: 'ping',
    name: 'Online Ping',
    shortName: 'Ping',
    desc: 'Test host reachability and measure round-trip latency, jitter, and packet loss.',
    icon: Activity,
    presets: [
      { label: 'cloudflare.com', value: 'cloudflare.com' },
      { label: 'google.com', value: 'google.com' },
      { label: '1.1.1.1', value: '1.1.1.1' },
      { label: '8.8.8.8', value: '8.8.8.8' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/ping?host=cloudflare.com&count=4"`,
  },
  {
    id: 'traceroute',
    name: 'Traceroute',
    shortName: 'Traceroute',
    desc: 'Trace the network path and hop-by-hop latency to a destination host or IP.',
    icon: Route,
    presets: [
      { label: '1.1.1.1', value: '1.1.1.1' },
      { label: '8.8.8.8', value: '8.8.8.8' },
      { label: 'cloudflare.com', value: 'cloudflare.com' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/traceroute?host=1.1.1.1"`,
  },
  {
    id: 'dns',
    name: 'DNS Lookup',
    shortName: 'DNS Lookup',
    desc: 'Query A, AAAA, MX, NS, TXT, CNAME, SOA, CAA, SRV, and PTR records with TTLs.',
    icon: Search,
    presets: [
      { label: 'justanother.engineer', value: 'justanother.engineer' },
      { label: 'cloudflare.com', value: 'cloudflare.com' },
      { label: 'github.com', value: 'github.com' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/dns?host=cloudflare.com&type=ALL"`,
  },
  {
    id: 'propagation',
    name: 'DNS Propagation',
    shortName: 'DNS Propagation',
    desc: 'Check global DNS propagation across 6 Prisma Compute regions and 9 worldwide resolvers.',
    icon: Radar,
    presets: [
      { label: 'www.google.com', value: 'www.google.com' },
      { label: 'justanother.engineer', value: 'justanother.engineer' },
      { label: 'cloudflare.com', value: 'cloudflare.com' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/propagation?host=www.google.com&type=A"`,
  },
  {
    id: 'whois',
    name: 'WHOIS Lookup',
    shortName: 'WHOIS',
    desc: 'Retrieve domain registrar, expiration dates, name servers, or IP allocation data.',
    icon: FileSearch,
    presets: [
      { label: 'justanother.engineer', value: 'justanother.engineer' },
      { label: 'cloudflare.com', value: 'cloudflare.com' },
      { label: '1.1.1.1', value: '1.1.1.1' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/whois?query=cloudflare.com"`,
  },
  {
    id: 'port',
    name: 'Port Check',
    shortName: 'Port Check',
    desc: 'Check if specific TCP ports are open, closed, or filtered on a remote host.',
    icon: Radar,
    presets: [
      { label: 'cloudflare.com', value: 'cloudflare.com' },
      { label: 'github.com', value: 'github.com' },
      { label: '1.1.1.1', value: '1.1.1.1' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/port?host=cloudflare.com&ports=80,443,22"`,
  },
  {
    id: 'reverse',
    name: 'Reverse Lookup',
    shortName: 'Reverse DNS',
    desc: 'Resolve an IPv4 or IPv6 address to its PTR hostname and verify FCrDNS.',
    icon: RefreshCw,
    presets: [
      { label: '1.1.1.1', value: '1.1.1.1' },
      { label: '8.8.8.8', value: '8.8.8.8' },
      { label: '9.9.9.9', value: '9.9.9.9' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/reverse?ip=1.1.1.1"`,
  },
  {
    id: 'proxy',
    name: 'Proxy Checker',
    shortName: 'Proxy Check',
    desc: 'Inspect proxy headers, open proxy ports (80/1080/3128/8080/8888), and ASN hints.',
    icon: ShieldAlert,
    presets: [
      { label: '1.1.1.1', value: '1.1.1.1' },
      { label: '8.8.8.8', value: '8.8.8.8' },
    ],
    cliTemplate: (origin, ip) => `curl -s "${origin}/api/proxy?ip=${ip || '1.1.1.1'}"`,
  },
  {
    id: 'rbl',
    name: 'RBL Blacklist Check',
    shortName: 'RBL Check',
    desc: 'Check any public IP or domain across 25+ live DNSBL and domain blocklist zones.',
    icon: ShieldCheck,
    presets: [
      { label: '1.1.1.1', value: '1.1.1.1' },
      { label: '8.8.8.8', value: '8.8.8.8' },
      { label: 'cloudflare.com', value: 'cloudflare.com' },
    ],
    cliTemplate: (origin, ip) => `curl -s "${origin}/api/rbl?target=${ip || '1.1.1.1'}"`,
  },
  {
    id: 'spf',
    name: 'SPF Policy Tester',
    shortName: 'SPF Tester',
    desc: 'Evaluate RFC 7208 SPF policies in Basic or Advanced mode (sender IP, MAIL FROM, HELO, macros, 10-lookup & custom record).',
    icon: MailCheck,
    presets: [
      { label: 'gmail.com', value: 'gmail.com' },
      { label: 'cloudflare.com', value: 'cloudflare.com' },
      { label: 'github.com', value: 'github.com' },
      { label: 'justanother.engineer', value: 'justanother.engineer' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/spf?domain=gmail.com&ip=209.85.220.41"`,
  },
  {
    id: 'geo',
    name: 'Country by IP',
    shortName: 'Country / IP',
    desc: 'Identify country, city, timezone, ISP, ASN, and coordinates for any IP or domain.',
    icon: Globe,
    presets: [
      { label: '1.1.1.1', value: '1.1.1.1' },
      { label: '8.8.8.8', value: '8.8.8.8' },
      { label: 'github.com', value: 'github.com' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/geo?target=1.1.1.1"`,
  },
  {
    id: 'bandwidth',
    name: 'Multi-Region Speed Test',
    shortName: 'Speed Test',
    desc: 'Benchmark download, upload, latency, jitter, and packet loss across Prisma Compute regions.',
    icon: Gauge,
    presets: [],
    cliTemplate: (origin) => `curl -o /dev/null -s -w "%{speed_download} B/s\\n" "${origin}/api/download?bytes=8388608"`,
  },
  {
    id: 'subnet',
    name: 'Network Calculator',
    shortName: 'Subnet Calc',
    desc: 'Calculate IPv4/IPv6 CIDR ranges, subnet masks, wildcards, binary octets, and splits.',
    icon: Calculator,
    presets: [
      { label: '192.168.1.10/24', value: '192.168.1.10/24' },
      { label: '10.0.42.5/16', value: '10.0.42.5/16' },
      { label: '172.16.0.1/22', value: '172.16.0.1/22' },
      { label: '2001:db8::1/64', value: '2001:db8::1/64' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/subnet?cidr=192.168.1.10/24"`,
  },
  {
    id: 'sla',
    name: 'SLA Calculator',
    shortName: 'SLA Calc',
    desc: 'Convert uptime nines into downtime budgets, compare two SLAs, or reverse-check outage percentages.',
    icon: Clock,
    presets: [
      { label: '99% (Two Nines)', value: '99' },
      { label: '99.9% (Three Nines)', value: '99.9' },
      { label: '99.95%', value: '99.95' },
      { label: '99.99% (Four Nines)', value: '99.99' },
      { label: '99.999% (Five Nines)', value: '99.999' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/sla?pct=99.9"`,
  },
  {
    id: 'epoch',
    name: 'Epoch Converter',
    shortName: 'Epoch Conv',
    desc: 'Convert Unix timestamps (s/ms/µs/ns) to GMT & local dates, parse human dates, and break down seconds.',
    icon: CalendarClock,
    presets: [
      { label: '0 (Unix Epoch)', value: '0' },
      { label: '1700000000', value: '1700000000' },
      { label: '1795118400000 (ms)', value: '1795118400000' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/epoch?ts=1700000000"`,
  },
  {
    id: 'days',
    name: 'Days & Workdays Calculator',
    shortName: 'Days / Dates',
    desc: 'Find dates N days/hours ahead or ago, count days between dates, skip weekends & country holidays, and estimate effort hours.',
    icon: CalendarDays,
    presets: [
      { label: '15 days', value: '15' },
      { label: '30 days', value: '30' },
      { label: '45 days', value: '45' },
      { label: '90 days', value: '90' },
    ],
    cliTemplate: () => `date -u -d "+15 days" +%Y-%m-%d`,
  },
  {
    id: 'jsonsort',
    name: 'JSON Sort',
    shortName: 'JSON Sort',
    desc: 'Recursively sort JSON object keys alphabetically, optionally sort arrays, and format or minify output.',
    icon: ArrowDownAZ,
    presets: [],
    cliTemplate: (origin) => `curl -s "${origin}/api/me" | jq -S .`,
  },
  {
    id: 'xml2json',
    name: 'XML to JSON',
    shortName: 'XML → JSON',
    desc: 'Convert XML documents with attributes, CDATA, and repeated elements into clean JSON.',
    icon: CodeXml,
    presets: [],
    cliTemplate: () => `printf '<service port="3000"><name>jae-tools</name></service>'`,
  },
  {
    id: 'base64',
    name: 'Base64 Encode / Decode',
    shortName: 'Base64',
    desc: 'UTF-8 safe Base64 and URL-safe Base64 encoding & decoding with byte length metrics.',
    icon: Binary,
    presets: [],
    cliTemplate: () => `printf 'justanother.engineer' | base64`,
  },
  {
    id: 'url',
    name: 'URL Encode / Decode',
    shortName: 'URL Encode',
    desc: 'Percent-encode or decode URLs and query components, plus inspect query string parameters.',
    icon: Link2,
    presets: [],
    cliTemplate: () => `python3 -c "import urllib.parse; print(urllib.parse.quote('hello world & tools'))"`,
  },
  {
    id: 'cron',
    name: 'Crontab Converter',
    shortName: 'Crontab',
    desc: 'Translate 5-field crontab schedules & macros into plain English and preview upcoming run times.',
    icon: Timer,
    presets: [
      { label: '*/5 * * * *', value: '*/5 * * * *' },
      { label: '0 9 * * 1-5', value: '0 9 * * 1-5' },
      { label: '30 3 * * 0', value: '30 3 * * 0' },
      { label: '@daily', value: '@daily' },
    ],
    cliTemplate: () => `# * * * * *  (minute hour day month weekday)`,
  },
  {
    id: 'regex',
    name: 'Regex Tester & Explainer',
    shortName: 'Regex Tester',
    desc: 'Test JavaScript regular expressions with live highlighting, capture groups, substitution, and token breakdown.',
    icon: Regex,
    presets: [],
    cliTemplate: () => `rg -n --pcre2 '(?<proto>https?)://(?<host>[^/\\s:]+)' sample.txt`,
  },
  {
    id: 'ascii',
    name: 'ASCII Art Builder',
    shortName: 'ASCII Art',
    desc: 'Generate block, shadow, dot-matrix, banner, and Braille ASCII banners with frames and comment wrappers.',
    icon: Type,
    presets: [
      { label: 'LUI.Z', value: 'LUI.Z' },
      { label: 'JAE-LABS', value: 'JAE-LABS' },
      { label: 'PRISMA', value: 'PRISMA' },
      { label: '404', value: '404' },
    ],
    cliTemplate: () => `figlet "LUI.Z"`,
  },
  {
    id: 'ipv4to6',
    name: 'IPv4 to IPv6 Converter',
    shortName: 'IPv4 → IPv6',
    desc: 'Convert IPv4 to ::ffff: IPv4-mapped, 6to4 (2002::/16), NAT64 (64:ff9b::/96), ISATAP, & reverse IPv6 back to IPv4.',
    icon: EthernetPort,
    presets: [
      { label: '192.0.2.1', value: '192.0.2.1' },
      { label: '1.1.1.1', value: '1.1.1.1' },
      { label: '::ffff:8.8.8.8', value: '::ffff:8.8.8.8' },
      { label: '2002:c000:201::', value: '2002:c000:201::' },
    ],
    cliTemplate: () => `printf "::ffff:%02x%02x:%02x%02x\\n" 192 0 2 1`,
  },
  {
    id: 'units',
    name: 'Unit Converter',
    shortName: 'Unit Conv',
    desc: 'Convert data storage (SI & IEC), network bandwidth rates, and estimate transfer ETA.',
    icon: ArrowLeftRight,
    presets: [],
    cliTemplate: (origin) => `curl -s "${origin}/api/me"`,
  },
];

let activeTool: ToolId = 'myip';
let visitorIp = '';
let activeAbort: AbortController | null = null;
let activeSpeedCleanup: (() => void) | null = null;

function escapeHtml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderIconSvg(icon: typeof Activity, size = 16, className = ''): string {
  const el = createElement(icon, { width: size, height: size, class: className });
  return el.outerHTML;
}

function statCard(label: string, value: string, accent: 'white' | 'yellow' | 'cyan' | 'green' | 'red' = 'white'): string {
  const colorMap: Record<typeof accent, string> = {
    white: 'text-white',
    yellow: 'text-[#f3eb2c]',
    cyan: 'text-[#00ffff]',
    green: 'text-emerald-400',
    red: 'text-rose-400',
  };
  return `
    <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
      <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">${escapeHtml(label)}</p>
      <p class="mt-1 font-fira text-sm sm:text-base font-bold ${colorMap[accent]} truncate" title="${escapeHtml(value)}">${escapeHtml(value)}</p>
    </div>
  `;
}

function rawOutputBlock(title: string, rawText: string, jsonPayload?: unknown): string {
  const rawId = `raw-${Math.random().toString(36).slice(2, 8)}`;
  const jsonBtn =
    jsonPayload !== undefined
      ? `<button type="button" data-copy-json="${rawId}" class="px-2.5 py-1 rounded border border-white/15 bg-black text-[10px] font-fira uppercase tracking-wider text-[#00ffff] hover:border-[#00ffff]/60 cursor-pointer">COPY JSON</button>`
      : '';
  return `
    <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
      <div class="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/10 bg-black/60">
        <span class="font-fira text-[10px] uppercase tracking-[0.2em] text-[#858585]">${escapeHtml(title)}</span>
        <div class="flex items-center gap-2">
          ${jsonBtn}
          <button type="button" data-copy-raw="${rawId}" class="px-2.5 py-1 rounded border border-white/15 bg-black text-[10px] font-fira uppercase tracking-wider text-[#f3eb2c] hover:border-[#f3eb2c]/60 cursor-pointer">COPY RAW</button>
        </div>
      </div>
      <pre id="${rawId}" class="p-4 font-fira text-xs text-[#d6d6d6] overflow-x-auto leading-relaxed whitespace-pre-wrap break-words max-h-[380px] overflow-y-auto">${escapeHtml(rawText)}</pre>
    </div>
  `;
}

function bindCopyButtons(container: HTMLElement, jsonPayload?: unknown): void {
  container.querySelectorAll<HTMLButtonElement>('[data-copy-raw]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const targetId = btn.dataset.copyRaw;
      const pre = targetId ? document.getElementById(targetId) : null;
      if (!pre) return;
      await copyText(pre.textContent ?? '', btn, 'COPY RAW');
    });
  });

  if (jsonPayload !== undefined) {
    container.querySelectorAll<HTMLButtonElement>('[data-copy-json]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await copyText(JSON.stringify(jsonPayload, null, 2), btn, 'COPY JSON');
      });
    });
  }
}

async function copyText(text: string, button: HTMLElement, originalLabel: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'COPIED';
    setTimeout(() => {
      button.textContent = originalLabel;
    }, 1500);
  } catch {
    button.textContent = 'FAILED';
    setTimeout(() => {
      button.textContent = originalLabel;
    }, 1500);
  }
}

function showLoading(outputEl: HTMLElement, message: string): void {
  outputEl.innerHTML = `
    <div class="rounded-xl border border-[#00ffff]/30 bg-[#050505] p-6 flex items-center gap-3 font-fira text-xs text-[#00ffff]">
      <span class="inline-block w-2.5 h-2.5 rounded-full bg-[#00ffff] animate-ping"></span>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

function showError(outputEl: HTMLElement, message: string): void {
  outputEl.innerHTML = `
    <div class="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 font-fira text-xs text-rose-300">
      <span class="font-bold text-rose-400 uppercase tracking-wider mr-2">[ERROR]</span>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

async function apiGet<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function ctaButton(label: string, id = 'tool-submit-btn'): string {
  return `
    <button
      id="${id}"
      type="submit"
      class="group hero-cta-sm hero-cta-primary relative inline-flex h-10 items-center justify-center px-6 text-xs font-black uppercase leading-none text-black transition-all duration-200 hover:scale-[1.03] disabled:opacity-40 disabled:pointer-events-none overflow-hidden cursor-pointer shrink-0"
    >
      <span class="relative z-10 flex items-center justify-center gap-2 tracking-[0.16em]">${escapeHtml(label)}</span>
      <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
    </button>
  `;
}

function stopButton(id = 'tool-stop-btn'): string {
  return `
    <button
      id="${id}"
      type="button"
      disabled
      class="group hero-cta-sm hero-cta-danger relative inline-flex h-10 items-center justify-center px-5 text-xs font-black uppercase leading-none text-white transition-all duration-200 hover:scale-[1.03] disabled:opacity-35 disabled:pointer-events-none overflow-hidden cursor-pointer shrink-0"
    >
      <span class="relative z-10 flex items-center justify-center gap-1.5 tracking-[0.16em]">${renderIconSvg(Square, 12)} STOP</span>
      <div class="absolute inset-0 bg-white/15 translate-y-full group-hover:translate-y-0 transition-transform"></div>
    </button>
  `;
}

function sleepMs(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function computeClientPingStats(samples: PingSample[]) {
  const valid = samples.map((s) => s.rttMs).filter((v): v is number => v !== null);
  const transmitted = samples.length;
  const received = valid.length;
  const lossPercent = transmitted > 0 ? Math.round(((transmitted - received) / transmitted) * 10000) / 100 : 0;
  if (valid.length === 0) {
    return { transmitted, received, lossPercent, minMs: null, avgMs: null, maxMs: null, jitterMs: null };
  }
  const minMs = Math.round(Math.min(...valid) * 100) / 100;
  const maxMs = Math.round(Math.max(...valid) * 100) / 100;
  const avgMs = Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
  let jitterMs = 0;
  if (valid.length > 1) {
    let diff = 0;
    for (let i = 1; i < valid.length; i++) diff += Math.abs(valid[i] - valid[i - 1]);
    jitterMs = Math.round((diff / (valid.length - 1)) * 100) / 100;
  }
  return { transmitted, received, lossPercent, minMs, avgMs, maxMs, jitterMs };
}

// --- TOOL RENDERERS ---

interface ApiInfoResponse {
  client: ClientIpInfo;
  geo: GeoInfo | null;
  connection: {
    ip: string;
    family: string;
    userAgent: string;
    port: string;
    language: string;
    method: string;
    encoding: string;
    mime: string;
    via: string;
    forwarded: string;
    host: string;
  };
  headers: Record<string, string>;
}

function mountMyIp(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="font-fira text-xs text-[#858585]">Automatic dual-stack IPv4 &amp; IPv6 telemetry, ISP/ASN lookup, and HTTP request header inspection.</p>
      <button
        id="myip-refresh-btn"
        type="button"
        class="group hero-cta-sm hero-cta-primary relative inline-flex h-10 items-center justify-center px-5 text-xs font-black uppercase leading-none text-black transition-all duration-200 hover:scale-[1.03] overflow-hidden cursor-pointer shrink-0"
      >
        <span class="relative z-10 flex items-center justify-center gap-2 tracking-[0.16em]">REFRESH</span>
        <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
      </button>
    </div>
  `;

  let mapInstance: L.Map | null = null;
  let mapMarker: L.Marker | null = null;

  const disposeMap = () => {
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
      mapMarker = null;
    }
  };

  activeSpeedCleanup = disposeMap;

  const runProbe = async () => {
    activeAbort?.abort();
    disposeMap();
    const controller = new AbortController();
    activeAbort = controller;
    showLoading(outputEl, 'Detecting dual-stack IPv4 / IPv6 and network telemetry...');

    try {
      const info = await apiGet<ApiInfoResponse>('/api/info', controller.signal);
      const dual = await resolveDualStack(info.client.ip, info.client.family);
      const geoCache = new Map<string, GeoInfo | null>();
      geoCache.set(info.client.ip, info.geo);

      let activeFamily: 'IPv4' | 'IPv6' =
        dual.ipv4 ? 'IPv4' : dual.ipv6 ? 'IPv6' : info.client.family === 'IPv6' ? 'IPv6' : 'IPv4';

      const connRows: Array<[string, string]> = [
        ['Host', info.connection.host || '--'],
        ['IP Source', info.client.source],
        ['Remote Port', info.connection.port || '--'],
        ['User-Agent', info.connection.userAgent || '--'],
        ['Accept-Language', info.connection.language || '--'],
        ['Accept-Encoding', info.connection.encoding || '--'],
        ['Forwarded', info.connection.forwarded || '--'],
        ['Via', info.connection.via || '--'],
      ];

      const rawHeaderEntries = Object.entries(info.headers).sort(([a], [b]) => a.localeCompare(b));

      outputEl.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <article class="rounded-xl border border-[#f3eb2c]/25 bg-black/55 p-5 sm:p-6 flex flex-col justify-between gap-4 hover:border-[#f3eb2c]/60 transition-all duration-300">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded bg-[#f3eb2c]/15 border border-[#f3eb2c]/40 font-fira text-xs font-bold text-[#f3eb2c]">IPv4</span>
              ${dual.ipv4 ? `<button type="button" id="myip-copy-v4" class="px-3 py-1 rounded border border-[#f3eb2c]/40 bg-[#f3eb2c]/10 font-fira text-[10px] font-bold uppercase tracking-wider text-[#f3eb2c] hover:bg-[#f3eb2c]/20 cursor-pointer">COPY</button>` : ''}
            </div>
            <div class="font-fira text-2xl sm:text-3xl font-bold text-white break-all select-all">
              ${escapeHtml(dual.ipv4 ?? 'Not detected')}
            </div>
          </article>

          <article class="rounded-xl border border-[#00ffff]/25 bg-black/55 p-5 sm:p-6 flex flex-col justify-between gap-4 hover:border-[#00ffff]/60 transition-all duration-300">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded bg-[#00ffff]/15 border border-[#00ffff]/40 font-fira text-xs font-bold text-[#00ffff]">IPv6</span>
              ${dual.ipv6 ? `<button type="button" id="myip-copy-v6" class="px-3 py-1 rounded border border-[#00ffff]/40 bg-[#00ffff]/10 font-fira text-[10px] font-bold uppercase tracking-wider text-[#00ffff] hover:bg-[#00ffff]/20 cursor-pointer">COPY</button>` : ''}
            </div>
            <div class="font-fira text-lg sm:text-xl font-bold text-white break-all select-all">
              ${escapeHtml(dual.ipv6 ?? 'Not detected')}
            </div>
          </article>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">ISP / CARRIER</p>
            <p id="myip-summary-isp" class="mt-1 font-fira text-sm sm:text-base font-bold text-white truncate">--</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">ASN</p>
            <p id="myip-summary-asn" class="mt-1 font-fira text-sm sm:text-base font-bold text-[#f3eb2c] truncate">--</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">LOCATION</p>
            <p id="myip-summary-location" class="mt-1 font-fira text-sm sm:text-base font-bold text-white truncate">--</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] p-3.5">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">TIMEZONE</p>
            <p id="myip-summary-timezone" class="mt-1 font-fira text-sm sm:text-base font-bold text-[#00ffff] truncate">--</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="lg:col-span-7 rounded-xl border border-[#00ffff]/30 bg-black/60 overflow-hidden flex flex-col">
            <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-[#050505]">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#00ffff] shadow-[0_0_8px_#00ffff]"></span>
                <h3 class="font-fira text-xs uppercase tracking-[0.2em] text-white">MAP</h3>
              </div>
              <div class="flex items-center gap-3">
                <div class="inline-flex rounded-lg border border-white/10 bg-black/80 p-0.5 font-fira text-[11px]" role="group" aria-label="Select IP family for map">
                  <button id="myip-map-v4" type="button" class="px-2.5 py-1 rounded-md uppercase tracking-wider transition-colors cursor-pointer">IPv4</button>
                  <button id="myip-map-v6" type="button" class="px-2.5 py-1 rounded-md uppercase tracking-wider transition-colors cursor-pointer">IPv6</button>
                </div>
                <span id="myip-map-coords" class="font-fira text-xs text-[#00ffff]">-- , --</span>
              </div>
            </div>
            <div class="relative flex-1 min-h-[20rem] sm:min-h-[24rem] w-full bg-[#05070a]">
              <div id="myip-geo-map" class="h-full w-full z-0"></div>
              <div
                id="myip-map-empty"
                class="hidden absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-black/85 backdrop-blur-sm"
              >
                <p class="font-fira text-xs uppercase tracking-[0.2em] text-[#f3eb2c] mb-2">COORDINATES UNAVAILABLE</p>
                <p id="myip-map-empty-reason" class="text-sm text-[#aaa] max-w-sm">
                  Private or loopback addresses have no public geolocation coordinates.
                </p>
              </div>
            </div>
          </div>

          <div class="lg:col-span-5 rounded-xl border border-white/10 bg-[#050505] p-5 flex flex-col gap-3">
            <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 class="font-fira text-xs uppercase tracking-[0.2em] text-[#f3eb2c]">GEO &amp; ISP</h3>
              <span id="myip-inspected-ip" class="font-fira text-[11px] text-[#858585]">--</span>
            </div>
            <dl id="myip-geo-table" class="flex flex-col gap-2 font-fira text-xs"></dl>
          </div>
        </div>

        <div class="rounded-xl border border-white/10 bg-[#050505] p-5 flex flex-col gap-3">
          <h3 class="font-fira text-xs uppercase tracking-[0.2em] text-[#00ffff] border-b border-white/10 pb-2.5">HEADERS</h3>
          <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 font-fira text-xs">
            ${connRows
              .map(
                ([k, v]) =>
                  `<div class="flex justify-between gap-3 border-b border-white/5 pb-1.5"><dt class="text-[#858585] shrink-0">${escapeHtml(k)}</dt><dd class="text-white text-right break-all">${escapeHtml(v)}</dd></div>`,
              )
              .join('')}
          </dl>

          <details class="mt-1 group rounded-xl border border-white/10 bg-black/60 p-3.5">
            <summary class="cursor-pointer font-fira text-xs uppercase tracking-wider text-[#aaa] group-open:text-[#f3eb2c] select-none">
              RAW REQUEST HEADERS (${rawHeaderEntries.length})
            </summary>
            <dl class="mt-3 flex flex-col gap-1.5 font-fira text-[11px] border-t border-white/10 pt-3">
              ${rawHeaderEntries
                .map(
                  ([k, v]) =>
                    `<div class="flex justify-between gap-3"><dt class="text-[#00ffff] shrink-0">${escapeHtml(k)}</dt><dd class="text-[#ccc] text-right break-all">${escapeHtml(v)}</dd></div>`,
                )
                .join('')}
            </dl>
          </details>
        </div>
      `;

      const v4MapBtn = outputEl.querySelector<HTMLButtonElement>('#myip-map-v4')!;
      const v6MapBtn = outputEl.querySelector<HTMLButtonElement>('#myip-map-v6')!;
      const coordsEl = outputEl.querySelector<HTMLElement>('#myip-map-coords')!;
      const emptyOverlay = outputEl.querySelector<HTMLElement>('#myip-map-empty')!;
      const emptyReason = outputEl.querySelector<HTMLElement>('#myip-map-empty-reason')!;
      const mapEl = outputEl.querySelector<HTMLDivElement>('#myip-geo-map')!;

      const syncFamilyButtons = () => {
        v4MapBtn.disabled = !dual.ipv4;
        v6MapBtn.disabled = !dual.ipv6;
        const isV4 = activeFamily === 'IPv4';
        v4MapBtn.className = isV4
          ? 'px-2.5 py-1 rounded-md uppercase tracking-wider transition-colors bg-[#f3eb2c]/20 text-[#f3eb2c] font-bold cursor-pointer'
          : 'px-2.5 py-1 rounded-md uppercase tracking-wider transition-colors text-[#858585] hover:text-white disabled:opacity-35 disabled:pointer-events-none cursor-pointer';
        v6MapBtn.className = !isV4
          ? 'px-2.5 py-1 rounded-md uppercase tracking-wider transition-colors bg-[#00ffff]/20 text-[#00ffff] font-bold cursor-pointer'
          : 'px-2.5 py-1 rounded-md uppercase tracking-wider transition-colors text-[#858585] hover:text-white disabled:opacity-35 disabled:pointer-events-none cursor-pointer';
      };

      const renderMapAndGeo = (geo: GeoInfo | null) => {
        const locStr = [geo?.city, geo?.region, geo?.country].filter(Boolean).join(', ') || '--';
        outputEl.querySelector<HTMLElement>('#myip-summary-isp')!.textContent = geo?.isp ?? '--';
        outputEl.querySelector<HTMLElement>('#myip-summary-asn')!.textContent = geo?.asn ?? '--';
        outputEl.querySelector<HTMLElement>('#myip-summary-location')!.textContent = locStr;
        outputEl.querySelector<HTMLElement>('#myip-summary-timezone')!.textContent = geo?.timezone ?? '--';
        outputEl.querySelector<HTMLElement>('#myip-inspected-ip')!.textContent = geo?.ip ?? '--';

        const geoRows: Array<[string, string]> = [
          ['IP Address', geo?.ip ?? '--'],
          ['Protocol', geo?.family ?? '--'],
          ['ISP', geo?.isp ?? '--'],
          ['Organization', geo?.org ?? '--'],
          ['ASN', geo?.asn ?? '--'],
          ['City', geo?.city ?? '--'],
          ['Region', geo?.region ?? '--'],
          ['Country', geo?.country ? `${geo.country}${geo.countryCode ? ` (${geo.countryCode})` : ''}` : '--'],
          ['Postal', geo?.postal ?? '--'],
          ['Timezone', geo?.timezone ?? '--'],
          [
            'Coordinates',
            geo?.latitude !== null && geo?.latitude !== undefined && geo?.longitude !== null && geo?.longitude !== undefined
              ? `${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`
              : '--',
          ],
          ['Source', geo?.provider ?? '--'],
        ];

        outputEl.querySelector<HTMLElement>('#myip-geo-table')!.innerHTML = geoRows
          .map(
            ([k, v]) =>
              `<div class="flex justify-between gap-3 border-b border-white/5 pb-1.5"><dt class="text-[#858585] shrink-0">${escapeHtml(k)}</dt><dd class="text-white text-right break-all">${escapeHtml(v)}</dd></div>`,
          )
          .join('');

        if (!geo || typeof geo.latitude !== 'number' || typeof geo.longitude !== 'number') {
          coordsEl.textContent = '-- , --';
          emptyReason.textContent = geo?.localNetwork
            ? `Address ${geo.ip} is a local/private interface with no public geolocation coordinates.`
            : 'Geolocation coordinates were not returned for this IP address.';
          emptyOverlay.classList.remove('hidden');
          return;
        }

        emptyOverlay.classList.add('hidden');
        coordsEl.textContent = `${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`;

        if (!mapInstance) {
          mapInstance = L.map(mapEl, {
            zoomControl: true,
            scrollWheelZoom: false,
          }).setView([geo.latitude, geo.longitude], 10);

          L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
            {
              attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap contributors',
              maxZoom: 16,
            },
          ).addTo(mapInstance);
          L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
            { maxZoom: 16 },
          ).addTo(mapInstance);
        } else {
          mapInstance.setView([geo.latitude, geo.longitude], 10, { animate: true });
          mapInstance.invalidateSize();
        }

        const icon = L.divIcon({
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          html: '<div class="cyber-reticle"><div class="cyber-reticle-ring"></div><div class="cyber-reticle-core"></div></div>',
        });

        const popupText = `${geo.ip} — ${locStr}`;
        if (!mapMarker) {
          mapMarker = L.marker([geo.latitude, geo.longitude], { icon }).addTo(mapInstance);
        } else {
          mapMarker.setLatLng([geo.latitude, geo.longitude]);
        }
        mapMarker.bindPopup(popupText);
        setTimeout(() => mapInstance?.invalidateSize(), 100);
      };

      const selectFamily = async (family: 'IPv4' | 'IPv6') => {
        activeFamily = family;
        syncFamilyButtons();
        const ip = family === 'IPv4' ? dual.ipv4 : dual.ipv6;
        if (!ip) {
          renderMapAndGeo(info.geo);
          return;
        }
        if (geoCache.has(ip)) {
          renderMapAndGeo(geoCache.get(ip) ?? null);
          return;
        }
        try {
          const res = await apiGet<{ geo: GeoInfo | null }>(
            `/api/geo?target=${encodeURIComponent(ip)}`,
            controller.signal,
          );
          geoCache.set(ip, res.geo);
          renderMapAndGeo(res.geo);
        } catch {
          renderMapAndGeo(info.geo);
        }
      };

      v4MapBtn.addEventListener('click', () => void selectFamily('IPv4'));
      v6MapBtn.addEventListener('click', () => void selectFamily('IPv6'));

      const v4Btn = outputEl.querySelector<HTMLButtonElement>('#myip-copy-v4');
      if (v4Btn && dual.ipv4) {
        v4Btn.addEventListener('click', () => void copyText(dual.ipv4!, v4Btn, 'COPY'));
      }
      const v6Btn = outputEl.querySelector<HTMLButtonElement>('#myip-copy-v6');
      if (v6Btn && dual.ipv6) {
        v6Btn.addEventListener('click', () => void copyText(dual.ipv6!, v6Btn, 'COPY'));
      }

      await selectFamily(activeFamily);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        showError(outputEl, (err as Error).message);
      }
    }
  };

  controlsEl.querySelector<HTMLButtonElement>('#myip-refresh-btn')!.addEventListener('click', () => {
    void runProbe();
  });

  void runProbe();
}

function mountPing(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="tool-form" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div class="md:col-span-5">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Host or IP Address</label>
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. cloudflare.com or 1.1.1.1" value="cloudflare.com" required />
      </div>
      <div class="md:col-span-2">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Mode</label>
        <select id="ping-mode" class="cyber-select w-full">
          <option value="auto" selected>Auto (ICMP→TCP)</option>
          <option value="tcp">TCP Connect</option>
          <option value="icmp">ICMP Only</option>
        </select>
      </div>
      <div class="md:col-span-2">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Count</label>
        <select id="ping-count" class="cyber-select w-full">
          <option value="4" selected>4 probes</option>
          <option value="6">6 probes</option>
          <option value="10">10 probes</option>
        </select>
      </div>
      <div class="md:col-span-3 flex items-center justify-end gap-2">
        ${ctaButton('PING HOST')}
        ${stopButton()}
      </div>
    </form>
  `;

  const form = controlsEl.querySelector<HTMLFormElement>('#tool-form')!;
  const submitBtn = controlsEl.querySelector<HTMLButtonElement>('#tool-submit-btn')!;
  const stopBtn = controlsEl.querySelector<HTMLButtonElement>('#tool-stop-btn')!;

  stopBtn.addEventListener('click', () => {
    activeAbort?.abort();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const host = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!.value.trim();
    const mode = controlsEl.querySelector<HTMLSelectElement>('#ping-mode')!.value;
    const totalCount = Number(controlsEl.querySelector<HTMLSelectElement>('#ping-count')!.value);
    if (!host) return;

    activeAbort?.abort();
    const controller = new AbortController();
    activeAbort = controller;

    submitBtn.disabled = true;
    stopBtn.disabled = false;

    const samples: PingSample[] = [];
    const rawLines: string[] = [];
    let resolvedIp = '--';
    let methodLabel = mode.toUpperCase();
    let method: 'icmp' | 'tcp' = 'icmp';
    let port: number | null = null;
    let family = 'unknown';

    const renderLive = (inProgress: boolean, stopped = false) => {
      const stats = computeClientPingStats(samples);
      const maxBar = Math.max(...samples.map((s) => s.rttMs ?? 0), 1);

      const summaryLines = [...rawLines];
      if (!inProgress && samples.length > 0) {
        summaryLines.push(
          `--- ${host} ${method}-ping statistics ---`,
          `${stats.transmitted} probes transmitted, ${stats.received} received, ${stats.lossPercent}% loss${stopped ? ' (stopped)' : ''}`,
        );
        if (stats.minMs !== null && stats.avgMs !== null && stats.maxMs !== null) {
          summaryLines.push(
            `rtt min/avg/max/jitter = ${stats.minMs}/${stats.avgMs}/${stats.maxMs}/${stats.jitterMs ?? 0} ms`,
          );
        }
      }

      const jsonSummary = !inProgress
        ? {
            target: host,
            resolvedIp,
            family,
            method,
            port,
            ...stats,
            samples,
          }
        : undefined;

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          ${statCard('RESOLVED IP', resolvedIp, 'cyan')}
          ${statCard('METHOD', methodLabel, 'yellow')}
          ${statCard('AVG RTT', stats.avgMs !== null ? `${stats.avgMs} ms` : '--', 'white')}
          ${statCard('MIN / MAX', stats.minMs !== null ? `${stats.minMs} / ${stats.maxMs} ms` : '--', 'white')}
          ${statCard('JITTER', stats.jitterMs !== null ? `${stats.jitterMs} ms` : '--', 'cyan')}
          ${statCard('PACKET LOSS', `${stats.lossPercent}%`, stats.lossPercent === 0 ? 'green' : 'red')}
        </div>

        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-2.5">
          <div class="flex items-center justify-between font-fira text-[10px] uppercase tracking-[0.2em] text-[#858585]">
            <span>PROBE TIMELINE (${samples.length}/${totalCount})</span>
            ${
              inProgress
                ? `<span class="flex items-center gap-2 text-[#00ffff]"><span class="inline-block w-2 h-2 rounded-full bg-[#00ffff] animate-ping"></span>PROBING #${samples.length + 1}...</span>`
                : `<span class="${stopped ? 'text-[#f3eb2c]' : 'text-emerald-400'}">${stopped ? 'STOPPED' : 'COMPLETE'}</span>`
            }
          </div>
          ${samples
            .map((s) => {
              const pct = s.rttMs !== null ? Math.max(4, Math.round((s.rttMs / maxBar) * 100)) : 0;
              return `
                <div class="grid grid-cols-12 items-center gap-3 font-fira text-xs">
                  <span class="col-span-2 sm:col-span-1 text-[#858585]">#${s.seq}</span>
                  <div class="col-span-6 sm:col-span-8 h-2.5 rounded-full bg-white/5 overflow-hidden">
                    <div class="h-full rounded-full ${s.status === 'reply' ? 'bg-gradient-to-r from-[#f3eb2c] to-[#00ffff]' : 'bg-rose-500/70'}" style="width: ${s.status === 'reply' ? pct : 100}%"></div>
                  </div>
                  <span class="col-span-4 sm:col-span-3 text-right ${s.status === 'reply' ? 'text-white' : 'text-rose-400'}">
                    ${s.rttMs !== null ? `${s.rttMs.toFixed(2)} ms` : 'TIMEOUT'}
                  </span>
                </div>
              `;
            })
            .join('')}
        </div>

        ${rawOutputBlock('LIVE TERMINAL OUTPUT', summaryLines.join('\n') || `PING ${host}...`, jsonSummary)}
      `;

      if (!inProgress) {
        bindCopyButtons(outputEl, jsonSummary);
      }
    };

    renderLive(true);

    let stoppedByUser = false;
    try {
      for (let seq = 1; seq <= totalCount; seq++) {
        const data = await apiGet<PingResult>(
          `/api/ping?host=${encodeURIComponent(host)}&count=1&mode=${encodeURIComponent(mode)}&seq=${seq}`,
          controller.signal,
        );

        if (seq === 1) {
          resolvedIp = data.resolvedIp;
          method = data.method;
          port = data.port;
          family = data.family;
          methodLabel = data.method === 'tcp' ? `TCP:${data.port}` : 'ICMP';
          rawLines.push(
            data.method === 'tcp'
              ? `TCP PING ${data.target} (${data.resolvedIp}) port ${data.port} — ${totalCount} probes`
              : `PING ${data.target} (${data.resolvedIp}) — ${totalCount} probes`,
          );
        }

        const sample = data.samples[0];
        if (sample) {
          samples.push(sample);
          rawLines.push(
            sample.status === 'reply' && sample.rttMs !== null
              ? `seq=${sample.seq} from ${resolvedIp}${port ? `:${port}` : ''} time=${sample.rttMs.toFixed(2)} ms${sample.ttl ? ` ttl=${sample.ttl}` : ''}`
              : `seq=${sample.seq} ${resolvedIp} timeout (${sample.detail})`,
          );
        }

        renderLive(seq < totalCount);
        if (seq < totalCount) {
          await sleepMs(160, controller.signal);
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        stoppedByUser = true;
      } else {
        showError(outputEl, (err as Error).message);
        submitBtn.disabled = false;
        stopBtn.disabled = true;
        return;
      }
    } finally {
      submitBtn.disabled = false;
      stopBtn.disabled = true;
    }

    if (samples.length > 0) {
      renderLive(false, stoppedByUser);
    }
  });
}

function mountTraceroute(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="tool-form" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div class="md:col-span-7">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Destination Host or IP</label>
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. 1.1.1.1 or cloudflare.com" value="1.1.1.1" required />
      </div>
      <div class="md:col-span-2">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Max Hops</label>
        <select id="trace-hops" class="cyber-select w-full">
          <option value="12">12 hops</option>
          <option value="18" selected>18 hops</option>
          <option value="24">24 hops</option>
        </select>
      </div>
      <div class="md:col-span-3 flex items-center justify-end gap-2">
        ${ctaButton('TRACE ROUTE')}
        ${stopButton()}
      </div>
    </form>
  `;

  const form = controlsEl.querySelector<HTMLFormElement>('#tool-form')!;
  const submitBtn = controlsEl.querySelector<HTMLButtonElement>('#tool-submit-btn')!;
  const stopBtn = controlsEl.querySelector<HTMLButtonElement>('#tool-stop-btn')!;

  stopBtn.addEventListener('click', () => {
    activeAbort?.abort();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const host = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!.value.trim();
    const maxHops = Number(controlsEl.querySelector<HTMLSelectElement>('#trace-hops')!.value);
    if (!host) return;

    activeAbort?.abort();
    const controller = new AbortController();
    activeAbort = controller;

    submitBtn.disabled = true;
    stopBtn.disabled = false;

    const started = performance.now();
    const hops: TracerouteHop[] = [];
    const rawLines: string[] = [];
    let resolvedIp = '--';
    let family = 'unknown';
    let method: 'traceroute' | 'fallback' = 'traceroute';
    let completed = false;
    let note: string | null = null;
    let currentHop = 1;

    const renderLive = (inProgress: boolean, stopped = false) => {
      const elapsedMs = Math.round(performance.now() - started);
      const notice = note
        ? `<div class="rounded-xl border border-[#f3eb2c]/40 bg-[#f3eb2c]/10 p-3.5 font-fira text-xs text-[#f3eb2c]">${escapeHtml(note)}</div>`
        : '';

      const statusText = inProgress
        ? `HOP ${currentHop}...`
        : stopped
          ? 'STOPPED'
          : completed
            ? 'REACHED'
            : 'PARTIAL';
      const statusAccent: 'cyan' | 'yellow' | 'green' = inProgress
        ? 'cyan'
        : completed
          ? 'green'
          : 'yellow';

      const jsonSummary = !inProgress
        ? {
            target: host,
            resolvedIp,
            family,
            method,
            completed,
            note,
            hops,
            durationMs: elapsedMs,
          }
        : undefined;

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${statCard('DESTINATION IP', resolvedIp, 'cyan')}
          ${statCard('HOPS CAPTURED', String(hops.length), 'yellow')}
          ${statCard('STATUS', statusText, statusAccent)}
          ${statCard('ELAPSED', `${elapsedMs} ms`, 'white')}
        </div>
        ${notice}
        <div class="rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
          <table class="w-full text-left font-fira text-xs">
            <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-[#858585]">
              <tr>
                <th class="px-4 py-2.5">HOP</th>
                <th class="px-4 py-2.5">ROUTER / IP</th>
                <th class="px-4 py-2.5 text-right">RTT</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              ${hops
                .map(
                  (h) => `
                  <tr class="hover:bg-white/[0.02]">
                    <td class="px-4 py-2 text-[#f3eb2c] font-bold">${h.hop}</td>
                    <td class="px-4 py-2 ${h.timedOut ? 'text-[#666]' : h.address === resolvedIp ? 'text-emerald-300 font-semibold' : 'text-white'}">${escapeHtml(h.address ?? '* * * (request timed out)')}</td>
                    <td class="px-4 py-2 text-right ${h.rttMs !== null ? 'text-[#00ffff]' : 'text-[#666]'}">${h.rttMs !== null ? `${h.rttMs.toFixed(2)} ms` : '--'}</td>
                  </tr>
                `,
                )
                .join('')}
              ${
                inProgress
                  ? `<tr>
                      <td class="px-4 py-2 text-[#00ffff] font-bold">${currentHop}</td>
                      <td colspan="2" class="px-4 py-2 text-[#00ffff]">
                        <span class="inline-flex items-center gap-2"><span class="inline-block w-2 h-2 rounded-full bg-[#00ffff] animate-ping"></span>Probing hop ${currentHop}...</span>
                      </td>
                    </tr>`
                  : ''
              }
            </tbody>
          </table>
        </div>
        ${rawOutputBlock('LIVE TRACEROUTE OUTPUT', rawLines.join('\n') || `traceroute to ${host}, ${maxHops} hops max...`, jsonSummary)}
      `;

      if (!inProgress) {
        bindCopyButtons(outputEl, jsonSummary);
      }
    };

    renderLive(true);

    let stoppedByUser = false;
    let consecutiveTimeouts = 0;

    try {
      for (let hopNum = 1; hopNum <= maxHops; hopNum++) {
        currentHop = hopNum;
        renderLive(true);

        const data = await apiGet<SingleTracerouteHopResult>(
          `/api/traceroute?host=${encodeURIComponent(host)}&hop=${hopNum}`,
          controller.signal,
        );

        if (hopNum === 1) {
          resolvedIp = data.resolvedIp;
          family = data.family;
          method = data.method;
          note = data.note;
          rawLines.push(`traceroute to ${data.target} (${data.resolvedIp}), ${maxHops} hops max`);
          if (data.note) {
            rawLines.push(`[runtime notice] ${data.note}`);
          }
        }

        hops.push(data.hop);
        rawLines.push(data.hop.rawLine);

        if (data.hop.timedOut) {
          consecutiveTimeouts += 1;
        } else {
          consecutiveTimeouts = 0;
        }

        if (data.reached || data.method === 'fallback') {
          completed = !data.hop.timedOut;
          break;
        }

        // Stop early if destination firewall drops all probes for 4 hops in a row after hop 3
        if (hopNum >= 4 && consecutiveTimeouts >= 4) {
          break;
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        stoppedByUser = true;
      } else {
        showError(outputEl, (err as Error).message);
        submitBtn.disabled = false;
        stopBtn.disabled = true;
        return;
      }
    } finally {
      submitBtn.disabled = false;
      stopBtn.disabled = true;
    }

    renderLive(false, stoppedByUser);
  });
}

function mountDns(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="tool-form" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div class="md:col-span-6">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Domain Name</label>
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. justanother.engineer" value="cloudflare.com" required />
      </div>
      <div class="md:col-span-3">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Record Type</label>
        <select id="dns-type" class="cyber-select w-full">
          <option value="ALL" selected>ALL (A, AAAA, MX, NS, TXT...)</option>
          <option value="A">A (IPv4)</option>
          <option value="AAAA">AAAA (IPv6)</option>
          <option value="MX">MX (Mail)</option>
          <option value="NS">NS (Nameserver)</option>
          <option value="TXT">TXT</option>
          <option value="CNAME">CNAME</option>
          <option value="SOA">SOA</option>
          <option value="CAA">CAA</option>
          <option value="SRV">SRV</option>
          <option value="PTR">PTR</option>
        </select>
      </div>
      <div class="md:col-span-3 flex justify-end">
        ${ctaButton('LOOKUP DNS')}
      </div>
    </form>
  `;

  const form = controlsEl.querySelector<HTMLFormElement>('#tool-form')!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const host = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!.value.trim();
    const type = controlsEl.querySelector<HTMLSelectElement>('#dns-type')!.value;
    if (!host) return;

    activeAbort?.abort();
    activeAbort = new AbortController();
    showLoading(outputEl, `Querying ${type} DNS records for ${host}...`);

    try {
      const data = await apiGet<DnsLookupResult>(
        `/api/dns?host=${encodeURIComponent(host)}&type=${encodeURIComponent(type)}`,
        activeAbort.signal,
      );

      const rows =
        data.records.length > 0
          ? data.records
              .map(
                (r) => `
                <tr class="hover:bg-white/[0.02]">
                  <td class="px-4 py-2.5">
                    <span class="px-2 py-0.5 rounded bg-[#f3eb2c]/15 border border-[#f3eb2c]/35 text-[#f3eb2c] font-bold text-[10px]">${escapeHtml(r.type)}</span>
                  </td>
                  <td class="px-4 py-2.5 text-[#aaa]">${escapeHtml(r.name)}</td>
                  <td class="px-4 py-2.5 text-[#00ffff]">${r.ttl !== null ? `${r.ttl}s` : '--'}</td>
                  <td class="px-4 py-2.5 text-white break-all">${escapeHtml(r.data)}</td>
                </tr>
              `,
              )
              .join('')
          : `<tr><td colspan="4" class="px-4 py-6 text-center text-[#858585]">No ${escapeHtml(data.queryType)} records found for ${escapeHtml(data.host)}.</td></tr>`;

      const rawText = data.records
        .map((r) => `${r.name.padEnd(28)} ${String(r.ttl ?? '-').padEnd(6)} IN ${r.type.padEnd(6)} ${r.data}`)
        .join('\n');

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${statCard('DOMAIN', data.host, 'white')}
          ${statCard('RECORDS FOUND', String(data.records.length), 'yellow')}
          ${statCard('RESOLVER', data.resolver, 'cyan')}
          ${statCard('QUERY TIME', `${data.durationMs} ms`, 'white')}
        </div>
        <div class="rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
          <table class="w-full text-left font-fira text-xs">
            <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-[#858585]">
              <tr>
                <th class="px-4 py-2.5">TYPE</th>
                <th class="px-4 py-2.5">NAME</th>
                <th class="px-4 py-2.5">TTL</th>
                <th class="px-4 py-2.5">VALUE</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">${rows}</tbody>
          </table>
        </div>
        ${rawOutputBlock('ZONE FORMAT OUTPUT', rawText || '; No records returned', data)}
      `;
      bindCopyButtons(outputEl, data);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        showError(outputEl, (err as Error).message);
      }
    }
  });
}

function mountWhois(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="tool-form" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div class="md:col-span-9">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Domain Name or IP Address</label>
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. cloudflare.com or 1.1.1.1" value="cloudflare.com" required />
      </div>
      <div class="md:col-span-3 flex justify-end">
        ${ctaButton('WHOIS QUERY')}
      </div>
    </form>
  `;

  const form = controlsEl.querySelector<HTMLFormElement>('#tool-form')!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!.value.trim();
    if (!query) return;

    activeAbort?.abort();
    activeAbort = new AbortController();
    showLoading(outputEl, `Querying WHOIS / RDAP registry for ${query}...`);

    try {
      const data = await apiGet<WhoisResult>(
        `/api/whois?query=${encodeURIComponent(query)}`,
        activeAbort.signal,
      );
      const s = data.summary;

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${statCard('REGISTRY SERVER', data.server, 'cyan')}
          ${statCard('PROTOCOL', data.source.toUpperCase(), 'yellow')}
          ${statCard('REGISTRAR / ORG', s.registrar ?? s.organization ?? s.netName ?? '--', 'white')}
          ${statCard('QUERY TIME', `${data.durationMs} ms`, 'white')}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          ${statCard('CREATED', s.created ?? '--', 'white')}
          ${statCard('UPDATED', s.updated ?? '--', 'white')}
          ${statCard('EXPIRES', s.expires ?? '--', 'yellow')}
          ${statCard(data.kind === 'ip' ? 'CIDR / RANGE' : 'COUNTRY', (data.kind === 'ip' ? s.cidr : s.country) ?? '--', 'cyan')}
        </div>

        ${
          s.nameServers.length > 0
            ? `<div class="rounded-xl border border-white/10 bg-[#050505] p-4">
                <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-2">NAME SERVERS</p>
                <div class="flex flex-wrap gap-2">
                  ${s.nameServers.map((ns) => `<span class="px-2.5 py-1 rounded bg-[#00ffff]/10 border border-[#00ffff]/30 font-fira text-xs text-[#00ffff]">${escapeHtml(ns)}</span>`).join('')}
                </div>
              </div>`
            : ''
        }

        ${rawOutputBlock('RAW WHOIS / RDAP RECORD', data.raw, data)}
      `;
      bindCopyButtons(outputEl, data);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        showError(outputEl, (err as Error).message);
      }
    }
  });
}

function mountPort(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="tool-form" class="flex flex-col gap-3">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div class="md:col-span-5">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Host or IP Address</label>
          <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. cloudflare.com or 1.1.1.1" value="cloudflare.com" required />
        </div>
        <div class="md:col-span-4">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">TCP Port(s) (comma-separated, max 16)</label>
          <input id="port-list" type="text" class="cyber-input" placeholder="80, 443, 22" value="80, 443, 22, 53" required />
        </div>
        <div class="md:col-span-3 flex justify-end">
          ${ctaButton('CHECK PORTS')}
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2 font-fira text-[11px]">
        <span class="text-[#858585] uppercase tracking-wider">PRESETS:</span>
        <button type="button" data-port-preset="80,443,8080,8443" class="px-2.5 py-1 rounded border border-white/15 bg-[#050505] text-[#00ffff] hover:border-[#00ffff]/60 cursor-pointer">Web (80,443,8080,8443)</button>
        <button type="button" data-port-preset="25,110,143,465,587,993,995" class="px-2.5 py-1 rounded border border-white/15 bg-[#050505] text-[#00ffff] hover:border-[#00ffff]/60 cursor-pointer">Mail</button>
        <button type="button" data-port-preset="21,22,25,53,80,110,143,443,3306,5432,6379,8080" class="px-2.5 py-1 rounded border border-white/15 bg-[#050505] text-[#f3eb2c] hover:border-[#f3eb2c]/60 cursor-pointer">Top 12 Common</button>
      </div>
    </form>
  `;

  controlsEl.querySelectorAll<HTMLButtonElement>('[data-port-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      controlsEl.querySelector<HTMLInputElement>('#port-list')!.value = btn.dataset.portPreset ?? '80,443';
    });
  });

  const form = controlsEl.querySelector<HTMLFormElement>('#tool-form')!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const host = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!.value.trim();
    const ports = controlsEl.querySelector<HTMLInputElement>('#port-list')!.value.trim();
    if (!host || !ports) return;

    activeAbort?.abort();
    activeAbort = new AbortController();
    showLoading(outputEl, `Probing TCP ports [${ports}] on ${host}...`);

    try {
      const data = await apiGet<PortCheckResult>(
        `/api/port?host=${encodeURIComponent(host)}&ports=${encodeURIComponent(ports)}`,
        activeAbort.signal,
      );
      const openCount = data.results.filter((r) => r.status === 'open').length;

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${statCard('RESOLVED IP', data.resolvedIp, 'cyan')}
          ${statCard('PORTS TESTED', String(data.results.length), 'white')}
          ${statCard('OPEN PORTS', String(openCount), openCount > 0 ? 'green' : 'yellow')}
          ${statCard('SCAN TIME', `${data.durationMs} ms`, 'white')}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          ${data.results
            .map((r) => {
              const badge =
                r.status === 'open'
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                  : r.status === 'closed'
                    ? 'bg-[#f3eb2c]/15 border-[#f3eb2c]/40 text-[#f3eb2c]'
                    : 'bg-rose-500/15 border-rose-400/40 text-rose-300';
              return `
                <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex items-center justify-between gap-3">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-fira text-base font-bold text-white">:${r.port}</span>
                      <span class="font-fira text-[11px] text-[#858585]">${escapeHtml(r.service)}</span>
                    </div>
                    <p class="font-fira text-[11px] text-[#858585] mt-1">${escapeHtml(r.detail)}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <span class="inline-block px-2 py-0.5 rounded border font-fira text-[10px] font-bold uppercase ${badge}">${r.status}</span>
                    <div class="font-fira text-[11px] text-[#00ffff] mt-1">${r.latencyMs !== null ? `${r.latencyMs} ms` : '--'}</div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        showError(outputEl, (err as Error).message);
      }
    }
  });
}

function mountReverse(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="tool-form" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div class="md:col-span-9">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">IPv4 or IPv6 Address</label>
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. 1.1.1.1 or 8.8.8.8" value="${escapeHtml(visitorIp || '1.1.1.1')}" required />
      </div>
      <div class="md:col-span-3 flex justify-end">
        ${ctaButton('REVERSE DNS')}
      </div>
    </form>
  `;

  const form = controlsEl.querySelector<HTMLFormElement>('#tool-form')!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ip = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!.value.trim();
    if (!ip) return;

    activeAbort?.abort();
    activeAbort = new AbortController();
    showLoading(outputEl, `Resolving PTR record for ${ip}...`);

    try {
      const data = await apiGet<ReverseLookupResult>(
        `/api/reverse?ip=${encodeURIComponent(ip)}`,
        activeAbort.signal,
      );

      outputEl.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          ${statCard('IP ADDRESS', data.ip, 'cyan')}
          ${statCard('PTR RECORDS', String(data.hostnames.length), data.hostnames.length > 0 ? 'yellow' : 'red')}
          ${statCard('QUERY TIME', `${data.durationMs} ms`, 'white')}
        </div>

        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-3">
          <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">ARPA QUERY: <span class="text-[#00ffff]">${escapeHtml(data.arpaName)}</span></p>
          ${
            data.forwardConfirmed.length > 0
              ? data.forwardConfirmed
                  .map(
                    (item) => `
                    <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/60 px-4 py-3 font-fira text-xs">
                      <div>
                        <div class="text-white font-bold">${escapeHtml(item.hostname)}</div>
                        <div class="text-[11px] text-[#858585] mt-0.5">Forward: ${escapeHtml(item.resolvedIps.join(', ') || 'none')}</div>
                      </div>
                      <span class="px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase ${item.matches ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300' : 'bg-[#f3eb2c]/15 border-[#f3eb2c]/40 text-[#f3eb2c]'}">
                        ${item.matches ? 'FCrDNS VERIFIED' : 'NO FORWARD MATCH'}
                      </span>
                    </div>
                  `,
                  )
                  .join('')
              : `<p class="font-fira text-xs text-[#858585]">No PTR record configured for ${escapeHtml(data.ip)}.</p>`
          }
        </div>
      `;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        showError(outputEl, (err as Error).message);
      }
    }
  });
}

function mountProxy(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="tool-form" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div class="md:col-span-9">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">IP Address (leave blank to inspect your connection)</label>
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="Leave blank for your IP, or enter an IPv4/IPv6" value="${escapeHtml(visitorIp)}" />
      </div>
      <div class="md:col-span-3 flex justify-end">
        ${ctaButton('CHECK PROXY')}
      </div>
    </form>
  `;

  const form = controlsEl.querySelector<HTMLFormElement>('#tool-form')!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ip = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!.value.trim();

    activeAbort?.abort();
    activeAbort = new AbortController();
    showLoading(outputEl, `Running proxy header, open port, and ASN diagnostics...`);

    try {
      const qs = ip ? `?ip=${encodeURIComponent(ip)}` : '';
      const data = await apiGet<ProxyCheckResult>(`/api/proxy${qs}`, activeAbort.signal);

      const riskAccent = data.riskLevel === 'high' ? 'red' : data.riskLevel === 'medium' ? 'yellow' : 'green';

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${statCard('INSPECTED IP', data.ip, 'cyan')}
          ${statCard('VERDICT', data.verdict.toUpperCase().replaceAll('-', ' '), riskAccent)}
          ${statCard('RISK LEVEL', data.riskLevel.toUpperCase(), riskAccent)}
          ${statCard('OPEN PROXY PORTS', String(data.openProxyPorts.length), data.openProxyPorts.length > 0 ? 'red' : 'green')}
        </div>

        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 font-fira text-xs text-white">
          ${escapeHtml(data.summary)}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="rounded-xl border border-white/10 bg-[#050505] p-4">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#f3eb2c] mb-3">DETECTED FORWARDING HEADERS</p>
            ${
              data.detectedHeaders.length > 0
                ? `<dl class="flex flex-col gap-2 font-fira text-xs">
                    ${data.detectedHeaders
                      .map(
                        (h) =>
                          `<div class="flex justify-between gap-3 border-b border-white/5 pb-1.5"><dt class="text-[#858585]">${escapeHtml(h.header)}</dt><dd class="text-white text-right break-all">${escapeHtml(h.value)}</dd></div>`,
                      )
                      .join('')}
                  </dl>`
                : `<p class="font-fira text-xs text-[#858585]">None detected (or checking a remote IP).</p>`
            }
          </div>

          <div class="rounded-xl border border-white/10 bg-[#050505] p-4">
            <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#00ffff] mb-3">NETWORK &amp; ASN SIGNALS</p>
            <dl class="flex flex-col gap-2 font-fira text-xs">
              <div class="flex justify-between gap-3 border-b border-white/5 pb-1.5"><dt class="text-[#858585]">ISP / Org</dt><dd class="text-white text-right">${escapeHtml(data.geo?.isp ?? data.geo?.org ?? '--')}</dd></div>
              <div class="flex justify-between gap-3 border-b border-white/5 pb-1.5"><dt class="text-[#858585]">ASN</dt><dd class="text-[#f3eb2c] text-right">${escapeHtml(data.geo?.asn ?? '--')}</dd></div>
              <div class="flex justify-between gap-3 border-b border-white/5 pb-1.5"><dt class="text-[#858585]">Location</dt><dd class="text-white text-right">${escapeHtml([data.geo?.city, data.geo?.country].filter(Boolean).join(', ') || '--')}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-[#858585]">Reverse DNS</dt><dd class="text-[#00ffff] text-right break-all">${escapeHtml(data.reverseHostnames.join(', ') || '--')}</dd></div>
            </dl>
          </div>
        </div>
      `;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        showError(outputEl, (err as Error).message);
      }
    }
  });
}

function mountGeo(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="tool-form" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div class="md:col-span-9">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">IP Address or Domain</label>
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. 1.1.1.1 or github.com (blank = your IP)" value="${escapeHtml(visitorIp || '1.1.1.1')}" />
      </div>
      <div class="md:col-span-3 flex justify-end">
        ${ctaButton('LOCATE IP')}
      </div>
    </form>
  `;

  const form = controlsEl.querySelector<HTMLFormElement>('#tool-form')!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const target = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!.value.trim();

    activeAbort?.abort();
    activeAbort = new AbortController();
    showLoading(outputEl, `Looking up geolocation & ASN for ${target || 'your IP'}...`);

    try {
      const qs = target ? `?target=${encodeURIComponent(target)}` : '';
      const data = await apiGet<{ target: string; resolvedIp: string; geo: GeoInfo | null }>(
        `/api/geo${qs}`,
        activeAbort.signal,
      );
      const g = data.geo;

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${statCard('IP ADDRESS', data.resolvedIp, 'cyan')}
          ${statCard('COUNTRY', g?.country ? `${g.country}${g.countryCode ? ` (${g.countryCode})` : ''}` : '--', 'yellow')}
          ${statCard('CITY / REGION', [g?.city, g?.region].filter(Boolean).join(', ') || '--', 'white')}
          ${statCard('ASN', g?.asn ?? '--', 'cyan')}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          ${statCard('ISP', g?.isp ?? '--', 'white')}
          ${statCard('ORGANIZATION', g?.org ?? '--', 'white')}
          ${statCard('TIMEZONE', g?.timezone ?? '--', 'cyan')}
          ${statCard('COORDINATES', g?.latitude !== null && g?.latitude !== undefined && g?.longitude !== null && g?.longitude !== undefined ? `${g.latitude.toFixed(4)}, ${g.longitude.toFixed(4)}` : '--', 'yellow')}
        </div>

        ${rawOutputBlock('GEO TELEMETRY JSON', JSON.stringify(data, null, 2), data)}
      `;
      bindCopyButtons(outputEl, data);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        showError(outputEl, (err as Error).message);
      }
    }
  });
}

function mountBandwidth(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  const regionNodes = resolveRegionNodes({ currentOrigin: window.location.origin });
  const selectedRegions = new Set<PrismaRegion>(['eu-central-1']);
  let selectedMode: TestSequenceMode = 'auto';
  let selectedDurationSec: number | null = 20;
  let latestTimeline: ChartSample[] = [];
  const latestNodeMetrics = new Map<PrismaRegion, NodeMetrics>();
  const latestLatencyMap = new Map<PrismaRegion, { latencyMs: number | null; reachable: boolean }>();
  const controller = new SpeedTestController();

  controlsEl.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2 sm:gap-3">
        <div class="inline-flex rounded-lg border border-white/10 bg-[#050505] p-0.5 font-fira text-[11px]" role="group" aria-label="Test direction">
          <button type="button" data-speed-mode="auto" class="speed-mode-btn px-2.5 py-1 rounded-md uppercase tracking-wider cursor-pointer transition-colors">BOTH</button>
          <button type="button" data-speed-mode="download" class="speed-mode-btn px-2.5 py-1 rounded-md uppercase tracking-wider cursor-pointer transition-colors">DOWNLOAD</button>
          <button type="button" data-speed-mode="upload" class="speed-mode-btn px-2.5 py-1 rounded-md uppercase tracking-wider cursor-pointer transition-colors">UPLOAD</button>
        </div>

        <div class="inline-flex rounded-lg border border-white/10 bg-[#050505] p-0.5 font-fira text-[11px]" role="group" aria-label="Test duration">
          <button type="button" data-speed-dur="10" class="speed-dur-btn px-2 py-1 rounded-md cursor-pointer transition-colors">10s</button>
          <button type="button" data-speed-dur="20" class="speed-dur-btn px-2 py-1 rounded-md cursor-pointer transition-colors">20s</button>
          <button type="button" data-speed-dur="30" class="speed-dur-btn px-2 py-1 rounded-md cursor-pointer transition-colors">30s</button>
          <button type="button" data-speed-dur="60" class="speed-dur-btn px-2 py-1 rounded-md cursor-pointer transition-colors">60s</button>
          <button type="button" data-speed-dur="infinite" class="speed-dur-btn px-2 py-1 rounded-md cursor-pointer transition-colors">∞</button>
        </div>

        <button
          id="sp-select-all"
          type="button"
          class="px-2.5 py-1.5 rounded-lg border border-white/15 bg-[#050505] font-fira text-[11px] uppercase tracking-wider text-[#00ffff] hover:border-[#00ffff]/60 transition-colors cursor-pointer"
        >
          ALL 6
        </button>
      </div>

      <div class="flex items-center gap-2.5">
        <span id="sp-timer" class="font-fira text-xs text-[#858585]">00:00 / 00:20</span>
        <button
          id="sp-start-btn"
          type="button"
          class="group hero-cta-sm hero-cta-primary relative inline-flex h-10 items-center justify-center px-5 text-xs font-black uppercase leading-none text-black transition-all duration-200 hover:scale-[1.03] disabled:opacity-40 disabled:pointer-events-none overflow-hidden cursor-pointer"
        >
          <span class="relative z-10 flex items-center justify-center gap-2 tracking-[0.16em]">${renderIconSvg(Play, 13)} START</span>
          <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
        </button>
        <button
          id="sp-stop-btn"
          type="button"
          disabled
          class="group hero-cta-sm hero-cta-danger relative inline-flex h-10 items-center justify-center px-4 text-xs font-black uppercase leading-none text-white transition-all duration-200 hover:scale-[1.03] disabled:opacity-35 disabled:pointer-events-none overflow-hidden cursor-pointer"
        >
          <span class="relative z-10 flex items-center justify-center gap-1.5 tracking-[0.16em]">${renderIconSvg(Square, 12)} STOP</span>
          <div class="absolute inset-0 bg-white/15 translate-y-full group-hover:translate-y-0 transition-transform"></div>
        </button>
      </div>
    </div>
  `;

  outputEl.innerHTML = `
    <div class="rounded-xl border border-[#00ffff]/30 bg-[#030508] overflow-hidden flex flex-col">
      <div class="h-1 w-full bg-white/5 overflow-hidden">
        <div id="sp-progress" class="h-full w-0 bg-gradient-to-r from-[#f3eb2c] to-[#00ffff] transition-all duration-150"></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 bg-[#030508]">
        <div class="lg:col-span-7 relative w-full h-[280px] sm:h-[360px] lg:h-[440px] bg-[#030508] border-b lg:border-b-0 lg:border-r border-white/10">
          <div id="three-topology" class="relative w-full h-full overflow-hidden"></div>
          <div class="pointer-events-none absolute top-3 left-3 px-2.5 py-1 rounded bg-black/75 border border-white/10 font-fira text-[10px] uppercase tracking-wider text-[#aaa]">
            CLICK 3D NODES TO TOGGLE REGIONS
          </div>
        </div>

        <div class="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between gap-4 bg-black/40">
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-[#00ffff]/35 bg-[#050505] p-3.5">
              <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">DOWNLOAD</p>
              <p id="sp-dl" class="mt-1 font-fira text-xl sm:text-2xl font-bold text-[#00ffff]">0.00 <span class="text-xs font-normal text-[#858585]">Mbps</span></p>
            </div>
            <div class="rounded-xl border border-[#f3eb2c]/35 bg-[#050505] p-3.5">
              <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">UPLOAD</p>
              <p id="sp-ul" class="mt-1 font-fira text-xl sm:text-2xl font-bold text-[#f3eb2c]">0.00 <span class="text-xs font-normal text-[#858585]">Mbps</span></p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2.5">
            <div class="rounded-xl border border-white/10 bg-[#050505] p-3">
              <p class="font-fira text-[9px] uppercase tracking-[0.16em] text-[#858585]">LATENCY</p>
              <p id="sp-lat" class="mt-1 font-fira text-sm font-bold text-white">-- <span class="text-[10px] font-normal text-[#858585]">ms</span></p>
            </div>
            <div class="rounded-xl border border-white/10 bg-[#050505] p-3">
              <p class="font-fira text-[9px] uppercase tracking-[0.16em] text-[#858585]">JITTER</p>
              <p id="sp-jit" class="mt-1 font-fira text-sm font-bold text-[#00ffff]">-- <span class="text-[10px] font-normal text-[#858585]">ms</span></p>
            </div>
            <div class="rounded-xl border border-white/10 bg-[#050505] p-3">
              <p class="font-fira text-[9px] uppercase tracking-[0.16em] text-[#858585]">LOSS</p>
              <p id="sp-loss" class="mt-1 font-fira text-sm font-bold text-emerald-400">0.0<span class="text-[10px] font-normal text-[#858585]">%</span></p>
            </div>
          </div>

          <div id="sp-chart-wrap" class="flex-1 min-h-[160px] rounded-xl border border-white/10 bg-[#050505] p-3 flex flex-col gap-2">
            <div class="flex items-center justify-between font-fira text-[10px] uppercase tracking-[0.16em]">
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1 text-[#00ffff]"><span class="w-2 h-2 rounded-full bg-[#00ffff]"></span>DL</span>
                <span class="flex items-center gap-1 text-[#f3eb2c]"><span class="w-2 h-2 rounded-full bg-[#f3eb2c]"></span>UL</span>
              </div>
              <span id="sp-phase" class="text-[#858585]">READY</span>
            </div>
            <canvas id="sp-chart" class="w-full flex-1 block"></canvas>
          </div>
        </div>
      </div>
    </div>

    <div id="sp-report-section" class="hidden rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
      <table class="w-full text-left font-fira text-xs">
        <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.16em] text-[#858585]">
          <tr>
            <th class="px-4 py-2.5">NODE</th>
            <th class="px-3 py-2.5">LATENCY (MIN/MAX/AVG)</th>
            <th class="px-3 py-2.5">JITTER</th>
            <th class="px-3 py-2.5">LOSS</th>
            <th class="px-3 py-2.5">DOWNLOAD</th>
            <th class="px-3 py-2.5">UPLOAD</th>
            <th class="px-3 py-2.5">DATA</th>
            <th class="px-4 py-2.5 text-right">STATUS</th>
          </tr>
        </thead>
        <tbody id="sp-report-body" class="divide-y divide-white/5"></tbody>
      </table>
    </div>
  `;

  const topoContainer = outputEl.querySelector<HTMLDivElement>('#three-topology')!;
  const chartWrap = outputEl.querySelector<HTMLElement>('#sp-chart-wrap')!;
  const canvas = outputEl.querySelector<HTMLCanvasElement>('#sp-chart')!;
  const timerEl = controlsEl.querySelector<HTMLElement>('#sp-timer')!;
  const progressBar = outputEl.querySelector<HTMLElement>('#sp-progress')!;
  const dlEl = outputEl.querySelector<HTMLElement>('#sp-dl')!;
  const ulEl = outputEl.querySelector<HTMLElement>('#sp-ul')!;
  const latEl = outputEl.querySelector<HTMLElement>('#sp-lat')!;
  const jitEl = outputEl.querySelector<HTMLElement>('#sp-jit')!;
  const lossEl = outputEl.querySelector<HTMLElement>('#sp-loss')!;
  const phaseEl = outputEl.querySelector<HTMLElement>('#sp-phase')!;
  const reportSection = outputEl.querySelector<HTMLElement>('#sp-report-section')!;
  const reportBody = outputEl.querySelector<HTMLElement>('#sp-report-body')!;
  const startBtn = controlsEl.querySelector<HTMLButtonElement>('#sp-start-btn')!;
  const stopBtn = controlsEl.querySelector<HTMLButtonElement>('#sp-stop-btn')!;
  const selectAllBtn = controlsEl.querySelector<HTMLButtonElement>('#sp-select-all')!;

  const getTargets = (): SpeedTargetNode[] => {
    const targets: SpeedTargetNode[] = [];
    for (const id of selectedRegions) {
      const node = regionNodes.find((n) => n.id === id);
      if (!node || !node.url) continue;
      targets.push({
        regionId: node.id,
        label: node.label,
        shortCode: node.shortCode,
        endpointUrl: node.url,
        isLocalFallback: false,
      });
    }
    return targets;
  };

  let topology3D: SpeedTopology3D | null = null;

  const syncAllNodes = () => {
    if (!topology3D) return;
    for (const node of regionNodes) {
      const probe = latestLatencyMap.get(node.id);
      const live = latestNodeMetrics.get(node.id);
      topology3D.updateNodeState(node.id, {
        selected: selectedRegions.has(node.id),
        hasUrl: Boolean(node.url),
        isLocalFallback: false,
        reachable: probe ? probe.reachable : null,
        status: live ? live.status : 'idle',
        latencyMs: live?.latencyAvgMs ?? probe?.latencyMs ?? null,
        downloadMbps: live?.downloadCurrentMbps ?? 0,
        uploadMbps: live?.uploadCurrentMbps ?? 0,
      });
    }
  };

  const syncButtons = () => {
    const running = controller.isRunning();
    startBtn.disabled = running || getTargets().length === 0;
    stopBtn.disabled = !running;
    selectAllBtn.textContent = selectedRegions.size === regionNodes.length ? 'ONLY FRA' : 'ALL 6';

    controlsEl.querySelectorAll<HTMLButtonElement>('.speed-mode-btn').forEach((btn) => {
      const active = btn.dataset.speedMode === selectedMode;
      btn.className = active
        ? 'speed-mode-btn px-2.5 py-1 rounded-md uppercase tracking-wider cursor-pointer transition-colors bg-[#f3eb2c]/20 text-[#f3eb2c] font-bold'
        : 'speed-mode-btn px-2.5 py-1 rounded-md uppercase tracking-wider cursor-pointer transition-colors text-[#858585] hover:text-white';
    });

    controlsEl.querySelectorAll<HTMLButtonElement>('.speed-dur-btn').forEach((btn) => {
      const raw = btn.dataset.speedDur;
      const val = raw === 'infinite' ? null : Number(raw);
      const active = val === selectedDurationSec;
      btn.className = active
        ? 'speed-dur-btn px-2 py-1 rounded-md cursor-pointer transition-colors bg-[#00ffff]/20 text-[#00ffff] font-bold'
        : 'speed-dur-btn px-2 py-1 rounded-md cursor-pointer transition-colors text-[#858585] hover:text-white';
    });

    if (!running) {
      timerEl.textContent =
        selectedDurationSec === null ? '00:00 / ∞' : `00:00 / ${formatSpeedDuration(selectedDurationSec)}`;
    }
  };

  const toggleRegion = (regionId: PrismaRegion) => {
    if (controller.isRunning()) return;
    if (selectedRegions.has(regionId)) {
      selectedRegions.delete(regionId);
    } else {
      selectedRegions.add(regionId);
    }
    syncAllNodes();
    syncButtons();
  };

  try {
    topology3D = new SpeedTopology3D(topoContainer, regionNodes, {
      onToggleRegion: toggleRegion,
    });
  } catch {
    topoContainer.innerHTML =
      '<div class="h-full flex items-center justify-center p-6 font-fira text-xs text-[#858585]">WebGL 3D topology unavailable in this browser.</div>';
  }

  const handleSnapshot = (snap: SpeedTestSnapshot) => {
    for (const m of snap.nodes) {
      latestNodeMetrics.set(m.regionId, m);
      if (m.latencyAvgMs !== null || m.status === 'error') {
        latestLatencyMap.set(m.regionId, {
          latencyMs: m.latencyAvgMs,
          reachable: m.status !== 'error',
        });
      }
    }

    timerEl.textContent =
      snap.configuredDurationSec === null
        ? `${formatSpeedDuration(snap.elapsedSec)} / ∞`
        : `${formatSpeedDuration(snap.elapsedSec)} / ${formatSpeedDuration(snap.configuredDurationSec)}`;

    if (snap.configuredDurationSec !== null && snap.configuredDurationSec > 0) {
      const pct = Math.min(100, (snap.elapsedSec / snap.configuredDurationSec) * 100);
      progressBar.style.width = `${pct.toFixed(1)}%`;
    } else if (snap.running) {
      progressBar.style.width = '100%';
    }

    const agg = snap.aggregate;
    const dlVal = snap.running && snap.phase === 'downloading' ? agg.downloadCurrentMbps : agg.downloadAvgMbps;
    const ulVal = snap.running && snap.phase === 'uploading' ? agg.uploadCurrentMbps : agg.uploadAvgMbps;

    const unit = (u: string) => `<span class="text-xs font-normal text-[#858585]">${u}</span>`;
    dlEl.innerHTML = `${formatMbpsNumber(dlVal)} ${unit('Mbps')}`;
    ulEl.innerHTML = `${formatMbpsNumber(ulVal)} ${unit('Mbps')}`;
    latEl.innerHTML = `${agg.avgLatencyMs !== null ? agg.avgLatencyMs.toFixed(1) : '--'} <span class="text-[10px] font-normal text-[#858585]">ms</span>`;
    jitEl.innerHTML = `${agg.jitterMs !== null ? agg.jitterMs.toFixed(1) : '--'} <span class="text-[10px] font-normal text-[#858585]">ms</span>`;
    lossEl.innerHTML = `${agg.packetLossPct.toFixed(1)}<span class="text-[10px] font-normal text-[#858585]">%</span>`;
    lossEl.className = `mt-1 font-fira text-sm font-bold ${agg.packetLossPct > 0 ? 'text-[#ff3b5c]' : 'text-emerald-400'}`;

    phaseEl.textContent = snap.phase.toUpperCase();
    phaseEl.className =
      snap.phase === 'completed'
        ? 'text-emerald-400'
        : snap.phase === 'stopped'
          ? 'text-[#f3eb2c]'
          : 'text-[#00ffff]';

    latestTimeline = snap.timeline;
    renderThroughputChart(canvas, latestTimeline);
    syncAllNodes();
    syncButtons();
  };

  const renderSpeedReport = (report: SpeedTestReport) => {
    reportSection.classList.remove('hidden');
    reportBody.innerHTML = report.nodes
      .map(
        (n) => `
        <tr class="hover:bg-white/[0.02]">
          <td class="px-4 py-2.5 text-white font-bold">${escapeHtml(n.shortCode)} <span class="text-[#858585] font-normal">${escapeHtml(n.regionId)}</span></td>
          <td class="px-3 py-2.5 text-white">${escapeHtml(formatMsTriple(n.latencyMinMs, n.latencyMaxMs, n.latencyAvgMs))}</td>
          <td class="px-3 py-2.5 text-[#aaa]">${escapeHtml(formatMsTriple(n.jitterMinMs, n.jitterMaxMs, n.jitterMs))}</td>
          <td class="px-3 py-2.5 ${n.packetLossPct > 0 ? 'text-[#ff3b5c]' : 'text-[#00ffff]'}">${n.packetLossPct.toFixed(1)}% (${n.probesLost}/${n.probesSent})</td>
          <td class="px-3 py-2.5 text-[#00ffff]">${escapeHtml(formatMbpsTriple(n.downloadMinMbps, n.downloadPeakMbps, n.downloadAvgMbps))}</td>
          <td class="px-3 py-2.5 text-[#f3eb2c]">${escapeHtml(formatMbpsTriple(n.uploadMinMbps, n.uploadPeakMbps, n.uploadAvgMbps))}</td>
          <td class="px-3 py-2.5 text-white">${escapeHtml(formatBytes(n.downloadBytes + n.uploadBytes))}</td>
          <td class="px-4 py-2.5 text-right uppercase ${n.status === 'error' ? 'text-[#ff3b5c]' : 'text-[#aaa]'}">${escapeHtml(n.errorMessage ?? n.status)}</td>
        </tr>
      `,
      )
      .join('');
  };

  controlsEl.querySelectorAll<HTMLButtonElement>('.speed-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (controller.isRunning()) return;
      selectedMode = btn.dataset.speedMode as TestSequenceMode;
      syncButtons();
    });
  });

  controlsEl.querySelectorAll<HTMLButtonElement>('.speed-dur-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (controller.isRunning()) return;
      const raw = btn.dataset.speedDur;
      selectedDurationSec = raw === 'infinite' ? null : Number(raw);
      syncButtons();
    });
  });

  selectAllBtn.addEventListener('click', () => {
    if (controller.isRunning()) return;
    if (selectedRegions.size === regionNodes.length) {
      selectedRegions.clear();
      selectedRegions.add('eu-central-1');
    } else {
      for (const n of regionNodes) {
        if (n.url) selectedRegions.add(n.id);
      }
    }
    syncAllNodes();
    syncButtons();
  });

  startBtn.addEventListener('click', () => {
    if (controller.isRunning()) return;
    const targets = getTargets();
    if (targets.length === 0) return;

    latestNodeMetrics.clear();
    latestTimeline = [];
    progressBar.style.width = '0%';
    renderThroughputChart(canvas, latestTimeline);
    reportSection.classList.add('hidden');

    controller.start({
      targets,
      mode: selectedMode,
      durationSec: selectedDurationSec,
      onUpdate: handleSnapshot,
      onComplete: (report) => {
        syncButtons();
        renderSpeedReport(report);
      },
    });
    syncButtons();
  });

  stopBtn.addEventListener('click', () => {
    controller.stop('stopped_by_user');
  });

  const resizeObserver = new ResizeObserver(() => {
    renderThroughputChart(canvas, latestTimeline);
  });
  resizeObserver.observe(chartWrap);

  syncAllNodes();
  syncButtons();
  renderThroughputChart(canvas, latestTimeline);

  activeSpeedCleanup = () => {
    controller.stop('stopped_by_user');
    resizeObserver.disconnect();
    topology3D?.dispose();
    topology3D = null;
  };
}

function mountSubnet(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="tool-form" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div class="md:col-span-6">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">IP Address or CIDR</label>
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. 192.168.1.10/24 or 2001:db8::1/64" value="192.168.1.10/24" required />
      </div>
      <div class="md:col-span-3">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Optional Mask / Prefix</label>
        <input id="subnet-mask" type="text" class="cyber-input" placeholder="e.g. 255.255.255.0 or 64" />
      </div>
      <div class="md:col-span-3 flex justify-end">
        ${ctaButton('CALCULATE')}
      </div>
    </form>
  `;

  const renderSubnet = () => {
    const ipVal = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!.value.trim();
    const maskVal = controlsEl.querySelector<HTMLInputElement>('#subnet-mask')!.value.trim();
    try {
      const res: SubnetResult = calculateSubnet(ipVal, maskVal || undefined);
      if (res.version === 4) {
        outputEl.innerHTML = `
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${statCard('NETWORK', `${res.networkAddress}/${res.cidr}`, 'yellow')}
            ${statCard('SUBNET MASK', res.subnetMask, 'cyan')}
            ${statCard('BROADCAST', res.broadcastAddress, 'white')}
            ${statCard('USABLE HOSTS', res.usableHosts.toLocaleString('en-US'), 'green')}
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${statCard('FIRST USABLE', res.firstUsable, 'white')}
            ${statCard('LAST USABLE', res.lastUsable, 'white')}
            ${statCard('WILDCARD MASK', res.wildcardMask, 'cyan')}
            ${statCard('SCOPE / CLASS', `${res.ipClass} · ${res.scope}`, 'white')}
          </div>

          <div class="rounded-xl border border-white/10 bg-[#050505] p-4 font-fira text-xs flex flex-col gap-2">
            <p class="text-[10px] uppercase tracking-[0.18em] text-[#858585]">BINARY REPRESENTATION</p>
            <div class="flex flex-wrap justify-between gap-2"><span class="text-[#858585]">IP:</span><span class="text-white">${res.binaryIp}</span></div>
            <div class="flex flex-wrap justify-between gap-2"><span class="text-[#858585]">MASK:</span><span class="text-[#00ffff]">${res.binaryMask}</span></div>
            <div class="flex flex-wrap justify-between gap-2"><span class="text-[#858585]">NET:</span><span class="text-[#f3eb2c]">${res.binaryNetwork}</span></div>
          </div>

          ${
            res.subnets.length > 0
              ? `<div class="rounded-xl border border-white/10 bg-[#050505] p-4">
                  <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-3">SUBNET SPLIT (/${res.cidr + 1})</p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 font-fira text-xs">
                    ${res.subnets
                      .map(
                        (sub) => `
                        <div class="rounded-lg border border-white/10 bg-black/60 p-3">
                          <div class="text-[#f3eb2c] font-bold">${escapeHtml(sub.cidr)}</div>
                          <div class="text-[#aaa] mt-1">Usable: ${escapeHtml(sub.range)}</div>
                          <div class="text-[#666] mt-0.5">Broadcast: ${escapeHtml(sub.broadcast)}</div>
                        </div>
                      `,
                      )
                      .join('')}
                  </div>
                </div>`
              : ''
          }
        `;
      } else {
        outputEl.innerHTML = `
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${statCard('IPv6 NETWORK', `${res.compressedNetwork}/${res.cidr}`, 'yellow')}
            ${statCard('TOTAL ADDRESSES', res.totalAddresses, 'green')}
            ${statCard('/64 SUBNETS', res.slash64Count ?? 'Host / < /64', 'cyan')}
            ${statCard('SCOPE', res.scope, 'white')}
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${statCard('PREFIX / HOST BITS', `/${res.cidr} (${res.hostBits} host bits)`, 'cyan')}
            ${statCard('COMPRESSED IP', res.compressedIp, 'white')}
            ${statCard('FIRST ADDRESS', res.firstUsable, 'white')}
            ${statCard('LAST ADDRESS', res.lastUsable, 'white')}
          </div>

          <div class="rounded-xl border border-white/10 bg-[#050505] p-4 font-fira text-xs flex flex-col gap-2">
            <p class="text-[10px] uppercase tracking-[0.18em] text-[#858585]">EXPANDED &amp; MASK REPRESENTATION</p>
            <div class="flex flex-wrap justify-between gap-2"><span class="text-[#858585]">EXPANDED IP:</span><span class="text-white break-all">${escapeHtml(res.expandedIp)}</span></div>
            <div class="flex flex-wrap justify-between gap-2"><span class="text-[#858585]">NETWORK START:</span><span class="text-[#f3eb2c] break-all">${escapeHtml(res.networkAddress)}</span></div>
            <div class="flex flex-wrap justify-between gap-2"><span class="text-[#858585]">NETWORK END:</span><span class="text-[#00ffff] break-all">${escapeHtml(res.lastAddress)}</span></div>
            <div class="flex flex-wrap justify-between gap-2"><span class="text-[#858585]">PREFIX MASK:</span><span class="text-[#aaa] break-all">${escapeHtml(res.subnetMask)}</span></div>
            <div class="flex flex-wrap justify-between gap-2"><span class="text-[#858585]">WILDCARD MASK:</span><span class="text-[#aaa] break-all">${escapeHtml(res.wildcardMask)}</span></div>
            <div class="flex flex-wrap justify-between gap-2"><span class="text-[#858585]">IPv6 PTR (ip6.arpa):</span><span class="text-emerald-300 break-all">${escapeHtml(res.ipv6PtrArpa)}</span></div>
          </div>

          ${
            res.subnets.length > 0
              ? `<div class="rounded-xl border border-white/10 bg-[#050505] p-4">
                  <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-3">SUBNET SPLIT (/${res.cidr + 1})</p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 font-fira text-xs">
                    ${res.subnets
                      .map(
                        (sub) => `
                        <div class="rounded-lg border border-white/10 bg-black/60 p-3">
                          <div class="text-[#f3eb2c] font-bold break-all">${escapeHtml(sub.cidr)}</div>
                          <div class="text-[#aaa] mt-1 break-all">Range: ${escapeHtml(sub.range)}</div>
                        </div>
                      `,
                      )
                      .join('')}
                  </div>
                </div>`
              : ''
          }
        `;
      }
    } catch (err) {
      showError(outputEl, (err as Error).message);
    }
  };

  controlsEl.querySelector<HTMLFormElement>('#tool-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    renderSubnet();
  });
  controlsEl.querySelector('#tool-primary-input')!.addEventListener('input', renderSubnet);
  controlsEl.querySelector('#subnet-mask')!.addEventListener('input', renderSubnet);
  renderSubnet();
}

interface RblCheckItem {
  zone: string;
  name: string;
  category: 'spam' | 'exploit' | 'policy' | 'domain';
  kind: 'ip' | 'domain';
  infoUrl: string;
  queryHost: string;
  status: 'clean' | 'listed' | 'blocked' | 'error';
  codes: string[];
  reason?: string;
  latencyMs: number;
}

interface RblLookupResponse {
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
  results: RblCheckItem[];
}

const RBL_STATUS_ORDER: Record<RblCheckItem['status'], number> = {
  listed: 0,
  blocked: 1,
  error: 2,
  clean: 3,
};

function renderRblBadge(status: RblCheckItem['status']): string {
  if (status === 'listed') {
    return `<span class="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-[10px]">LISTED</span>`;
  }
  if (status === 'clean') {
    return `<span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-bold text-[10px]">CLEAN</span>`;
  }
  if (status === 'blocked') {
    return `<span class="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-300 font-bold text-[10px]">RATE-LIMITED</span>`;
  }
  return `<span class="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[#aaa] font-bold text-[10px]">ERROR</span>`;
}

function mountRbl(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="tool-form" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div class="md:col-span-6">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">IP Address or Domain</label>
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. 1.1.1.1 or cloudflare.com" value="1.1.1.1" required />
      </div>
      <div class="md:col-span-3">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Filter Results</label>
        <select id="rbl-filter" class="cyber-select w-full">
          <option value="all" selected>All Providers</option>
          <option value="listed">Listed Only</option>
          <option value="clean">Clean Only</option>
          <option value="issues">Blocked / Errors</option>
        </select>
      </div>
      <div class="md:col-span-3 flex items-center justify-end gap-2">
        ${ctaButton('CHECK RBL')}
        ${stopButton()}
      </div>
    </form>
  `;

  const form = controlsEl.querySelector<HTMLFormElement>('#tool-form')!;
  const filterSelect = controlsEl.querySelector<HTMLSelectElement>('#rbl-filter')!;
  const submitBtn = controlsEl.querySelector<HTMLButtonElement>('#tool-submit-btn')!;
  const stopBtn = controlsEl.querySelector<HTMLButtonElement>('#tool-stop-btn')!;

  let currentResults: RblCheckItem[] = [];
  let metaState: Omit<RblLookupResponse, 'offset' | 'limit' | 'checkedCount' | 'results' | 'listedCount' | 'cleanCount' | 'blockedCount' | 'errorCount'> | null = null;
  let lastInProgress = false;
  let lastStopped = false;
  let totalElapsedMs = 0;

  const renderState = () => {
    if (!metaState) return;
    const filter = filterSelect.value;
    const filtered = currentResults
      .filter((r) => {
        if (filter === 'listed') return r.status === 'listed';
        if (filter === 'clean') return r.status === 'clean';
        if (filter === 'issues') return r.status === 'blocked' || r.status === 'error';
        return true;
      })
      .sort((a, b) => RBL_STATUS_ORDER[a.status] - RBL_STATUS_ORDER[b.status] || a.zone.localeCompare(b.zone));

    let listedCount = 0;
    let cleanCount = 0;
    let blockedCount = 0;
    let errorCount = 0;
    for (const r of currentResults) {
      if (r.status === 'listed') listedCount += 1;
      else if (r.status === 'clean') cleanCount += 1;
      else if (r.status === 'blocked') blockedCount += 1;
      else errorCount += 1;
    }

    const progressPct =
      metaState.totalProviders > 0 ? Math.min(100, Math.round((currentResults.length / metaState.totalProviders) * 100)) : 0;

    const rows =
      filtered.length > 0
        ? filtered
            .map(
              (r) => `
              <tr class="hover:bg-white/[0.02]">
                <td class="px-4 py-2.5">${renderRblBadge(r.status)}</td>
                <td class="px-4 py-2.5">
                  <div class="text-white font-semibold">${escapeHtml(r.name)}</div>
                  <div class="text-[11px] text-[#858585]">
                    <a href="${escapeHtml(r.infoUrl)}" target="_blank" rel="noopener noreferrer" class="hover:text-[#00ffff] transition-colors">${escapeHtml(r.zone)}</a>
                    <span class="mx-1.5 text-white/20">•</span>
                    <span class="uppercase">${escapeHtml(r.kind)}</span>
                  </div>
                </td>
                <td class="px-4 py-2.5 text-[#aaa] break-all">
                  <div>${r.codes.length > 0 ? `<span class="text-red-300 font-semibold">${escapeHtml(r.codes.join(', '))}</span>` : '<span class="text-[#666]">--</span>'}</div>
                  ${r.reason ? `<div class="text-[11px] text-[#858585] mt-0.5">${escapeHtml(r.reason)}</div>` : ''}
                </td>
                <td class="px-4 py-2.5 text-[#00ffff] whitespace-nowrap">${r.latencyMs} ms</td>
              </tr>
            `,
            )
            .join('')
        : `<tr><td colspan="4" class="px-4 py-6 text-center text-[#858585]">No RBL entries match the active filter.</td></tr>`;

    const rawLines = currentResults.map(
      (r) =>
        `${r.status.toUpperCase().padEnd(8)} ${r.zone.padEnd(32)} ${r.codes.join(',') || '-'} (${r.latencyMs}ms)${r.reason ? ` :: ${r.reason}` : ''}`,
    );

    const summaryPayload = !lastInProgress
      ? {
          target: metaState.target,
          resolvedIp: metaState.resolvedIp,
          hostname: metaState.hostname,
          family: metaState.family,
          targetType: metaState.targetType,
          totalProviders: metaState.totalProviders,
          checkedCount: currentResults.length,
          listedCount,
          cleanCount,
          blockedCount,
          errorCount,
          stopped: lastStopped,
          elapsedMs: totalElapsedMs,
          results: currentResults,
        }
      : undefined;

    outputEl.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        ${statCard('RESOLVED IP', metaState.resolvedIp, 'cyan')}
        ${statCard('TESTED ZONES', `${currentResults.length} / ${metaState.totalProviders}`, 'yellow')}
        ${statCard('LISTED', String(listedCount), listedCount > 0 ? 'red' : 'green')}
        ${statCard('CLEAN', String(cleanCount), 'green')}
        ${statCard('ISSUES / RL', String(blockedCount + errorCount), blockedCount + errorCount > 0 ? 'white' : 'white')}
      </div>
      ${
        lastInProgress
          ? `
        <div class="rounded-xl border border-[#f3eb2c]/25 bg-[#050505] p-3">
          <div class="flex items-center justify-between font-fira text-[11px] text-[#f3eb2c] mb-1.5">
            <span>Querying DNSBL zones via DoH (${currentResults.length}/${metaState.totalProviders})...</span>
            <span>${progressPct}%</span>
          </div>
          <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div class="h-full bg-[#f3eb2c] transition-all duration-200" style="width:${progressPct}%"></div>
          </div>
        </div>
      `
          : ''
      }
      <div class="rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
        <table class="w-full text-left font-fira text-xs">
          <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-[#858585]">
            <tr>
              <th class="px-4 py-2.5">STATUS</th>
              <th class="px-4 py-2.5">RBL ZONE</th>
              <th class="px-4 py-2.5">RETURN CODE / DETAILS</th>
              <th class="px-4 py-2.5">RTT</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">${rows}</tbody>
        </table>
      </div>
      ${
        !lastInProgress
          ? rawOutputBlock(
              `RBL AUDIT (${listedCount} LISTED, ${cleanCount} CLEAN${lastStopped ? ', STOPPED' : ''})`,
              rawLines.join('\n') || '; No RBL checks completed',
              summaryPayload,
            )
          : ''
      }
    `;

    if (summaryPayload) {
      bindCopyButtons(outputEl, summaryPayload);
    }
  };

  filterSelect.addEventListener('change', renderState);

  stopBtn.addEventListener('click', () => {
    activeAbort?.abort();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const target = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!.value.trim();
    if (!target) return;

    activeAbort?.abort();
    const controller = new AbortController();
    activeAbort = controller;

    submitBtn.disabled = true;
    stopBtn.disabled = false;
    currentResults = [];
    metaState = null;
    lastInProgress = true;
    lastStopped = false;
    const scanStart = performance.now();

    showLoading(outputEl, `Resolving ${target} and querying DNSBL zones...`);

    const batchSize = 8;
    let offset = 0;

    try {
      while (!controller.signal.aborted) {
        const batch = await apiGet<RblLookupResponse>(
          `/api/rbl?target=${encodeURIComponent(target)}&offset=${offset}&limit=${batchSize}`,
          controller.signal,
        );

        metaState = {
          target: batch.target,
          resolvedIp: batch.resolvedIp,
          hostname: batch.hostname,
          family: batch.family,
          targetType: batch.targetType,
          totalProviders: batch.totalProviders,
          elapsedMs: batch.elapsedMs,
        };
        currentResults.push(...batch.results);
        offset += batch.checkedCount;
        totalElapsedMs = Math.round(performance.now() - scanStart);

        const done = offset >= batch.totalProviders || batch.checkedCount === 0;
        lastInProgress = !done;
        renderState();
        if (done) break;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        lastInProgress = false;
        lastStopped = true;
        totalElapsedMs = Math.round(performance.now() - scanStart);
        if (metaState) {
          renderState();
        }
      } else {
        showError(outputEl, (err as Error).message);
      }
    } finally {
      if (activeAbort === controller) {
        submitBtn.disabled = false;
        stopBtn.disabled = true;
      }
    }
  });
}

interface PropagationCheckpointItem {
  id: string;
  label: string;
  provider: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  kind: 'prisma-region' | 'global-resolver';
  status: 'ok' | 'mismatch' | 'missing' | 'error';
  values: string[];
  ttl: number | null;
  signature: string;
  resolverSource: string;
  latencyMs: number;
  error?: string;
}

interface PropagationApiResponse {
  host: string;
  queryName: string;
  recordType: string;
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
  results: PropagationCheckpointItem[];
}

function countryCodeToFlag(code: string): string {
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '🌐';
  return String.fromCodePoint(0x1f1e6 + upper.charCodeAt(0) - 65, 0x1f1e6 + upper.charCodeAt(1) - 65);
}

function renderPropagationStatusGlyph(status: PropagationCheckpointItem['status']): string {
  if (status === 'ok') {
    return `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/45 text-emerald-400 font-bold text-xs" title="Matched">✓</span>`;
  }
  if (status === 'mismatch') {
    return `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/45 text-amber-300 font-bold text-xs" title="Different value vs consensus">!</span>`;
  }
  if (status === 'missing') {
    return `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 border border-white/20 text-[#858585] font-bold text-xs" title="No record returned">—</span>`;
  }
  return `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 border border-red-500/45 text-red-400 font-bold text-xs" title="Lookup error">✕</span>`;
}

function recomputePropagationStatuses(
  items: PropagationCheckpointItem[],
  expected?: string,
): {
  scored: PropagationCheckpointItem[];
  consensusValues: string[];
  matchedCount: number;
  mismatchCount: number;
  missingCount: number;
  errorCount: number;
} {
  const counts = new Map<string, { count: number; values: string[] }>();
  for (const item of items) {
    if (!item.signature) continue;
    const prev = counts.get(item.signature);
    if (prev) prev.count += 1;
    else counts.set(item.signature, { count: 1, values: item.values });
  }

  let bestSig = '';
  let consensusValues: string[] = [];
  let bestCount = 0;
  for (const [sig, entry] of counts.entries()) {
    if (entry.count > bestCount) {
      bestSig = sig;
      consensusValues = entry.values;
      bestCount = entry.count;
    }
  }

  const normalizedExpected = expected?.trim().replace(/^"+|"+$/g, '').replace(/\.$/, '').toLowerCase() || null;

  let matchedCount = 0;
  let mismatchCount = 0;
  let missingCount = 0;
  let errorCount = 0;

  const scored = items.map((item) => {
    let status: PropagationCheckpointItem['status'];
    if (item.error) {
      status = 'error';
      errorCount += 1;
    } else if (item.values.length === 0) {
      status = 'missing';
      missingCount += 1;
    } else if (normalizedExpected) {
      const hasMatch = item.values.some((v) => v.toLowerCase() === normalizedExpected);
      status = hasMatch ? 'ok' : 'mismatch';
      if (hasMatch) matchedCount += 1;
      else mismatchCount += 1;
    } else if (!bestSig || item.signature === bestSig) {
      status = 'ok';
      matchedCount += 1;
    } else {
      status = 'mismatch';
      mismatchCount += 1;
    }
    return { ...item, status };
  });

  return { scored, consensusValues, matchedCount, mismatchCount, missingCount, errorCount };
}

function mountPropagation(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="tool-form" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div class="md:col-span-4">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Domain Name</label>
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. www.google.com" value="www.google.com" required />
      </div>
      <div class="md:col-span-2">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Record Type</label>
        <select id="prop-type" class="cyber-select w-full">
          <option value="A" selected>A</option>
          <option value="AAAA">AAAA</option>
          <option value="CNAME">CNAME</option>
          <option value="MX">MX</option>
          <option value="NS">NS</option>
          <option value="TXT">TXT</option>
          <option value="SOA">SOA</option>
          <option value="SRV">SRV</option>
          <option value="CAA">CAA</option>
          <option value="PTR">PTR</option>
        </select>
      </div>
      <div class="md:col-span-3">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Expected Value (Optional)</label>
        <input id="prop-expected" type="text" class="cyber-input" placeholder="Auto-consensus if empty" />
      </div>
      <div class="md:col-span-3 flex items-center justify-end gap-2">
        ${ctaButton('CHECK PROPAGATION')}
        ${stopButton()}
      </div>
    </form>
  `;

  const form = controlsEl.querySelector<HTMLFormElement>('#tool-form')!;
  const expectedInput = controlsEl.querySelector<HTMLInputElement>('#prop-expected')!;
  const submitBtn = controlsEl.querySelector<HTMLButtonElement>('#tool-submit-btn')!;
  const stopBtn = controlsEl.querySelector<HTMLButtonElement>('#tool-stop-btn')!;

  let mapInstance: L.Map | null = null;
  let markerLayer: L.LayerGroup | null = null;
  let items: PropagationCheckpointItem[] = [];
  let totalCheckpoints = 15;
  let currentHost = '';
  let currentQueryName = '';
  let currentType = 'A';
  let inProgress = false;
  let stopped = false;
  let totalElapsedMs = 0;

  const disposeMap = () => {
    mapInstance?.remove();
    mapInstance = null;
    markerLayer = null;
  };
  activeSpeedCleanup = disposeMap;

  const ensureSkeleton = () => {
    if (outputEl.querySelector('#prop-map')) return;
    outputEl.innerHTML = `
      <div id="prop-stats" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"></div>
      <div id="prop-progress"></div>
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div class="xl:col-span-6 rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
          <div class="px-4 py-2.5 border-b border-white/10 flex items-center justify-between font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">
            <span>SERVER / REGION</span>
            <span>RESOLVED RECORD</span>
          </div>
          <div id="prop-rows" class="divide-y divide-white/5"></div>
        </div>
        <div class="xl:col-span-6 flex flex-col gap-3">
          <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
            <div class="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
              <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">GLOBAL PROPAGATION MAP</span>
              <span class="font-fira text-[10px] text-[#00ffff]">LIVE REGIONS + RESOLVERS</span>
            </div>
            <div id="prop-map" class="w-full h-[340px] bg-[#060606]"></div>
          </div>
          <div id="prop-consensus" class="rounded-xl border border-white/10 bg-[#050505] p-4"></div>
        </div>
      </div>
      <div id="prop-raw"></div>
    `;

    const mapEl = outputEl.querySelector<HTMLElement>('#prop-map')!;
    mapInstance = L.map(mapEl, {
      zoomControl: true,
      scrollWheelZoom: false,
      worldCopyJump: true,
    }).setView([24, 10], 2);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap contributors',
        maxZoom: 16,
      },
    ).addTo(mapInstance);
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 16 },
    ).addTo(mapInstance);
    markerLayer = L.layerGroup().addTo(mapInstance);
    setTimeout(() => mapInstance?.invalidateSize(), 100);
  };

  const renderState = () => {
    if (!currentHost) return;
    ensureSkeleton();

    const expectedVal = expectedInput.value.trim() || undefined;
    const summary = recomputePropagationStatuses(items, expectedVal);
    const maxRtt = items.length > 0 ? Math.max(...items.map((i) => i.latencyMs)) : 0;
    const propPct = items.length > 0 ? Math.round((summary.matchedCount / items.length) * 100) : 0;
    const scanPct = totalCheckpoints > 0 ? Math.min(100, Math.round((items.length / totalCheckpoints) * 100)) : 0;
    const consensusDisplay = summary.consensusValues.length > 0 ? summary.consensusValues[0] : '--';

    outputEl.querySelector('#prop-stats')!.innerHTML = `
      ${statCard('CONSENSUS', consensusDisplay, 'cyan')}
      ${statCard('PROPAGATED', `${summary.matchedCount} / ${items.length} (${propPct}%)`, summary.matchedCount === items.length && items.length > 0 ? 'green' : 'yellow')}
      ${statCard('MISMATCH', String(summary.mismatchCount), summary.mismatchCount > 0 ? 'red' : 'white')}
      ${statCard('NO RECORD / ERR', String(summary.missingCount + summary.errorCount), summary.missingCount + summary.errorCount > 0 ? 'red' : 'white')}
      ${statCard('MAX RTT', maxRtt > 0 ? `${maxRtt} ms` : '--', 'white')}
    `;

    outputEl.querySelector('#prop-progress')!.innerHTML = inProgress
      ? `
        <div class="rounded-xl border border-[#f3eb2c]/25 bg-[#050505] p-3">
          <div class="flex items-center justify-between font-fira text-[11px] text-[#f3eb2c] mb-1.5">
            <span>Querying Prisma regions &amp; global resolvers (${items.length}/${totalCheckpoints})...</span>
            <span>${scanPct}%</span>
          </div>
          <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div class="h-full bg-[#f3eb2c] transition-all duration-200" style="width:${scanPct}%"></div>
          </div>
        </div>
      `
      : '';

    outputEl.querySelector('#prop-rows')!.innerHTML = summary.scored
      .map((item) => {
        const valueHtml =
          item.values.length > 0
            ? item.values.map((v) => `<div class="text-white break-all">${escapeHtml(v)}</div>`).join('')
            : item.error
              ? `<div class="text-red-400 text-[11px]">${escapeHtml(item.error)}</div>`
              : `<div class="text-[#858585] text-[11px]">No ${escapeHtml(currentType)} record</div>`;

        const regionTag =
          item.kind === 'prisma-region'
            ? `<span class="px-1.5 py-0.5 rounded bg-[#f3eb2c]/15 border border-[#f3eb2c]/35 text-[#f3eb2c] text-[9px] uppercase tracking-wider">PRISMA</span>`
            : `<span class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#858585] text-[9px] uppercase tracking-wider">RESOLVER</span>`;

        return `
          <div class="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] font-fira text-xs">
            <div class="min-w-0">
              <div class="flex items-center gap-2 text-white font-semibold truncate">
                <span aria-hidden="true">${countryCodeToFlag(item.countryCode)}</span>
                <span class="truncate">${escapeHtml(item.label)}</span>
                ${regionTag}
              </div>
              <div class="text-[11px] text-[#858585] mt-0.5 flex items-center gap-2">
                <span>${escapeHtml(item.provider)}</span>
                <span class="text-white/20">•</span>
                <span class="text-[#00ffff]">${item.latencyMs} ms</span>
                ${item.ttl !== null ? `<span class="text-white/20">•</span><span>TTL ${item.ttl}s</span>` : ''}
              </div>
            </div>
            <div class="flex items-center gap-3 shrink-0 text-right">
              <div class="max-w-[220px]">${valueHtml}</div>
              ${renderPropagationStatusGlyph(item.status)}
            </div>
          </div>
        `;
      })
      .join('');

    // Answer distribution breakdown
    const buckets = new Map<string, { label: string; count: number; status: PropagationCheckpointItem['status'] }>();
    for (const item of summary.scored) {
      const key = item.values.length > 0 ? item.values.join(', ') : item.error ? `Error: ${item.error}` : 'No record';
      const existing = buckets.get(key);
      if (existing) existing.count += 1;
      else buckets.set(key, { label: key, count: 1, status: item.status });
    }
    const bucketRows = Array.from(buckets.values())
      .sort((a, b) => b.count - a.count)
      .map((b) => {
        const pct = summary.scored.length > 0 ? Math.round((b.count / summary.scored.length) * 100) : 0;
        const barColor =
          b.status === 'ok' ? 'bg-emerald-400' : b.status === 'mismatch' ? 'bg-amber-400' : 'bg-red-400';
        return `
          <div class="font-fira text-xs">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-white break-all">${escapeHtml(b.label)}</span>
              <span class="text-[#aaa] shrink-0">${b.count}/${summary.scored.length} (${pct}%)</span>
            </div>
            <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div class="h-full ${barColor}" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      })
      .join('');

    outputEl.querySelector('#prop-consensus')!.innerHTML = `
      <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-3">ANSWER DISTRIBUTION (${escapeHtml(currentQueryName)} · ${escapeHtml(currentType)})</p>
      <div class="flex flex-col gap-3">${bucketRows || '<span class="font-fira text-xs text-[#858585]">Waiting for answers...</span>'}</div>
    `;

    // Update map markers without re-creating tile layers
    if (markerLayer) {
      markerLayer.clearLayers();
      for (const item of summary.scored) {
        const color =
          item.status === 'ok'
            ? '#22c55e'
            : item.status === 'mismatch'
              ? '#f59e0b'
              : '#ef4444';
        const icon = L.divIcon({
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          html: `<div style="width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid #050505;box-shadow:0 0 10px ${color};"></div>`,
        });
        const answerText = item.values.length > 0 ? item.values.join('<br>') : item.error ?? 'No record';
        L.marker([item.latitude, item.longitude], { icon })
          .bindPopup(
            `<div style="font-family:monospace;font-size:11px;"><strong>${escapeHtml(item.label)}</strong><br>${escapeHtml(item.provider)} (${item.latencyMs} ms)<br><br>${answerText}</div>`,
          )
          .addTo(markerLayer);
      }
      mapInstance?.invalidateSize();
    }

    const rawEl = outputEl.querySelector<HTMLElement>('#prop-raw')!;
    if (!inProgress) {
      const rawLines = summary.scored.map(
        (item) =>
          `${item.status.toUpperCase().padEnd(8)} ${item.label.padEnd(32)} ${item.provider.padEnd(22)} ${item.values.join(', ') || item.error || 'NO RECORD'} (${item.latencyMs}ms)`,
      );
      const payload = {
        host: currentHost,
        queryName: currentQueryName,
        recordType: currentType,
        expected: expectedVal,
        consensusValues: summary.consensusValues,
        matchedCount: summary.matchedCount,
        mismatchCount: summary.mismatchCount,
        missingCount: summary.missingCount,
        errorCount: summary.errorCount,
        stopped,
        elapsedMs: totalElapsedMs,
        results: summary.scored,
      };
      rawEl.innerHTML = rawOutputBlock(
        `PROPAGATION SUMMARY (${summary.matchedCount}/${summary.scored.length} MATCHED${stopped ? ', STOPPED' : ''})`,
        rawLines.join('\n') || '; No checkpoints queried',
        payload,
      );
      bindCopyButtons(outputEl, payload);
    } else {
      rawEl.innerHTML = '';
    }
  };

  expectedInput.addEventListener('input', () => {
    if (items.length > 0) renderState();
  });

  stopBtn.addEventListener('click', () => {
    activeAbort?.abort();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const host = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!.value.trim();
    const type = controlsEl.querySelector<HTMLSelectElement>('#prop-type')!.value;
    if (!host) return;

    activeAbort?.abort();
    const controller = new AbortController();
    activeAbort = controller;

    disposeMap();
    outputEl.innerHTML = '';
    submitBtn.disabled = true;
    stopBtn.disabled = false;
    items = [];
    currentHost = host;
    currentQueryName = host;
    currentType = type;
    inProgress = true;
    stopped = false;
    const scanStart = performance.now();

    showLoading(outputEl, `Checking global ${type} DNS propagation for ${host}...`);

    const batchSize = 5;
    let offset = 0;

    try {
      while (!controller.signal.aborted) {
        const expected = expectedInput.value.trim();
        const url = `/api/propagation?host=${encodeURIComponent(host)}&type=${encodeURIComponent(type)}&offset=${offset}&limit=${batchSize}${expected ? `&expected=${encodeURIComponent(expected)}` : ''}`;
        const batch = await apiGet<PropagationApiResponse>(url, controller.signal);

        if (offset === 0) {
          outputEl.innerHTML = '';
        }
        currentHost = batch.host;
        currentQueryName = batch.queryName;
        currentType = batch.recordType;
        totalCheckpoints = batch.totalCheckpoints;
        items.push(...batch.results);
        offset += batch.checkedCount;
        totalElapsedMs = Math.round(performance.now() - scanStart);

        const done = offset >= batch.totalCheckpoints || batch.checkedCount === 0;
        inProgress = !done;
        renderState();
        if (done) break;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        inProgress = false;
        stopped = true;
        totalElapsedMs = Math.round(performance.now() - scanStart);
        if (items.length > 0) {
          renderState();
        }
      } else {
        disposeMap();
        showError(outputEl, (err as Error).message);
      }
    } finally {
      if (activeAbort === controller) {
        submitBtn.disabled = false;
        stopBtn.disabled = true;
      }
    }
  });
}

function mountSla(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  type SlaMode = 'simple' | 'compare' | 'reverse';
  let mode: SlaMode = 'simple';

  controlsEl.innerHTML = `
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" data-sla-mode="simple" class="sla-mode-btn px-3.5 py-1.5 rounded-lg border font-fira text-xs uppercase tracking-[0.14em] transition-colors cursor-pointer">SIMPLE</button>
        <button type="button" data-sla-mode="compare" class="sla-mode-btn px-3.5 py-1.5 rounded-lg border font-fira text-xs uppercase tracking-[0.14em] transition-colors cursor-pointer">COMPARE</button>
        <button type="button" data-sla-mode="reverse" class="sla-mode-btn px-3.5 py-1.5 rounded-lg border font-fira text-xs uppercase tracking-[0.14em] transition-colors cursor-pointer">REVERSE</button>
      </div>

      <div id="sla-pane-simple" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div class="md:col-span-5">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Target SLA Uptime (%)</label>
          <input id="tool-primary-input" type="number" step="any" min="0" max="100" class="cyber-input" value="99.9" placeholder="e.g. 99.95" />
        </div>
        <div class="md:col-span-7 flex flex-wrap gap-2">
          ${SLA_PRESET_TIERS.map(
            (t) =>
              `<button type="button" data-sla-preset="${t.percentage}" class="px-3 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#aaa] hover:text-[#f3eb2c] hover:border-[#f3eb2c]/45 transition-colors cursor-pointer">${escapeHtml(t.badge)} · ${escapeHtml(t.name)}</button>`,
          ).join('')}
        </div>
      </div>

      <div id="sla-pane-compare" class="hidden grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div class="md:col-span-4">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">SLA Target A (%)</label>
          <input id="sla-compare-a" type="number" step="any" min="0" max="100" class="cyber-input" value="99.9" />
        </div>
        <div class="md:col-span-4">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">SLA Target B (%)</label>
          <input id="sla-compare-b" type="number" step="any" min="0" max="100" class="cyber-input" value="99.99" />
        </div>
        <div class="md:col-span-4 flex flex-wrap gap-2">
          <button type="button" data-compare-pair="99.9,99.95" class="px-3 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#aaa] hover:text-[#00ffff] hover:border-[#00ffff]/45 transition-colors cursor-pointer">99.9% vs 99.95%</button>
          <button type="button" data-compare-pair="99.9,99.99" class="px-3 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#aaa] hover:text-[#00ffff] hover:border-[#00ffff]/45 transition-colors cursor-pointer">99.9% vs 99.99%</button>
          <button type="button" data-compare-pair="99.99,99.999" class="px-3 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#aaa] hover:text-[#00ffff] hover:border-[#00ffff]/45 transition-colors cursor-pointer">99.99% vs 99.999%</button>
        </div>
      </div>

      <div id="sla-pane-reverse" class="hidden grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div class="md:col-span-5">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Actual Downtime (e.g. 45m, 1h 12m 30s, 300s)</label>
          <input id="sla-reverse-down" type="text" class="cyber-input" value="45m" placeholder="e.g. 45m or 2h 15m 10s" />
        </div>
        <div class="md:col-span-4">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Reporting Period</label>
          <select id="sla-reverse-period" class="cyber-select w-full">
            <option value="daily">Daily (24h)</option>
            <option value="weekly">Weekly (7d)</option>
            <option value="monthly" selected>Monthly (avg)</option>
            <option value="quarterly">Quarterly (avg)</option>
            <option value="yearly">Yearly (365.25d)</option>
            <option value="custom">Custom Days...</option>
          </select>
        </div>
        <div id="sla-custom-days-wrap" class="md:col-span-3 hidden">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Custom Days</label>
          <input id="sla-custom-days" type="number" step="any" min="0.01" class="cyber-input" value="30" />
        </div>
      </div>
    </div>
  `;

  const modeBtns = controlsEl.querySelectorAll<HTMLButtonElement>('[data-sla-mode]');
  const paneSimple = controlsEl.querySelector<HTMLElement>('#sla-pane-simple')!;
  const paneCompare = controlsEl.querySelector<HTMLElement>('#sla-pane-compare')!;
  const paneReverse = controlsEl.querySelector<HTMLElement>('#sla-pane-reverse')!;
  const simpleInput = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!;
  const compareAInput = controlsEl.querySelector<HTMLInputElement>('#sla-compare-a')!;
  const compareBInput = controlsEl.querySelector<HTMLInputElement>('#sla-compare-b')!;
  const reverseDownInput = controlsEl.querySelector<HTMLInputElement>('#sla-reverse-down')!;
  const reversePeriodSelect = controlsEl.querySelector<HTMLSelectElement>('#sla-reverse-period')!;
  const customDaysWrap = controlsEl.querySelector<HTMLElement>('#sla-custom-days-wrap')!;
  const customDaysInput = controlsEl.querySelector<HTMLInputElement>('#sla-custom-days')!;

  const syncModeUi = () => {
    modeBtns.forEach((btn) => {
      const isSelected = btn.dataset.slaMode === mode;
      btn.className = isSelected
        ? 'sla-mode-btn px-3.5 py-1.5 rounded-lg border border-[#f3eb2c]/60 bg-[#f3eb2c]/15 text-[#f3eb2c] font-fira text-xs font-bold uppercase tracking-[0.14em] transition-colors cursor-pointer'
        : 'sla-mode-btn px-3.5 py-1.5 rounded-lg border border-white/10 bg-[#050505] text-[#858585] hover:text-white font-fira text-xs uppercase tracking-[0.14em] transition-colors cursor-pointer';
    });
    paneSimple.classList.toggle('hidden', mode !== 'simple');
    paneCompare.classList.toggle('hidden', mode !== 'compare');
    paneReverse.classList.toggle('hidden', mode !== 'reverse');
    customDaysWrap.classList.toggle('hidden', reversePeriodSelect.value !== 'custom');
  };

  const renderSla = () => {
    syncModeUi();
    try {
      if (mode === 'simple') {
        const pct = Number(simpleInput.value);
        if (simpleInput.value.trim() === '') {
          outputEl.innerHTML = '';
          return;
        }
        const res = calculateSlaBreakdown(pct);
        const rows = res.intervals
          .map(
            (i) => `
            <tr class="hover:bg-white/[0.02]">
              <td class="px-4 py-3 text-white font-semibold">${escapeHtml(i.label)}</td>
              <td class="px-4 py-3 text-[#f3eb2c] font-bold">${escapeHtml(i.downtimeFormatted)}</td>
              <td class="px-4 py-3 text-emerald-400">${escapeHtml(i.uptimeFormatted)}</td>
            </tr>
          `,
          )
          .join('');

        outputEl.innerHTML = `
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            ${statCard('SLA TARGET', `${res.percentage}%`, 'yellow')}
            ${statCard('DOWNTIME ALLOWANCE', `${res.downtimePercentage}%`, 'cyan')}
            ${statCard('CLASSIFICATION', res.ninesLabel, 'white')}
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
            <table class="w-full text-left font-fira text-xs">
              <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-[#858585]">
                <tr>
                  <th class="px-4 py-2.5">INTERVAL</th>
                  <th class="px-4 py-2.5">ALLOWED DOWNTIME</th>
                  <th class="px-4 py-2.5">REQUIRED UPTIME</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">${rows}</tbody>
            </table>
          </div>
        `;
        return;
      }

      if (mode === 'compare') {
        const pctA = Number(compareAInput.value);
        const pctB = Number(compareBInput.value);
        const cmp = compareSlas(pctA, pctB);
        const rows = cmp.intervals
          .map(
            (i) => `
            <tr class="hover:bg-white/[0.02]">
              <td class="px-4 py-3 text-white font-semibold">${escapeHtml(i.label)}</td>
              <td class="px-4 py-3 ${i.betterTarget === 'A' ? 'text-emerald-400 font-bold' : 'text-[#f3eb2c]'}">${escapeHtml(i.downtimeAFormatted)}</td>
              <td class="px-4 py-3 ${i.betterTarget === 'B' ? 'text-emerald-400 font-bold' : 'text-[#00ffff]'}">${escapeHtml(i.downtimeBFormatted)}</td>
              <td class="px-4 py-3 text-white font-semibold">${escapeHtml(i.diffFormatted)}</td>
            </tr>
          `,
          )
          .join('');

        const referenceRows = SLA_PRESET_TIERS.map((tier) => {
          const b = calculateSlaBreakdown(tier.percentage);
          const daily = b.intervals[0]?.downtimeFormatted ?? '--';
          const weekly = b.intervals[1]?.downtimeFormatted ?? '--';
          const monthly = b.intervals[2]?.downtimeFormatted ?? '--';
          const yearly = b.intervals[4]?.downtimeFormatted ?? '--';
          return `
            <tr class="hover:bg-white/[0.02]">
              <td class="px-4 py-2.5 text-[#f3eb2c] font-bold">${tier.percentage}% <span class="text-[#858585] font-normal">(${escapeHtml(tier.name)})</span></td>
              <td class="px-4 py-2.5 text-[#aaa]">${escapeHtml(daily)}</td>
              <td class="px-4 py-2.5 text-[#aaa]">${escapeHtml(weekly)}</td>
              <td class="px-4 py-2.5 text-white">${escapeHtml(monthly)}</td>
              <td class="px-4 py-2.5 text-[#00ffff]">${escapeHtml(yearly)}</td>
            </tr>
          `;
        }).join('');

        outputEl.innerHTML = `
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            ${statCard('SLA TARGET A', `${cmp.pctA}%`, 'yellow')}
            ${statCard('SLA TARGET B', `${cmp.pctB}%`, 'cyan')}
            ${statCard('DIFFERENCE', cmp.multiplierLabel, 'green')}
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
            <table class="w-full text-left font-fira text-xs">
              <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-[#858585]">
                <tr>
                  <th class="px-4 py-2.5">INTERVAL</th>
                  <th class="px-4 py-2.5">SLA A (${cmp.pctA}%)</th>
                  <th class="px-4 py-2.5">SLA B (${cmp.pctB}%)</th>
                  <th class="px-4 py-2.5">DELTA</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">${rows}</tbody>
            </table>
          </div>
          <div class="rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
            <div class="px-4 py-2.5 border-b border-white/10 font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">STANDARD SLA TIER REFERENCE MATRIX</div>
            <table class="w-full text-left font-fira text-xs">
              <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-[#858585]">
                <tr>
                  <th class="px-4 py-2.5">SLA LEVEL</th>
                  <th class="px-4 py-2.5">DAILY</th>
                  <th class="px-4 py-2.5">WEEKLY</th>
                  <th class="px-4 py-2.5">MONTHLY</th>
                  <th class="px-4 py-2.5">YEARLY</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">${referenceRows}</tbody>
            </table>
          </div>
        `;
        return;
      }

      const downSec = parseDurationString(reverseDownInput.value);
      const periodArg: SlaPeriodId | { customDays: number } =
        reversePeriodSelect.value === 'custom'
          ? { customDays: Number(customDaysInput.value) }
          : (reversePeriodSelect.value as SlaPeriodId);
      const rev = calculateReverseSla(downSec, periodArg);

      const tierRows = rev.tierChecks
        .map(
          (t) => `
          <tr class="hover:bg-white/[0.02]">
            <td class="px-4 py-2.5">
              ${
                t.passed
                  ? `<span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-bold text-[10px]">PASS</span>`
                  : `<span class="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/35 text-red-400 font-bold text-[10px]">BREACH</span>`
              }
            </td>
            <td class="px-4 py-2.5 text-white font-semibold">${t.percentage}% <span class="text-[#858585] font-normal">(${escapeHtml(t.name)})</span></td>
            <td class="px-4 py-2.5 text-[#00ffff]">${escapeHtml(t.allowedFormatted)}</td>
            <td class="px-4 py-2.5 ${t.passed ? 'text-emerald-400' : 'text-red-400'}">${t.passed ? `${escapeHtml(t.deltaFormatted)} remaining` : `${escapeHtml(t.deltaFormatted)} over budget`}</td>
          </tr>
        `,
        )
        .join('');

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${statCard('ACHIEVED UPTIME', rev.uptimeFormattedPct, rev.uptimePercentage >= 99.9 ? 'green' : 'yellow')}
          ${statCard('RECORDED DOWNTIME', rev.downtimeFormatted, 'cyan')}
          ${statCard('REPORTING WINDOW', rev.periodLabel, 'white')}
          ${statCard('HIGHEST TIER MET', rev.highestTierMet, rev.uptimePercentage >= 99 ? 'green' : 'red')}
        </div>
        <div class="rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
          <table class="w-full text-left font-fira text-xs">
            <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-[#858585]">
              <tr>
                <th class="px-4 py-2.5">STATUS</th>
                <th class="px-4 py-2.5">SLA TIER</th>
                <th class="px-4 py-2.5">ALLOWED BUDGET</th>
                <th class="px-4 py-2.5">MARGIN</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">${tierRows}</tbody>
          </table>
        </div>
      `;
    } catch (err) {
      showError(outputEl, (err as Error).message);
    }
  };

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.slaMode as SlaMode;
      renderSla();
    });
  });

  controlsEl.querySelectorAll<HTMLButtonElement>('[data-sla-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = 'simple';
      simpleInput.value = btn.dataset.slaPreset ?? '99.9';
      renderSla();
    });
  });

  controlsEl.querySelectorAll<HTMLButtonElement>('[data-compare-pair]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [a, b] = (btn.dataset.comparePair ?? '99.9,99.99').split(',');
      compareAInput.value = a ?? '99.9';
      compareBInput.value = b ?? '99.99';
      renderSla();
    });
  });

  simpleInput.addEventListener('input', () => {
    if (mode !== 'simple') mode = 'simple';
    renderSla();
  });
  compareAInput.addEventListener('input', renderSla);
  compareBInput.addEventListener('input', renderSla);
  reverseDownInput.addEventListener('input', renderSla);
  reversePeriodSelect.addEventListener('change', renderSla);
  customDaysInput.addEventListener('input', renderSla);

  renderSla();
}

function formatLocalDateTime(ms: number): string {
  const d = new Date(ms);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  return `${d.toLocaleString()} (${tz})`;
}

function renderEpochCards(res: EpochConversionResult, titlePrefix: string): string {
  const dayStartIso = new Date(res.dayStartSeconds * 1000).toISOString();
  const dayEndIso = new Date(res.dayEndSeconds * 1000).toISOString();
  return `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      ${statCard(`${titlePrefix} · SECONDS`, String(res.epochSeconds), 'yellow')}
      ${statCard('DETECTED UNIT', res.detectedUnit.toUpperCase(), 'cyan')}
      ${statCard('RELATIVE', res.relative, 'white')}
      ${statCard('MILLISECONDS', String(res.epochMilliseconds), 'white')}
    </div>
    <div class="rounded-xl border border-white/10 bg-[#050505] p-4 font-fira text-xs flex flex-col gap-2">
      <div class="flex flex-wrap justify-between gap-2"><span class="text-[#858585]">GMT / UTC:</span><span class="text-[#f3eb2c] font-semibold break-all">${escapeHtml(res.utcDateTime)} (${escapeHtml(res.utcString)})</span></div>
      <div class="flex flex-wrap justify-between gap-2"><span class="text-[#858585]">LOCAL TIME:</span><span class="text-[#00ffff] break-all">${escapeHtml(formatLocalDateTime(res.epochMilliseconds))}</span></div>
      <div class="flex flex-wrap justify-between gap-2"><span class="text-[#858585]">ISO 8601:</span><span class="text-white break-all">${escapeHtml(res.iso8601)}</span></div>
      <div class="flex flex-wrap justify-between gap-2"><span class="text-[#858585]">MICRO / NANO:</span><span class="text-[#aaa] break-all">${res.epochMicroseconds} µs · ${res.epochNanoseconds} ns</span></div>
      <div class="flex flex-wrap justify-between gap-2"><span class="text-[#858585]">UTC DAY RANGE:</span><span class="text-[#aaa] break-all">${res.dayStartSeconds} (${escapeHtml(dayStartIso)}) → ${res.dayEndSeconds} (${escapeHtml(dayEndIso)})</span></div>
    </div>
  `;
}

function mountEpoch(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  const now = new Date();
  const initialSec = Math.floor(now.getTime() / 1000);
  let clockPaused = false;

  controlsEl.innerHTML = `
    <div class="flex flex-col gap-4">
      <div class="rounded-xl border border-[#f3eb2c]/25 bg-[#050505] p-4 flex flex-wrap items-center justify-between gap-3">
        <div class="font-fira">
          <div class="text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1">CURRENT UNIX EPOCH TIMESTAMP</div>
          <div class="flex flex-wrap items-baseline gap-3">
            <span id="epoch-live-sec" class="text-2xl font-bold text-[#f3eb2c]">${initialSec}</span>
            <span id="epoch-live-utc" class="text-xs text-[#00ffff]">${escapeHtml(now.toUTCString())}</span>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button id="epoch-copy-now" type="button" class="px-3 py-1.5 rounded-lg border border-white/10 bg-black text-[#aaa] hover:text-[#f3eb2c] font-fira text-[11px] uppercase tracking-[0.14em] transition-colors cursor-pointer">COPY NOW</button>
          <button id="epoch-use-now" type="button" class="px-3 py-1.5 rounded-lg border border-[#00ffff]/35 bg-[#00ffff]/10 text-[#00ffff] hover:bg-[#00ffff]/20 font-fira text-[11px] uppercase tracking-[0.14em] transition-colors cursor-pointer">USE CURRENT</button>
          <button id="epoch-pause-btn" type="button" class="px-3 py-1.5 rounded-lg border border-white/10 bg-black text-[#aaa] hover:text-white font-fira text-[11px] uppercase tracking-[0.14em] transition-colors cursor-pointer">PAUSE</button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form id="epoch-ts-form" class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-3">
          <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#f3eb2c]">TIMESTAMP → HUMAN DATE</p>
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div class="sm:col-span-7">
              <label class="block font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585] mb-1">Unix Timestamp</label>
              <input id="tool-primary-input" type="text" class="cyber-input" value="${initialSec}" placeholder="e.g. 1700000000" required />
            </div>
            <div class="sm:col-span-5">
              <label class="block font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585] mb-1">Precision</label>
              <select id="epoch-precision" class="cyber-select w-full">
                <option value="auto" selected>Auto-detect</option>
                <option value="seconds">Seconds (s)</option>
                <option value="milliseconds">Milliseconds (ms)</option>
                <option value="microseconds">Microseconds (µs)</option>
                <option value="nanoseconds">Nanoseconds (ns)</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end">
            ${ctaButton('CONVERT TIMESTAMP')}
          </div>
        </form>

        <form id="epoch-human-form" class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-3">
          <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#00ffff]">HUMAN DATE → TIMESTAMP</p>
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <div><label class="block font-fira text-[9px] text-[#858585] mb-1">YEAR</label><input id="ep-yr" type="number" class="cyber-input" value="${now.getUTCFullYear()}" /></div>
            <div><label class="block font-fira text-[9px] text-[#858585] mb-1">MON</label><input id="ep-mo" type="number" min="1" max="12" class="cyber-input" value="${now.getUTCMonth() + 1}" /></div>
            <div><label class="block font-fira text-[9px] text-[#858585] mb-1">DAY</label><input id="ep-dy" type="number" min="1" max="31" class="cyber-input" value="${now.getUTCDate()}" /></div>
            <div><label class="block font-fira text-[9px] text-[#858585] mb-1">HR</label><input id="ep-hr" type="number" min="0" max="23" class="cyber-input" value="${now.getUTCHours()}" /></div>
            <div><label class="block font-fira text-[9px] text-[#858585] mb-1">MIN</label><input id="ep-mn" type="number" min="0" max="59" class="cyber-input" value="${now.getUTCMinutes()}" /></div>
            <div><label class="block font-fira text-[9px] text-[#858585] mb-1">SEC</label><input id="ep-sc" type="number" min="0" max="59" class="cyber-input" value="${now.getUTCSeconds()}" /></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div class="sm:col-span-5">
              <select id="ep-tz" class="cyber-select w-full">
                <option value="utc" selected>GMT / UTC</option>
                <option value="local">Local Timezone</option>
              </select>
            </div>
            <div class="sm:col-span-7 flex justify-end">
              <button type="submit" class="hero-cta-sm hero-cta-primary cursor-pointer px-4 py-2 rounded-lg font-fira text-xs font-bold tracking-[0.14em] uppercase">HUMAN → EPOCH</button>
            </div>
          </div>
          <div class="flex gap-2 items-center pt-1 border-t border-white/5">
            <input id="ep-str" type="text" class="cyber-input text-xs" placeholder="Or parse ISO / date string (e.g. 2026-11-19T19:59:10Z)" />
            <button id="ep-str-btn" type="button" class="px-3 py-2 rounded-lg border border-white/10 bg-black font-fira text-[11px] text-[#aaa] hover:text-[#00ffff] whitespace-nowrap cursor-pointer">PARSE STRING</button>
          </div>
        </form>
      </div>

      <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-wrap items-center gap-3">
        <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">SECONDS → D/H/M/S:</span>
        <input id="ep-dur-sec" type="number" min="0" step="1" class="cyber-input w-44" value="90061" />
        <span id="ep-dur-out" class="font-fira text-xs text-[#f3eb2c] font-semibold"></span>
      </div>
    </div>
  `;

  const liveSecEl = controlsEl.querySelector<HTMLElement>('#epoch-live-sec')!;
  const liveUtcEl = controlsEl.querySelector<HTMLElement>('#epoch-live-utc')!;
  const pauseBtn = controlsEl.querySelector<HTMLButtonElement>('#epoch-pause-btn')!;
  const tsInput = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!;
  const precisionSelect = controlsEl.querySelector<HTMLSelectElement>('#epoch-precision')!;
  const durInput = controlsEl.querySelector<HTMLInputElement>('#ep-dur-sec')!;
  const durOut = controlsEl.querySelector<HTMLElement>('#ep-dur-out')!;

  const timer = window.setInterval(() => {
    if (clockPaused) return;
    const d = new Date();
    liveSecEl.textContent = String(Math.floor(d.getTime() / 1000));
    liveUtcEl.textContent = d.toUTCString();
  }, 1000);
  activeSpeedCleanup = () => window.clearInterval(timer);

  pauseBtn.addEventListener('click', () => {
    clockPaused = !clockPaused;
    pauseBtn.textContent = clockPaused ? 'RESUME' : 'PAUSE';
  });

  controlsEl.querySelector('#epoch-copy-now')!.addEventListener('click', () => {
    navigator.clipboard?.writeText(liveSecEl.textContent ?? '');
  });

  controlsEl.querySelector('#epoch-use-now')!.addEventListener('click', () => {
    tsInput.value = String(Math.floor(Date.now() / 1000));
    precisionSelect.value = 'auto';
    runTsConversion();
  });

  const renderDuration = () => {
    try {
      const b = breakdownSeconds(Number(durInput.value));
      durOut.textContent = b.formatted;
    } catch (err) {
      durOut.textContent = (err as Error).message;
    }
  };
  durInput.addEventListener('input', renderDuration);
  renderDuration();

  const runTsConversion = () => {
    try {
      const res = convertEpochToDate(tsInput.value, precisionSelect.value as EpochPrecision);
      outputEl.innerHTML = renderEpochCards(res, 'TIMESTAMP');
    } catch (err) {
      showError(outputEl, (err as Error).message);
    }
  };

  controlsEl.querySelector('#epoch-ts-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    runTsConversion();
  });
  tsInput.addEventListener('input', runTsConversion);
  precisionSelect.addEventListener('change', runTsConversion);

  controlsEl.querySelector('#epoch-human-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const res = convertHumanPartsToEpoch({
        year: Number(controlsEl.querySelector<HTMLInputElement>('#ep-yr')!.value),
        month: Number(controlsEl.querySelector<HTMLInputElement>('#ep-mo')!.value),
        day: Number(controlsEl.querySelector<HTMLInputElement>('#ep-dy')!.value),
        hour: Number(controlsEl.querySelector<HTMLInputElement>('#ep-hr')!.value),
        minute: Number(controlsEl.querySelector<HTMLInputElement>('#ep-mn')!.value),
        second: Number(controlsEl.querySelector<HTMLInputElement>('#ep-sc')!.value),
        timezone: controlsEl.querySelector<HTMLSelectElement>('#ep-tz')!.value as 'utc' | 'local',
      });
      outputEl.innerHTML = renderEpochCards(res, 'HUMAN DATE');
    } catch (err) {
      showError(outputEl, (err as Error).message);
    }
  });

  controlsEl.querySelector('#ep-str-btn')!.addEventListener('click', () => {
    try {
      const str = controlsEl.querySelector<HTMLInputElement>('#ep-str')!.value;
      const res = convertDateStringToEpoch(str);
      outputEl.innerHTML = renderEpochCards(res, 'PARSED DATE');
    } catch (err) {
      showError(outputEl, (err as Error).message);
    }
  });

  runTsConversion();
}

const SAMPLE_UNSORTED_JSON = JSON.stringify(
  {
    zebra: true,
    service: {
      port: 3000,
      env: 'production',
      author: 'justanother.engineer',
      alpha: [3, 1, 2],
    },
    regions: ['eu-central-1', 'us-east-1', 'ap-southeast-1'],
    active: true,
    metadata: {
      version: '2.0.0',
      createdAt: '2026-11-19T19:59:10Z',
    },
  },
  null,
  2,
);

function mountJsonSort(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-4 font-fira text-xs text-[#aaa]">
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input id="js-sort-arrays" type="checkbox" class="accent-[#f3eb2c] cursor-pointer" />
            <span>Sort Arrays</span>
          </label>
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input id="js-desc" type="checkbox" class="accent-[#f3eb2c] cursor-pointer" />
            <span>Descending (Z→A)</span>
          </label>
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input id="js-case-ins" type="checkbox" checked class="accent-[#f3eb2c] cursor-pointer" />
            <span>Case-insensitive</span>
          </label>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <select id="js-indent" class="cyber-select">
            <option value="2" selected>2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
            <option value="0">Minified</option>
          </select>
          <button id="js-sample-btn" type="button" class="px-3 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#aaa] hover:text-[#f3eb2c] transition-colors cursor-pointer">SAMPLE</button>
          <button id="js-clear-btn" type="button" class="px-3 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#aaa] hover:text-red-400 transition-colors cursor-pointer">CLEAR</button>
          <button id="js-sort-btn" type="button" class="hero-cta-sm hero-cta-primary px-4 py-2 rounded-lg font-fira text-xs font-bold tracking-[0.14em] uppercase cursor-pointer">SORT JSON</button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-xl border border-white/10 bg-[#050505] p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">
            <span>INPUT JSON</span>
            <span id="js-input-status" class="text-[#00ffff]">READY</span>
          </div>
          <textarea id="js-input" rows="14" spellcheck="false" class="w-full rounded-lg border border-white/10 bg-black p-3 font-fira text-xs text-white focus:outline-none focus:border-[#f3eb2c]/60 resize-y">${escapeHtml(SAMPLE_UNSORTED_JSON)}</textarea>
        </div>

        <div class="rounded-xl border border-white/10 bg-[#050505] p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">
            <span>SORTED JSON OUTPUT</span>
            <div class="flex items-center gap-2">
              <button id="js-use-sorted" type="button" class="text-[10px] text-[#aaa] hover:text-[#00ffff] transition-colors cursor-pointer">← USE AS INPUT</button>
              <button id="js-copy-btn" type="button" class="px-2 py-0.5 rounded border border-white/10 bg-black text-[10px] text-[#f3eb2c] hover:border-[#f3eb2c]/50 transition-colors cursor-pointer">COPY</button>
            </div>
          </div>
          <textarea id="js-output" rows="14" readonly spellcheck="false" class="w-full rounded-lg border border-white/10 bg-black p-3 font-fira text-xs text-emerald-300 focus:outline-none resize-y"></textarea>
        </div>
      </div>
    </div>
  `;

  const inputEl = controlsEl.querySelector<HTMLTextAreaElement>('#js-input')!;
  const outputArea = controlsEl.querySelector<HTMLTextAreaElement>('#js-output')!;
  const statusEl = controlsEl.querySelector<HTMLElement>('#js-input-status')!;
  const sortArraysEl = controlsEl.querySelector<HTMLInputElement>('#js-sort-arrays')!;
  const descEl = controlsEl.querySelector<HTMLInputElement>('#js-desc')!;
  const caseEl = controlsEl.querySelector<HTMLInputElement>('#js-case-ins')!;
  const indentEl = controlsEl.querySelector<HTMLSelectElement>('#js-indent')!;

  const runSort = () => {
    if (!inputEl.value.trim()) {
      outputArea.value = '';
      statusEl.textContent = 'EMPTY';
      statusEl.className = 'text-[#858585]';
      outputEl.innerHTML = '';
      return;
    }

    try {
      const indentVal = indentEl.value === 'tab' ? 'tab' : Number(indentEl.value);
      const res = sortJsonString(inputEl.value, {
        sortArrays: sortArraysEl.checked,
        descending: descEl.checked,
        caseInsensitive: caseEl.checked,
        indent: indentVal,
      });
      outputArea.value = res.formatted;
      statusEl.textContent = 'VALID JSON';
      statusEl.className = 'text-emerald-400';

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${statCard('OBJECT KEYS', String(res.stats.objectKeys), 'yellow')}
          ${statCard('ARRAYS', String(res.stats.arrayCount), 'cyan')}
          ${statCard('MAX DEPTH', String(res.stats.maxDepth), 'white')}
          ${statCard('OUTPUT SIZE', `${res.stats.outputBytes} B`, 'green')}
        </div>
      `;
    } catch (err) {
      outputArea.value = '';
      statusEl.textContent = 'INVALID JSON';
      statusEl.className = 'text-red-400';
      showError(outputEl, (err as Error).message);
    }
  };

  controlsEl.querySelector('#js-sort-btn')!.addEventListener('click', runSort);
  controlsEl.querySelector('#js-sample-btn')!.addEventListener('click', () => {
    inputEl.value = SAMPLE_UNSORTED_JSON;
    runSort();
  });
  controlsEl.querySelector('#js-clear-btn')!.addEventListener('click', () => {
    inputEl.value = '';
    runSort();
  });
  controlsEl.querySelector('#js-use-sorted')!.addEventListener('click', () => {
    if (outputArea.value) {
      inputEl.value = outputArea.value;
      runSort();
    }
  });
  controlsEl.querySelector('#js-copy-btn')!.addEventListener('click', (e) => {
    if (!outputArea.value) return;
    navigator.clipboard?.writeText(outputArea.value);
    const btn = e.currentTarget as HTMLButtonElement;
    btn.textContent = 'COPIED';
    setTimeout(() => {
      btn.textContent = 'COPY';
    }, 1200);
  });

  inputEl.addEventListener('input', runSort);
  sortArraysEl.addEventListener('change', runSort);
  descEl.addEventListener('change', runSort);
  caseEl.addEventListener('change', runSort);
  indentEl.addEventListener('change', runSort);

  runSort();
}

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<service env="production" enabled="true">
  <name>jae-tools</name>
  <port>3000</port>
  <region code="fra" primary="true">eu-central-1</region>
  <region code="iad" primary="false">us-east-1</region>
  <notes><![CDATA[Fast edge diagnostics & network utilities]]></notes>
</service>`;

function flashCopyLabel(btn: HTMLButtonElement, value: string): void {
  if (!value) return;
  navigator.clipboard?.writeText(value);
  btn.textContent = 'COPIED';
  setTimeout(() => {
    btn.textContent = 'COPY';
  }, 1200);
}

function mountXmlToJson(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-4 font-fira text-xs text-[#aaa]">
          <label class="inline-flex items-center gap-2">
            <span>Attr Prefix</span>
            <select id="xml-prefix" class="cyber-select py-1">
              <option value="@" selected>@ (e.g. @id)</option>
              <option value="_">_ (e.g. _id)</option>
              <option value="">None (inline)</option>
            </select>
          </label>
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input id="xml-primitives" type="checkbox" checked class="accent-[#f3eb2c] cursor-pointer" />
            <span>Parse Numbers / Booleans</span>
          </label>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <select id="xml-indent" class="cyber-select">
            <option value="2" selected>2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="0">Minified</option>
          </select>
          <button id="xml-sample-btn" type="button" class="px-3 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#aaa] hover:text-[#f3eb2c] transition-colors cursor-pointer">SAMPLE</button>
          <button id="xml-clear-btn" type="button" class="px-3 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#aaa] hover:text-red-400 transition-colors cursor-pointer">CLEAR</button>
          <button id="xml-convert-btn" type="button" class="hero-cta-sm hero-cta-primary px-4 py-2 rounded-lg font-fira text-xs font-bold tracking-[0.14em] uppercase cursor-pointer">CONVERT TO JSON</button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-xl border border-white/10 bg-[#050505] p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">
            <span>INPUT XML</span>
            <span id="xml-status" class="text-[#00ffff]">READY</span>
          </div>
          <textarea id="xml-input" rows="13" spellcheck="false" class="w-full rounded-lg border border-white/10 bg-black p-3 font-fira text-xs text-white focus:outline-none focus:border-[#f3eb2c]/60 resize-y">${escapeHtml(SAMPLE_XML)}</textarea>
        </div>
        <div class="rounded-xl border border-white/10 bg-[#050505] p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">
            <span>JSON OUTPUT</span>
            <button id="xml-copy-btn" type="button" class="px-2 py-0.5 rounded border border-white/10 bg-black text-[10px] text-[#f3eb2c] hover:border-[#f3eb2c]/50 transition-colors cursor-pointer">COPY</button>
          </div>
          <textarea id="xml-output" rows="13" readonly spellcheck="false" class="w-full rounded-lg border border-white/10 bg-black p-3 font-fira text-xs text-emerald-300 focus:outline-none resize-y"></textarea>
        </div>
      </div>
    </div>
  `;

  const inputEl = controlsEl.querySelector<HTMLTextAreaElement>('#xml-input')!;
  const outputArea = controlsEl.querySelector<HTMLTextAreaElement>('#xml-output')!;
  const statusEl = controlsEl.querySelector<HTMLElement>('#xml-status')!;
  const prefixEl = controlsEl.querySelector<HTMLSelectElement>('#xml-prefix')!;
  const primitivesEl = controlsEl.querySelector<HTMLInputElement>('#xml-primitives')!;
  const indentEl = controlsEl.querySelector<HTMLSelectElement>('#xml-indent')!;

  const runConvert = () => {
    if (!inputEl.value.trim()) {
      outputArea.value = '';
      statusEl.textContent = 'EMPTY';
      statusEl.className = 'text-[#858585]';
      outputEl.innerHTML = '';
      return;
    }
    try {
      const res = convertXmlToJson(inputEl.value, {
        attributePrefix: prefixEl.value,
        parsePrimitives: primitivesEl.checked,
        indent: Number(indentEl.value),
      });
      outputArea.value = res.formatted;
      statusEl.textContent = 'VALID XML';
      statusEl.className = 'text-emerald-400';
      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${statCard('XML ELEMENTS', String(res.stats.elements), 'yellow')}
          ${statCard('ATTRIBUTES', String(res.stats.attributes), 'cyan')}
          ${statCard('XML BYTES', `${res.stats.inputBytes} B`, 'white')}
          ${statCard('JSON BYTES', `${res.stats.outputBytes} B`, 'green')}
        </div>
      `;
    } catch (err) {
      outputArea.value = '';
      statusEl.textContent = 'INVALID XML';
      statusEl.className = 'text-red-400';
      showError(outputEl, (err as Error).message);
    }
  };

  controlsEl.querySelector('#xml-convert-btn')!.addEventListener('click', runConvert);
  controlsEl.querySelector('#xml-sample-btn')!.addEventListener('click', () => {
    inputEl.value = SAMPLE_XML;
    runConvert();
  });
  controlsEl.querySelector('#xml-clear-btn')!.addEventListener('click', () => {
    inputEl.value = '';
    runConvert();
  });
  controlsEl.querySelector('#xml-copy-btn')!.addEventListener('click', (e) => {
    flashCopyLabel(e.currentTarget as HTMLButtonElement, outputArea.value);
  });

  inputEl.addEventListener('input', runConvert);
  prefixEl.addEventListener('change', runConvert);
  primitivesEl.addEventListener('change', runConvert);
  indentEl.addEventListener('change', runConvert);
  runConvert();
}

function mountBase64(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  let op: 'encode' | 'decode' = 'encode';

  controlsEl.innerHTML = `
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" data-b64-op="encode" class="b64-op-btn px-3.5 py-1.5 rounded-lg border font-fira text-xs uppercase tracking-[0.14em] cursor-pointer">ENCODE</button>
          <button type="button" data-b64-op="decode" class="b64-op-btn px-3.5 py-1.5 rounded-lg border font-fira text-xs uppercase tracking-[0.14em] cursor-pointer">DECODE</button>
        </div>
        <div class="flex flex-wrap items-center gap-4 font-fira text-xs text-[#aaa]">
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input id="b64-urlsafe" type="checkbox" class="accent-[#f3eb2c] cursor-pointer" />
            <span>URL-Safe (- / _)</span>
          </label>
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input id="b64-nopad" type="checkbox" class="accent-[#f3eb2c] cursor-pointer" />
            <span>Strip Padding (=)</span>
          </label>
          <button id="b64-swap-btn" type="button" class="px-3 py-1.5 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#00ffff] hover:border-[#00ffff]/50 transition-colors cursor-pointer">⇄ SWAP</button>
          <button id="b64-clear-btn" type="button" class="px-3 py-1.5 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#aaa] hover:text-red-400 transition-colors cursor-pointer">CLEAR</button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-xl border border-white/10 bg-[#050505] p-3 flex flex-col gap-2">
          <span id="b64-in-label" class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">PLAIN TEXT (UTF-8)</span>
          <textarea id="b64-input" rows="8" spellcheck="false" class="w-full rounded-lg border border-white/10 bg-black p-3 font-fira text-xs text-white focus:outline-none focus:border-[#f3eb2c]/60 resize-y">justanother.engineer ⚡ network tools</textarea>
        </div>
        <div class="rounded-xl border border-white/10 bg-[#050505] p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">
            <span id="b64-out-label">BASE64 OUTPUT</span>
            <button id="b64-copy-btn" type="button" class="px-2 py-0.5 rounded border border-white/10 bg-black text-[10px] text-[#f3eb2c] hover:border-[#f3eb2c]/50 transition-colors cursor-pointer">COPY</button>
          </div>
          <textarea id="b64-output" rows="8" readonly spellcheck="false" class="w-full rounded-lg border border-white/10 bg-black p-3 font-fira text-xs text-[#f3eb2c] focus:outline-none resize-y"></textarea>
        </div>
      </div>
    </div>
  `;

  const opBtns = controlsEl.querySelectorAll<HTMLButtonElement>('[data-b64-op]');
  const inputEl = controlsEl.querySelector<HTMLTextAreaElement>('#b64-input')!;
  const outputArea = controlsEl.querySelector<HTMLTextAreaElement>('#b64-output')!;
  const inLabel = controlsEl.querySelector<HTMLElement>('#b64-in-label')!;
  const outLabel = controlsEl.querySelector<HTMLElement>('#b64-out-label')!;
  const urlSafeEl = controlsEl.querySelector<HTMLInputElement>('#b64-urlsafe')!;
  const noPadEl = controlsEl.querySelector<HTMLInputElement>('#b64-nopad')!;

  const syncButtons = () => {
    opBtns.forEach((btn) => {
      const active = btn.dataset.b64Op === op;
      btn.className = active
        ? 'b64-op-btn px-3.5 py-1.5 rounded-lg border border-[#f3eb2c]/60 bg-[#f3eb2c]/15 text-[#f3eb2c] font-fira text-xs font-bold uppercase tracking-[0.14em] cursor-pointer'
        : 'b64-op-btn px-3.5 py-1.5 rounded-lg border border-white/10 bg-[#050505] text-[#858585] hover:text-white font-fira text-xs uppercase tracking-[0.14em] cursor-pointer';
    });
    inLabel.textContent = op === 'encode' ? 'PLAIN TEXT (UTF-8)' : 'BASE64 INPUT';
    outLabel.textContent = op === 'encode' ? 'BASE64 OUTPUT' : 'DECODED TEXT (UTF-8)';
  };

  const renderBase64 = () => {
    syncButtons();
    const raw = inputEl.value;
    if (!raw) {
      outputArea.value = '';
      outputEl.innerHTML = '';
      return;
    }

    try {
      const encoder = new TextEncoder();
      if (op === 'encode') {
        const encoded = encodeBase64Utf8(raw, {
          urlSafe: urlSafeEl.checked,
          stripPadding: noPadEl.checked,
        });
        outputArea.value = encoded;
        outputEl.innerHTML = `
          <div class="grid grid-cols-3 gap-3">
            ${statCard('MODE', urlSafeEl.checked ? 'ENCODE (URL-SAFE)' : 'ENCODE (STD)', 'yellow')}
            ${statCard('INPUT BYTES', `${encoder.encode(raw).length} B`, 'white')}
            ${statCard('OUTPUT CHARS', `${encoded.length}`, 'cyan')}
          </div>
        `;
      } else {
        const res = decodeBase64Utf8(raw);
        outputArea.value = res.text;
        outputEl.innerHTML = `
          <div class="grid grid-cols-3 gap-3">
            ${statCard('MODE', 'DECODE (UTF-8)', 'cyan')}
            ${statCard('DECODED BYTES', `${res.byteLength} B`, 'green')}
            ${statCard('OUTPUT CHARS', `${res.text.length}`, 'white')}
          </div>
        `;
      }
    } catch (err) {
      outputArea.value = '';
      showError(outputEl, (err as Error).message);
    }
  };

  opBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      op = btn.dataset.b64Op as 'encode' | 'decode';
      renderBase64();
    });
  });

  controlsEl.querySelector('#b64-swap-btn')!.addEventListener('click', () => {
    if (outputArea.value) {
      inputEl.value = outputArea.value;
    }
    op = op === 'encode' ? 'decode' : 'encode';
    renderBase64();
  });

  controlsEl.querySelector('#b64-clear-btn')!.addEventListener('click', () => {
    inputEl.value = '';
    renderBase64();
  });

  controlsEl.querySelector('#b64-copy-btn')!.addEventListener('click', (e) => {
    flashCopyLabel(e.currentTarget as HTMLButtonElement, outputArea.value);
  });

  inputEl.addEventListener('input', renderBase64);
  urlSafeEl.addEventListener('change', renderBase64);
  noPadEl.addEventListener('change', renderBase64);
  renderBase64();
}

function mountUrl(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  let op: 'encode' | 'decode' = 'encode';

  controlsEl.innerHTML = `
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" data-url-op="encode" class="url-op-btn px-3.5 py-1.5 rounded-lg border font-fira text-xs uppercase tracking-[0.14em] cursor-pointer">ENCODE</button>
          <button type="button" data-url-op="decode" class="url-op-btn px-3.5 py-1.5 rounded-lg border font-fira text-xs uppercase tracking-[0.14em] cursor-pointer">DECODE</button>
        </div>
        <div class="flex flex-wrap items-center gap-3 font-fira text-xs text-[#aaa]">
          <select id="url-mode" class="cyber-select">
            <option value="component" selected>Component (encodeURIComponent)</option>
            <option value="uri">Full URL (encodeURI)</option>
          </select>
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input id="url-plus" type="checkbox" class="accent-[#f3eb2c] cursor-pointer" />
            <span>Space ↔ +</span>
          </label>
          <button id="url-swap-btn" type="button" class="px-3 py-1.5 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#00ffff] hover:border-[#00ffff]/50 transition-colors cursor-pointer">⇄ SWAP</button>
          <button id="url-clear-btn" type="button" class="px-3 py-1.5 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#aaa] hover:text-red-400 transition-colors cursor-pointer">CLEAR</button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-xl border border-white/10 bg-[#050505] p-3 flex flex-col gap-2">
          <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">INPUT TEXT / URL</span>
          <textarea id="url-input" rows="7" spellcheck="false" class="w-full rounded-lg border border-white/10 bg-black p-3 font-fira text-xs text-white focus:outline-none focus:border-[#f3eb2c]/60 resize-y">https://tools.justanother.engineer/?host=cloudflare.com&tag=edge test & rbl#propagation</textarea>
        </div>
        <div class="rounded-xl border border-white/10 bg-[#050505] p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">
            <span>RESULT OUTPUT</span>
            <button id="url-copy-btn" type="button" class="px-2 py-0.5 rounded border border-white/10 bg-black text-[10px] text-[#f3eb2c] hover:border-[#f3eb2c]/50 transition-colors cursor-pointer">COPY</button>
          </div>
          <textarea id="url-output" rows="7" readonly spellcheck="false" class="w-full rounded-lg border border-white/10 bg-black p-3 font-fira text-xs text-[#f3eb2c] focus:outline-none resize-y"></textarea>
        </div>
      </div>
    </div>
  `;

  const opBtns = controlsEl.querySelectorAll<HTMLButtonElement>('[data-url-op]');
  const inputEl = controlsEl.querySelector<HTMLTextAreaElement>('#url-input')!;
  const outputArea = controlsEl.querySelector<HTMLTextAreaElement>('#url-output')!;
  const modeEl = controlsEl.querySelector<HTMLSelectElement>('#url-mode')!;
  const plusEl = controlsEl.querySelector<HTMLInputElement>('#url-plus')!;

  const syncButtons = () => {
    opBtns.forEach((btn) => {
      const active = btn.dataset.urlOp === op;
      btn.className = active
        ? 'url-op-btn px-3.5 py-1.5 rounded-lg border border-[#f3eb2c]/60 bg-[#f3eb2c]/15 text-[#f3eb2c] font-fira text-xs font-bold uppercase tracking-[0.14em] cursor-pointer'
        : 'url-op-btn px-3.5 py-1.5 rounded-lg border border-white/10 bg-[#050505] text-[#858585] hover:text-white font-fira text-xs uppercase tracking-[0.14em] cursor-pointer';
    });
  };

  const renderUrl = () => {
    syncButtons();
    const raw = inputEl.value;
    if (!raw) {
      outputArea.value = '';
      outputEl.innerHTML = '';
      return;
    }

    try {
      const opts = { mode: modeEl.value as UrlEncodeMode, formSpace: plusEl.checked };
      const out = op === 'encode' ? encodeUrlValue(raw, opts) : decodeUrlValue(raw, opts);
      outputArea.value = out;

      const parsed = inspectUrlQuery(op === 'decode' ? out : raw);
      const paramRows = parsed.params
        .map(
          (p) => `
          <tr class="hover:bg-white/[0.02]">
            <td class="px-4 py-2 text-[#f3eb2c] font-semibold">${escapeHtml(p.key)}</td>
            <td class="px-4 py-2 text-white break-all">${escapeHtml(p.value)}</td>
          </tr>
        `,
        )
        .join('');

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          ${statCard('OPERATION', op.toUpperCase(), 'yellow')}
          ${statCard('INPUT LENGTH', `${raw.length} chars`, 'white')}
          ${statCard('OUTPUT LENGTH', `${out.length} chars`, 'cyan')}
        </div>
        ${
          parsed.params.length > 0 || parsed.isFullUrl
            ? `
          <div class="rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
            <div class="px-4 py-2.5 border-b border-white/10 font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">
              URL &amp; QUERY INSPECTOR ${parsed.origin ? `· ${escapeHtml(parsed.origin)}${escapeHtml(parsed.pathname ?? '')}` : ''}
            </div>
            ${
              parsed.params.length > 0
                ? `<table class="w-full text-left font-fira text-xs">
                    <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-[#858585]">
                      <tr><th class="px-4 py-2">KEY</th><th class="px-4 py-2">DECODED VALUE</th></tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">${paramRows}</tbody>
                  </table>`
                : `<p class="px-4 py-3 font-fira text-xs text-[#858585]">No query parameters detected.</p>`
            }
          </div>
        `
            : ''
        }
      `;
    } catch (err) {
      outputArea.value = '';
      showError(outputEl, (err as Error).message);
    }
  };

  opBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      op = btn.dataset.urlOp as 'encode' | 'decode';
      renderUrl();
    });
  });

  controlsEl.querySelector('#url-swap-btn')!.addEventListener('click', () => {
    if (outputArea.value) inputEl.value = outputArea.value;
    op = op === 'encode' ? 'decode' : 'encode';
    renderUrl();
  });
  controlsEl.querySelector('#url-clear-btn')!.addEventListener('click', () => {
    inputEl.value = '';
    renderUrl();
  });
  controlsEl.querySelector('#url-copy-btn')!.addEventListener('click', (e) => {
    flashCopyLabel(e.currentTarget as HTMLButtonElement, outputArea.value);
  });

  inputEl.addEventListener('input', renderUrl);
  modeEl.addEventListener('change', renderUrl);
  plusEl.addEventListener('change', renderUrl);
  renderUrl();
}

function mountCron(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <div class="flex flex-col gap-3">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div class="md:col-span-8">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Cron Expression (min hour dom mon dow) or @Macro</label>
          <input id="tool-primary-input" type="text" class="cyber-input text-lg tracking-wider" value="*/5 * * * *" placeholder="e.g. 0 9 * * 1-5 or @daily" />
        </div>
        <div class="md:col-span-4 flex flex-wrap gap-2">
          <button type="button" data-cron-ex="* * * * *" class="px-2.5 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-[11px] text-[#aaa] hover:text-[#f3eb2c] cursor-pointer">* * * * *</button>
          <button type="button" data-cron-ex="0 */6 * * *" class="px-2.5 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-[11px] text-[#aaa] hover:text-[#f3eb2c] cursor-pointer">0 */6 * * *</button>
          <button type="button" data-cron-ex="0 0 1 * *" class="px-2.5 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-[11px] text-[#aaa] hover:text-[#f3eb2c] cursor-pointer">0 0 1 * *</button>
          <button type="button" data-cron-ex="15 14 * * MON-FRI" class="px-2.5 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-[11px] text-[#aaa] hover:text-[#f3eb2c] cursor-pointer">Weekdays</button>
        </div>
      </div>
      <div class="grid grid-cols-5 gap-2 text-center font-fira text-[10px] uppercase tracking-[0.14em] text-[#858585]">
        <div class="rounded border border-white/10 bg-[#050505] py-1.5">Minute <span class="text-[#00ffff]">0-59</span></div>
        <div class="rounded border border-white/10 bg-[#050505] py-1.5">Hour <span class="text-[#00ffff]">0-23</span></div>
        <div class="rounded border border-white/10 bg-[#050505] py-1.5">Day (Mo) <span class="text-[#00ffff]">1-31</span></div>
        <div class="rounded border border-white/10 bg-[#050505] py-1.5">Month <span class="text-[#00ffff]">1-12</span></div>
        <div class="rounded border border-white/10 bg-[#050505] py-1.5">Weekday <span class="text-[#00ffff]">0-6</span></div>
      </div>
    </div>
  `;

  const inputEl = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!;

  const renderCron = () => {
    try {
      const res = parseCronExpression(inputEl.value, 10);
      const fieldCards = [
        ['MINUTE', res.fields.minute],
        ['HOUR', res.fields.hour],
        ['DAY OF MONTH', res.fields.dayOfMonth],
        ['MONTH', res.fields.month],
        ['DAY OF WEEK', res.fields.dayOfWeek],
      ] as const;

      const runsRows =
        res.nextRuns.length > 0
          ? res.nextRuns
              .map((iso, idx) => {
                const d = new Date(iso);
                return `
                <tr class="hover:bg-white/[0.02]">
                  <td class="px-4 py-2 text-[#858585]">#${idx + 1}</td>
                  <td class="px-4 py-2 text-[#f3eb2c]">${escapeHtml(iso.replace('T', ' ').replace('.000Z', ' UTC'))}</td>
                  <td class="px-4 py-2 text-white">${escapeHtml(d.toLocaleString())}</td>
                  <td class="px-4 py-2 text-[#00ffff]">${escapeHtml(formatRelativeTime(d.getTime()))}</td>
                </tr>
              `;
              })
              .join('')
          : `<tr><td colspan="4" class="px-4 py-6 text-center text-[#858585]">No matching scheduled run found within the next 5 years.</td></tr>`;

      outputEl.innerHTML = `
        <div class="rounded-xl border border-[#f3eb2c]/40 bg-[#f3eb2c]/[0.06] p-5 text-center">
          <p class="font-fira text-[10px] uppercase tracking-[0.2em] text-[#858585] mb-2">HUMAN SCHEDULE SUMMARY</p>
          <p class="font-fira text-lg md:text-xl font-bold text-[#f3eb2c]">“${escapeHtml(res.summary)}”</p>
          ${res.normalized !== res.expression ? `<p class="font-fira text-xs text-[#00ffff] mt-1.5">Expanded: ${escapeHtml(res.normalized)}</p>` : ''}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          ${fieldCards
            .map(
              ([title, spec]) => `
            <div class="rounded-xl border border-white/10 bg-[#050505] p-3 font-fira">
              <div class="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-[#858585] mb-1">
                <span>${title}</span>
                <span class="text-[#00ffff] font-bold">${escapeHtml(spec.raw)}</span>
              </div>
              <div class="text-xs text-white">${escapeHtml(spec.description)}</div>
            </div>
          `,
            )
            .join('')}
        </div>

        <div class="rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
          <div class="px-4 py-2.5 border-b border-white/10 font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">NEXT 10 SCHEDULED RUNS (UTC REFERENCE)</div>
          <table class="w-full text-left font-fira text-xs">
            <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-[#858585]">
              <tr>
                <th class="px-4 py-2.5">RUN</th>
                <th class="px-4 py-2.5">UTC TIME</th>
                <th class="px-4 py-2.5">LOCAL TIME</th>
                <th class="px-4 py-2.5">IN</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">${runsRows}</tbody>
          </table>
        </div>
      `;
    } catch (err) {
      showError(outputEl, (err as Error).message);
    }
  };

  controlsEl.querySelectorAll<HTMLButtonElement>('[data-cron-ex]').forEach((btn) => {
    btn.addEventListener('click', () => {
      inputEl.value = btn.dataset.cronEx ?? '* * * * *';
      renderCron();
    });
  });

  inputEl.addEventListener('input', renderCron);
  renderCron();
}

function renderHighlightedRegexText(text: string, matches: RegexMatchEntry[]): string {
  if (!text) return '<span class="text-[#666]">Empty test string</span>';
  if (matches.length === 0) return escapeHtml(text);

  let html = '';
  let cursor = 0;

  for (const m of matches) {
    if (m.start < cursor) continue;
    if (m.start > cursor) {
      html += escapeHtml(text.slice(cursor, m.start));
    }
    const isEven = m.matchIndex % 2 === 0;
    const cls = isEven
      ? 'bg-[#f3eb2c]/25 text-[#f3eb2c] border-b-2 border-[#f3eb2c] rounded-xs px-0.5'
      : 'bg-[#00ffff]/20 text-[#00ffff] border-b-2 border-[#00ffff] rounded-xs px-0.5';

    const displayText = m.value.length > 0 ? escapeHtml(m.value) : '∅';
    html += `<mark class="${cls}" title="Match #${m.matchIndex + 1} [${m.start}..${m.end}]">${displayText}</mark>`;
    cursor = m.end;
  }

  if (cursor < text.length) {
    html += escapeHtml(text.slice(cursor));
  }
  return html;
}

const REGEX_PRESETS: ReadonlyArray<{ label: string; pattern: string; flags: string; text: string; replace: string }> = [
  {
    label: 'URL + Named Groups',
    pattern: '(?<proto>https?)://(?<host>[a-zA-Z0-9.-]+)(?::(?<port>\\d+))?(?<path>/[^\\s]*)?',
    flags: 'gm',
    text: 'Check https://tools.justanother.engineer:443/api/me or http://localhost:3000/health',
    replace: '[$<proto>] $<host>$<path>',
  },
  {
    label: 'IPv4 Address',
    pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\b',
    flags: 'g',
    text: 'Resolvers: 1.1.1.1, 8.8.8.8, invalid 999.10.2.1, edge 172.67.171.186',
    replace: '[IP:$&]',
  },
  {
    label: 'Email',
    pattern: '([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
    flags: 'gi',
    text: 'Contact ops@justanother.engineer or admin@jae-labs.dev for alerts.',
    replace: '$1 at $2',
  },
  {
    label: 'SemVer',
    pattern: '\\bv?(?<major>0|[1-9]\\d*)\\.(?<minor>0|[1-9]\\d*)\\.(?<patch>0|[1-9]\\d*)(?:-(?<pre>[0-9A-Za-z.-]+))?\\b',
    flags: 'g',
    text: 'Released v2.4.1-rc.3 and promoted v2.4.0 cleanly.',
    replace: 'major=$<major> minor=$<minor> patch=$<patch>',
  },
];

function mountRegex(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  const initial = REGEX_PRESETS[0]!;
  const activeFlags = new Set(initial.flags.split(''));

  controlsEl.innerHTML = `
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap gap-2">
        ${REGEX_PRESETS.map(
          (p, i) =>
            `<button type="button" data-rx-preset="${i}" class="px-2.5 py-1 rounded-md border border-white/10 bg-[#050505] font-fira text-[11px] text-[#aaa] hover:text-[#f3eb2c] hover:border-[#f3eb2c]/45 transition-colors cursor-pointer">${escapeHtml(p.label)}</button>`,
        ).join('')}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
        <div class="lg:col-span-8">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Regular Expression Pattern</label>
          <div class="flex items-center rounded-lg border border-white/15 bg-black px-3 focus-within:border-[#f3eb2c]/60">
            <span class="font-fira text-sm text-[#858585] select-none">/</span>
            <input id="tool-primary-input" type="text" class="w-full bg-transparent px-2 py-2.5 font-fira text-xs text-[#f3eb2c] focus:outline-none" value="${escapeHtml(initial.pattern)}" placeholder="Enter regex pattern..." />
            <span class="font-fira text-sm text-[#858585] select-none">/</span>
            <span id="rx-flags-label" class="font-fira text-xs text-[#00ffff] ml-1">${escapeHtml(initial.flags)}</span>
          </div>
        </div>
        <div class="lg:col-span-4 flex flex-wrap gap-1.5 justify-end">
          ${(['g', 'i', 'm', 's', 'u'] as const)
            .map(
              (f) =>
                `<button type="button" data-rx-flag="${f}" class="rx-flag-btn px-2.5 py-2 rounded-lg border font-fira text-xs uppercase cursor-pointer" title="Toggle /${f}">${f}</button>`,
            )
            .join('')}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-xl border border-white/10 bg-[#050505] p-3 flex flex-col gap-2">
          <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">TEST STRING</span>
          <textarea id="rx-test" rows="6" spellcheck="false" class="w-full rounded-lg border border-white/10 bg-black p-3 font-fira text-xs text-white focus:outline-none focus:border-[#f3eb2c]/60 resize-y">${escapeHtml(initial.text)}</textarea>
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mt-1">SUBSTITUTION TEMPLATE ($1, $&lt;name&gt;, $&amp;)</label>
          <input id="rx-replace" type="text" class="cyber-input text-xs" value="${escapeHtml(initial.replace)}" placeholder="Optional replacement template" />
        </div>

        <div class="rounded-xl border border-white/10 bg-[#050505] p-3 flex flex-col gap-2">
          <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">LIVE MATCH HIGHLIGHTS</span>
          <pre id="rx-highlighted" class="w-full min-h-[132px] max-h-[220px] overflow-auto rounded-lg border border-white/10 bg-black p-3 font-fira text-xs text-white whitespace-pre-wrap break-all"></pre>
          <div class="flex items-center justify-between font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mt-1">
            <span>SUBSTITUTION RESULT</span>
            <button id="rx-copy-sub" type="button" class="text-[10px] text-[#f3eb2c] hover:underline cursor-pointer">COPY</button>
          </div>
          <pre id="rx-replaced" class="w-full max-h-[84px] overflow-auto rounded-lg border border-white/10 bg-black p-2.5 font-fira text-xs text-emerald-300 whitespace-pre-wrap break-all"></pre>
        </div>
      </div>
    </div>
  `;

  const patternInput = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!;
  const flagsLabel = controlsEl.querySelector<HTMLElement>('#rx-flags-label')!;
  const flagBtns = controlsEl.querySelectorAll<HTMLButtonElement>('[data-rx-flag]');
  const testInput = controlsEl.querySelector<HTMLTextAreaElement>('#rx-test')!;
  const replaceInput = controlsEl.querySelector<HTMLInputElement>('#rx-replace')!;
  const highlightedEl = controlsEl.querySelector<HTMLElement>('#rx-highlighted')!;
  const replacedEl = controlsEl.querySelector<HTMLElement>('#rx-replaced')!;

  const currentFlags = () => Array.from(activeFlags).join('');

  const syncFlags = () => {
    const fStr = currentFlags();
    flagsLabel.textContent = fStr;
    flagBtns.forEach((btn) => {
      const flag = btn.dataset.rxFlag ?? '';
      const active = activeFlags.has(flag);
      btn.className = active
        ? 'rx-flag-btn px-2.5 py-2 rounded-lg border border-[#00ffff]/60 bg-[#00ffff]/15 text-[#00ffff] font-fira text-xs font-bold cursor-pointer'
        : 'rx-flag-btn px-2.5 py-2 rounded-lg border border-white/10 bg-[#050505] text-[#666] hover:text-white font-fira text-xs cursor-pointer';
    });
  };

  const renderRegex = () => {
    syncFlags();
    try {
      const res = evaluateRegex(patternInput.value, currentFlags(), testInput.value, replaceInput.value);
      highlightedEl.innerHTML = renderHighlightedRegexText(testInput.value, res.matches);
      replacedEl.textContent = res.replaced;

      const matchRows =
        res.matches.length > 0
          ? res.matches
              .slice(0, 50)
              .map((m) => {
                const groupsHtml =
                  m.groups.length > 0
                    ? m.groups
                        .map(
                          (g) =>
                            `<span class="inline-block mr-2 mb-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[11px]"><span class="text-[#00ffff]">${escapeHtml(g.name ? g.name : `$${g.index}`)}:</span> <span class="text-white">${escapeHtml(g.value ?? 'undefined')}</span></span>`,
                        )
                        .join('')
                    : '<span class="text-[#666]">None</span>';
                return `
                  <tr class="hover:bg-white/[0.02]">
                    <td class="px-4 py-2 text-[#858585]">#${m.matchIndex + 1}</td>
                    <td class="px-4 py-2 text-[#00ffff] whitespace-nowrap">[${m.start}..${m.end}]</td>
                    <td class="px-4 py-2 text-[#f3eb2c] font-semibold break-all">${escapeHtml(m.value || '∅')}</td>
                    <td class="px-4 py-2">${groupsHtml}</td>
                  </tr>
                `;
              })
              .join('')
          : `<tr><td colspan="4" class="px-4 py-5 text-center text-[#858585]">No matches found.</td></tr>`;

      const tokenRows = res.tokens
        .slice(0, 60)
        .map(
          (t) => `
          <div class="px-3 py-2 flex items-start justify-between gap-3 border-b border-white/5 last:border-b-0 font-fira text-xs">
            <span class="px-2 py-0.5 rounded bg-[#f3eb2c]/15 border border-[#f3eb2c]/35 text-[#f3eb2c] font-bold shrink-0">${escapeHtml(t.token)}</span>
            <span class="text-[#aaa] text-right">${escapeHtml(t.description)}</span>
          </div>
        `,
        )
        .join('');

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${statCard('MATCHES', `${res.matchCount}${res.truncated ? '+' : ''}`, res.matchCount > 0 ? 'green' : 'yellow')}
          ${statCard('FLAGS', `/${res.flags || 'none'}`, 'cyan')}
          ${statCard('TOKENS', String(res.tokens.length), 'white')}
          ${statCard('GROUPS / MATCH', String(res.matches[0]?.groups.length ?? 0), 'white')}
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          <div class="xl:col-span-7 rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
            <div class="px-4 py-2.5 border-b border-white/10 font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">MATCH &amp; CAPTURE GROUP INFORMATION</div>
            <table class="w-full text-left font-fira text-xs">
              <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-[#858585]">
                <tr><th class="px-4 py-2">MATCH</th><th class="px-4 py-2">RANGE</th><th class="px-4 py-2">FULL MATCH</th><th class="px-4 py-2">GROUPS</th></tr>
              </thead>
              <tbody class="divide-y divide-white/5">${matchRows}</tbody>
            </table>
          </div>
          <div class="xl:col-span-5 rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
            <div class="px-4 py-2.5 border-b border-white/10 font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">PATTERN EXPLANATION</div>
            <div class="max-h-[340px] overflow-y-auto">${tokenRows}</div>
          </div>
        </div>
      `;
    } catch (err) {
      highlightedEl.textContent = testInput.value;
      replacedEl.textContent = '';
      showError(outputEl, (err as Error).message);
    }
  };

  flagBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.rxFlag ?? '';
      if (activeFlags.has(f)) activeFlags.delete(f);
      else activeFlags.add(f);
      renderRegex();
    });
  });

  controlsEl.querySelectorAll<HTMLButtonElement>('[data-rx-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = REGEX_PRESETS[Number(btn.dataset.rxPreset)];
      if (!preset) return;
      patternInput.value = preset.pattern;
      testInput.value = preset.text;
      replaceInput.value = preset.replace;
      activeFlags.clear();
      for (const ch of preset.flags) activeFlags.add(ch);
      renderRegex();
    });
  });

  controlsEl.querySelector('#rx-copy-sub')!.addEventListener('click', (e) => {
    flashCopyLabel(e.currentTarget as HTMLButtonElement, replacedEl.textContent ?? '');
  });

  patternInput.addEventListener('input', renderRegex);
  testInput.addEventListener('input', renderRegex);
  replaceInput.addEventListener('input', renderRegex);
  renderRegex();
}

function mountAscii(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <div class="flex flex-col gap-3">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div class="md:col-span-4">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Banner Text (multiline supported)</label>
          <input id="tool-primary-input" type="text" class="cyber-input" value="LUI.Z" placeholder="Type text..." />
        </div>
        <div class="md:col-span-2">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Style</label>
          <select id="ascii-style" class="cyber-select w-full">
            <option value="block" selected>Solid Block (██)</option>
            <option value="shadow">Drop Shadow (█░)</option>
            <option value="cyber">Cyber Shade (▓)</option>
            <option value="banner">Classic Banner (#)</option>
            <option value="dot">Dot Matrix (●)</option>
            <option value="braille">Compact Braille (⣿)</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Frame</label>
          <select id="ascii-frame" class="cyber-select w-full">
            <option value="none" selected>No Frame</option>
            <option value="single">Single (┌─┐)</option>
            <option value="double">Double (╔═╗)</option>
            <option value="cyber">Cyber (//==//)</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Comment</label>
          <select id="ascii-comment" class="cyber-select w-full">
            <option value="none" selected>Raw Text</option>
            <option value="//">// JS / TS / Go</option>
            <option value="#"># Shell / Python</option>
            <option value="/*">/* CSS / C */</option>
            <option value="--">-- SQL</option>
            <option value="html">&lt;!-- HTML --&gt;</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Fill / Spacing</label>
          <div class="flex gap-2">
            <input id="ascii-fill" type="text" maxlength="1" class="cyber-input text-center" value="#" title="Character for Banner mode" />
            <input id="ascii-space" type="number" min="0" max="4" class="cyber-input text-center" value="1" title="Letter spacing" />
          </div>
        </div>
      </div>
    </div>
  `;

  const textInput = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!;
  const styleEl = controlsEl.querySelector<HTMLSelectElement>('#ascii-style')!;
  const frameEl = controlsEl.querySelector<HTMLSelectElement>('#ascii-frame')!;
  const commentEl = controlsEl.querySelector<HTMLSelectElement>('#ascii-comment')!;
  const fillEl = controlsEl.querySelector<HTMLInputElement>('#ascii-fill')!;
  const spaceEl = controlsEl.querySelector<HTMLInputElement>('#ascii-space')!;

  const renderAscii = () => {
    const style = styleEl.value as AsciiStyle;
    fillEl.disabled = style !== 'banner';
    const res = buildAsciiArt(textInput.value || ' ', {
      style,
      fillChar: fillEl.value || '#',
      frame: frameEl.value as AsciiFrame,
      commentPrefix: commentEl.value as AsciiCommentPrefix,
      letterSpacing: Math.max(0, Math.min(4, Number(spaceEl.value) || 0)),
    });

    outputEl.innerHTML = `
      <div class="grid grid-cols-3 gap-3">
        ${statCard('STYLE', style.toUpperCase(), 'yellow')}
        ${statCard('DIMENSIONS', `${res.columns} × ${res.lines}`, 'cyan')}
        ${statCard('CHARS', String(res.characterCount), 'white')}
      </div>
      <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
        <div class="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
          <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">ASCII PREVIEW</span>
          <div class="flex items-center gap-2">
            <button id="ascii-dl-btn" type="button" class="px-2.5 py-1 rounded border border-white/10 bg-black font-fira text-[10px] text-[#00ffff] hover:border-[#00ffff]/50 cursor-pointer">DOWNLOAD .TXT</button>
            <button id="ascii-copy-btn" type="button" class="px-2.5 py-1 rounded border border-white/10 bg-black font-fira text-[10px] text-[#f3eb2c] hover:border-[#f3eb2c]/50 cursor-pointer">COPY</button>
          </div>
        </div>
        <pre class="p-4 font-fira text-xs leading-[1.18] text-[#f3eb2c] overflow-x-auto select-all">${escapeHtml(res.art)}</pre>
      </div>
    `;

    outputEl.querySelector('#ascii-copy-btn')!.addEventListener('click', (e) => {
      flashCopyLabel(e.currentTarget as HTMLButtonElement, res.art);
    });
    outputEl.querySelector('#ascii-dl-btn')!.addEventListener('click', () => {
      const blob = new Blob([res.art + '\n'], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ascii-art.txt';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  textInput.addEventListener('input', renderAscii);
  styleEl.addEventListener('change', renderAscii);
  frameEl.addEventListener('change', renderAscii);
  commentEl.addEventListener('change', renderAscii);
  fillEl.addEventListener('input', renderAscii);
  spaceEl.addEventListener('input', renderAscii);
  renderAscii();
}

function mountIpv4ToIpv6(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <form id="tool-form" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div class="md:col-span-9">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">IPv4 Address or Embedded IPv6 (e.g. 192.0.2.1, ::ffff:8.8.8.8, 2002:c000:201::)</label>
        <input id="tool-primary-input" type="text" class="cyber-input" value="192.0.2.1" placeholder="e.g. 192.0.2.1 or ::ffff:192.0.2.1" required />
      </div>
      <div class="md:col-span-3 flex justify-end">
        ${ctaButton('CONVERT IP')}
      </div>
    </form>
  `;

  const inputEl = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!;

  const renderIpConv = () => {
    const raw = inputEl.value.trim();
    if (!raw) {
      outputEl.innerHTML = '';
      return;
    }

    try {
      const res = convertIpv4ToIpv6(raw);
      const rows: Array<[string, string, string]> = [
        ['IPv4-Mapped (Dotted)', res.ipv4MappedDotted, 'RFC 4291 dual-stack sockets'],
        ['IPv4-Mapped (Compressed)', res.ipv4MappedCompressed, 'Short hex representation'],
        ['IPv4-Mapped (Expanded)', res.ipv4MappedExpanded, 'Full 128-bit lowercase hex'],
        ['6to4 Prefix (/48)', res.sixToFourPrefix, 'RFC 3056 2002::/16 prefix'],
        ['6to4 (Expanded)', res.sixToFourExpanded, 'Full 128-bit 6to4 base address'],
        ['NAT64 (Dotted)', res.nat64Dotted, 'RFC 6052 Well-Known Prefix'],
        ['NAT64 (Compressed)', res.nat64Compressed, 'Short hex NAT64 form'],
        ['NAT64 (Expanded)', res.nat64Expanded, 'Full 128-bit NAT64 form'],
        ['IPv4-Compatible (Deprecated)', res.ipv4CompatibleCompressed, 'RFC 4291 legacy ::/96'],
        ['ISATAP Interface Suffix', res.isatapSuffix, 'RFC 5214 intra-site automatic tunnel'],
        ['Decimal / Hex Integer', `${res.ipv4Decimal} (${res.ipv4Hex})`, 'Unsigned 32-bit IPv4 scalar'],
        ['Binary Octets', res.ipv4Binary, '32-bit binary representation'],
        ['IPv6 PTR (ip6.arpa)', res.ipv6PtrArpa, 'Reverse DNS nibble zone'],
      ];

      outputEl.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          ${statCard('RESOLVED IPv4', res.ipv4, 'yellow')}
          ${statCard('DETECTED INPUT', res.sourceType, 'cyan')}
          ${statCard('IPv4-MAPPED IPv6', res.ipv4MappedCompressed, 'green')}
        </div>
        <div class="rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
          <table class="w-full text-left font-fira text-xs">
            <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-[#858585]">
              <tr>
                <th class="px-4 py-2.5">FORMAT</th>
                <th class="px-4 py-2.5">CONVERTED ADDRESS / VALUE</th>
                <th class="px-4 py-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              ${rows
                .map(
                  ([label, value, note]) => `
                <tr class="hover:bg-white/[0.02]">
                  <td class="px-4 py-2.5">
                    <div class="text-white font-semibold">${escapeHtml(label)}</div>
                    <div class="text-[11px] text-[#858585]">${escapeHtml(note)}</div>
                  </td>
                  <td class="px-4 py-2.5 text-[#f3eb2c] break-all font-semibold">${escapeHtml(value)}</td>
                  <td class="px-4 py-2.5 text-right">
                    <button type="button" data-copy-ip6="${escapeHtml(value)}" class="px-2.5 py-1 rounded border border-white/10 bg-black font-fira text-[10px] text-[#00ffff] hover:border-[#00ffff]/50 cursor-pointer">COPY</button>
                  </td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;

      outputEl.querySelectorAll<HTMLButtonElement>('[data-copy-ip6]').forEach((btn) => {
        btn.addEventListener('click', () => {
          flashCopyLabel(btn, btn.dataset.copyIp6 ?? '');
        });
      });
    } catch (err) {
      showError(outputEl, (err as Error).message);
    }
  };

  controlsEl.querySelector<HTMLFormElement>('#tool-form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    renderIpConv();
  });
  inputEl.addEventListener('input', renderIpConv);
  renderIpConv();
}

function spfVerdictColor(verdict: SpfVerdict): 'green' | 'red' | 'yellow' | 'cyan' {
  if (verdict === 'pass') return 'green';
  if (verdict === 'fail' || verdict === 'permerror') return 'red';
  if (verdict === 'softfail' || verdict === 'temperror') return 'yellow';
  return 'cyan';
}

function mountSpf(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  let mode: 'basic' | 'advanced' = 'basic';

  controlsEl.innerHTML = `
    <form id="tool-form" class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <button type="button" data-spf-mode="basic" class="spf-mode-btn px-3.5 py-1.5 rounded-lg border font-fira text-xs uppercase tracking-[0.14em] cursor-pointer">BASIC</button>
          <button type="button" data-spf-mode="advanced" class="spf-mode-btn px-3.5 py-1.5 rounded-lg border font-fira text-xs uppercase tracking-[0.14em] cursor-pointer">ADVANCED</button>
        </div>
        <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">RFC 7208 · 10-LOOKUP &amp; MACRO SIMULATOR</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div class="md:col-span-5">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Domain Name (or MAIL FROM domain)</label>
          <input id="tool-primary-input" type="text" class="cyber-input" value="gmail.com" placeholder="e.g. gmail.com or justanother.engineer" required />
        </div>
        <div class="md:col-span-4">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Sending Server IP (Optional for Basic audit)</label>
          <input id="spf-ip" type="text" class="cyber-input" placeholder="e.g. 209.85.220.41" />
        </div>
        <div class="md:col-span-3 flex justify-end">
          ${ctaButton('TEST SPF POLICY')}
        </div>
      </div>

      <div id="spf-advanced-pane" class="hidden rounded-xl border border-[#00ffff]/25 bg-[#050505] p-4 flex flex-col gap-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">MAIL FROM / Return-Path Address</label>
            <input id="spf-sender" type="text" class="cyber-input text-xs" placeholder="e.g. bounce@gmail.com" />
          </div>
          <div>
            <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">HELO / EHLO Hostname</label>
            <input id="spf-helo" type="text" class="cyber-input text-xs" placeholder="e.g. mail-sor-f41.google.com" />
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Custom / Pre-Publish SPF Record Override (Optional)</label>
            <button id="spf-fill-custom" type="button" class="font-fira text-[10px] text-[#00ffff] hover:underline cursor-pointer">LOAD SAMPLE POLICY</button>
          </div>
          <textarea id="spf-custom" rows="2" spellcheck="false" class="w-full rounded-lg border border-white/10 bg-black p-2.5 font-fira text-xs text-[#f3eb2c] focus:outline-none focus:border-[#f3eb2c]/60 resize-y" placeholder="Leave blank to query live DNS TXT, or paste draft e.g. v=spf1 ip4:198.51.100.0/24 include:_spf.google.com ~all"></textarea>
        </div>
      </div>
    </form>
  `;

  const modeBtns = controlsEl.querySelectorAll<HTMLButtonElement>('[data-spf-mode]');
  const advPane = controlsEl.querySelector<HTMLElement>('#spf-advanced-pane')!;
  const domainInput = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!;
  const ipInput = controlsEl.querySelector<HTMLInputElement>('#spf-ip')!;
  const senderInput = controlsEl.querySelector<HTMLInputElement>('#spf-sender')!;
  const heloInput = controlsEl.querySelector<HTMLInputElement>('#spf-helo')!;
  const customInput = controlsEl.querySelector<HTMLTextAreaElement>('#spf-custom')!;

  const syncModeUi = () => {
    modeBtns.forEach((btn) => {
      const selected = btn.dataset.spfMode === mode;
      btn.className = selected
        ? 'spf-mode-btn px-3.5 py-1.5 rounded-lg border border-[#f3eb2c]/60 bg-[#f3eb2c]/15 text-[#f3eb2c] font-fira text-xs font-bold uppercase tracking-[0.14em] cursor-pointer'
        : 'spf-mode-btn px-3.5 py-1.5 rounded-lg border border-white/10 bg-[#050505] text-[#858585] hover:text-white font-fira text-xs uppercase tracking-[0.14em] cursor-pointer';
    });
    advPane.classList.toggle('hidden', mode !== 'advanced');
  };

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.spfMode as 'basic' | 'advanced';
      syncModeUi();
    });
  });

  controlsEl.querySelector('#spf-fill-custom')!.addEventListener('click', () => {
    customInput.value = 'v=spf1 ip4:198.51.100.0/24 include:_spf.google.com ~all';
    if (!ipInput.value.trim()) ipInput.value = '198.51.100.42';
  });

  syncModeUi();

  controlsEl.querySelector<HTMLFormElement>('#tool-form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const domain = domainInput.value.trim();
    if (!domain) return;

    activeAbort?.abort();
    activeAbort = new AbortController();
    showLoading(outputEl, `Evaluating RFC 7208 SPF policy for ${domain}...`);

    try {
      const payload = {
        domain,
        senderIp: ipInput.value.trim() || undefined,
        sender: mode === 'advanced' ? senderInput.value.trim() || undefined : undefined,
        helo: mode === 'advanced' ? heloInput.value.trim() || undefined : undefined,
        customRecord: mode === 'advanced' ? customInput.value.trim() || undefined : undefined,
      };

      const res = await fetch('/api/spf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: activeAbort.signal,
      });
      const data = (await res.json()) as SpfTestResult & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `Request failed with HTTP ${res.status}`);
      }

      const traceRows =
        data.trace.length > 0
          ? data.trace
              .map((step) => {
                const indent = step.depth * 18;
                const badge =
                  step.matched === true
                    ? `<span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-bold text-[10px]">MATCH (${escapeHtml((step.result ?? 'pass').toUpperCase())})</span>`
                    : step.result === 'permerror' || step.result === 'temperror'
                      ? `<span class="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/35 text-red-400 font-bold text-[10px]">${escapeHtml(step.result.toUpperCase())}</span>`
                      : step.matched === false
                        ? `<span class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#858585] text-[10px]">NO MATCH</span>`
                        : `<span class="px-2 py-0.5 rounded bg-[#00ffff]/10 border border-[#00ffff]/30 text-[#00ffff] text-[10px]">INFO</span>`;

                return `
                  <tr class="hover:bg-white/[0.02]">
                    <td class="px-4 py-2 text-[#858585] whitespace-nowrap" style="padding-left:${16 + indent}px">
                      ${step.depth > 0 ? '↳ ' : ''}${escapeHtml(step.domain)}
                    </td>
                    <td class="px-4 py-2 text-[#f3eb2c] font-semibold break-all">
                      ${escapeHtml(step.term)}
                      ${step.expandedTerm !== step.term ? `<div class="text-[10px] text-[#00ffff]">→ ${escapeHtml(step.expandedTerm)}</div>` : ''}
                    </td>
                    <td class="px-4 py-2 text-center whitespace-nowrap">${step.dnsLookupDelta > 0 ? `+${step.dnsLookupDelta}` : '--'}</td>
                    <td class="px-4 py-2">${badge}</td>
                    <td class="px-4 py-2 text-[#aaa]">${escapeHtml(step.detail)}</td>
                  </tr>
                `;
              })
              .join('')
          : `<tr><td colspan="5" class="px-4 py-6 text-center text-[#858585]">No evaluation trace steps recorded.</td></tr>`;

      const warningsHtml =
        data.warnings.length > 0
          ? `<div class="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 font-fira text-xs text-amber-200 flex flex-col gap-1">
              ${data.warnings.map((w) => `<div>⚠ ${escapeHtml(w)}</div>`).join('')}
            </div>`
          : '';

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          ${statCard('VERDICT', data.senderIp ? data.verdict.toUpperCase() : `AUDIT (${data.verdict.toUpperCase()})`, spfVerdictColor(data.verdict))}
          ${statCard('DNS LOOKUPS', `${data.dnsLookups} / ${data.maxDnsLookups}`, data.dnsLookups > data.maxDnsLookups ? 'red' : data.dnsLookups >= 8 ? 'yellow' : 'green')}
          ${statCard('VOID LOOKUPS', `${data.voidLookups} / ${data.maxVoidLookups}`, data.voidLookups > data.maxVoidLookups ? 'red' : 'white')}
          ${statCard('MATCHED TERM', data.matchedMechanism ?? (data.senderIp ? 'Fallback' : 'Policy Audit'), 'cyan')}
          ${statCard('ELAPSED', `${data.elapsedMs} ms`, 'white')}
        </div>

        ${warningsHtml}

        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 font-fira text-xs flex flex-col gap-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-[10px] uppercase tracking-[0.18em] text-[#858585]">${data.usedCustomRecord ? 'CUSTOM OVERRIDE SPF POLICY' : 'PUBLISHED TXT SPF RECORD'} (${escapeHtml(data.domain)})</span>
            <span class="text-[10px] text-[#00ffff]">SENDER: ${escapeHtml(data.sender)} · HELO: ${escapeHtml(data.helo)}</span>
          </div>
          <pre class="rounded-lg border border-white/10 bg-black p-3 text-[#f3eb2c] whitespace-pre-wrap break-all">${escapeHtml(data.record ?? '; No v=spf1 record')}</pre>
          ${
            data.includes.length > 0
              ? `<div class="text-[11px] text-[#aaa] mt-1">Includes / Redirects: <span class="text-[#00ffff]">${escapeHtml(data.includes.join(', '))}</span></div>`
              : ''
          }
          ${
            data.authorizedNetworks.length > 0
              ? `<div class="text-[11px] text-[#aaa]">Authorized Networks (${data.authorizedNetworks.length}): <span class="text-white break-all">${escapeHtml(data.authorizedNetworks.slice(0, 20).join(', '))}${data.authorizedNetworks.length > 20 ? ` (+${data.authorizedNetworks.length - 20} more)` : ''}</span></div>`
              : ''
          }
        </div>

        <div class="rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
          <div class="px-4 py-2.5 border-b border-white/10 font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">RFC 7208 EVALUATION TRACE TREE</div>
          <table class="w-full text-left font-fira text-xs">
            <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-[#858585]">
              <tr>
                <th class="px-4 py-2.5">SCOPE DOMAIN</th>
                <th class="px-4 py-2.5">MECHANISM / TERM</th>
                <th class="px-4 py-2.5 text-center">DNS</th>
                <th class="px-4 py-2.5">RESULT</th>
                <th class="px-4 py-2.5">DETAILS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">${traceRows}</tbody>
          </table>
        </div>

        ${rawOutputBlock('SPF EVALUATION JSON REPORT', JSON.stringify(data, null, 2), data)}
      `;
      bindCopyButtons(outputEl, data);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        showError(outputEl, (err as Error).message);
      }
    }
  });
}

function mountDays(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  const todayIso = formatIsoDateUtc(new Date());
  const in30Iso = formatIsoDateUtc(new Date(Date.now() + 30 * 86_400_000));
  let mode: 'offset' | 'diff' = 'offset';

  controlsEl.innerHTML = `
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <button type="button" data-days-mode="offset" class="days-mode-btn px-3.5 py-1.5 rounded-lg border font-fira text-xs uppercase tracking-[0.14em] cursor-pointer">FROM / AGO (± DAYS)</button>
          <button type="button" data-days-mode="diff" class="days-mode-btn px-3.5 py-1.5 rounded-lg border font-fira text-xs uppercase tracking-[0.14em] cursor-pointer">BETWEEN DATES</button>
        </div>
        <span id="days-country-note" class="font-fira text-[11px] text-[#00ffff]"></span>
      </div>

      <div id="days-pane-offset" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div class="md:col-span-3">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Start Date</label>
          <div class="flex gap-1.5">
            <input id="days-start" type="date" class="cyber-input" value="${todayIso}" />
            <button id="days-today-btn" type="button" class="px-2.5 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-[10px] text-[#aaa] hover:text-[#f3eb2c] cursor-pointer">TODAY</button>
          </div>
        </div>
        <div class="md:col-span-3">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Direction</label>
          <select id="days-dir" class="cyber-select w-full">
            <option value="forward" selected>In N Days / Hours (Future)</option>
            <option value="backward">N Days / Hours Ago (Past)</option>
          </select>
        </div>
        <div class="md:col-span-3">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Amount</label>
          <input id="tool-primary-input" type="number" min="0" step="any" class="cyber-input" value="15" />
        </div>
        <div class="md:col-span-3">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Unit</label>
          <select id="days-unit" class="cyber-select w-full">
            <option value="days" selected>Days</option>
            <option value="hours">Work Hours (convert to days)</option>
          </select>
        </div>
      </div>

      <div id="days-pane-diff" class="hidden grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div class="md:col-span-5">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">From Date</label>
          <input id="days-diff-from" type="date" class="cyber-input" value="${todayIso}" />
        </div>
        <div class="md:col-span-5">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">To Date</label>
          <input id="days-diff-to" type="date" class="cyber-input" value="${in30Iso}" />
        </div>
        <div class="md:col-span-2 flex justify-end">
          <button id="days-swap-dates" type="button" class="px-3 py-2.5 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#00ffff] hover:border-[#00ffff]/50 cursor-pointer w-full">⇄ SWAP</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-xl border border-white/10 bg-[#050505] p-3">
        <div class="md:col-span-3">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Country Holidays</label>
          <select id="days-country" class="cyber-select w-full">
            ${COUNTRY_CONFIGS.map((c) => `<option value="${c.code}" ${c.code === 'IE' ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="md:col-span-2">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Hours / Day</label>
          <input id="days-hours" type="number" min="0.5" max="24" step="0.5" class="cyber-input" value="8" />
        </div>
        <div class="md:col-span-4 flex flex-wrap items-center gap-4 pb-2 font-fira text-xs text-[#aaa]">
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input id="days-skip-weekends" type="checkbox" checked class="accent-[#f3eb2c] cursor-pointer" />
            <span>Skip Weekends</span>
          </label>
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input id="days-skip-holidays" type="checkbox" checked class="accent-[#f3eb2c] cursor-pointer" />
            <span>Skip Holidays</span>
          </label>
        </div>
        <div class="md:col-span-3">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Extra Holidays (YYYY-MM-DD, ...)</label>
          <input id="days-custom" type="text" class="cyber-input text-xs" placeholder="e.g. 2026-12-24" />
        </div>
      </div>
    </div>
  `;

  const modeBtns = controlsEl.querySelectorAll<HTMLButtonElement>('[data-days-mode]');
  const paneOffset = controlsEl.querySelector<HTMLElement>('#days-pane-offset')!;
  const paneDiff = controlsEl.querySelector<HTMLElement>('#days-pane-diff')!;
  const startEl = controlsEl.querySelector<HTMLInputElement>('#days-start')!;
  const dirEl = controlsEl.querySelector<HTMLSelectElement>('#days-dir')!;
  const amountEl = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!;
  const unitEl = controlsEl.querySelector<HTMLSelectElement>('#days-unit')!;
  const diffFromEl = controlsEl.querySelector<HTMLInputElement>('#days-diff-from')!;
  const diffToEl = controlsEl.querySelector<HTMLInputElement>('#days-diff-to')!;
  const countryEl = controlsEl.querySelector<HTMLSelectElement>('#days-country')!;
  const hoursEl = controlsEl.querySelector<HTMLInputElement>('#days-hours')!;
  const skipWeekendsEl = controlsEl.querySelector<HTMLInputElement>('#days-skip-weekends')!;
  const skipHolidaysEl = controlsEl.querySelector<HTMLInputElement>('#days-skip-holidays')!;
  const customEl = controlsEl.querySelector<HTMLInputElement>('#days-custom')!;
  const noteEl = controlsEl.querySelector<HTMLElement>('#days-country-note')!;

  const syncModeUi = () => {
    modeBtns.forEach((btn) => {
      const selected = btn.dataset.daysMode === mode;
      btn.className = selected
        ? 'days-mode-btn px-3.5 py-1.5 rounded-lg border border-[#f3eb2c]/60 bg-[#f3eb2c]/15 text-[#f3eb2c] font-fira text-xs font-bold uppercase tracking-[0.14em] cursor-pointer'
        : 'days-mode-btn px-3.5 py-1.5 rounded-lg border border-white/10 bg-[#050505] text-[#858585] hover:text-white font-fira text-xs uppercase tracking-[0.14em] cursor-pointer';
    });
    paneOffset.classList.toggle('hidden', mode !== 'offset');
    paneDiff.classList.toggle('hidden', mode !== 'diff');
    const cfg = getCountryConfig(countryEl.value as CountryCode);
    noteEl.textContent = `${cfg.name} · ${cfg.workweekNote}`;
  };

  const renderHolidaysPanel = (title: string, holidays: Array<{ date: string; name: string; weekday: string; wasWeekend: boolean }>) => {
    if (holidays.length === 0) {
      return `
        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 font-fira text-xs text-[#858585]">
          ${escapeHtml(title)}: None falling inside this range.
        </div>
      `;
    }
    return `
      <div class="rounded-xl border border-white/10 bg-[#050505] overflow-x-auto">
        <div class="px-4 py-2.5 border-b border-white/10 font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">${escapeHtml(title)} (${holidays.length})</div>
        <table class="w-full text-left font-fira text-xs">
          <thead class="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-[#858585]">
            <tr><th class="px-4 py-2">DATE</th><th class="px-4 py-2">DAY</th><th class="px-4 py-2">HOLIDAY NAME</th></tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            ${holidays
              .map(
                (h) => `
              <tr class="hover:bg-white/[0.02]">
                <td class="px-4 py-2 text-[#f3eb2c] whitespace-nowrap">${escapeHtml(h.date)}</td>
                <td class="px-4 py-2 text-[#00ffff]">${escapeHtml(h.weekday)}${h.wasWeekend ? ' (Weekend)' : ''}</td>
                <td class="px-4 py-2 text-white">${escapeHtml(h.name)}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const renderDays = () => {
    syncModeUi();
    const customDates = customEl.value
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const countryCode = countryEl.value as CountryCode;
    const hoursPerDay = Number(hoursEl.value);

    try {
      if (mode === 'offset') {
        const res = calculateWorkdaysOffset({
          startDate: startEl.value,
          direction: dirEl.value as 'forward' | 'backward',
          amount: Number(amountEl.value || 0),
          unit: unitEl.value as 'days' | 'hours',
          countryCode,
          skipWeekends: skipWeekendsEl.checked,
          skipHolidays: skipHolidaysEl.checked,
          hoursPerDay: Number.isFinite(hoursPerDay) && hoursPerDay > 0 ? hoursPerDay : undefined,
          customHolidayDates: customDates,
        });

        const dayTypeLabel = skipWeekendsEl.checked || skipHolidaysEl.checked ? 'WORKING DAYS' : 'DAYS';
        outputEl.innerHTML = `
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            ${statCard('RESULT DATE', `${res.targetDate} (${res.targetWeekday})`, 'yellow')}
            ${statCard(dayTypeLabel, `${res.countedDays} d${res.partialFinalDayHours !== null ? ` (${res.partialFinalDayHours}h final)` : ''}`, 'cyan')}
            ${statCard('EFFORT HOURS', `${res.totalHours} h @ ${res.hoursPerDay}h/d`, 'green')}
            ${statCard('CALENDAR SPAN', `${res.calendarDays} days`, 'white')}
            ${statCard('SKIPPED', `${res.skippedWeekends} wknd · ${res.skippedHolidaysCount} hol`, 'white')}
          </div>
          ${renderHolidaysPanel(`SKIPPED PUBLIC HOLIDAYS (${res.country.name})`, res.skippedHolidays)}
        `;
      } else {
        const res = calculateWorkdaysDiff({
          startDate: diffFromEl.value,
          endDate: diffToEl.value,
          countryCode,
          skipWeekends: skipWeekendsEl.checked,
          skipHolidays: skipHolidaysEl.checked,
          hoursPerDay: Number.isFinite(hoursPerDay) && hoursPerDay > 0 ? hoursPerDay : undefined,
          customHolidayDates: customDates,
        });

        outputEl.innerHTML = `
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            ${statCard('WORKING DAYS', String(res.workingDays), 'yellow')}
            ${statCard('TOTAL WORK HOURS', `${res.totalWorkHours} h @ ${res.hoursPerDay}h/d`, 'green')}
            ${statCard('CALENDAR DAYS', String(res.calendarDays), 'cyan')}
            ${statCard('WEEKEND DAYS', String(res.weekendDays), 'white')}
            ${statCard('HOLIDAYS IN RANGE', String(res.holidaysCount), 'white')}
          </div>
          ${renderHolidaysPanel(`PUBLIC HOLIDAYS IN WINDOW (${res.country.name})`, res.holidaysInRange)}
        `;
      }
    } catch (err) {
      showError(outputEl, (err as Error).message);
    }
  };

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.daysMode as 'offset' | 'diff';
      renderDays();
    });
  });

  countryEl.addEventListener('change', () => {
    const cfg = getCountryConfig(countryEl.value as CountryCode);
    hoursEl.value = String(cfg.standardHoursPerDay);
    renderDays();
  });

  controlsEl.querySelector('#days-today-btn')!.addEventListener('click', () => {
    startEl.value = formatIsoDateUtc(new Date());
    renderDays();
  });

  controlsEl.querySelector('#days-swap-dates')!.addEventListener('click', () => {
    const tmp = diffFromEl.value;
    diffFromEl.value = diffToEl.value;
    diffToEl.value = tmp;
    renderDays();
  });

  for (const el of [
    startEl,
    dirEl,
    amountEl,
    unitEl,
    diffFromEl,
    diffToEl,
    hoursEl,
    skipWeekendsEl,
    skipHolidaysEl,
    customEl,
  ]) {
    el.addEventListener('input', renderDays);
    el.addEventListener('change', renderDays);
  }

  renderDays();
}

function mountUnits(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  controlsEl.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-3">
        <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#f3eb2c]">DATA &amp; BANDWIDTH CONVERTER</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <select id="unit-category" class="cyber-select">
            <option value="data" selected>Data Storage</option>
            <option value="bandwidth">Bandwidth / Speed</option>
          </select>
          <input id="unit-value" type="number" step="any" min="0" class="cyber-input" value="1" />
          <select id="unit-from" class="cyber-select"></select>
        </div>
      </div>

      <div class="rounded-xl border border-[#00ffff]/25 bg-[#050505] p-4 flex flex-col gap-3">
        <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#00ffff]">TRANSFER TIME ESTIMATOR</p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input id="eta-size" type="number" step="any" min="0" class="cyber-input" value="10" />
          <select id="eta-size-unit" class="cyber-select">
            ${DATA_UNITS.filter((u) => ['MB', 'GB', 'TB', 'MiB', 'GiB'].includes(u.id))
              .map((u) => `<option value="${u.id}" ${u.id === 'GB' ? 'selected' : ''}>${u.symbol}</option>`)
              .join('')}
          </select>
          <input id="eta-speed" type="number" step="any" min="0.001" class="cyber-input" value="100" />
          <select id="eta-speed-unit" class="cyber-select">
            ${BANDWIDTH_UNITS.filter((u) => ['Mbps', 'Gbps', 'MB/s', 'GB/s'].includes(u.id))
              .map((u) => `<option value="${u.id}" ${u.id === 'Mbps' ? 'selected' : ''}>${u.symbol}</option>`)
              .join('')}
          </select>
        </div>
        <div class="flex items-center justify-between pt-1 font-fira text-xs">
          <span class="text-[#858585]">ESTIMATED TIME:</span>
          <span id="eta-result" class="text-lg font-bold text-[#f3eb2c]">--</span>
        </div>
      </div>
    </div>
  `;

  const catEl = controlsEl.querySelector<HTMLSelectElement>('#unit-category')!;
  const valEl = controlsEl.querySelector<HTMLInputElement>('#unit-value')!;
  const fromEl = controlsEl.querySelector<HTMLSelectElement>('#unit-from')!;

  const populateUnitOptions = () => {
    const list = catEl.value === 'bandwidth' ? BANDWIDTH_UNITS : DATA_UNITS;
    const defaultId = catEl.value === 'bandwidth' ? 'Mbps' : 'GB';
    fromEl.innerHTML = list
      .map((u) => `<option value="${u.id}" ${u.id === defaultId ? 'selected' : ''}>${u.symbol} — ${u.label}</option>`)
      .join('');
  };

  const renderConversions = () => {
    const list = catEl.value === 'bandwidth' ? BANDWIDTH_UNITS : DATA_UNITS;
    const num = Number(valEl.value);
    const rows = convertUnits(num, fromEl.value, list);

    outputEl.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        ${rows
          .map(
            (r) => `
            <div class="rounded-xl border ${r.id === fromEl.value ? 'border-[#f3eb2c]/60 bg-[#f3eb2c]/5' : 'border-white/10 bg-[#050505]'} px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <div class="font-fira text-xs font-bold text-white">${escapeHtml(r.symbol)}</div>
                <div class="text-[11px] text-[#858585]">${escapeHtml(r.label)}</div>
              </div>
              <div class="font-fira text-sm font-bold text-[#00ffff] text-right break-all">${escapeHtml(r.formatted)}</div>
            </div>
          `,
          )
          .join('')}
      </div>
    `;
  };

  const renderEta = () => {
    const size = Number(controlsEl.querySelector<HTMLInputElement>('#eta-size')!.value);
    const sizeUnit = controlsEl.querySelector<HTMLSelectElement>('#eta-size-unit')!.value;
    const speed = Number(controlsEl.querySelector<HTMLInputElement>('#eta-speed')!.value);
    const speedUnit = controlsEl.querySelector<HTMLSelectElement>('#eta-speed-unit')!.value;
    const secs = estimateTransferSeconds(size, sizeUnit, speed, speedUnit);
    controlsEl.querySelector<HTMLElement>('#eta-result')!.textContent =
      secs !== null ? formatDuration(secs) : '--';
  };

  catEl.addEventListener('change', () => {
    populateUnitOptions();
    renderConversions();
  });
  valEl.addEventListener('input', renderConversions);
  fromEl.addEventListener('change', renderConversions);

  ['#eta-size', '#eta-size-unit', '#eta-speed', '#eta-speed-unit'].forEach((sel) => {
    controlsEl.querySelector(sel)!.addEventListener('input', renderEta);
    controlsEl.querySelector(sel)!.addEventListener('change', renderEta);
  });

  populateUnitOptions();
  renderConversions();
  renderEta();
}

// --- NAVIGATION & BOOTSTRAP ---

function renderTabs(): void {
  const container = document.getElementById('tool-tabs')!;
  container.innerHTML = TOOLS.map(
    (t) => `
      <button
        type="button"
        role="tab"
        data-tool-id="${t.id}"
        data-active="${t.id === activeTool ? 'true' : 'false'}"
        aria-selected="${t.id === activeTool ? 'true' : 'false'}"
        class="tool-tab"
      >
        <span class="tool-tab-icon text-[#00ffff] shrink-0">${renderIconSvg(t.icon, 16)}</span>
        <span class="tool-tab-title font-fira text-xs font-semibold text-[#c8c8c8] truncate">${escapeHtml(t.shortName)}</span>
      </button>
    `,
  ).join('');

  container.querySelectorAll<HTMLButtonElement>('[data-tool-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toolId as ToolId;
      if (id && id !== activeTool) {
        selectTool(id, true);
      }
    });
  });
}

function updateCliSnippet(tool: ToolMeta): void {
  const snippetEl = document.getElementById('cli-snippet')!;
  snippetEl.textContent = tool.cliTemplate(window.location.origin, visitorIp);
}

function selectTool(id: ToolId, updateHash = false): void {
  activeAbort?.abort();
  activeAbort = null;
  activeSpeedCleanup?.();
  activeSpeedCleanup = null;
  activeTool = id;

  if (updateHash) {
    history.replaceState(null, '', `#${id}`);
  }

  const tool = TOOLS.find((t) => t.id === id) ?? TOOLS[0];
  renderTabs();

  document.getElementById('workspace-icon')!.innerHTML = renderIconSvg(tool.icon, 18);
  document.getElementById('workspace-title')!.textContent = tool.name;
  document.getElementById('workspace-desc')!.textContent = tool.desc;
  updateCliSnippet(tool);

  const controlsEl = document.getElementById('tool-controls')!;
  const outputEl = document.getElementById('tool-output')!;
  outputEl.innerHTML = '';

  const presetsEl = document.getElementById('workspace-presets')!;
  const presetItems = [...tool.presets];

  presetsEl.innerHTML = presetItems
    .map(
      (p) =>
        `<button type="button" data-preset-val="${escapeHtml(p.value)}" class="px-2.5 py-1 rounded-md border border-white/10 bg-black/70 font-fira text-[11px] text-[#aaa] hover:text-[#f3eb2c] hover:border-[#f3eb2c]/50 transition-colors cursor-pointer">${escapeHtml(p.label)}</button>`,
    )
    .join('');

  presetsEl.querySelectorAll<HTMLButtonElement>('[data-preset-val]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input');
      if (input) {
        input.value = btn.dataset.presetVal ?? '';
        input.dispatchEvent(new Event('input'));
        input.focus();
      }
    });
  });

  switch (id) {
    case 'myip':
      mountMyIp(controlsEl, outputEl);
      break;
    case 'ping':
      mountPing(controlsEl, outputEl);
      break;
    case 'traceroute':
      mountTraceroute(controlsEl, outputEl);
      break;
    case 'dns':
      mountDns(controlsEl, outputEl);
      break;
    case 'propagation':
      mountPropagation(controlsEl, outputEl);
      break;
    case 'whois':
      mountWhois(controlsEl, outputEl);
      break;
    case 'port':
      mountPort(controlsEl, outputEl);
      break;
    case 'reverse':
      mountReverse(controlsEl, outputEl);
      break;
    case 'proxy':
      mountProxy(controlsEl, outputEl);
      break;
    case 'rbl':
      mountRbl(controlsEl, outputEl);
      break;
    case 'spf':
      mountSpf(controlsEl, outputEl);
      break;
    case 'geo':
      mountGeo(controlsEl, outputEl);
      break;
    case 'bandwidth':
      mountBandwidth(controlsEl, outputEl);
      break;
    case 'subnet':
      mountSubnet(controlsEl, outputEl);
      break;
    case 'sla':
      mountSla(controlsEl, outputEl);
      break;
    case 'epoch':
      mountEpoch(controlsEl, outputEl);
      break;
    case 'days':
      mountDays(controlsEl, outputEl);
      break;
    case 'jsonsort':
      mountJsonSort(controlsEl, outputEl);
      break;
    case 'xml2json':
      mountXmlToJson(controlsEl, outputEl);
      break;
    case 'base64':
      mountBase64(controlsEl, outputEl);
      break;
    case 'url':
      mountUrl(controlsEl, outputEl);
      break;
    case 'cron':
      mountCron(controlsEl, outputEl);
      break;
    case 'regex':
      mountRegex(controlsEl, outputEl);
      break;
    case 'ascii':
      mountAscii(controlsEl, outputEl);
      break;
    case 'ipv4to6':
      mountIpv4ToIpv6(controlsEl, outputEl);
      break;
    case 'units':
      mountUnits(controlsEl, outputEl);
      break;
  }
}

async function hydrateVisitorIp(): Promise<void> {
  try {
    const data = await apiGet<{ client: ClientIpInfo; geo: GeoInfo | null }>('/api/me');
    visitorIp = data.client.ip;

    // Refresh presets & CLI snippet if visitor IP loaded after initial mount
    const current = TOOLS.find((t) => t.id === activeTool);
    if (current) updateCliSnippet(current);
  } catch {
    // Ignore visitor IP hydration errors
  }
}

function setupEmbeddedSearch(): void {
  if (window.parent === window) return;

  const allowedOrigins = new Set([
    'https://justanother.engineer',
    'https://www.justanother.engineer',
    'http://localhost:4321',
    'http://127.0.0.1:4321',
  ]);

  let highlights: HTMLElement[] = [];
  let activeIndex = -1;
  let lastOrigin = 'https://justanother.engineer';

  const postToParent = (payload: Record<string, unknown>) => {
    window.parent.postMessage(payload, lastOrigin);
  };

  const clearHighlights = () => {
    const marks = document.querySelectorAll('.search-highlight');
    const parentsToNormalize = new Set<HTMLElement>();

    marks.forEach((mark) => {
      const parent = mark.parentNode as HTMLElement | null;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
        parentsToNormalize.add(parent);
      }
    });

    parentsToNormalize.forEach((parent) => parent.normalize());
    highlights = [];
    activeIndex = -1;
  };

  const getRegexForQuery = (query: string): RegExp | null => {
    if (!query.trim()) return null;
    try {
      return new RegExp(query, 'gi');
    } catch {
      const escaped = query.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(escaped, 'gi');
    }
  };

  const highlightTextNode = (node: Text, regex: RegExp): HTMLElement[] => {
    const text = node.nodeValue || '';
    regex.lastIndex = 0;
    if (!text || !regex.test(text)) return [];
    regex.lastIndex = 0;

    const parent = node.parentNode as HTMLElement | null;
    if (!parent) return [];

    const fragment = document.createDocumentFragment();
    const newMarks: HTMLElement[] = [];
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    let count = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex++;
        continue;
      }
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const mark = document.createElement('mark');
      mark.className = 'search-highlight px-0.5';
      mark.textContent = match[0];
      fragment.appendChild(mark);
      newMarks.push(mark);

      lastIndex = regex.lastIndex;
      count++;
      if (count > 500) break;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    parent.replaceChild(fragment, node);
    return newMarks;
  };

  const updateActiveHighlight = () => {
    if (highlights.length === 0) return;
    highlights.forEach((h) => h.classList.remove('search-highlight-active'));
    const active = highlights[activeIndex];
    if (active) {
      active.classList.add('search-highlight-active');
      const rect = active.getBoundingClientRect();
      postToParent({
        type: 'jae-search-scroll',
        top: rect.top + window.scrollY,
      });
    }
  };

  const runSearch = (query: string) => {
    clearHighlights();
    const regex = getRegexForQuery(query);
    if (!regex) {
      postToParent({ type: 'jae-search-results', total: 0, activeIndex: -1 });
      return;
    }

    const root = document.querySelector('main') ?? document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentNode as HTMLElement | null;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'textarea', 'input', 'select', 'option'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes: Text[] = [];
    let current: Node | null;
    while ((current = walker.nextNode())) {
      textNodes.push(current as Text);
    }

    for (const node of textNodes) {
      highlights.push(...highlightTextNode(node, regex));
    }

    if (highlights.length > 0) {
      activeIndex = 0;
      updateActiveHighlight();
    }
    postToParent({ type: 'jae-search-results', total: highlights.length, activeIndex });
  };

  window.addEventListener('message', (event: MessageEvent) => {
    if (!allowedOrigins.has(event.origin)) return;
    lastOrigin = event.origin;
    const data = event.data as { type?: unknown; query?: unknown; delta?: unknown } | null;
    if (!data || typeof data.type !== 'string') return;

    if (data.type === 'jae-search-query' && typeof data.query === 'string') {
      runSearch(data.query);
    } else if (data.type === 'jae-search-clear') {
      clearHighlights();
    } else if (data.type === 'jae-search-step' && typeof data.delta === 'number') {
      if (highlights.length === 0) return;
      activeIndex = (activeIndex + data.delta + highlights.length) % highlights.length;
      updateActiveHighlight();
      postToParent({ type: 'jae-search-results', total: highlights.length, activeIndex });
    }
  });

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      window.parent.postMessage({ type: 'jae-search-toggle' }, '*');
    } else if (e.key === 'Escape') {
      window.parent.postMessage({ type: 'jae-search-close' }, '*');
    }
  });
}

function setupParentResizeSync(): void {
  if (window.parent === window) return;

  const target = document.querySelector('main') ?? document.body;
  let rafId = 0;

  const postHeight = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const height = Math.ceil(target.getBoundingClientRect().height);
      window.parent.postMessage({ type: 'jae-tools-resize', height }, '*');
    });
  };

  const ro = new ResizeObserver(postHeight);
  ro.observe(target);

  const mo = new MutationObserver(postHeight);
  mo.observe(target, { childList: true, subtree: true, attributes: true });

  document.addEventListener('toggle', postHeight, true);
  window.addEventListener('resize', postHeight);
  postHeight();
  setTimeout(postHeight, 150);
  setTimeout(postHeight, 600);
}

function init(): void {
  setupParentResizeSync();
  setupEmbeddedSearch();
  const hashTool = window.location.hash.replace(/^#/, '') as ToolId;
  const initialTool: ToolId = TOOLS.some((t) => t.id === hashTool) ? hashTool : 'myip';

  // Wire up CLI copy
  const copyCliBtn = document.getElementById('copy-cli-btn')!;
  const copyCliLabel = document.getElementById('copy-cli-label')!;
  copyCliBtn.addEventListener('click', () => {
    const cmd = document.getElementById('cli-snippet')!.textContent ?? '';
    void copyText(cmd, copyCliLabel, 'COPY CMD');
  });

  window.addEventListener('hashchange', () => {
    const next = window.location.hash.replace(/^#/, '') as ToolId;
    if (TOOLS.some((t) => t.id === next) && next !== activeTool) {
      selectTool(next, false);
    }
  });

  // Keep lucide icons used in bundle tree-shaking clean
  void Network;
  void Check;
  void Copy;

  selectTool(initialTool, false);
  void hydrateVisitorIp();
}

init();
