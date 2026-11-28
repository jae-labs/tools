import './styles/main.css';
import L from 'leaflet';
import {
  Activity,
  ArrowDownAZ,
  ArrowLeftRight,
  Binary,
  Braces,
  Calculator,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  CodeXml,
  Copy,
  Crop,
  EthernetPort,
  Euro,
  FileSearch,
  FileText,
  Fingerprint,
  Gauge,
  Globe,
  Hash,
  KeyRound,
  Lightbulb,
  Link2,
  Lock,
  MailCheck,
  Network,
  Palette,
  Pipette,
  Play,
  Radar,
  RefreshCw,
  Regex,
  Route,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  Sprout,
  Square,
  Terminal,
  Timer,
  Trash2,
  Type,
  Webhook,
  X,
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
import type { WebhookChannelConfig, WebhookEvent } from '../server/tools/webhook.ts';
import type { WhoisResult } from '../server/tools/whois.ts';
import {
  buildAsciiArt,
  type AsciiCommentPrefix,
  type AsciiFrame,
  type AsciiStyle,
} from '../shared/ascii.ts';
import { parseCronExpression } from '../shared/cron.ts';
import {
  REGEX_QUICK_REFERENCE,
  evaluateRegex,
  generateRegexCode,
  runRegexUnitTests,
  type RegexCodeLanguage,
  type RegexMatchEntry,
  type RegexUnitTestCase,
} from '../shared/regex.ts';
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
import { scoreFuzzyCandidate } from '../shared/fuzzy.ts';
import {
  DEFAULT_CONTRACTOR_INPUTS,
  DEFAULT_TAX_INPUTS,
  calculateContractComparison,
  calculateIrishTax2026,
  type ContractorInputs,
  type FilingStatus,
  type TaxInputs,
} from '../shared/irishtax.ts';
import { sortJsonString } from '../shared/jsonsort.ts';
import {
  analyzeJsonTree,
  formatJsonPath,
  searchJsonTree,
  type JsonPathSegment,
} from '../shared/jsontree.ts';
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
import {
  buildHarmonyPalette,
  checkContrast,
  formatColorOutputs,
  hsvToRgb,
  parseColor,
  rgbToHsv,
  rgbaToHex,
  type RgbaColor,
} from '../shared/color.ts';
import {
  BCRYPT_ROUNDS_DEFAULT,
  BCRYPT_ROUNDS_MAX,
  BCRYPT_ROUNDS_MIN,
  computeAllHashes,
  computeBcryptHash,
  isBcryptHash,
  matchExpectedHash,
  parseBcryptRounds,
  verifyBcryptHash,
  type BcryptResult,
  type HashAllResult,
  type HashEncoding,
} from '../shared/hash.ts';
import {
  DEFAULT_MEMORABLE_OPTIONS,
  DEFAULT_PIN_OPTIONS,
  DEFAULT_RANDOM_OPTIONS,
  MEMORABLE_WORDS_MAX,
  MEMORABLE_WORDS_MIN,
  PIN_LENGTH_MAX,
  PIN_LENGTH_MIN,
  RANDOM_LENGTH_MAX,
  RANDOM_LENGTH_MIN,
  generatePassword,
  type MemorablePasswordOptions,
  type MemorableSeparator,
  type PasswordResult,
  type PasswordType,
  type PinPasswordOptions,
  type RandomPasswordOptions,
} from '../shared/password.ts';
import {
  MAX_PORTS_PER_SCAN,
  PORT_PRESET_SETS,
  formatPortExpression,
  parsePortExpression,
} from '../shared/ports.ts';
import { resolveRegionNodes, type PrismaRegion } from '../shared/regions.ts';
import {
  SLA_PRESET_TIERS,
  calculateReverseSla,
  calculateSlaBreakdown,
  compareSlas,
  parseDurationString,
  type SlaPeriodId,
} from '../shared/sla.ts';
import {
  DEFAULT_SOIL_INPUTS,
  SOIL_MATERIALS,
  calculateSoilVolume,
  type SoilInputs,
  type SoilLengthUnit,
  type SoilMaterialId,
  type SoilShape,
} from '../shared/soil.ts';
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
import {
  mountChmodTool,
  mountDataConvertTool,
  mountDiffTool,
  mountHtmlHexTool,
  mountMarkdownTool,
  mountUuidTool,
} from './tools/dev-tools.ts';
import { mountPaintTool } from './tools/calc-tools.ts';
import { mountImageTool } from './tools/image-tools.ts';
import { mountMacTool } from './tools/network-tools.ts';
import {
  mountDmarcDkimTool,
  mountHeadersTool,
  mountJwtTool,
  mountSmtpTool,
  mountTlsTool,
} from './tools/security-tools.ts';
import { mountTabbedTool } from './tools/ui-helpers.ts';

type ToolId =
  | 'myip'
  | 'ping'
  | 'traceroute'
  | 'dns'
  | 'propagation'
  | 'whois'
  | 'port'
  | 'mac'
  | 'proxy'
  | 'rbl'
  | 'spf'
  | 'tls'
  | 'headers'
  | 'jwt'
  | 'bandwidth'
  | 'subnet'
  | 'sla'
  | 'epoch'
  | 'days'
  | 'jsonsort'
  | 'base64'
  | 'cron'
  | 'regex'
  | 'diff'
  | 'uuid'
  | 'chmod'
  | 'markdown'
  | 'ascii'
  | 'units'
  | 'hook'
  | 'irishtax'
  | 'soil'
  | 'paint'
  | 'password'
  | 'hash'
  | 'color'
  | 'image';

const TOOL_HASH_ALIASES: Record<string, { tool: ToolId; tab: string }> = {
  geo: { tool: 'myip', tab: 'geo' },
  reverse: { tool: 'dns', tab: 'reverse' },
  smtp: { tool: 'spf', tab: 'smtp' },
  jsonbrowser: { tool: 'jsonsort', tab: 'browser' },
  xml2json: { tool: 'jsonsort', tab: 'convert' },
  url: { tool: 'base64', tab: 'url' },
  ipv4to6: { tool: 'subnet', tab: 'ipv4to6' },
};

type ToolCategoryId = 'network' | 'dns-security' | 'calculators' | 'datetime' | 'dev';

interface ToolCategoryMeta {
  id: ToolCategoryId;
  label: string;
  shortLabel: string;
  icon: typeof Activity;
}

const TOOL_CATEGORIES: ToolCategoryMeta[] = [
  { id: 'network', label: 'Network & IP', shortLabel: 'Network', icon: Network },
  { id: 'dns-security', label: 'DNS & Security', shortLabel: 'DNS & Sec', icon: ShieldCheck },
  { id: 'calculators', label: 'Calculators', shortLabel: 'Calc', icon: Calculator },
  { id: 'datetime', label: 'Date & Time', shortLabel: 'Time', icon: CalendarClock },
  { id: 'dev', label: 'Dev & Text', shortLabel: 'Dev', icon: CodeXml },
];

interface ToolMeta {
  id: ToolId;
  category: ToolCategoryId;
  name: string;
  shortName: string;
  desc: string;
  icon: typeof Activity;
  keywords?: string[];
  presets: Array<{ label: string; value: string }>;
  cliTemplate: (origin: string, visitorIp: string) => string;
}

const TOOLS: ToolMeta[] = [
  {
    id: 'myip',
    category: 'network',
    name: 'IP & Geo Lookup',
    shortName: 'IP & Geo',
    desc: 'Inspect your dual-stack IPv4 & IPv6 addresses and headers, or look up country, city, ISP, ASN, and coordinates for any IP or domain.',
    icon: Fingerprint,
    keywords: ['ip', 'ipv4', 'ipv6', 'isp', 'asn', 'headers', 'whoami', 'geo', 'geolocation', 'geoip', 'country', 'map'],
    presets: [],
    cliTemplate: (origin) => `curl -s "${origin}/api/info"`,
  },
  {
    id: 'ping',
    category: 'network',
    name: 'TCP Ping',
    shortName: 'TCP Ping',
    desc: 'Measure TCP handshake round-trip latency, jitter, and packet loss to any host and port.',
    icon: Activity,
    keywords: ['tcp', 'ping', 'latency', 'rtt', 'jitter', 'packet loss', 'port'],
    presets: [
      { label: 'google.com', value: 'google.com' },
      { label: '1.1.1.1', value: '1.1.1.1' },
      { label: '8.8.8.8', value: '8.8.8.8' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/ping?host=google.com&mode=tcp&port=443&count=10"`,
  },
  {
    id: 'traceroute',
    category: 'network',
    name: 'TCP Traceroute',
    shortName: 'TCP Traceroute',
    desc: 'Trace the TCP network path and hop-by-hop latency to a destination host and port.',
    icon: Route,
    keywords: ['tcp', 'hops', 'route', 'path', 'mtr', 'network', 'traceroute'],
    presets: [
      { label: 'google.com', value: 'google.com' },
      { label: '1.1.1.1', value: '1.1.1.1' },
      { label: '8.8.8.8', value: '8.8.8.8' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/traceroute?host=google.com&port=443"`,
  },
  {
    id: 'dns',
    category: 'dns-security',
    name: 'DNS & Reverse Lookup',
    shortName: 'DNS Lookup',
    desc: 'Query A, AAAA, MX, NS, TXT, CNAME, SOA, CAA, SRV, and PTR records with TTLs, or verify Reverse DNS (FCrDNS).',
    icon: Search,
    keywords: ['dig', 'nslookup', 'mx', 'txt', 'cname', 'aaaa', 'records', 'ptr', 'rdns', 'fcrdns', 'reverse'],
    presets: [
      { label: 'google.com', value: 'google.com' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/dns?host=google.com&type=ALL"`,
  },
  {
    id: 'propagation',
    category: 'dns-security',
    name: 'DNS Propagation',
    shortName: 'DNS Propagation',
    desc: 'Check global DNS propagation across 6 Prisma Compute regions and 9 worldwide resolvers.',
    icon: Radar,
    keywords: ['dns', 'global', 'resolvers', 'regions', 'ttl'],
    presets: [
      { label: 'google.com', value: 'google.com' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/propagation?host=google.com&type=A"`,
  },
  {
    id: 'whois',
    category: 'dns-security',
    name: 'WHOIS Lookup',
    shortName: 'WHOIS',
    desc: 'Retrieve domain registrar, expiration dates, name servers, or IP allocation data.',
    icon: FileSearch,
    keywords: ['domain', 'registrar', 'rdap', 'owner', 'expiry'],
    presets: [
      { label: 'google.com', value: 'google.com' },
      { label: '1.1.1.1', value: '1.1.1.1' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/whois?query=google.com"`,
  },
  {
    id: 'port',
    category: 'network',
    name: 'Port Check',
    shortName: 'Port Check',
    desc: 'Check if specific TCP ports are open, closed, or filtered on a remote host.',
    icon: Radar,
    keywords: ['tcp', 'open', 'firewall', 'socket', 'scan'],
    presets: [
      { label: 'google.com', value: 'google.com' },
      { label: '1.1.1.1', value: '1.1.1.1' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/port?host=google.com&ports=80,443,22"`,
  },
  {
    id: 'mac',
    category: 'network',
    name: 'MAC Vendor / OUI Lookup',
    shortName: 'MAC Lookup',
    desc: 'Look up IEEE OUI vendors (54k+ MA-L/MA-M/MA-S blocks), decode UAA/LAA & multicast bits, search by vendor, or resolve ARP tables.',
    icon: EthernetPort,
    keywords: ['mac', 'oui', 'vendor', 'ieee', 'ethernet', 'arp', 'hardware', 'nic', 'manufacturer', 'laa'],
    presets: [
      { label: 'Cisco (00:00:0C)', value: '00:00:0C:12:34:56' },
      { label: 'Raspberry Pi', value: 'B8:27:EB:11:22:33' },
      { label: 'Docker LAA', value: '02:42:AC:11:00:02' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/mac?mac=00:00:0C:12:34:56"`,
  },
  {
    id: 'proxy',
    category: 'dns-security',
    name: 'Proxy Checker',
    shortName: 'Proxy Check',
    desc: 'Inspect proxy headers, open proxy ports (80/1080/3128/8080/8888), and ASN hints.',
    icon: ShieldAlert,
    keywords: ['vpn', 'tor', 'socks', 'anonymizer', 'headers'],
    presets: [
      { label: '1.1.1.1', value: '1.1.1.1' },
      { label: '8.8.8.8', value: '8.8.8.8' },
    ],
    cliTemplate: (origin, ip) => `curl -s "${origin}/api/proxy?ip=${ip || '1.1.1.1'}"`,
  },
  {
    id: 'rbl',
    category: 'dns-security',
    name: 'RBL Blacklist Check',
    shortName: 'RBL Check',
    desc: 'Check any public IP or domain across 25+ live DNSBL and domain blocklist zones.',
    icon: ShieldCheck,
    keywords: ['dnsbl', 'spam', 'blacklist', 'blocklist', 'reputation', 'email'],
    presets: [
      { label: 'google.com', value: 'google.com' },
      { label: '1.1.1.1', value: '1.1.1.1' },
      { label: '8.8.8.8', value: '8.8.8.8' },
    ],
    cliTemplate: (origin, ip) => `curl -s "${origin}/api/rbl?target=${ip || 'google.com'}"`,
  },
  {
    id: 'spf',
    category: 'dns-security',
    name: 'Email Auth & SMTP (SPF / DMARC / DKIM)',
    shortName: 'Email & SMTP',
    desc: 'Evaluate RFC 7208 SPF policies, inspect DMARC & DKIM DNS records, and probe live SMTP banners / EHLO / STARTTLS.',
    icon: MailCheck,
    keywords: ['email', 'smtp', 'ehlo', 'starttls', 'banner', 'spf', 'dmarc', 'dkim', 'txt', 'rfc7208', 'mail'],
    presets: [
      { label: 'google.com', value: 'google.com' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/spf?domain=google.com&ip=209.85.220.41"`,
  },
  {
    id: 'tls',
    category: 'dns-security',
    name: 'SSL / TLS Certificate Inspector',
    shortName: 'TLS Cert',
    desc: 'Inspect remote TLS certificates, SANs, expiry countdown, certificate chain, protocol version, and cipher suite.',
    icon: Lock,
    keywords: ['ssl', 'tls', 'cert', 'certificate', 'https', 'x509', 'san', 'expiry', 'chain'],
    presets: [
      { label: 'google.com', value: 'google.com' },
      { label: 'cloudflare.com', value: 'cloudflare.com' },
      { label: 'github.com', value: 'github.com' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/tls?host=google.com&port=443"`,
  },
  {
    id: 'headers',
    category: 'dns-security',
    name: 'HTTP Header & Redirect Inspector',
    shortName: 'HTTP Audit',
    desc: 'Trace HTTP redirect chains, response timing, and audit security headers (HSTS, CSP, X-Frame-Options, CORS).',
    icon: ShieldCheck,
    keywords: ['http', 'headers', 'redirect', 'hsts', 'csp', 'cors', 'security', 'audit', 'ttfb'],
    presets: [
      { label: 'https://google.com', value: 'https://google.com' },
      { label: 'https://cloudflare.com', value: 'https://cloudflare.com' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/headers?url=https://google.com"`,
  },
  {
    id: 'jwt',
    category: 'dns-security',
    name: 'JWT Decoder & Verifier',
    shortName: 'JWT Decoder',
    desc: 'Decode JWT headers and payloads, inspect exp/iat/nbf validity, and verify HS256/HS384/HS512 signatures locally.',
    icon: KeyRound,
    keywords: ['jwt', 'token', 'bearer', 'auth', 'oauth', 'hs256', 'decode', 'verify', 'claims'],
    presets: [],
    cliTemplate: () => `# Paste a JWT to decode & verify 100% locally in your browser`,
  },
  {
    id: 'bandwidth',
    category: 'network',
    name: 'Multi-Region Speed Test',
    shortName: 'Speed Test',
    desc: 'Benchmark download, upload, latency, jitter, and packet loss across Prisma Compute regions.',
    icon: Gauge,
    keywords: ['bandwidth', 'throughput', 'download', 'upload', 'mbps'],
    presets: [],
    cliTemplate: (origin) => `curl -o /dev/null -s -w "%{speed_download} B/s\\n" "${origin}/api/download?bytes=8388608"`,
  },
  {
    id: 'subnet',
    category: 'calculators',
    name: 'Network Calculator',
    shortName: 'Network Calc',
    desc: 'Calculate IPv4/IPv6 CIDR ranges, subnet masks, wildcards, splits, and convert IPv4 ↔ IPv6 (6to4, NAT64, ISATAP).',
    icon: Calculator,
    keywords: ['cidr', 'mask', 'netmask', 'ipv4', 'ipv6', 'vlsm', 'nat64', '6to4', 'isatap', 'mapped'],
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
    category: 'calculators',
    name: 'SLA Calculator',
    shortName: 'SLA Calc',
    desc: 'Convert uptime nines into downtime budgets, compare two SLAs, or reverse-check outage percentages.',
    icon: Clock,
    keywords: ['uptime', 'downtime', 'nines', 'slo', 'availability', 'sre'],
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
    category: 'datetime',
    name: 'Epoch Converter',
    shortName: 'Epoch Conv',
    desc: 'Convert Unix timestamps (s/ms/µs/ns) to GMT & local dates, parse human dates, and break down seconds.',
    icon: CalendarClock,
    keywords: ['unix', 'timestamp', 'utc', 'gmt', 'iso8601', 'time'],
    presets: [
      { label: '0 (Unix Epoch)', value: '0' },
      { label: '1700000000', value: '1700000000' },
      { label: '1795118400000 (ms)', value: '1795118400000' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/epoch?ts=1700000000"`,
  },
  {
    id: 'days',
    category: 'datetime',
    name: 'Days & Workdays Calculator',
    shortName: 'Days / Dates',
    desc: 'Find dates N days/hours ahead or ago, count days between dates, skip weekends & country holidays, and estimate effort hours.',
    icon: CalendarDays,
    keywords: ['workdays', 'business days', 'holidays', 'calendar', 'duration'],
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
    category: 'dev',
    name: 'JSON & Data Toolkit',
    shortName: 'JSON Toolkit',
    desc: 'Sort & format JSON, explore nested trees with JSONPath copy, and convert between JSON, YAML, TOML, XML, and CSV.',
    icon: Braces,
    keywords: ['json', 'format', 'pretty', 'minify', 'jq', 'sort', 'tree', 'browser', 'jsonpath', 'xml', 'yaml', 'toml', 'csv', 'convert'],
    presets: [],
    cliTemplate: (origin) => `curl -s "${origin}/api/me" | jq -S .`,
  },
  {
    id: 'base64',
    category: 'dev',
    name: 'Encoder / Decoder',
    shortName: 'Encoders',
    desc: 'UTF-8 Base64, URL & query-string inspector, HTML entities, and Hex encoding & decoding.',
    icon: Binary,
    keywords: ['encode', 'decode', 'b64', 'base64', 'utf8', 'binary', 'url', 'uri', 'percent', 'querystring', 'html', 'hex'],
    presets: [],
    cliTemplate: () => `printf 'justanother.engineer' | base64`,
  },
  {
    id: 'cron',
    category: 'datetime',
    name: 'Crontab Converter',
    shortName: 'Crontab',
    desc: 'Translate 5-field crontab schedules & macros into plain English and preview upcoming run times.',
    icon: Timer,
    keywords: ['cron', 'schedule', 'job', 'timer', 'interval'],
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
    category: 'dev',
    name: 'Regex Tester & Explainer',
    shortName: 'Regex Tester',
    desc: 'Test JavaScript regular expressions with live highlighting, capture groups, substitution, and token breakdown.',
    icon: Regex,
    keywords: ['regexp', 'pattern', 'match', 'replace', 'grep'],
    presets: [],
    cliTemplate: () => `rg -n --pcre2 '(?<proto>https?)://(?<host>[^/\\s:]+)' sample.txt`,
  },
  {
    id: 'ascii',
    category: 'dev',
    name: 'ASCII Art Builder',
    shortName: 'ASCII Art',
    desc: 'Generate block, shadow, dot-matrix, banner, and Braille ASCII banners with frames and comment wrappers.',
    icon: Type,
    keywords: ['figlet', 'banner', 'text', 'braille', 'font'],
    presets: [
      { label: 'LUI.Z', value: 'LUI.Z' },
      { label: 'JAE-LABS', value: 'JAE-LABS' },
      { label: 'PRISMA', value: 'PRISMA' },
      { label: '404', value: '404' },
    ],
    cliTemplate: () => `figlet "LUI.Z"`,
  },
  {
    id: 'diff',
    category: 'dev',
    name: 'Text & JSON Diff Checker',
    shortName: 'Diff Checker',
    desc: 'Compare two text or JSON documents line-by-line with optional JSON key sorting and whitespace normalization.',
    icon: ArrowLeftRight,
    keywords: ['diff', 'compare', 'patch', 'json', 'text', 'delta', 'changes'],
    presets: [],
    cliTemplate: () => `diff -u fileA.json fileB.json`,
  },
  {
    id: 'uuid',
    category: 'dev',
    name: 'UUID / ULID / NanoID Generator',
    shortName: 'ID Generator',
    desc: 'Bulk-generate CSPRNG UUIDv4, time-ordered UUIDv7, ULID, and NanoID values, plus decode UUIDv7/ULID timestamps.',
    icon: Fingerprint,
    keywords: ['uuid', 'uuidv4', 'uuidv7', 'ulid', 'nanoid', 'guid', 'id', 'identifier', 'timestamp'],
    presets: [],
    cliTemplate: (origin) => `curl -s "${origin}/api/id?type=uuidv7&count=5"`,
  },
  {
    id: 'chmod',
    category: 'calculators',
    name: 'Chmod / Unix Permissions',
    shortName: 'Chmod Calc',
    desc: 'Interactive rwx + setuid/setgid/sticky permissions matrix synced with octal, symbolic, chmod command, and umask.',
    icon: Terminal,
    keywords: ['chmod', 'unix', 'linux', 'permissions', 'octal', 'rwx', 'umask', 'sticky', 'setuid'],
    presets: [
      { label: '755', value: '755' },
      { label: '644', value: '644' },
      { label: '600', value: '600' },
      { label: '777', value: '777' },
      { label: '4755', value: '4755' },
    ],
    cliTemplate: () => `chmod 755 script.sh`,
  },
  {
    id: 'markdown',
    category: 'dev',
    name: 'Markdown Preview & Table Builder',
    shortName: 'Markdown',
    desc: 'Live GitHub-Flavored Markdown preview with safe HTML export plus an interactive GFM table builder.',
    icon: FileText,
    keywords: ['markdown', 'md', 'gfm', 'preview', 'table', 'html', 'docs', 'readme'],
    presets: [],
    cliTemplate: () => `# GitHub-Flavored Markdown preview & table builder`,
  },
  {
    id: 'units',
    category: 'calculators',
    name: 'Unit Converter',
    shortName: 'Unit Conv',
    desc: 'Convert data storage (SI & IEC), network bandwidth rates, and estimate transfer ETA.',
    icon: ArrowLeftRight,
    keywords: ['bytes', 'mbps', 'gbps', 'tb', 'gib', 'transfer', 'eta'],
    presets: [],
    cliTemplate: (origin) => `curl -s "${origin}/api/me"`,
  },
  {
    id: 'hook',
    category: 'dev',
    name: 'Payload Inspector',
    shortName: 'Payload Catch',
    desc: 'Capture and inspect live HTTP requests, JSON payloads, headers, and query strings sent to /hook/<path>.',
    icon: Webhook,
    keywords: ['webhook', 'payload', 'http', 'requestbin', 'catch', 'inspect', 'post', 'live'],
    presets: [],
    cliTemplate: (origin) =>
      `curl -s -X POST "${origin}/hook/demo" -H "Content-Type: application/json" -d '{"hello":"world"}'`,
  },
  {
    id: 'irishtax',
    category: 'calculators',
    name: 'Irish Salary Calculator',
    shortName: 'Irish Tax 2026',
    desc: 'Estimate 2026 Irish PAYE, PRSI, USC, CGT, pension relief, and Permanent vs Umbrella / Limited Company contractor take-home pay.',
    icon: Euro,
    keywords: ['ireland', 'irish', 'salary', 'tax', 'paye', 'usc', 'prsi', 'cgt', 'contractor', 'umbrella', 'net pay', '2026'],
    presets: [
      { label: '€45,000', value: '45000' },
      { label: '€72,000', value: '72000' },
      { label: '€100,000', value: '100000' },
      { label: '€140,000', value: '140000' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/irishtax?salary=72000&filing=single"`,
  },
  {
    id: 'soil',
    category: 'calculators',
    name: 'Soil Calculator',
    shortName: 'Soil Calc',
    desc: 'Calculate topsoil, compost, or mulch volume (m³, litres, tonnes) and 20L/40L/50L/bulk bags for raised beds & gardens.',
    icon: Sprout,
    keywords: ['soil', 'compost', 'mulch', 'topsoil', 'garden', 'raised bed', 'litres', 'tonnes', 'bags', 'quickcrop'],
    presets: [],
    cliTemplate: () => `# Volume (L) = Length(m) × Width(m) × Depth(m) × 1000`,
  },
  {
    id: 'paint',
    category: 'calculators',
    name: 'Paint Calculator',
    shortName: 'Paint Calc',
    desc: 'Calculate litres, coats, optimal 1L/2.5L/5L/10L tin combinations, and cost for rooms, ceilings, and walls with door/window deductions.',
    icon: Palette,
    keywords: ['paint', 'litres', 'coats', 'wall', 'room', 'ceiling', 'dulux', 'emulsion', 'diy', 'tins', 'coverage'],
    presets: [],
    cliTemplate: () => `# Litres = (Paintable Area m² × Coats) / Coverage (m²/L) × (1 + Buffer%)`,
  },
  {
    id: 'password',
    category: 'dns-security',
    name: 'Password Generator',
    shortName: 'Password Gen',
    desc: 'Generate cryptographically secure Random passwords, Memorable passphrases, and numeric PINs with entropy metrics.',
    icon: KeyRound,
    keywords: ['password', 'passphrase', 'pin', 'generator', '1password', 'random', 'memorable', 'secret', 'key', 'entropy'],
    presets: [],
    cliTemplate: (origin) => `curl -s "${origin}/api/password?type=random&length=20&numbers=true&symbols=false"`,
  },
  {
    id: 'hash',
    category: 'dns-security',
    name: 'Hash Generator',
    shortName: 'Hash Gen',
    desc: 'Compute MD5, SHA-1, SHA-256, SHA-384, SHA-512, HMAC, and bcrypt hashes for text and local files, with instant verification.',
    icon: Hash,
    keywords: ['hash', 'md5', 'sha1', 'sha256', 'sha384', 'sha512', 'bcrypt', 'hmac', 'checksum', 'digest', 'verify', 'crypto', 'kdf'],
    presets: [
      { label: 'hello world', value: 'hello world' },
      { label: 'lui.z', value: 'lui.z' },
      { label: 'JSON', value: '{"ok":true,"service":"tools"}' },
    ],
    cliTemplate: (origin) => `curl -s "${origin}/api/hash?text=hello%20world&format=hex"`,
  },
  {
    id: 'color',
    category: 'dev',
    name: 'RGB / HEX Colour Picker',
    shortName: 'RGB / HEX',
    desc: 'Interactive live colour picker with 2D spectrum, Hue/Alpha sliders, HEX, RGB, HSL, CSS snippets, WCAG contrast, and harmonies.',
    icon: Palette,
    keywords: ['color', 'colour', 'picker', 'hex', 'rgb', 'rgba', 'hsl', 'css', 'palette', 'swatch', 'contrast', 'wcag', 'eyedropper'],
    presets: [
      { label: '#00FFFF', value: '#00FFFF' },
      { label: '#F3EB2C', value: '#F3EB2C' },
      { label: '#FF3B5C', value: '#FF3B5C' },
      { label: '#3B82F6', value: '#3B82F6' },
      { label: '#10B981', value: '#10B981' },
    ],
    cliTemplate: () => `/* CSS */ :root { --color-primary: #00ffff; }`,
  },
  {
    id: 'image',
    category: 'dev',
    name: 'Image Crop, Resize & Convert',
    shortName: 'Image Studio',
    desc: 'Crop, rotate, flip, resize, compress, and convert images to WebP, JPEG, or PNG 100% locally in your browser.',
    icon: Crop,
    keywords: ['image', 'crop', 'resize', 'compress', 'convert', 'png', 'jpeg', 'jpg', 'webp', 'photo', 'rotate', 'aspect'],
    presets: [],
    cliTemplate: () => `# Runs 100% locally via HTML5 Canvas — images never leave your browser`,
  },
];

let activeTool: ToolId = 'myip';
let pickerOpen = false;
let pickerQuery = '';
let pickerHighlightIdx = 0;
let visitorIp = '';
let activeAbort: AbortController | null = null;
let activeSpeedCleanup: (() => void) | null = null;
let activeToolCleanup: (() => void) | null = null;

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
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <p class="font-fira text-xs text-[#858585]">Automatic dual-stack IPv4 &amp; IPv6 telemetry, ISP/ASN lookup, and HTTP request header inspection.</p>
      <button
        id="myip-refresh-btn"
        type="button"
        class="group hero-cta-sm hero-cta-primary relative inline-flex h-10 items-center justify-center px-5 text-xs font-black uppercase leading-none text-black transition-all duration-200 hover:scale-[1.03] overflow-hidden cursor-pointer shrink-0 self-center sm:self-auto"
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
    <form id="tool-form" class="flex flex-col gap-3">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div class="md:col-span-5">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Host or IP Address</label>
          <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. google.com or 1.1.1.1" value="google.com" required />
        </div>
        <div class="md:col-span-2">
          <label for="ping-port" class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">TCP Port</label>
          <input id="ping-port" type="number" min="1" max="65535" step="1" value="443" class="cyber-input" required />
        </div>
        <div class="md:col-span-2">
          <label for="ping-count" class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Probes</label>
          <select id="ping-count" class="cyber-select w-full">
            <option value="10" selected>10 probes</option>
            <option value="continuous">Continuous</option>
          </select>
        </div>
        <div class="md:col-span-3 flex items-center justify-center md:justify-end gap-2">
          ${ctaButton('TCP PING')}
          ${stopButton()}
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-1.5 font-fira text-[11px]">
        <span class="text-[#858585] text-[10px] uppercase tracking-wider mr-1">PORT:</span>
        ${(
          [
            [443, '443 HTTPS'],
            [80, '80 HTTP'],
            [22, '22 SSH'],
            [53, '53 DNS'],
            [3306, '3306 MySQL'],
            [5432, '5432 Postgres'],
          ] as const
        )
          .map(
            ([p, label]) =>
              `<button type="button" data-tcp-port="${p}" class="px-2.5 py-1 rounded-md border border-white/15 bg-[#050505] text-[#bbb] hover:border-[#00ffff]/60 hover:text-[#00ffff] transition-colors cursor-pointer">${label}</button>`,
          )
          .join('')}
      </div>
    </form>
  `;

  const form = controlsEl.querySelector<HTMLFormElement>('#tool-form')!;
  const hostInput = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!;
  const portInput = controlsEl.querySelector<HTMLInputElement>('#ping-port')!;
  const countSelect = controlsEl.querySelector<HTMLSelectElement>('#ping-count')!;
  const submitBtn = controlsEl.querySelector<HTMLButtonElement>('#tool-submit-btn')!;
  const stopBtn = controlsEl.querySelector<HTMLButtonElement>('#tool-stop-btn')!;
  const portButtons = controlsEl.querySelectorAll<HTMLButtonElement>('[data-tcp-port]');

  const syncPortUi = () => {
    const p = Math.min(65535, Math.max(1, Number(portInput.value) || 443));
    portButtons.forEach((btn) => {
      const isSelected = Number(btn.dataset.tcpPort) === p;
      btn.classList.toggle('border-[#00ffff]/65', isSelected);
      btn.classList.toggle('bg-[#00ffff]/12', isSelected);
      btn.classList.toggle('text-[#00ffff]', isSelected);
      btn.classList.toggle('border-white/15', !isSelected);
      btn.classList.toggle('bg-[#050505]', !isSelected);
      btn.classList.toggle('text-[#bbb]', !isSelected);
    });
    const snippetEl = document.getElementById('cli-snippet');
    if (snippetEl) {
      const h = hostInput.value.trim() || 'google.com';
      const cnt = countSelect.value === 'continuous' ? 10 : Number(countSelect.value);
      snippetEl.textContent = `curl -s "${window.location.origin}/api/ping?host=${encodeURIComponent(h)}&mode=tcp&port=${p}&count=${cnt}"`;
    }
  };

  portButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      portInput.value = btn.dataset.tcpPort ?? '443';
      syncPortUi();
    });
  });
  portInput.addEventListener('input', syncPortUi);
  hostInput.addEventListener('input', syncPortUi);
  countSelect.addEventListener('change', syncPortUi);
  syncPortUi();

  stopBtn.addEventListener('click', () => {
    activeAbort?.abort();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const host = hostInput.value.trim();
    const targetPort = Math.min(65535, Math.max(1, Math.trunc(Number(portInput.value) || 443)));
    portInput.value = String(targetPort);
    const isContinuous = countSelect.value === 'continuous';
    const totalCount = isContinuous ? Number.POSITIVE_INFINITY : Number(countSelect.value) || 10;
    if (!host) return;

    activeAbort?.abort();
    const controller = new AbortController();
    activeAbort = controller;

    submitBtn.disabled = true;
    stopBtn.disabled = false;

    const samples: PingSample[] = [];
    const rawLines: string[] = [];
    let resolvedIp = '--';
    let methodLabel = `TCP:${targetPort}`;
    let method: 'icmp' | 'tcp' = 'tcp';
    let port: number | null = targetPort;
    let family = 'unknown';

    const renderLive = (inProgress: boolean, stopped = false) => {
      const stats = computeClientPingStats(samples);
      const visibleSamples = samples.slice(-40);
      const maxBar = Math.max(...visibleSamples.map((s) => s.rttMs ?? 0), 1);

      const summaryLines = [...rawLines.slice(-100)];
      if (!inProgress && samples.length > 0) {
        summaryLines.push(
          `--- ${host}:${port ?? targetPort} tcp-ping statistics ---`,
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

      const countHeading = isContinuous
        ? `PROBE TIMELINE (${samples.length} sent · continuous)`
        : `PROBE TIMELINE (${samples.length}/${totalCount})`;

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          ${statCard('RESOLVED IP', resolvedIp, 'cyan')}
          ${statCard('TARGET PORT', methodLabel, 'yellow')}
          ${statCard('AVG RTT', stats.avgMs !== null ? `${stats.avgMs} ms` : '--', 'white')}
          ${statCard('MIN / MAX', stats.minMs !== null ? `${stats.minMs} / ${stats.maxMs} ms` : '--', 'white')}
          ${statCard('JITTER', stats.jitterMs !== null ? `${stats.jitterMs} ms` : '--', 'cyan')}
          ${statCard('PACKET LOSS', `${stats.lossPercent}%`, stats.lossPercent === 0 ? 'green' : 'red')}
        </div>

        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-2.5">
          <div class="flex items-center justify-between font-fira text-[10px] uppercase tracking-[0.2em] text-[#858585]">
            <span>${countHeading}</span>
            ${
              inProgress
                ? `<span class="flex items-center gap-2 text-[#00ffff]"><span class="inline-block w-2 h-2 rounded-full bg-[#00ffff] animate-ping"></span>PROBING #${samples.length + 1}...</span>`
                : `<span class="${stopped ? 'text-[#f3eb2c]' : 'text-emerald-400'}">${stopped ? 'STOPPED' : 'COMPLETE'}</span>`
            }
          </div>
          ${visibleSamples
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

        ${rawOutputBlock('LIVE TERMINAL OUTPUT', summaryLines.join('\n') || `TCP PING ${host}:${targetPort}...`, jsonSummary)}
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
          `/api/ping?host=${encodeURIComponent(host)}&count=1&mode=tcp&port=${targetPort}&seq=${seq}`,
          controller.signal,
        );

        if (seq === 1) {
          resolvedIp = data.resolvedIp;
          method = data.method;
          port = data.port ?? targetPort;
          family = data.family;
          methodLabel = `TCP:${port}`;
          rawLines.push(
            `TCP PING ${data.target} (${data.resolvedIp}) port ${port} — ${isContinuous ? 'continuous' : `${totalCount} probes`}`,
          );
        }

        const sample = data.samples[0];
        if (sample) {
          samples.push(sample);
          rawLines.push(
            sample.status === 'reply' && sample.rttMs !== null
              ? `seq=${sample.seq} from ${resolvedIp}:${port ?? targetPort} time=${sample.rttMs.toFixed(2)} ms`
              : `seq=${sample.seq} ${resolvedIp}:${port ?? targetPort} timeout (${sample.detail})`,
          );
        }

        const hasMore = seq < totalCount;
        renderLive(hasMore);
        if (hasMore) {
          await sleepMs(isContinuous ? 450 : 160, controller.signal);
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
      <div class="md:col-span-5">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Destination Host or IP</label>
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. 1.1.1.1 or google.com" value="google.com" required />
      </div>
      <div class="md:col-span-2">
        <label for="trace-port" class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">TCP Port</label>
        <input id="trace-port" type="number" min="1" max="65535" step="1" value="443" class="cyber-input" required />
      </div>
      <div class="md:col-span-2">
        <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Max Hops</label>
        <select id="trace-hops" class="cyber-select w-full">
          <option value="12">12 hops</option>
          <option value="18" selected>18 hops</option>
          <option value="24">24 hops</option>
        </select>
      </div>
      <div class="md:col-span-3 flex items-center justify-center md:justify-end gap-2">
        ${ctaButton('TCP TRACE')}
        ${stopButton()}
      </div>
    </form>
  `;

  const form = controlsEl.querySelector<HTMLFormElement>('#tool-form')!;
  const hostInput = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!;
  const portInput = controlsEl.querySelector<HTMLInputElement>('#trace-port')!;
  const submitBtn = controlsEl.querySelector<HTMLButtonElement>('#tool-submit-btn')!;
  const stopBtn = controlsEl.querySelector<HTMLButtonElement>('#tool-stop-btn')!;

  const syncTraceCli = () => {
    const snippetEl = document.getElementById('cli-snippet');
    if (snippetEl) {
      const h = hostInput.value.trim() || 'google.com';
      const p = Math.min(65535, Math.max(1, Math.trunc(Number(portInput.value) || 443)));
      snippetEl.textContent = `curl -s "${window.location.origin}/api/traceroute?host=${encodeURIComponent(h)}&port=${p}"`;
    }
  };
  hostInput.addEventListener('input', syncTraceCli);
  portInput.addEventListener('input', syncTraceCli);

  stopBtn.addEventListener('click', () => {
    activeAbort?.abort();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const host = hostInput.value.trim();
    const tcpPort = Math.min(65535, Math.max(1, Math.trunc(Number(portInput.value) || 443)));
    portInput.value = String(tcpPort);
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
    let method: 'tcp-traceroute' | 'fallback' = 'tcp-traceroute';
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
          `/api/traceroute?host=${encodeURIComponent(host)}&hop=${hopNum}&port=${tcpPort}`,
          controller.signal,
        );

        if (hopNum === 1) {
          resolvedIp = data.resolvedIp;
          family = data.family;
          method = data.method;
          note = data.note;
          rawLines.push(`tcp traceroute to ${data.target} (${data.resolvedIp}) port ${data.port}, ${maxHops} hops max`);
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
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. google.com" value="google.com" required />
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
      <div class="md:col-span-3 flex justify-center md:justify-end">
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
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. google.com or 1.1.1.1" value="google.com" required />
      </div>
      <div class="md:col-span-3 flex justify-center md:justify-end">
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
          <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. google.com or 1.1.1.1" value="google.com" required />
        </div>
        <div class="md:col-span-4">
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <label for="port-list" class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">TCP Ports / Ranges (max ${MAX_PORTS_PER_SCAN})</label>
            <span id="port-count-badge" class="font-fira text-[10px] text-[#00ffff]">4 / ${MAX_PORTS_PER_SCAN}</span>
          </div>
          <input id="port-list" type="text" class="cyber-input" placeholder="e.g. 1,2,5-20 or 80, 443" value="80, 443, 22, 53" required />
        </div>
        <div class="md:col-span-3 flex justify-center md:justify-end">
          ${ctaButton('CHECK PORTS')}
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-1.5 font-fira text-[11px]">
        <span class="text-[#858585] text-[10px] uppercase tracking-wider mr-1">COMMON SETS:</span>
        ${PORT_PRESET_SETS.map(
          (set) => `
            <button
              type="button"
              data-port-set="${set.id}"
              title="${escapeHtml(set.expr)}"
              class="port-set-btn inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/15 bg-[#050505] text-[#bbb] hover:border-[#00ffff]/55 hover:text-white transition-colors cursor-pointer"
            >
              <span>${escapeHtml(set.label)}</span>
              <span class="text-[10px] text-[#777]">${set.ports.length}</span>
            </button>
          `,
        ).join('')}
        <button
          type="button"
          id="port-clear-btn"
          class="px-2.5 py-1 rounded-md border border-rose-500/30 bg-rose-950/15 text-rose-300 hover:border-rose-400/60 transition-colors cursor-pointer"
        >
          CLEAR
        </button>
      </div>
    </form>
  `;

  const hostInput = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!;
  const portInput = controlsEl.querySelector<HTMLInputElement>('#port-list')!;
  const countBadge = controlsEl.querySelector<HTMLElement>('#port-count-badge')!;
  const setButtons = controlsEl.querySelectorAll<HTMLButtonElement>('[data-port-set]');

  const syncPortState = () => {
    const raw = portInput.value.trim();
    const parsed = raw ? parsePortExpression(raw) : { ports: [] };
    const currentSet = new Set(parsed.ports);

    if (!raw) {
      countBadge.textContent = `0 / ${MAX_PORTS_PER_SCAN}`;
      countBadge.className = 'font-fira text-[10px] text-[#777]';
    } else if (parsed.error) {
      countBadge.textContent = 'Invalid / >64';
      countBadge.title = parsed.error;
      countBadge.className = 'font-fira text-[10px] text-rose-400';
    } else {
      countBadge.textContent = `${parsed.ports.length} / ${MAX_PORTS_PER_SCAN}`;
      countBadge.title = '';
      countBadge.className = 'font-fira text-[10px] text-[#00ffff]';
    }

    setButtons.forEach((btn) => {
      const preset = PORT_PRESET_SETS.find((s) => s.id === btn.dataset.portSet);
      if (!preset) return;
      const allIncluded = preset.ports.every((p) => currentSet.has(p));
      btn.classList.toggle('border-[#00ffff]/65', allIncluded);
      btn.classList.toggle('bg-[#00ffff]/12', allIncluded);
      btn.classList.toggle('text-[#00ffff]', allIncluded);
      btn.classList.toggle('border-white/15', !allIncluded);
      btn.classList.toggle('bg-[#050505]', !allIncluded);
      btn.classList.toggle('text-[#bbb]', !allIncluded);
    });

    const snippetEl = document.getElementById('cli-snippet');
    if (snippetEl) {
      const h = hostInput.value.trim() || 'google.com';
      const p = raw || '80,443';
      snippetEl.textContent = `curl -s "${window.location.origin}/api/port?host=${encodeURIComponent(h)}&ports=${encodeURIComponent(p)}"`;
    }
  };

  setButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = PORT_PRESET_SETS.find((s) => s.id === btn.dataset.portSet);
      if (!preset) return;
      const parsed = portInput.value.trim() ? parsePortExpression(portInput.value) : { ports: [] };
      const current = parsed.error ? new Set<number>() : new Set(parsed.ports);
      const allIncluded = preset.ports.every((p) => current.has(p));

      if (allIncluded) {
        preset.ports.forEach((p) => current.delete(p));
      } else {
        for (const p of preset.ports) {
          if (current.size >= MAX_PORTS_PER_SCAN) break;
          current.add(p);
        }
      }

      portInput.value = formatPortExpression(Array.from(current));
      syncPortState();
    });
  });

  controlsEl.querySelector<HTMLButtonElement>('#port-clear-btn')?.addEventListener('click', () => {
    portInput.value = '';
    syncPortState();
    portInput.focus();
  });

  portInput.addEventListener('input', syncPortState);
  hostInput.addEventListener('input', syncPortState);
  syncPortState();

  let lastResult: PortCheckResult | null = null;
  let statusFilter: 'all' | 'open' | 'closed' | 'filtered' = 'all';

  const renderPortResults = () => {
    if (!lastResult) return;
    const data = lastResult;
    const openCount = data.results.filter((r) => r.status === 'open').length;
    const closedCount = data.results.filter((r) => r.status === 'closed').length;
    const filteredCount = data.results.filter((r) => r.status === 'filtered').length;
    const visible =
      statusFilter === 'all' ? data.results : data.results.filter((r) => r.status === statusFilter);

    outputEl.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${statCard('RESOLVED IP', data.resolvedIp, 'cyan')}
        ${statCard('PORTS TESTED', String(data.results.length), 'white')}
        ${statCard('OPEN PORTS', String(openCount), openCount > 0 ? 'green' : 'yellow')}
        ${statCard('SCAN TIME', `${data.durationMs} ms`, 'white')}
      </div>

      ${
        data.results.length > 4
          ? `
            <div class="flex flex-wrap items-center gap-1.5 font-fira text-[11px]">
              ${(
                [
                  ['all', `ALL (${data.results.length})`],
                  ['open', `OPEN (${openCount})`],
                  ['closed', `CLOSED (${closedCount})`],
                  ['filtered', `FILTERED (${filteredCount})`],
                ] as const
              )
                .map(
                  ([key, label]) => `
                    <button
                      type="button"
                      data-port-filter="${key}"
                      class="px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                        statusFilter === key
                          ? 'border-[#00ffff]/60 bg-[#00ffff]/12 text-[#00ffff]'
                          : 'border-white/10 bg-[#050505] text-[#888] hover:text-white'
                      }"
                    >${label}</button>
                  `,
                )
                .join('')}
            </div>
          `
          : ''
      }

      ${
        visible.length === 0
          ? `<div class="rounded-xl border border-white/10 bg-[#050505] p-5 text-center font-fira text-xs text-[#777]">No ports with status "${statusFilter}".</div>`
          : `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              ${visible
                .map((r) => {
                  const badge =
                    r.status === 'open'
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                      : r.status === 'closed'
                        ? 'bg-[#f3eb2c]/15 border-[#f3eb2c]/40 text-[#f3eb2c]'
                        : 'bg-rose-500/15 border-rose-400/50 text-rose-300';
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
          `
      }
    `;

    outputEl.querySelectorAll<HTMLButtonElement>('[data-port-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        statusFilter = (btn.dataset.portFilter as typeof statusFilter) ?? 'all';
        renderPortResults();
      });
    });
  };

  const form = controlsEl.querySelector<HTMLFormElement>('#tool-form')!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const host = hostInput.value.trim();
    const ports = portInput.value.trim();
    if (!host || !ports) return;

    const parsed = parsePortExpression(ports);
    if (parsed.error) {
      showError(outputEl, parsed.error);
      return;
    }

    activeAbort?.abort();
    activeAbort = new AbortController();
    showLoading(outputEl, `Probing ${parsed.ports.length} TCP port(s) [${ports}] on ${host}...`);

    try {
      const data = await apiGet<PortCheckResult>(
        `/api/port?host=${encodeURIComponent(host)}&ports=${encodeURIComponent(ports)}`,
        activeAbort.signal,
      );
      lastResult = data;
      statusFilter = 'all';
      renderPortResults();
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
      <div class="md:col-span-3 flex justify-center md:justify-end">
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
      <div class="md:col-span-3 flex justify-center md:justify-end">
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
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. 1.1.1.1 or google.com (blank = your IP)" value="${escapeHtml(visitorIp || 'google.com')}" />
      </div>
      <div class="md:col-span-3 flex justify-center md:justify-end">
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

      <div class="flex items-center justify-center sm:justify-end gap-2.5 w-full sm:w-auto">
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
      <div class="md:col-span-3 flex justify-center md:justify-end">
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
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. 1.1.1.1 or google.com" value="google.com" required />
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
      <div class="md:col-span-3 flex items-center justify-center md:justify-end gap-2">
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
        <input id="tool-primary-input" type="text" class="cyber-input" placeholder="e.g. google.com" value="google.com" required />
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
      <div class="md:col-span-3 flex items-center justify-center md:justify-end gap-2">
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
          <div class="flex justify-center sm:justify-end">
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
            <div class="sm:col-span-7 flex justify-center sm:justify-end">
              <button type="submit" class="hero-cta-sm hero-cta-primary cursor-pointer px-4 py-2 rounded-lg font-fira text-xs font-black text-black tracking-[0.14em] uppercase">HUMAN → EPOCH</button>
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
        <div class="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
          <select id="js-indent" class="cyber-select">
            <option value="2" selected>2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
            <option value="0">Minified</option>
          </select>
          <button id="js-sample-btn" type="button" class="px-3 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#aaa] hover:text-[#f3eb2c] transition-colors cursor-pointer">SAMPLE</button>
          <button id="js-clear-btn" type="button" class="px-3 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#aaa] hover:text-red-400 transition-colors cursor-pointer">CLEAR</button>
          <button id="js-sort-btn" type="button" class="hero-cta-sm hero-cta-primary px-4 py-2 rounded-lg font-fira text-xs font-black text-black tracking-[0.14em] uppercase cursor-pointer">SORT JSON</button>
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
        <div class="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
          <select id="xml-indent" class="cyber-select">
            <option value="2" selected>2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="0">Minified</option>
          </select>
          <button id="xml-sample-btn" type="button" class="px-3 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#aaa] hover:text-[#f3eb2c] transition-colors cursor-pointer">SAMPLE</button>
          <button id="xml-clear-btn" type="button" class="px-3 py-2 rounded-lg border border-white/10 bg-[#050505] font-fira text-xs text-[#aaa] hover:text-red-400 transition-colors cursor-pointer">CLEAR</button>
          <button id="xml-convert-btn" type="button" class="hero-cta-sm hero-cta-primary px-4 py-2 rounded-lg font-fira text-xs font-black text-black tracking-[0.14em] uppercase cursor-pointer">CONVERT TO JSON</button>
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
          <textarea id="url-input" rows="7" spellcheck="false" class="w-full rounded-lg border border-white/10 bg-black p-3 font-fira text-xs text-white focus:outline-none focus:border-[#f3eb2c]/60 resize-y">https://google.com/search?q=network tools &amp; port check#results</textarea>
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
  let activePanel: 'matches' | 'tests' | 'codegen' | 'quickref' = 'matches';
  let codeLang: RegexCodeLanguage = 'javascript';
  let quickRefQuery = '';
  let unitTests: RegexUnitTestCase[] = [
    { id: 't1', input: 'https://justanother.engineer/tools', expect: 'should_match' },
    { id: 't2', input: 'http://example.org', expect: 'should_match' },
    { id: 't3', input: 'ftp://not-http.local', expect: 'should_not_match' },
  ];

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

  const insertTokenAtCursor = (token: string) => {
    const start = patternInput.selectionStart ?? patternInput.value.length;
    const end = patternInput.selectionEnd ?? start;
    patternInput.value = patternInput.value.slice(0, start) + token + patternInput.value.slice(end);
    const nextPos = start + token.length;
    patternInput.focus();
    patternInput.setSelectionRange(nextPos, nextPos);
    renderRegex();
  };

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
      const t0 = performance.now();
      const res = evaluateRegex(patternInput.value, currentFlags(), testInput.value, replaceInput.value);
      const evalMs = Math.round((performance.now() - t0) * 100) / 100;
      highlightedEl.innerHTML = renderHighlightedRegexText(testInput.value, res.matches);
      replacedEl.textContent = res.replaced;

      const unitResults = runRegexUnitTests(patternInput.value, currentFlags(), unitTests);
      const passedCount = unitResults.filter((r) => r.passed).length;

      const panelTabs: Array<{ id: typeof activePanel; label: string }> = [
        { id: 'matches', label: 'Matches & Explain' },
        { id: 'tests', label: `Unit Tests (${passedCount}/${unitResults.length})` },
        { id: 'codegen', label: 'Code Generator' },
        { id: 'quickref', label: 'Quick Reference' },
      ];

      let bodyHtml = '';
      if (activePanel === 'matches') {
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

        bodyHtml = `
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
      } else if (activePanel === 'tests') {
        bodyHtml = `
          <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Assertion Suite (${passedCount}/${unitResults.length} passing)</span>
              <button id="rx-add-test" type="button" class="rounded-lg border border-[#00ffff]/45 bg-[#00ffff]/10 px-3 py-1 font-fira text-[11px] text-[#00ffff] cursor-pointer">+ Add Test Case</button>
            </div>
            <div class="flex flex-col gap-2">
              ${unitResults
                .map(
                  (r, idx) => `
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border ${r.passed ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-rose-500/35 bg-rose-950/15'} p-2.5">
                      <span class="rounded px-2 py-1 font-fira text-[10px] font-bold uppercase text-center shrink-0 ${r.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">${r.passed ? 'PASS' : 'FAIL'}</span>
                      <select data-rx-ut-expect="${idx}" class="cyber-select !py-1.5 !pl-2.5 !pr-7 !text-xs shrink-0">
                        <option value="should_match" ${r.expect === 'should_match' ? 'selected' : ''}>Should match</option>
                        <option value="should_not_match" ${r.expect === 'should_not_match' ? 'selected' : ''}>Should NOT match</option>
                      </select>
                      <input data-rx-ut-input="${idx}" type="text" value="${escapeHtml(r.input)}" placeholder="Test input..." class="cyber-input !py-1.5 !text-xs flex-1" />
                      <button type="button" data-rx-ut-del="${idx}" class="rounded border border-white/10 bg-black px-2.5 py-1.5 font-fira text-[10px] text-[#888] hover:text-rose-400 cursor-pointer shrink-0">Remove</button>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </div>
        `;
      } else if (activePanel === 'codegen') {
        const langs: Array<{ id: RegexCodeLanguage; label: string }> = [
          { id: 'javascript', label: 'JS / TS' },
          { id: 'python', label: 'Python' },
          { id: 'go', label: 'Go' },
          { id: 'rust', label: 'Rust' },
          { id: 'ripgrep', label: 'ripgrep' },
        ];
        const snippet = generateRegexCode(codeLang, patternInput.value, currentFlags(), replaceInput.value);
        bodyHtml = `
          <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
            <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-white/10 bg-black/60">
              <div class="flex flex-wrap gap-1.5">
                ${langs
                  .map(
                    (l) => `
                      <button type="button" data-rx-lang="${l.id}" class="rounded-md px-2.5 py-1 font-fira text-[11px] cursor-pointer ${
                        codeLang === l.id
                          ? 'bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/45'
                          : 'text-[#888] hover:text-white border border-transparent'
                      }">${l.label}</button>
                    `,
                  )
                  .join('')}
              </div>
              <button id="rx-copy-code" type="button" class="rounded border border-white/15 bg-black px-2.5 py-1 font-fira text-[10px] text-[#f3eb2c] cursor-pointer">COPY CODE</button>
            </div>
            <pre class="p-4 font-fira text-xs text-[#e0e0e0] overflow-x-auto leading-relaxed">${escapeHtml(snippet)}</pre>
          </div>
        `;
      } else {
        const q = quickRefQuery.trim().toLowerCase();
        const filtered = REGEX_QUICK_REFERENCE.filter(
          (item) =>
            !q ||
            item.token.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q),
        );
        bodyHtml = `
          <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">Click any token to insert at cursor</span>
              <input id="rx-qr-search" type="text" value="${escapeHtml(quickRefQuery)}" placeholder="Filter tokens (e.g. lookahead, digit)..." class="cyber-input !py-1.5 !text-xs sm:w-64" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              ${filtered
                .map(
                  (item) => `
                    <button type="button" data-rx-insert="${escapeHtml(item.token)}" class="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-left hover:border-[#00ffff]/60 transition-colors cursor-pointer">
                      <code class="font-fira text-xs font-bold text-[#f3eb2c] shrink-0">${escapeHtml(item.token)}</code>
                      <span class="font-fira text-[11px] text-[#aaa] truncate">${escapeHtml(item.description)}</span>
                    </button>
                  `,
                )
                .join('')}
            </div>
          </div>
        `;
      }

      outputEl.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${statCard('MATCHES', `${res.matchCount}${res.truncated ? '+' : ''}`, res.matchCount > 0 ? 'green' : 'yellow')}
          ${statCard('FLAGS', `/${res.flags || 'none'}`, 'cyan')}
          ${statCard('EVAL TIME', `${evalMs} ms`, 'white')}
          ${statCard('GROUPS / MATCH', String(res.matches[0]?.groups.length ?? 0), 'white')}
        </div>

        <div class="inline-flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-black/80 p-1.5 self-start">
          ${panelTabs
            .map(
              (t) => `
                <button type="button" data-rx-panel="${t.id}" class="rounded-lg px-3 py-1.5 font-fira text-xs font-semibold cursor-pointer ${
                  activePanel === t.id
                    ? 'bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/45'
                    : 'text-[#888] hover:text-white border border-transparent'
                }">${escapeHtml(t.label)}</button>
              `,
            )
            .join('')}
        </div>

        ${bodyHtml}
      `;

      outputEl.querySelectorAll<HTMLButtonElement>('[data-rx-panel]').forEach((btn) => {
        btn.addEventListener('click', () => {
          activePanel = btn.dataset.rxPanel as typeof activePanel;
          renderRegex();
        });
      });

      outputEl.querySelectorAll<HTMLButtonElement>('[data-rx-lang]').forEach((btn) => {
        btn.addEventListener('click', () => {
          codeLang = btn.dataset.rxLang as RegexCodeLanguage;
          renderRegex();
        });
      });

      document.getElementById('rx-copy-code')?.addEventListener('click', (e) => {
        const snippet = generateRegexCode(codeLang, patternInput.value, currentFlags(), replaceInput.value);
        void copyText(snippet, e.currentTarget as HTMLElement, 'COPY CODE');
      });

      document.getElementById('rx-add-test')?.addEventListener('click', () => {
        unitTests = [...unitTests, { id: `t${Date.now()}`, input: '', expect: 'should_match' }];
        renderRegex();
      });

      outputEl.querySelectorAll<HTMLSelectElement>('[data-rx-ut-expect]').forEach((sel) => {
        sel.addEventListener('change', () => {
          const idx = Number(sel.dataset.rxUtExpect);
          unitTests[idx] = { ...unitTests[idx]!, expect: sel.value as RegexUnitTestCase['expect'] };
          renderRegex();
        });
      });

      outputEl.querySelectorAll<HTMLInputElement>('[data-rx-ut-input]').forEach((inp) => {
        inp.addEventListener('change', () => {
          const idx = Number(inp.dataset.rxUtInput);
          unitTests[idx] = { ...unitTests[idx]!, input: inp.value };
          renderRegex();
        });
      });

      outputEl.querySelectorAll<HTMLButtonElement>('[data-rx-ut-del]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.rxUtDel);
          unitTests = unitTests.filter((_, i) => i !== idx);
          renderRegex();
        });
      });

      const qrSearch = document.getElementById('rx-qr-search') as HTMLInputElement | null;
      qrSearch?.addEventListener('input', () => {
        quickRefQuery = qrSearch.value;
        renderRegex();
        const nextSearch = document.getElementById('rx-qr-search') as HTMLInputElement | null;
        if (nextSearch) {
          nextSearch.focus();
          nextSearch.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
        }
      });

      outputEl.querySelectorAll<HTMLButtonElement>('[data-rx-insert]').forEach((btn) => {
        btn.addEventListener('click', () => {
          insertTokenAtCursor(btn.dataset.rxInsert ?? '');
        });
      });
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
      <div class="md:col-span-3 flex justify-center md:justify-end">
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
          <input id="tool-primary-input" type="text" class="cyber-input" value="google.com" placeholder="e.g. google.com" required />
        </div>
        <div class="md:col-span-4">
          <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Sending Server IP (Optional for Basic audit)</label>
          <input id="spf-ip" type="text" class="cyber-input" placeholder="e.g. 209.85.220.41" />
        </div>
        <div class="md:col-span-3 flex justify-center md:justify-end">
          ${ctaButton('TEST SPF POLICY')}
        </div>
      </div>

      <div id="spf-advanced-pane" class="hidden rounded-xl border border-[#00ffff]/25 bg-[#050505] p-4 flex flex-col gap-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">MAIL FROM / Return-Path Address</label>
            <input id="spf-sender" type="text" class="cyber-input text-xs" placeholder="e.g. bounce@google.com" />
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

function generateRandomChannel(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) {
    out += alphabet[b % alphabet.length];
  }
  return out;
}

function sanitizeChannelInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+/, '')
    .slice(0, 48);
}

function methodBadgeClass(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'border-[#f3eb2c]/45 bg-[#f3eb2c]/12 text-[#f3eb2c]';
    case 'GET':
      return 'border-[#00ffff]/45 bg-[#00ffff]/12 text-[#00ffff]';
    case 'PUT':
    case 'PATCH':
      return 'border-amber-400/45 bg-amber-400/12 text-amber-300';
    case 'DELETE':
      return 'border-rose-500/45 bg-rose-500/12 text-rose-400';
    default:
      return 'border-white/20 bg-white/5 text-[#ccc]';
  }
}

function buildReplayCurl(origin: string, ev: WebhookEvent): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(ev.query)) {
    if (Array.isArray(v)) {
      v.forEach((item) => qs.append(k, item));
    } else {
      qs.append(k, v);
    }
  }
  const fullUrl = `${origin}${ev.path}${qs.toString() ? `?${qs.toString()}` : ''}`;
  const parts = [`curl -X ${ev.method} "${fullUrl}"`];
  if (ev.contentType) {
    parts.push(`-H "Content-Type: ${ev.contentType.replaceAll('"', '\\"')}"`);
  }
  if (ev.bodyText.length > 0) {
    parts.push(`-d '${ev.bodyText.replaceAll("'", "'\\''")}'`);
  }
  return parts.join(' \\\n  ');
}

function mountHook(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  let channel = generateRandomChannel();
  let events: WebhookEvent[] = [];
  let maxEvents = 500;
  let selectedEventId: string | null = null;
  let currentConfig: WebhookChannelConfig = {
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: '',
  };
  let eventSource: EventSource | null = null;
  let disposed = false;

  const getHookUrl = () => `${window.location.origin}/hook/${channel}`;

  controlsEl.innerHTML = `
    <div class="flex flex-col gap-3">
      <div class="flex flex-col lg:flex-row lg:items-center gap-2.5">
        <form id="hook-channel-form" class="flex flex-1 items-center min-w-0">
          <div class="flex flex-1 items-center rounded-lg border border-white/15 bg-[#050505] overflow-hidden focus-within:border-[#00ffff]/70 min-w-0">
            <span class="px-3 py-2.5 font-fira text-xs text-[#777] bg-white/5 border-r border-white/10 shrink-0 select-none">/hook/</span>
            <input
              id="tool-primary-input"
              type="text"
              value="${escapeHtml(channel)}"
              placeholder="my-webhook-path"
              autocomplete="off"
              spellcheck="false"
              maxlength="48"
              aria-label="Webhook path slug"
              class="w-full min-w-0 bg-transparent px-3 py-2.5 font-fira text-xs sm:text-sm text-white placeholder-[#666] outline-none"
            />
            <button
              id="hook-new-btn"
              type="button"
              title="Generate a new random path"
              class="inline-flex items-center gap-1.5 px-3 py-2.5 border-l border-white/10 bg-white/5 font-fira text-[10px] font-semibold uppercase tracking-wider text-[#ccc] hover:text-[#00ffff] hover:bg-[#00ffff]/10 transition-colors cursor-pointer shrink-0"
            >
              ${renderIconSvg(RefreshCw, 12)} NEW PATH
            </button>
          </div>
        </form>

        <div class="flex items-center gap-2 shrink-0">
          <label for="hook-status-select" class="font-fira text-[10px] font-bold uppercase tracking-[0.18em] text-[#858585] shrink-0">REPLY</label>
          <select
            id="hook-status-select"
            aria-label="Response HTTP status"
            class="cyber-select !py-2 !text-xs"
            title="HTTP status returned to callers"
          >
            <option value="200">200 OK</option>
            <option value="201">201 Created</option>
            <option value="202">202 Accepted</option>
            <option value="204">204 No Content</option>
            <option value="400">400 Bad Request</option>
            <option value="404">404 Not Found</option>
            <option value="500">500 Error</option>
          </select>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-[#00ffff]/25 bg-[#050505] px-3.5 py-2.5">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="px-2 py-0.5 rounded bg-[#00ffff]/12 border border-[#00ffff]/35 font-fira text-[10px] font-bold uppercase tracking-widest text-[#00ffff] shrink-0">ENDPOINT</span>
          <code id="hook-full-url" class="font-fira text-xs text-white truncate select-all">${escapeHtml(getHookUrl())}</code>
        </div>
        <div class="flex flex-wrap items-center justify-center sm:justify-end gap-2 shrink-0">
          <button
            id="hook-copy-url-btn"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black px-3 py-1.5 font-fira text-[11px] uppercase tracking-wider text-[#f3eb2c] hover:border-[#f3eb2c]/60 transition-colors cursor-pointer"
          >
            COPY URL
          </button>
          <button
            id="hook-send-test-btn"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-[#00ffff]/40 bg-[#00ffff]/10 px-3 py-1.5 font-fira text-[11px] font-semibold uppercase tracking-wider text-[#00ffff] hover:bg-[#00ffff]/20 transition-colors cursor-pointer"
          >
            ${renderIconSvg(Send, 12)} SEND TEST
          </button>
        </div>
      </div>
    </div>
  `;

  const channelInput = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!;
  const channelForm = controlsEl.querySelector<HTMLFormElement>('#hook-channel-form')!;
  const statusSelect = controlsEl.querySelector<HTMLSelectElement>('#hook-status-select')!;
  const fullUrlEl = controlsEl.querySelector<HTMLElement>('#hook-full-url')!;
  const copyUrlBtn = controlsEl.querySelector<HTMLButtonElement>('#hook-copy-url-btn')!;
  const sendTestBtn = controlsEl.querySelector<HTMLButtonElement>('#hook-send-test-btn')!;
  const newBtn = controlsEl.querySelector<HTMLButtonElement>('#hook-new-btn')!;

  const updateUrlDisplay = () => {
    const url = getHookUrl();
    fullUrlEl.textContent = url;
    const snippetEl = document.getElementById('cli-snippet');
    if (snippetEl) {
      snippetEl.textContent = `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '{"event":"ping","ok":true}'`;
    }
  };

  const clearChannelEvents = async () => {
    await fetch(`/api/hook/${encodeURIComponent(channel)}/events`, { method: 'DELETE' });
    events = [];
    selectedEventId = null;
    renderEventsUi();
  };

  const renderEventsUi = () => {
    if (events.length === 0) {
      const sampleCurl = `curl -X POST "${getHookUrl()}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"service":"payments","event":"invoice.paid","amount":4200}'`;
      outputEl.innerHTML = `
        <div class="rounded-xl border border-white/10 bg-[#050505] p-6 flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-[#00ffff] animate-ping shrink-0"></span>
            <div>
              <p class="font-fira text-xs font-bold uppercase tracking-[0.18em] text-white">Waiting for incoming requests on /hook/${escapeHtml(channel)}</p>
              <p class="text-xs text-[#858585] mt-1">Send any GET, POST, PUT, PATCH, or DELETE request (including subpaths like <code class="font-fira text-[#00ffff]">/hook/${escapeHtml(channel)}/events</code>). Payloads appear here live in real time.</p>
            </div>
          </div>
          ${rawOutputBlock('QUICK TEST WITH CURL', sampleCurl)}
          <p class="font-fira text-[11px] text-[#666]">Captures up to ${maxEvents} requests per path (up to 256 KiB per body), then pauses until cleared.</p>
        </div>
      `;
      bindCopyButtons(outputEl);
      return;
    }

    const activeEvent = events.find((e) => e.id === selectedEventId) ?? events[0];
    selectedEventId = activeEvent.id;
    const isFull = events.length >= maxEvents;

    const formattedBody =
      activeEvent.bodyJson !== null
        ? JSON.stringify(activeEvent.bodyJson, null, 2)
        : activeEvent.bodyText;
    const bodyLabel =
      activeEvent.bodyJson !== null
        ? 'PAYLOAD BODY (JSON)'
        : activeEvent.bodyBytes > 0
          ? 'PAYLOAD BODY (RAW)'
          : 'PAYLOAD BODY (EMPTY)';

    const queryEntries = Object.entries(activeEvent.query);
    const headerEntries = Object.entries(activeEvent.headers).sort(([a], [b]) => a.localeCompare(b));
    const headersText = headerEntries.map(([k, v]) => `${k}: ${v}`).join('\n');
    const replayCurl = buildReplayCurl(window.location.origin, activeEvent);

    outputEl.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <!-- Request Feed -->
        <div class="lg:col-span-4 rounded-xl border ${isFull ? 'border-rose-500/45' : 'border-white/10'} bg-[#050505] overflow-hidden">
          <div class="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-white/10 bg-black/60">
            <span class="font-fira text-[10px] uppercase tracking-[0.18em] ${isFull ? 'text-rose-400 font-bold' : 'text-[#858585]'}">LIVE STREAM (${events.length} / ${maxEvents})</span>
            <button
              id="hook-clear-btn"
              type="button"
              class="inline-flex items-center gap-1 rounded border ${
                isFull
                  ? 'border-rose-400/70 bg-rose-500/20 text-rose-200 animate-pulse'
                  : 'border-rose-500/35 bg-rose-950/20 text-rose-300 hover:border-rose-400/70'
              } px-2 py-1 font-fira text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
            >
              ${renderIconSvg(Trash2, 11)} CLEAR
            </button>
          </div>
          ${
            isFull
              ? `
                <div class="px-3.5 py-2 border-b border-rose-500/30 bg-rose-950/30 font-fira text-[10px] text-rose-300">
                  Capture limit reached (${maxEvents}/${maxEvents}). Click <span class="font-bold text-white">CLEAR</span> to resume.
                </div>
              `
              : ''
          }
          <div class="flex flex-col divide-y divide-white/8 max-h-[540px] overflow-y-auto">
            ${events
              .map((ev) => {
                const isSel = ev.id === activeEvent.id;
                const timeStr = new Date(ev.receivedAtMs).toLocaleTimeString([], {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                return `
                  <button
                    type="button"
                    data-event-id="${escapeHtml(ev.id)}"
                    class="w-full px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                      isSel ? 'bg-[#f3eb2c]/10 border-l-2 border-l-[#f3eb2c]' : 'hover:bg-white/5 border-l-2 border-l-transparent'
                    }"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="px-1.5 py-0.5 rounded border font-fira text-[10px] font-bold uppercase ${methodBadgeClass(ev.method)}">${escapeHtml(ev.method)}</span>
                      <span class="font-fira text-[10px] text-[#777]">${escapeHtml(timeStr)}</span>
                    </div>
                    <p class="mt-1.5 font-fira text-xs text-white truncate" title="${escapeHtml(ev.path)}">${escapeHtml(ev.subpath || '/')}</p>
                    <div class="mt-1 flex items-center justify-between gap-2 font-fira text-[10px] text-[#777]">
                      <span class="truncate">${escapeHtml(ev.sourceIp || 'unknown')}</span>
                      <span class="shrink-0">${escapeHtml(formatBytes(ev.bodyBytes))}</span>
                    </div>
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- Selected Request Inspector -->
        <div class="lg:col-span-8 flex flex-col gap-4">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            ${statCard('METHOD', activeEvent.method, activeEvent.method === 'POST' ? 'yellow' : 'cyan')}
            ${statCard('SOURCE IP', activeEvent.sourceIp || '—', 'white')}
            ${statCard('PAYLOAD SIZE', `${formatBytes(activeEvent.bodyBytes)}${activeEvent.bodyTruncated ? ' (truncated)' : ''}`, activeEvent.bodyTruncated ? 'red' : 'green')}
            ${statCard('CONTENT-TYPE', activeEvent.contentType || 'none', 'cyan')}
          </div>

          <div class="rounded-xl border border-white/10 bg-[#050505] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div class="min-w-0">
              <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">PATH &amp; TIMESTAMP</span>
              <p class="font-fira text-xs text-white break-all mt-0.5">${escapeHtml(activeEvent.path)} <span class="text-[#666] ml-2">${escapeHtml(activeEvent.receivedAt)}</span></p>
            </div>
            <button
              id="hook-copy-curl-btn"
              type="button"
              class="px-2.5 py-1 rounded border border-white/15 bg-black font-fira text-[10px] uppercase tracking-wider text-[#00ffff] hover:border-[#00ffff]/60 cursor-pointer shrink-0"
            >
              COPY CURL
            </button>
          </div>

          ${
            activeEvent.bodyBytes > 0
              ? rawOutputBlock(
                  bodyLabel,
                  formattedBody,
                  activeEvent.bodyJson !== null ? activeEvent.bodyJson : undefined,
                )
              : `
                <div class="rounded-xl border border-white/10 bg-[#050505] px-4 py-4 font-fira text-xs text-[#666]">
                  No request body received for this ${escapeHtml(activeEvent.method)} request.
                </div>
              `
          }

          ${
            queryEntries.length > 0
              ? `
                <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
                  <div class="px-4 py-2.5 border-b border-white/10 bg-black/60 font-fira text-[10px] uppercase tracking-[0.2em] text-[#858585]">
                    QUERY PARAMETERS (${queryEntries.length})
                  </div>
                  <div class="divide-y divide-white/8">
                    ${queryEntries
                      .map(
                        ([k, v]) => `
                          <div class="grid grid-cols-1 sm:grid-cols-3 gap-1 px-4 py-2 font-fira text-xs">
                            <span class="text-[#00ffff] break-all">${escapeHtml(k)}</span>
                            <span class="sm:col-span-2 text-[#e0e0e0] break-all">${escapeHtml(Array.isArray(v) ? v.join(', ') : v)}</span>
                          </div>
                        `,
                      )
                      .join('')}
                  </div>
                </div>
              `
              : ''
          }

          <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
            <div class="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/10 bg-black/60">
              <span class="font-fira text-[10px] uppercase tracking-[0.2em] text-[#858585]">HTTP HEADERS (${headerEntries.length})</span>
              <button
                id="hook-copy-headers-btn"
                type="button"
                class="px-2.5 py-1 rounded border border-white/15 bg-black font-fira text-[10px] uppercase tracking-wider text-[#f3eb2c] hover:border-[#f3eb2c]/60 cursor-pointer shrink-0"
              >
                COPY HEADERS
              </button>
            </div>
            <div class="divide-y divide-white/8 max-h-[300px] overflow-y-auto">
              ${headerEntries
                .map(
                  ([k, v]) => `
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-1 px-4 py-2 font-fira text-xs">
                      <span class="text-[#f3eb2c]/90 break-all">${escapeHtml(k)}</span>
                      <span class="sm:col-span-2 text-[#d0d0d0] break-all">${escapeHtml(v)}</span>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    bindCopyButtons(outputEl, activeEvent.bodyJson !== null ? activeEvent.bodyJson : undefined);

    outputEl.querySelectorAll<HTMLButtonElement>('[data-event-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.eventId;
        if (id && id !== selectedEventId) {
          selectedEventId = id;
          renderEventsUi();
        }
      });
    });

    const clearBtn = outputEl.querySelector<HTMLButtonElement>('#hook-clear-btn');
    clearBtn?.addEventListener('click', () => {
      void clearChannelEvents();
    });

    const copyCurlBtn = outputEl.querySelector<HTMLButtonElement>('#hook-copy-curl-btn');
    copyCurlBtn?.addEventListener('click', () => {
      void copyText(replayCurl, copyCurlBtn, 'COPY CURL');
    });

    const copyHeadersBtn = outputEl.querySelector<HTMLButtonElement>('#hook-copy-headers-btn');
    copyHeadersBtn?.addEventListener('click', () => {
      void copyText(headersText, copyHeadersBtn, 'COPY HEADERS');
    });
  };

  const connectStream = () => {
    eventSource?.close();
    eventSource = null;
    if (disposed) return;

    updateUrlDisplay();

    const es = new EventSource(`/api/hook/${encodeURIComponent(channel)}/stream`);
    eventSource = es;

    es.addEventListener('init', (msg) => {
      if (disposed) return;
      try {
        const data = JSON.parse((msg as MessageEvent<string>).data) as {
          events: WebhookEvent[];
          config: WebhookChannelConfig;
          maxEvents?: number;
        };
        if (typeof data.maxEvents === 'number' && data.maxEvents > 0) {
          maxEvents = data.maxEvents;
        }
        events = data.events ?? [];
        if (data.config) {
          currentConfig = data.config;
          statusSelect.value = String(currentConfig.status);
        }
        selectedEventId = events[0]?.id ?? null;
        renderEventsUi();
      } catch {
        // Ignore malformed init event
      }
    });

    es.addEventListener('request', (msg) => {
      if (disposed) return;
      try {
        const ev = JSON.parse((msg as MessageEvent<string>).data) as WebhookEvent;
        if (events.length >= maxEvents) return;
        const wasAtLatest = events.length === 0 || selectedEventId === events[0]?.id;
        events = [ev, ...events.filter((e) => e.id !== ev.id)].slice(0, maxEvents);
        if (wasAtLatest) {
          selectedEventId = ev.id;
        }
        renderEventsUi();
      } catch {
        // Ignore malformed request event
      }
    });

    es.addEventListener('cleared', () => {
      if (disposed) return;
      events = [];
      selectedEventId = null;
      renderEventsUi();
    });
  };

  const applyChannelInput = () => {
    const cleaned = sanitizeChannelInput(channelInput.value);
    if (cleaned.length < 2) {
      channelInput.value = channel;
      return;
    }
    if (cleaned === channel) {
      channelInput.value = channel;
      return;
    }
    channel = cleaned;
    channelInput.value = channel;
    events = [];
    selectedEventId = null;
    connectStream();
  };

  channelForm.addEventListener('submit', (e) => {
    e.preventDefault();
    applyChannelInput();
  });

  channelInput.addEventListener('blur', () => {
    applyChannelInput();
  });

  newBtn.addEventListener('click', () => {
    channel = generateRandomChannel();
    channelInput.value = channel;
    events = [];
    selectedEventId = null;
    connectStream();
  });

  copyUrlBtn.addEventListener('click', () => {
    void copyText(getHookUrl(), copyUrlBtn, 'COPY URL');
  });

  sendTestBtn.addEventListener('click', async () => {
    sendTestBtn.disabled = true;
    try {
      await fetch(`${getHookUrl()}/test-event?source=ui&ts=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Demo-Event': 'payload.check',
        },
        body: JSON.stringify({
          event: 'payload.check',
          channel,
          sentAt: new Date().toISOString(),
          sample: { ok: true, region: 'client-test', items: [1, 2, 3] },
        }),
      });
    } finally {
      sendTestBtn.disabled = false;
    }
  });

  statusSelect.addEventListener('change', async () => {
    const nextStatus = Number(statusSelect.value);
    await fetch(`/api/hook/${encodeURIComponent(channel)}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
  });

  activeToolCleanup = () => {
    disposed = true;
    eventSource?.close();
    eventSource = null;
  };

  renderEventsUi();
  connectStream();
}

function renderDonutSvg(
  segments: Array<{ name: string; value: number; color: string; percentage: number }>,
  activeIndex: number,
  euroFmt: Intl.NumberFormat,
  pctFmt: Intl.NumberFormat,
): string {
  const size = 210;
  const cx = size / 2;
  const cy = size / 2;
  const r = 76;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * r;
  const total = Math.max(
    1,
    segments.reduce((sum, s) => sum + s.value, 0),
  );
  const gapPx = segments.length > 1 ? 3 : 0;
  let offset = 0;

  const circles = segments
    .map((seg, idx) => {
      const frac = seg.value / total;
      const arcLen = Math.max(0, frac * circumference - gapPx);
      const dashOffset = -offset;
      offset += frac * circumference;
      const isActive = idx === activeIndex;
      return `
        <circle
          cx="${cx}"
          cy="${cy}"
          r="${r}"
          fill="none"
          stroke="${seg.color}"
          stroke-width="${isActive ? strokeWidth + 3 : strokeWidth}"
          stroke-dasharray="${arcLen.toFixed(2)} ${(circumference - arcLen).toFixed(2)}"
          stroke-dashoffset="${dashOffset.toFixed(2)}"
          opacity="${activeIndex < 0 || isActive ? '1' : '0.45'}"
          data-donut-idx="${idx}"
          class="cursor-pointer transition-all duration-150"
        />
      `;
    })
    .join('');

  const active = segments[activeIndex] ?? segments[0];
  return `
    <div class="relative w-[210px] h-[210px] mx-auto shrink-0">
      <svg viewBox="0 0 ${size} ${size}" class="w-full h-full -rotate-90" role="img" aria-label="Salary breakdown chart">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${strokeWidth}" />
        ${circles}
      </svg>
      ${
        active
          ? `
            <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <span class="font-fira text-[10px] uppercase tracking-[0.14em] text-[#999] truncate max-w-[125px]">${escapeHtml(active.name)}</span>
              <span class="mt-0.5 font-fira text-base font-bold text-white">${escapeHtml(euroFmt.format(active.value))}</span>
              <span class="font-fira text-[11px] text-[#00ffff]">${escapeHtml(pctFmt.format(active.percentage))}%</span>
            </div>
          `
          : ''
      }
    </div>
  `;
}

function mountIrishTax(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  const euroFmt = new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
  const wholeFmt = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 });
  const pctFmt = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 1 });

  const taxInputs: TaxInputs = { ...DEFAULT_TAX_INPUTS };
  const contractInputs: ContractorInputs = { ...DEFAULT_CONTRACTOR_INPUTS };
  let activeChartIdx = 0;
  let mobilePeriod: 'annual' | 'monthly' = 'annual';

  const sliderField = (
    id: string,
    label: string,
    valueText: string,
    min: number,
    max: number,
    step: number,
    value: number,
    title: string,
    accentClass = 'text-[#f3eb2c]',
    disabled = false,
  ) => `
    <label class="block min-w-0 space-y-1.5" title="${escapeHtml(title)}">
      <span class="flex items-center justify-between gap-2 font-fira text-[11px] text-[#b0b0b0]">
        <span class="inline-flex items-center gap-1.5 min-w-0">
          <span class="truncate">${escapeHtml(label)}</span>
          <span class="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-white/20 text-[9px] text-[#777] shrink-0" title="${escapeHtml(title)}">?</span>
        </span>
        <span id="${id}-val" class="shrink-0 font-bold ${accentClass}">${escapeHtml(valueText)}</span>
      </span>
      <input
        id="${id}"
        type="range"
        min="${min}"
        max="${max}"
        step="${step}"
        value="${value}"
        ${disabled ? 'disabled' : ''}
        class="cyber-range"
      />
    </label>
  `;

  controlsEl.innerHTML = `
    <div class="flex flex-col gap-4">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 rounded-xl border border-white/10 bg-[#050505] p-4">
        <div class="flex-1 min-w-0">
          <label for="tool-primary-input" class="block font-fira text-[10px] font-bold uppercase tracking-[0.18em] text-[#00ffff] mb-1.5">
            ANNUAL BASE SALARY (€)
          </label>
          <input
            id="tool-primary-input"
            type="number"
            min="0"
            max="1000000"
            step="500"
            value="${taxInputs.employmentIncome}"
            class="cyber-input"
          />
        </div>
        <div class="w-full sm:w-64 shrink-0">
          <label for="ie-filing" class="block font-fira text-[10px] font-bold uppercase tracking-[0.18em] text-[#858585] mb-1.5">
            FILING STATUS
          </label>
          <select id="ie-filing" class="cyber-select w-full">
            <option value="single">Single</option>
            <option value="marriedJoint">Married — Jointly Assessed</option>
            <option value="marriedSeparate">Married — Separately Assessed</option>
          </select>
        </div>
      </div>

      <div class="rounded-xl border border-white/10 bg-[#050505] p-4 sm:p-5 flex flex-col gap-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${sliderField('ie-salary-range', 'Employment Income', `€${wholeFmt.format(taxInputs.employmentIncome)}`, 0, 300_000, 1_000, taxInputs.employmentIncome, 'Annual gross base salary before tax and pension.')}
          ${sliderField('ie-bonus', 'Annual Bonus', `€${wholeFmt.format(taxInputs.bonus)}`, 0, 100_000, 500, taxInputs.bonus, 'Cash bonus taxed via PAYE, PRSI, and USC.')}
          ${sliderField('ie-benefits', 'Taxable Benefits (BIK / mo)', `€${wholeFmt.format(taxInputs.taxableBenefits / 12)}`, 0, 10_000, 50, taxInputs.taxableBenefits / 12, 'Monthly employer-paid taxable benefits such as health insurance.')}
          ${sliderField('ie-stocks', 'Stock / Capital Gains', `€${wholeFmt.format(taxInputs.stockGains)}`, 0, 200_000, 1_000, taxInputs.stockGains, 'Realised capital gains taxed at 33% above the €1,270 annual exemption.')}
          ${sliderField('ie-other', 'Other Income', `€${wholeFmt.format(taxInputs.otherIncome)}`, 0, 100_000, 500, taxInputs.otherIncome, 'Additional taxable non-PAYE income.')}
          ${sliderField('ie-rental', 'Net Rental Income', `€${wholeFmt.format(taxInputs.rentalIncome)}`, 0, 100_000, 500, taxInputs.rentalIncome, 'Annual net taxable rental income.')}
          ${sliderField('ie-age', 'Age', String(taxInputs.age), 18, 75, 1, taxInputs.age, 'Determines your age-related pension tax relief percentage (15%–40%).', 'text-white')}
          ${sliderField('ie-children', 'Children', String(taxInputs.numberOfChildren), 0, 10, 1, taxInputs.numberOfChildren, 'Number of dependent children (for reference).', 'text-white')}
          ${sliderField('ie-pension', 'Pension Contribution (/ mo)', `€${wholeFmt.format(taxInputs.pensionContribution / 12)}`, 0, 5_000, 50, taxInputs.pensionContribution / 12, 'Monthly employee pension contribution eligible for income tax relief up to age limit.', 'text-emerald-400')}
        </div>

        <div id="ie-partner-fields" class="hidden grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 pt-4">
          ${sliderField('ie-partner-salary', 'Partner Annual Income', `€${wholeFmt.format(taxInputs.partnerEmploymentIncome)}`, 0, 300_000, 1_000, taxInputs.partnerEmploymentIncome, 'Partner annual gross PAYE income for joint assessment (band transfer up to €35,000).')}
          ${sliderField('ie-partner-age', 'Partner Age', String(taxInputs.partnerAge), 18, 75, 1, taxInputs.partnerAge, 'Determines partner pension relief cap.', 'text-white')}
          ${sliderField('ie-partner-pension', 'Partner Pension (/ mo)', `€${wholeFmt.format(taxInputs.partnerPensionContribution / 12)}`, 0, 5_000, 50, taxInputs.partnerPensionContribution / 12, 'Partner monthly pension contribution.', 'text-emerald-400')}
        </div>

        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-3">
          <label id="ie-partner-paye-wrap" class="hidden items-center gap-2 font-fira text-xs text-[#bbb] cursor-pointer">
            <input id="ie-partner-paye" type="checkbox" checked class="accent-[#f3eb2c]" />
            <span>Partner is PAYE worker (+€2,000 employee credit)</span>
          </label>
          <label class="inline-flex items-center gap-2 font-fira text-xs text-[#bbb] cursor-pointer">
            <input id="ie-self-employed" type="checkbox" class="accent-[#f3eb2c]" />
            <span>Self-employed (PRSI on all income, no PAYE employee credit)</span>
          </label>
        </div>
      </div>
    </div>
  `;

  const salaryInput = controlsEl.querySelector<HTMLInputElement>('#tool-primary-input')!;
  const salaryRange = controlsEl.querySelector<HTMLInputElement>('#ie-salary-range')!;
  const filingEl = controlsEl.querySelector<HTMLSelectElement>('#ie-filing')!;
  const partnerFieldsEl = controlsEl.querySelector<HTMLElement>('#ie-partner-fields')!;
  const partnerPayeWrap = controlsEl.querySelector<HTMLElement>('#ie-partner-paye-wrap')!;

  const syncPartnerVisibility = () => {
    const isJoint = taxInputs.filingStatus === 'marriedJoint';
    partnerFieldsEl.classList.toggle('hidden', !isJoint);
    partnerFieldsEl.classList.toggle('grid', isJoint);
    partnerPayeWrap.classList.toggle('hidden', !isJoint);
    partnerPayeWrap.classList.toggle('inline-flex', isJoint);
  };

  // Static shell for output so contractor sliders keep drag focus while updating
  outputEl.innerHTML = `
    <div id="ie-permanent-output" class="flex flex-col gap-5"></div>

    <div class="rounded-xl border border-white/10 bg-[#050505] p-4 sm:p-5 flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="font-fira text-xs font-bold uppercase tracking-[0.18em] text-white">CONTRACT DAY-RATE EQUIVALENT</h3>
          <p class="text-xs text-[#777] mt-0.5">Compare PAYE permanent take-home against Umbrella payroll and Limited company day rates (11.25% employer PRSI accounted for).</p>
        </div>
        <label class="inline-flex items-center gap-2 font-fira text-xs text-[#bbb] cursor-pointer">
          <input id="ie-match-pkg" type="checkbox" class="accent-[#f3eb2c]" />
          <span>Match permanent package</span>
        </label>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        ${sliderField('ie-c-rate', 'Daily Rate', `€${wholeFmt.format(contractInputs.dailyRate)}`, 0, 2_000, 25, contractInputs.dailyRate, 'Contractor gross daily rate.')}
        ${sliderField('ie-c-days', 'Billable Days / yr', String(contractInputs.billableDays), 120, 260, 1, contractInputs.billableDays, 'Working days billed per year (220 ≈ 44 weeks).', 'text-white')}
        ${sliderField('ie-c-umbrella', 'Umbrella Fee (/ mo)', `€${wholeFmt.format(contractInputs.umbrellaFeeMonthly)}`, 0, 300, 5, contractInputs.umbrellaFeeMonthly, 'Monthly umbrella company management fee.')}
        ${sliderField('ie-c-accountancy', 'Accountancy (/ yr)', `€${wholeFmt.format(contractInputs.accountancy)}`, 0, 8_000, 100, contractInputs.accountancy, 'Annual Ltd company accountancy fees.')}
        ${sliderField('ie-c-insurance', 'Insurance (/ yr)', `€${wholeFmt.format(contractInputs.insurance)}`, 0, 8_000, 100, contractInputs.insurance, 'Professional indemnity / public liability insurance.')}
        ${sliderField('ie-c-health', 'Health Cover (/ yr)', `€${wholeFmt.format(contractInputs.health)}`, 0, 8_000, 100, contractInputs.health, 'Annual private health cover cost.')}
        ${sliderField('ie-c-pension', 'Contractor Pension (/ yr)', `€${wholeFmt.format(contractInputs.pension)}`, 0, 30_000, 500, contractInputs.pension, 'Annual company pension contribution.', 'text-emerald-400')}
      </div>

      <div id="ie-contract-cards" class="grid grid-cols-1 md:grid-cols-3 gap-3"></div>
    </div>

    <div id="ie-details-output"></div>
  `;

  const permanentOutEl = outputEl.querySelector<HTMLElement>('#ie-permanent-output')!;
  const contractCardsEl = outputEl.querySelector<HTMLElement>('#ie-contract-cards')!;
  const detailsOutEl = outputEl.querySelector<HTMLElement>('#ie-details-output')!;
  const cHealthInput = outputEl.querySelector<HTMLInputElement>('#ie-c-health')!;
  const cPensionInput = outputEl.querySelector<HTMLInputElement>('#ie-c-pension')!;
  const cHealthVal = outputEl.querySelector<HTMLElement>('#ie-c-health-val')!;
  const cPensionVal = outputEl.querySelector<HTMLElement>('#ie-c-pension-val')!;

  const syncContractPackageLock = () => {
    const locked = contractInputs.matchPermanentPackage;
    cHealthInput.disabled = locked;
    cPensionInput.disabled = locked;
    const hVal = locked ? taxInputs.taxableBenefits : contractInputs.health;
    const pVal = locked ? taxInputs.pensionContribution : contractInputs.pension;
    cHealthInput.value = String(Math.min(8_000, hVal));
    cPensionInput.value = String(Math.min(30_000, pVal));
    cHealthVal.textContent = `€${wholeFmt.format(hVal)}`;
    cPensionVal.textContent = `€${wholeFmt.format(pVal)}`;
  };

  const renderContractCards = (res: ReturnType<typeof calculateIrishTax2026>) => {
    const cmp = calculateContractComparison(taxInputs, res, contractInputs);
    const isJoint = taxInputs.filingStatus === 'marriedJoint' && cmp.partnerIncome > 0;
    const takeHomeLabel = isJoint ? 'Household take-home / yr' : 'Take-home pay / yr';

    contractCardsEl.innerHTML = `
      <div class="rounded-xl border border-white/10 bg-black/60 p-4">
        <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">PERMANENT PAYE</p>
        <p class="mt-2 font-fira text-2xl font-black text-emerald-400">${escapeHtml(euroFmt.format(cmp.permanentNet))}</p>
        <p class="font-fira text-[11px] text-[#777]">${escapeHtml(takeHomeLabel)} · ${escapeHtml(euroFmt.format(cmp.permanentNet / 12))}/mo</p>
        <div class="mt-3 pt-3 border-t border-white/10 space-y-1 font-fira text-xs">
          <div class="flex justify-between"><span class="text-[#777]">Annual income</span><span class="text-white">${escapeHtml(euroFmt.format(cmp.permanentIncome))}</span></div>
          <div class="flex justify-between"><span class="text-[#777]">Deduction rate</span><span class="text-rose-400">${escapeHtml(pctFmt.format(cmp.permanentDeductionRate * 100))}%</span></div>
        </div>
      </div>

      <div class="rounded-xl border border-[#00ffff]/25 bg-black/60 p-4">
        <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#00ffff]">UMBRELLA PAYROLL</p>
        <p class="mt-2 font-fira text-2xl font-black text-emerald-400">${escapeHtml(euroFmt.format(cmp.umbrellaNet))}</p>
        <p class="font-fira text-[11px] text-[#777]">${escapeHtml(takeHomeLabel)} · ${escapeHtml(euroFmt.format(cmp.umbrellaNet / 12))}/mo</p>
        <div class="mt-3 pt-3 border-t border-white/10 space-y-1 font-fira text-xs">
          <div class="flex justify-between"><span class="text-[#777]">Contract amount</span><span class="text-white">${escapeHtml(euroFmt.format(cmp.revenue))}</span></div>
          <div class="flex justify-between"><span class="text-[#777]">Deduction rate</span><span class="text-rose-400">${escapeHtml(pctFmt.format(cmp.umbrellaDeductionRate * 100))}%</span></div>
        </div>
      </div>

      <div class="rounded-xl border border-[#f3eb2c]/30 bg-black/60 p-4">
        <p class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#f3eb2c]">LIMITED COMPANY</p>
        <p class="mt-2 font-fira text-2xl font-black text-emerald-400">${escapeHtml(euroFmt.format(cmp.limitedCompanyNet))}</p>
        <p class="font-fira text-[11px] text-[#777]">${escapeHtml(takeHomeLabel)} · ${escapeHtml(euroFmt.format(cmp.limitedCompanyNet / 12))}/mo</p>
        <div class="mt-3 pt-3 border-t border-white/10 space-y-1 font-fira text-xs">
          <div class="flex justify-between"><span class="text-[#777]">Contract amount</span><span class="text-white">${escapeHtml(euroFmt.format(cmp.revenue))}</span></div>
          <div class="flex justify-between"><span class="text-[#777]">Deduction rate</span><span class="text-rose-400">${escapeHtml(pctFmt.format(cmp.limitedCompanyDeductionRate * 100))}%</span></div>
        </div>
      </div>
    `;
  };

  const renderOutput = () => {
    const res = calculateIrishTax2026(taxInputs);
    syncContractPackageLock();
    const totalPension =
      taxInputs.pensionContribution +
      (taxInputs.filingStatus === 'marriedJoint' ? taxInputs.partnerPensionContribution : 0);
    const totalRelief = res.pensionReliefEligible + res.partnerPensionReliefEligible;

    const rawSegments = [
      { name: 'Net Pay', value: res.annualNetPay, color: '#34d399' },
      { name: 'Income Tax', value: res.incomeTax, color: '#f3eb2c' },
      { name: 'PRSI', value: res.prsi, color: '#00ffff' },
      { name: 'USC', value: res.usc, color: '#fbbf24' },
      { name: 'Pension', value: totalPension, color: '#a78bfa' },
      { name: 'CGT', value: res.cgt, color: '#fb7185' },
    ].filter((s) => s.value > 0);
    const segTotal = Math.max(
      1,
      rawSegments.reduce((sum, s) => sum + s.value, 0),
    );
    const segments = rawSegments.map((s) => ({
      ...s,
      percentage: (s.value / segTotal) * 100,
    }));
    if (activeChartIdx >= segments.length) activeChartIdx = 0;

    const breakdownRows: Array<{ label: string; value: number; tone: string; highlight?: boolean }> = [
      { label: 'Cash income', value: res.cashIncome, tone: 'text-white' },
      { label: 'Income tax (PAYE)', value: -res.incomeTax, tone: 'text-rose-400' },
      { label: 'PRSI (4.2375% blended)', value: -res.prsi, tone: 'text-rose-400' },
      { label: 'Universal Social Charge (USC)', value: -res.usc, tone: 'text-rose-400' },
      { label: 'Capital Gains Tax (CGT)', value: -res.cgt, tone: 'text-rose-400' },
      { label: 'Pension / AVC', value: -totalPension, tone: 'text-purple-300' },
      { label: 'Pension eligible for income-tax relief', value: totalRelief, tone: 'text-[#888]' },
      { label: 'Take-home pay', value: res.annualNetPay, tone: 'text-emerald-400', highlight: true },
    ];

    const divisor = mobilePeriod === 'monthly' ? 12 : 1;

    const snippetEl = document.getElementById('cli-snippet');
    if (snippetEl) {
      snippetEl.textContent = `curl -s "${window.location.origin}/api/irishtax?salary=${Math.round(taxInputs.employmentIncome)}&filing=${taxInputs.filingStatus}"`;
    }

    permanentOutEl.innerHTML = `
      <!-- Hero Summary + Donut -->
      <div class="rounded-xl border border-[#00ffff]/25 bg-[#050505] overflow-hidden">
        <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-5 p-5 items-center">
          <div class="min-w-0">
            <p class="font-fira text-[10px] font-bold uppercase tracking-[0.2em] text-[#00ffff]">TAKE-HOME PAY (2026)</p>
            <p class="mt-1.5 font-fira text-3xl sm:text-4xl font-black text-emerald-400 tabular-nums">${escapeHtml(euroFmt.format(res.annualNetPay))}<span class="text-xs font-normal text-[#777] ml-2">/ year</span></p>
            <p class="mt-1 font-fira text-xs text-[#858585]">From <span class="text-white font-semibold">${escapeHtml(euroFmt.format(res.cashIncome))}</span> cash income before deductions</p>

            <div class="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 border-t border-white/10 pt-4">
              <div>
                <p class="font-fira text-[10px] uppercase tracking-wider text-[#777]">Monthly Net</p>
                <p class="mt-0.5 font-fira text-base font-bold text-[#f3eb2c]">${escapeHtml(euroFmt.format(res.annualNetPay / 12))}</p>
              </div>
              <div>
                <p class="font-fira text-[10px] uppercase tracking-wider text-[#777]">Total Tax</p>
                <p class="mt-0.5 font-fira text-base font-bold text-rose-400">${escapeHtml(euroFmt.format(res.totalTax))}</p>
              </div>
              <div>
                <p class="font-fira text-[10px] uppercase tracking-wider text-[#777]">Deduction Rate</p>
                <p class="mt-0.5 font-fira text-base font-bold text-[#00ffff]">${escapeHtml(pctFmt.format(res.effectiveRate * 100))}%</p>
              </div>
            </div>
          </div>

          <div id="ie-donut-wrap">
            ${renderDonutSvg(segments, activeChartIdx, euroFmt, pctFmt)}
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 border-t border-white/10 bg-black/50 p-3">
          ${segments
            .map(
              (seg, idx) => `
                <button
                  type="button"
                  data-legend-idx="${idx}"
                  style="border-color: ${idx === activeChartIdx ? seg.color : `${seg.color}55`}; background: ${idx === activeChartIdx ? `${seg.color}22` : `${seg.color}0d`};"
                  class="flex items-center justify-between gap-2 rounded-full border px-3 py-1.5 font-fira text-[11px] transition-all cursor-pointer text-white"
                >
                  <span class="truncate">${escapeHtml(seg.name)}</span>
                  <span class="font-bold shrink-0" style="color:${seg.color}">${escapeHtml(pctFmt.format(seg.percentage))}%</span>
                </button>
              `,
            )
            .join('')}
        </div>
      </div>

      <!-- Full Breakdown Table -->
      <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
        <div class="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-black/60">
          <span class="font-fira text-[10px] font-bold uppercase tracking-[0.2em] text-[#858585]">BREAKDOWN</span>
          <div class="inline-flex sm:hidden rounded-lg border border-white/15 bg-black p-0.5">
            <button type="button" data-ie-period="annual" class="px-2.5 py-1 rounded font-fira text-[10px] uppercase cursor-pointer ${mobilePeriod === 'annual' ? 'bg-[#f3eb2c]/15 text-[#f3eb2c]' : 'text-[#888]'}">Annual</button>
            <button type="button" data-ie-period="monthly" class="px-2.5 py-1 rounded font-fira text-[10px] uppercase cursor-pointer ${mobilePeriod === 'monthly' ? 'bg-[#f3eb2c]/15 text-[#f3eb2c]' : 'text-[#888]'}">Monthly</button>
          </div>
        </div>

        <div class="sm:hidden divide-y divide-white/8">
          ${breakdownRows
            .map(
              (row) => `
                <div class="flex items-center justify-between gap-3 px-4 py-2.5 font-fira text-xs ${row.highlight ? 'bg-emerald-500/8 font-bold' : ''}">
                  <span class="text-[#bbb]">${escapeHtml(row.label)}</span>
                  <span class="${row.tone} shrink-0">${escapeHtml(euroFmt.format(row.value / divisor))}</span>
                </div>
              `,
            )
            .join('')}
        </div>

        <div class="hidden sm:block overflow-x-auto">
          <table class="w-full text-left font-fira text-xs">
            <thead class="bg-black/40 text-[10px] uppercase tracking-[0.18em] text-[#777]">
              <tr>
                <th class="px-4 py-2.5">Line Item</th>
                <th class="px-4 py-2.5 text-right">Annual</th>
                <th class="px-4 py-2.5 text-right">Monthly</th>
                <th class="px-4 py-2.5 text-right">Weekly</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/8">
              ${breakdownRows
                .map(
                  (row) => `
                    <tr class="${row.highlight ? 'bg-emerald-500/8 font-bold' : ''}">
                      <td class="px-4 py-2.5 text-[#ccc]">${escapeHtml(row.label)}</td>
                      <td class="px-4 py-2.5 text-right ${row.tone}">${escapeHtml(euroFmt.format(row.value))}</td>
                      <td class="px-4 py-2.5 text-right ${row.tone}">${escapeHtml(euroFmt.format(row.value / 12))}</td>
                      <td class="px-4 py-2.5 text-right ${row.tone}">${escapeHtml(euroFmt.format(row.value / 52))}</td>
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    renderContractCards(res);

    detailsOutEl.innerHTML = `
      <details class="rounded-xl border border-white/10 bg-[#050505] p-4">
        <summary class="cursor-pointer font-fira text-xs font-bold uppercase tracking-[0.18em] text-[#00ffff]">
          2026 IRISH TAX BANDS, USC BREAKDOWN &amp; SOURCES
        </summary>
        <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 font-fira text-xs">
          <div class="rounded-lg border border-white/10 bg-black/60 p-3 space-y-1.5">
            <p class="text-[10px] font-bold uppercase tracking-wider text-[#f3eb2c]">Income Tax (20% / 40%)</p>
            <p class="text-[#aaa]">Standard Band: <span class="text-white">${escapeHtml(euroFmt.format(res.standardBand))}</span></p>
            <p class="text-[#aaa]">20% Tax: <span class="text-white">${escapeHtml(euroFmt.format(res.standardRateTax))}</span></p>
            <p class="text-[#aaa]">40% Tax: <span class="text-white">${escapeHtml(euroFmt.format(res.higherRateTax))}</span></p>
            <p class="text-[#aaa]">Tax Credits: <span class="text-emerald-400">-${escapeHtml(euroFmt.format(res.taxCredits))}</span></p>
          </div>
          <div class="rounded-lg border border-white/10 bg-black/60 p-3 space-y-1.5">
            <p class="text-[10px] font-bold uppercase tracking-wider text-[#00ffff]">USC Bands (Primary)</p>
            ${res.uscBands
              .map(
                (b) =>
                  `<div class="flex justify-between text-[#aaa]"><span>${escapeHtml(b.label)} (${pctFmt.format(b.rate * 100)}%)</span><span class="text-white">${escapeHtml(euroFmt.format(b.amount))}</span></div>`,
              )
              .join('')}
          </div>
          <div class="rounded-lg border border-white/10 bg-black/60 p-3 space-y-2">
            <p class="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Official Revenue.ie Sources</p>
            <p class="text-[#888] leading-relaxed">Estimate uses announced 2026 headline rates (Class A blended PRSI 4.2375%, CGT 33% over €1,270, pension relief capped at €115k).</p>
            <div class="flex flex-wrap gap-2 pt-1">
              <a href="https://www.revenue.ie/en/corporate/press-office/budget-information/previous-years/2026/budget-summary.pdf" target="_blank" rel="noreferrer" class="px-2.5 py-1 rounded border border-white/15 bg-black text-[10px] text-[#00ffff] hover:border-[#00ffff]/60">Revenue Budget 2026 summary ↗</a>
              <a href="https://www.revenue.ie/en/jobs-and-pensions/calculating-your-income-tax/tax-rate-band.aspx" target="_blank" rel="noreferrer" class="px-2.5 py-1 rounded border border-white/15 bg-black text-[10px] text-[#00ffff] hover:border-[#00ffff]/60">Revenue tax rate bands ↗</a>
            </div>
          </div>
        </div>
      </details>
    `;

    // Interactive chart legend & donut segments
    permanentOutEl.querySelectorAll<HTMLElement>('[data-legend-idx], [data-donut-idx]').forEach((el) => {
      const idx = Number(el.dataset.legendIdx ?? el.dataset.donutIdx ?? '0');
      el.addEventListener('click', () => {
        if (activeChartIdx !== idx) {
          activeChartIdx = idx;
          renderOutput();
        }
      });
    });

    permanentOutEl.querySelectorAll<HTMLButtonElement>('[data-ie-period]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.iePeriod as 'annual' | 'monthly';
        if (next && next !== mobilePeriod) {
          mobilePeriod = next;
          renderOutput();
        }
      });
    });
  };

  // Bind contractor sliders & checkbox once (never lose drag focus)
  const bindContractRange = (
    id: string,
    key: keyof ContractorInputs,
    format: (v: number) => string,
  ) => {
    const el = outputEl.querySelector<HTMLInputElement>(`#${id}`);
    const valEl = outputEl.querySelector<HTMLElement>(`#${id}-val`);
    el?.addEventListener('input', () => {
      const v = Number(el.value) || 0;
      (contractInputs[key] as number) = v;
      if (valEl) valEl.textContent = format(v);
      renderContractCards(calculateIrishTax2026(taxInputs));
    });
  };
  bindContractRange('ie-c-rate', 'dailyRate', (v) => `€${wholeFmt.format(v)}`);
  bindContractRange('ie-c-days', 'billableDays', (v) => String(v));
  bindContractRange('ie-c-umbrella', 'umbrellaFeeMonthly', (v) => `€${wholeFmt.format(v)}`);
  bindContractRange('ie-c-accountancy', 'accountancy', (v) => `€${wholeFmt.format(v)}`);
  bindContractRange('ie-c-insurance', 'insurance', (v) => `€${wholeFmt.format(v)}`);
  bindContractRange('ie-c-health', 'health', (v) => `€${wholeFmt.format(v)}`);
  bindContractRange('ie-c-pension', 'pension', (v) => `€${wholeFmt.format(v)}`);

  outputEl.querySelector<HTMLInputElement>('#ie-match-pkg')?.addEventListener('change', (e) => {
    contractInputs.matchPermanentPackage = (e.target as HTMLInputElement).checked;
    syncContractPackageLock();
    renderContractCards(calculateIrishTax2026(taxInputs));
  });

  // Bind permanent inputs
  salaryInput.addEventListener('input', () => {
    const val = Math.max(0, Number(salaryInput.value) || 0);
    taxInputs.employmentIncome = val;
    salaryRange.value = String(Math.min(300_000, val));
    controlsEl.querySelector('#ie-salary-range-val')!.textContent = `€${wholeFmt.format(val)}`;
    renderOutput();
  });

  salaryRange.addEventListener('input', () => {
    const val = Number(salaryRange.value) || 0;
    taxInputs.employmentIncome = val;
    salaryInput.value = String(val);
    controlsEl.querySelector('#ie-salary-range-val')!.textContent = `€${wholeFmt.format(val)}`;
    renderOutput();
  });

  const bindTaxSlider = (
    id: string,
    onVal: (val: number) => void,
    format: (val: number) => string,
  ) => {
    const input = controlsEl.querySelector<HTMLInputElement>(`#${id}`);
    const valEl = controlsEl.querySelector<HTMLElement>(`#${id}-val`);
    input?.addEventListener('input', () => {
      const v = Number(input.value) || 0;
      onVal(v);
      if (valEl) valEl.textContent = format(v);
      renderOutput();
    });
  };

  bindTaxSlider('ie-bonus', (v) => (taxInputs.bonus = v), (v) => `€${wholeFmt.format(v)}`);
  bindTaxSlider('ie-benefits', (v) => (taxInputs.taxableBenefits = v * 12), (v) => `€${wholeFmt.format(v)}`);
  bindTaxSlider('ie-stocks', (v) => (taxInputs.stockGains = v), (v) => `€${wholeFmt.format(v)}`);
  bindTaxSlider('ie-other', (v) => (taxInputs.otherIncome = v), (v) => `€${wholeFmt.format(v)}`);
  bindTaxSlider('ie-rental', (v) => (taxInputs.rentalIncome = v), (v) => `€${wholeFmt.format(v)}`);
  bindTaxSlider('ie-age', (v) => (taxInputs.age = v), (v) => String(v));
  bindTaxSlider('ie-children', (v) => (taxInputs.numberOfChildren = v), (v) => String(v));
  bindTaxSlider('ie-pension', (v) => (taxInputs.pensionContribution = v * 12), (v) => `€${wholeFmt.format(v)}`);
  bindTaxSlider('ie-partner-salary', (v) => (taxInputs.partnerEmploymentIncome = v), (v) => `€${wholeFmt.format(v)}`);
  bindTaxSlider('ie-partner-age', (v) => (taxInputs.partnerAge = v), (v) => String(v));
  bindTaxSlider('ie-partner-pension', (v) => (taxInputs.partnerPensionContribution = v * 12), (v) => `€${wholeFmt.format(v)}`);

  filingEl.addEventListener('change', () => {
    taxInputs.filingStatus = filingEl.value as FilingStatus;
    syncPartnerVisibility();
    renderOutput();
  });

  controlsEl.querySelector<HTMLInputElement>('#ie-partner-paye')?.addEventListener('change', (e) => {
    taxInputs.partnerPaye = (e.target as HTMLInputElement).checked;
    renderOutput();
  });

  controlsEl.querySelector<HTMLInputElement>('#ie-self-employed')?.addEventListener('change', (e) => {
    taxInputs.selfEmployed = (e.target as HTMLInputElement).checked;
    renderOutput();
  });

  syncPartnerVisibility();
  renderOutput();
}

function mountJsonBrowser(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  const sampleJson = JSON.stringify(
    {
      service: {
        name: 'lui.z-tools',
        version: '2.6.0',
        runtime: 'bun',
        healthy: true,
        tls: { enabled: true, protocol: 'TLSv1.3', alpn: ['h2', 'http/1.1'] },
      },
      regions: [
        { id: 'eu-central-1', city: 'Frankfurt', latencyMs: 14.2, active: true },
        { id: 'eu-west-3', city: 'Paris', latencyMs: 21.8, active: true },
        { id: 'us-east-1', city: 'Virginia', latencyMs: 88.5, active: true },
        { id: 'ap-northeast-1', city: 'Tokyo', latencyMs: 214.0, active: false },
      ],
      limits: {
        maxPorts: 64,
        maxWebhookEvents: 500,
        maxPayloadBytes: 262144,
        deprecated: null,
      },
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
    null,
    2,
  );

  let parsedValue: unknown = JSON.parse(sampleJson);
  let parseError: string | null = null;
  let searchQuery = '';
  let inputCollapsed = false;
  let selectedPath = '$';
  let selectedValue: unknown = parsedValue;
  const expandedPaths = new Set<string>();

  const collectContainerPaths = (val: unknown, maxDepth: number): Set<string> => {
    const paths = new Set<string>();
    const walk = (node: unknown, segs: JsonPathSegment[], depth: number) => {
      if (node === null || typeof node !== 'object') return;
      if (depth < maxDepth) {
        paths.add(formatJsonPath(segs));
        if (Array.isArray(node)) {
          node.forEach((child, idx) => walk(child, [...segs, idx], depth + 1));
        } else {
          Object.entries(node as Record<string, unknown>).forEach(([k, v]) =>
            walk(v, [...segs, k], depth + 1),
          );
        }
      }
    };
    walk(val, [], 0);
    return paths;
  };

  const setExpandedDepth = (depth: number) => {
    expandedPaths.clear();
    if (parseError) return;
    for (const p of collectContainerPaths(parsedValue, depth)) {
      expandedPaths.add(p);
    }
  };

  setExpandedDepth(2);

  controlsEl.innerHTML = `
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5 font-fira text-[11px]">
          <button id="jb-toggle-input" type="button" class="px-2.5 py-1.5 rounded-lg border border-[#00ffff]/40 bg-[#00ffff]/10 text-[#00ffff] hover:bg-[#00ffff]/20 transition-colors cursor-pointer">HIDE INPUT</button>
          <button id="jb-sample-btn" type="button" class="px-2.5 py-1.5 rounded-lg border border-white/15 bg-[#050505] text-[#bbb] hover:text-[#f3eb2c] transition-colors cursor-pointer">SAMPLE</button>
          <button id="jb-format-btn" type="button" class="px-2.5 py-1.5 rounded-lg border border-white/15 bg-[#050505] text-[#bbb] hover:text-[#00ffff] transition-colors cursor-pointer">FORMAT</button>
          <button id="jb-minify-btn" type="button" class="px-2.5 py-1.5 rounded-lg border border-white/15 bg-[#050505] text-[#bbb] hover:text-[#00ffff] transition-colors cursor-pointer">MINIFY</button>
          <button id="jb-clear-btn" type="button" class="px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-950/15 text-rose-300 hover:border-rose-400/60 transition-colors cursor-pointer">CLEAR</button>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 font-fira text-[11px]">
          <button id="jb-expand-all" type="button" class="px-2.5 py-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer">EXPAND ALL</button>
          <button id="jb-collapse-all" type="button" class="px-2.5 py-1.5 rounded-lg border border-[#f3eb2c]/40 bg-[#f3eb2c]/10 text-[#f3eb2c] hover:bg-[#f3eb2c]/20 transition-colors cursor-pointer">COLLAPSE ALL</button>
          <button data-jb-depth="1" type="button" class="px-2 py-1.5 rounded-lg border border-white/15 bg-[#050505] text-[#aaa] hover:text-white cursor-pointer">LVL 1</button>
          <button data-jb-depth="2" type="button" class="px-2 py-1.5 rounded-lg border border-white/15 bg-[#050505] text-[#aaa] hover:text-white cursor-pointer">LVL 2</button>
          <button data-jb-depth="3" type="button" class="px-2 py-1.5 rounded-lg border border-white/15 bg-[#050505] text-[#aaa] hover:text-white cursor-pointer">LVL 3</button>
        </div>
      </div>

      <div id="jb-input-wrap" class="rounded-xl border border-white/10 bg-[#050505] p-3 flex flex-col gap-2">
        <div class="flex items-center justify-between font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585]">
          <span>JSON INPUT</span>
          <span id="jb-byte-count" class="text-[#00ffff]">${formatBytes(new TextEncoder().encode(sampleJson).length)}</span>
        </div>
        <textarea
          id="jb-input"
          rows="7"
          spellcheck="false"
          placeholder="Paste any JSON object or array here..."
          class="w-full rounded-lg border border-white/10 bg-black p-3 font-fira text-xs text-white focus:outline-none focus:border-[#00ffff]/60 resize-y"
        >${escapeHtml(sampleJson)}</textarea>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <input
          id="jb-search"
          type="text"
          placeholder="Search keys or values in tree..."
          autocomplete="off"
          spellcheck="false"
          class="cyber-input !py-2 !text-xs flex-1"
        />
        <span id="jb-match-count" class="font-fira text-[11px] text-[#858585] shrink-0"></span>
      </div>
    </div>
  `;

  const inputWrap = controlsEl.querySelector<HTMLElement>('#jb-input-wrap')!;
  const toggleInputBtn = controlsEl.querySelector<HTMLButtonElement>('#jb-toggle-input')!;
  const textarea = controlsEl.querySelector<HTMLTextAreaElement>('#jb-input')!;
  const byteCountEl = controlsEl.querySelector<HTMLElement>('#jb-byte-count')!;
  const searchInput = controlsEl.querySelector<HTMLInputElement>('#jb-search')!;
  const matchCountEl = controlsEl.querySelector<HTMLElement>('#jb-match-count')!;

  const pathValueMap = new Map<string, unknown>();

  const renderPrimitive = (val: unknown): string => {
    if (typeof val === 'string') {
      return `<span class="text-emerald-400 break-all">"${escapeHtml(val)}"</span>`;
    }
    if (typeof val === 'number') {
      return `<span class="text-[#f3eb2c]">${String(val)}</span>`;
    }
    if (typeof val === 'boolean') {
      return `<span class="text-purple-400">${String(val)}</span>`;
    }
    return `<span class="text-rose-400 italic">null</span>`;
  };

  const renderTree = () => {
    pathValueMap.clear();
    if (parseError) {
      matchCountEl.textContent = '';
      showError(outputEl, `Invalid JSON: ${parseError}`);
      return;
    }

    const stats = analyzeJsonTree(parsedValue);
    const hasQuery = searchQuery.trim().length > 0;
    const matches = hasQuery
      ? searchJsonTree(parsedValue, searchQuery)
      : { matchedPaths: new Set<string>(), ancestorPaths: new Set<string>() };

    matchCountEl.textContent = hasQuery
      ? `${matches.matchedPaths.size} match${matches.matchedPaths.size === 1 ? '' : 'es'}`
      : '';

    const renderNode = (
      val: unknown,
      segs: JsonPathSegment[],
      keyLabel: string | number | null,
      depth: number,
    ): string => {
      const path = formatJsonPath(segs);
      pathValueMap.set(path, val);
      const isMatched = matches.matchedPaths.has(path);
      const isSelected = path === selectedPath;
      const highlightCls = isMatched
        ? 'bg-[#f3eb2c]/15 ring-1 ring-[#f3eb2c]/45'
        : isSelected
          ? 'bg-[#00ffff]/10'
          : 'hover:bg-white/5';

      const keyHtml =
        keyLabel === null
          ? ''
          : typeof keyLabel === 'number'
            ? `<span class="text-[#777] mr-1.5">[${keyLabel}]</span>`
            : `<span class="text-[#00ffff] mr-1">"${escapeHtml(keyLabel)}"</span><span class="text-[#666] mr-1.5">:</span>`;

      if (val !== null && typeof val === 'object') {
        const isArr = Array.isArray(val);
        const entries: Array<[string | number, unknown]> = isArr
          ? val.map((item, idx) => [idx, item])
          : Object.entries(val as Record<string, unknown>);
        const count = entries.length;
        const isExpanded =
          expandedPaths.has(path) || (hasQuery && matches.ancestorPaths.has(path));
        const openBracket = isArr ? '[' : '{';
        const closeBracket = isArr ? ']' : '}';
        const summaryText = isArr
          ? `${count} item${count === 1 ? '' : 's'}`
          : `${count} key${count === 1 ? '' : 's'}`;

        const childrenHtml =
          isExpanded && count > 0
            ? `<div class="ml-4 pl-3 border-l border-white/10 flex flex-col gap-0.5 mt-0.5">${entries
                .map(([k, v]) => renderNode(v, [...segs, k], k, depth + 1))
                .join('')}</div>`
            : '';

        return `
          <div class="font-fira text-xs leading-relaxed">
            <div class="group flex items-center gap-1.5 rounded px-1.5 py-0.5 ${highlightCls}">
              <button
                type="button"
                data-jb-toggle="${escapeHtml(path)}"
                aria-expanded="${isExpanded ? 'true' : 'false'}"
                class="inline-flex items-center justify-center w-4 h-4 rounded text-[#00ffff] hover:bg-white/10 cursor-pointer shrink-0 select-none"
                title="${isExpanded ? 'Collapse' : 'Expand'}"
              >${count === 0 ? '·' : isExpanded ? '▾' : '▸'}</button>
              <button
                type="button"
                data-jb-select="${escapeHtml(path)}"
                class="flex items-center flex-wrap text-left min-w-0 flex-1 cursor-pointer"
              >
                ${keyHtml}
                <span class="text-[#999]">${openBracket}</span>
                ${
                  isExpanded
                    ? count === 0
                      ? `<span class="text-[#999]">${closeBracket}</span>`
                      : `<span class="ml-1.5 text-[10px] text-[#666]">${summaryText}</span>`
                    : `<span class="mx-1.5 px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-[10px] text-[#999]">${summaryText}</span><span class="text-[#999]">${closeBracket}</span>`
                }
              </button>
            </div>
            ${childrenHtml}
            ${isExpanded && count > 0 ? `<div class="pl-6 text-[#999]">${closeBracket}</div>` : ''}
          </div>
        `;
      }

      return `
        <div class="font-fira text-xs leading-relaxed">
          <div class="group flex items-start gap-1.5 rounded px-1.5 py-0.5 pl-6 ${highlightCls}">
            <button
              type="button"
              data-jb-select="${escapeHtml(path)}"
              class="flex items-baseline flex-wrap text-left min-w-0 flex-1 cursor-pointer"
            >
              ${keyHtml}${renderPrimitive(val)}
            </button>
          </div>
        </div>
      `;
    };

    outputEl.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${statCard('TOTAL NODES', String(stats.totalNodes), 'cyan')}
        ${statCard('OBJECTS', String(stats.objects), 'yellow')}
        ${statCard('ARRAYS', String(stats.arrays), 'white')}
        ${statCard('MAX DEPTH', String(stats.maxDepth), 'green')}
      </div>

      <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-white/10 bg-black/60">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] shrink-0">PATH</span>
            <code id="jb-selected-path" class="font-fira text-xs text-[#f3eb2c] truncate select-all">${escapeHtml(selectedPath)}</code>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button id="jb-copy-path" type="button" class="px-2.5 py-1 rounded border border-white/15 bg-black font-fira text-[10px] uppercase tracking-wider text-[#00ffff] hover:border-[#00ffff]/60 cursor-pointer">COPY PATH</button>
            <button id="jb-copy-val" type="button" class="px-2.5 py-1 rounded border border-white/15 bg-black font-fira text-[10px] uppercase tracking-wider text-[#f3eb2c] hover:border-[#f3eb2c]/60 cursor-pointer">COPY VALUE</button>
          </div>
        </div>

        <div id="jb-tree-container" class="p-4 overflow-x-auto flex flex-col gap-0.5">
          ${renderNode(parsedValue, [], null, 0)}
        </div>
      </div>
    `;

    outputEl.querySelectorAll<HTMLButtonElement>('[data-jb-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.jbToggle;
        if (!p) return;
        if (expandedPaths.has(p)) {
          expandedPaths.delete(p);
        } else {
          expandedPaths.add(p);
        }
        renderTree();
      });
    });

    outputEl.querySelectorAll<HTMLButtonElement>('[data-jb-select]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.jbSelect;
        if (!p) return;
        selectedPath = p;
        selectedValue = pathValueMap.get(p);
        // Also toggle containers on click for smooth section-by-section browsing
        if (selectedValue !== null && typeof selectedValue === 'object') {
          if (expandedPaths.has(p)) {
            expandedPaths.delete(p);
          } else {
            expandedPaths.add(p);
          }
        }
        renderTree();
      });
    });

    const copyPathBtn = outputEl.querySelector<HTMLButtonElement>('#jb-copy-path');
    copyPathBtn?.addEventListener('click', () => {
      void copyText(selectedPath, copyPathBtn, 'COPY PATH');
    });

    const copyValBtn = outputEl.querySelector<HTMLButtonElement>('#jb-copy-val');
    copyValBtn?.addEventListener('click', () => {
      const text =
        typeof selectedValue === 'string'
          ? selectedValue
          : JSON.stringify(selectedValue, null, 2);
      void copyText(text, copyValBtn, 'COPY VALUE');
    });
  };

  const parseInput = (resetDepth = false) => {
    const raw = textarea.value;
    byteCountEl.textContent = formatBytes(new TextEncoder().encode(raw).length);
    if (!raw.trim()) {
      parseError = 'Enter or paste JSON to explore.';
      renderTree();
      return;
    }
    try {
      parsedValue = JSON.parse(raw);
      parseError = null;
      selectedPath = '$';
      selectedValue = parsedValue;
      if (resetDepth) setExpandedDepth(2);
      else expandedPaths.add('$');
    } catch (err) {
      parseError = err instanceof Error ? err.message : 'Syntax error';
    }
    renderTree();
  };

  toggleInputBtn.addEventListener('click', () => {
    inputCollapsed = !inputCollapsed;
    inputWrap.classList.toggle('hidden', inputCollapsed);
    toggleInputBtn.textContent = inputCollapsed ? 'SHOW INPUT' : 'HIDE INPUT';
  });

  textarea.addEventListener('input', () => parseInput(false));

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    renderTree();
  });

  controlsEl.querySelector('#jb-expand-all')?.addEventListener('click', () => {
    setExpandedDepth(Number.POSITIVE_INFINITY);
    renderTree();
  });

  controlsEl.querySelector('#jb-collapse-all')?.addEventListener('click', () => {
    // Keep root open so every top-level section is collapsed and ready to expand one by one
    setExpandedDepth(1);
    renderTree();
  });

  controlsEl.querySelectorAll<HTMLButtonElement>('[data-jb-depth]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const d = Number(btn.dataset.jbDepth ?? '2');
      setExpandedDepth(d);
      renderTree();
    });
  });

  controlsEl.querySelector('#jb-sample-btn')?.addEventListener('click', () => {
    textarea.value = sampleJson;
    parseInput(true);
  });

  controlsEl.querySelector('#jb-format-btn')?.addEventListener('click', () => {
    if (!parseError) {
      textarea.value = JSON.stringify(parsedValue, null, 2);
      byteCountEl.textContent = formatBytes(new TextEncoder().encode(textarea.value).length);
    }
  });

  controlsEl.querySelector('#jb-minify-btn')?.addEventListener('click', () => {
    if (!parseError) {
      textarea.value = JSON.stringify(parsedValue);
      byteCountEl.textContent = formatBytes(new TextEncoder().encode(textarea.value).length);
    }
  });

  controlsEl.querySelector('#jb-clear-btn')?.addEventListener('click', () => {
    textarea.value = '';
    searchInput.value = '';
    searchQuery = '';
    parseInput(false);
    if (inputCollapsed) {
      inputCollapsed = false;
      inputWrap.classList.remove('hidden');
      toggleInputBtn.textContent = 'HIDE INPUT';
    }
    textarea.focus();
  });

  renderTree();
}

function mountSoil(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  const inputs: SoilInputs = { ...DEFAULT_SOIL_INPUTS };
  let customBagLitres = 40;
  let customBagPrice = 0;

  const unitOptions = (selected: SoilLengthUnit) =>
    (
      [
        ['m', 'Meters (m)'],
        ['cm', 'Centimeters (cm)'],
        ['mm', 'Millimeters (mm)'],
        ['ft', 'Feet (ft)'],
        ['in', 'Inches (in)'],
        ['yd', 'Yards (yd)'],
      ] as const
    )
      .map(
        ([u, label]) =>
          `<option value="${u}"${u === selected ? ' selected' : ''}>${label}</option>`,
      )
      .join('');

  controlsEl.innerHTML = `
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-1.5 font-fira text-[11px]">
        <span class="text-[#858585] text-[10px] uppercase tracking-wider mr-1">PRESETS:</span>
        <button type="button" data-soil-preset="1.2,m,1.2,m,30,cm" class="px-2.5 py-1 rounded-md border border-white/15 bg-[#050505] text-[#bbb] hover:border-[#00ffff]/60 hover:text-[#00ffff] cursor-pointer">1.2×1.2m × 30cm</button>
        <button type="button" data-soil-preset="2.4,m,1.2,m,30,cm" class="px-2.5 py-1 rounded-md border border-white/15 bg-[#050505] text-[#bbb] hover:border-[#00ffff]/60 hover:text-[#00ffff] cursor-pointer">2.4×1.2m × 30cm (8×4ft)</button>
        <button type="button" data-soil-preset="3,m,1.2,m,45,cm" class="px-2.5 py-1 rounded-md border border-white/15 bg-[#050505] text-[#bbb] hover:border-[#00ffff]/60 hover:text-[#00ffff] cursor-pointer">3×1.2m × 45cm Deep</button>
        <button type="button" data-soil-preset="10,m,5,m,5,cm" class="px-2.5 py-1 rounded-md border border-white/15 bg-[#050505] text-[#bbb] hover:border-[#f3eb2c]/60 hover:text-[#f3eb2c] cursor-pointer">10×5m × 5cm Lawn</button>
      </div>

      <div class="rounded-xl border border-white/10 bg-[#050505] p-4 sm:p-5 flex flex-col gap-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label for="soil-shape" class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Bed Shape</label>
            <select id="soil-shape" class="cyber-select w-full">
              <option value="rectangle" selected>Rectangle / Raised Bed</option>
              <option value="circle">Circle / Round Planter</option>
              <option value="triangle">Triangle / Corner Bed</option>
            </select>
          </div>
          <div class="sm:col-span-1 lg:col-span-2">
            <label for="soil-material" class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Soil / Compost / Mulch Mix</label>
            <select id="soil-material" class="cyber-select w-full">
              ${SOIL_MATERIALS.map(
                (m) =>
                  `<option value="${m.id}"${m.id === inputs.material ? ' selected' : ''}>${escapeHtml(m.label)} (${m.densityKgPerM3} kg/m³)</option>`,
              ).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label for="soil-beds" class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Beds Qty</label>
              <input id="soil-beds" type="number" min="1" max="1000" step="1" value="${inputs.beds}" class="cyber-input" />
            </div>
            <div>
              <label for="soil-buffer" class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#858585] mb-1.5">Settling +%</label>
              <select id="soil-buffer" class="cyber-select w-full">
                <option value="0">0%</option>
                <option value="10" selected>+10%</option>
                <option value="15">+15%</option>
                <option value="20">+20%</option>
              </select>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 border-t border-white/10 pt-4">
          <div>
            <label id="soil-length-label" for="soil-length" class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#00ffff] mb-1.5">Length</label>
            <div class="flex gap-2">
              <input id="soil-length" type="number" min="0" step="any" value="${inputs.length}" class="cyber-input flex-1 min-w-0" />
              <select id="soil-length-unit" aria-label="Length unit" class="cyber-select w-36 shrink-0">
                ${unitOptions(inputs.lengthUnit)}
              </select>
            </div>
          </div>

          <div id="soil-width-wrap">
            <label id="soil-width-label" for="soil-width" class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#00ffff] mb-1.5">Width</label>
            <div class="flex gap-2">
              <input id="soil-width" type="number" min="0" step="any" value="${inputs.width}" class="cyber-input flex-1 min-w-0" />
              <select id="soil-width-unit" aria-label="Width unit" class="cyber-select w-36 shrink-0">
                ${unitOptions(inputs.widthUnit)}
              </select>
            </div>
          </div>

          <div>
            <label for="soil-depth" class="block font-fira text-[10px] uppercase tracking-[0.18em] text-[#f3eb2c] mb-1.5">Depth / Thickness</label>
            <div class="flex gap-2">
              <input id="soil-depth" type="number" min="0" step="any" value="${inputs.depth}" class="cyber-input flex-1 min-w-0" />
              <select id="soil-depth-unit" aria-label="Depth unit" class="cyber-select w-36 shrink-0">
                ${unitOptions(inputs.depthUnit)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const shapeEl = controlsEl.querySelector<HTMLSelectElement>('#soil-shape')!;
  const materialEl = controlsEl.querySelector<HTMLSelectElement>('#soil-material')!;
  const bedsEl = controlsEl.querySelector<HTMLInputElement>('#soil-beds')!;
  const bufferEl = controlsEl.querySelector<HTMLSelectElement>('#soil-buffer')!;
  const lengthEl = controlsEl.querySelector<HTMLInputElement>('#soil-length')!;
  const lengthUnitEl = controlsEl.querySelector<HTMLSelectElement>('#soil-length-unit')!;
  const widthWrapEl = controlsEl.querySelector<HTMLElement>('#soil-width-wrap')!;
  const lengthLabelEl = controlsEl.querySelector<HTMLElement>('#soil-length-label')!;
  const widthLabelEl = controlsEl.querySelector<HTMLElement>('#soil-width-label')!;
  const widthEl = controlsEl.querySelector<HTMLInputElement>('#soil-width')!;
  const widthUnitEl = controlsEl.querySelector<HTMLSelectElement>('#soil-width-unit')!;
  const depthEl = controlsEl.querySelector<HTMLInputElement>('#soil-depth')!;
  const depthUnitEl = controlsEl.querySelector<HTMLSelectElement>('#soil-depth-unit')!;

  const syncShapeLabels = () => {
    if (inputs.shape === 'circle') {
      lengthLabelEl.textContent = 'Diameter';
      widthWrapEl.classList.add('hidden');
    } else if (inputs.shape === 'triangle') {
      lengthLabelEl.textContent = 'Base';
      widthLabelEl.textContent = 'Height';
      widthWrapEl.classList.remove('hidden');
    } else {
      lengthLabelEl.textContent = 'Length';
      widthLabelEl.textContent = 'Width';
      widthWrapEl.classList.remove('hidden');
    }
  };

  outputEl.innerHTML = `
    <div id="soil-stats-output" class="flex flex-col gap-5"></div>
    <div class="rounded-xl border border-white/10 bg-[#050505] p-4 sm:p-5 flex flex-col gap-3">
      <p class="font-fira text-[10px] font-bold uppercase tracking-[0.2em] text-[#00ffff]">CUSTOM BAG &amp; COST ESTIMATOR</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div>
          <label for="soil-custom-bag" class="block font-fira text-[10px] uppercase tracking-wider text-[#858585] mb-1.5">Bag Size (Litres)</label>
          <input id="soil-custom-bag" type="number" min="1" max="5000" step="1" value="${customBagLitres}" class="cyber-input" />
        </div>
        <div>
          <label for="soil-custom-price" class="block font-fira text-[10px] uppercase tracking-wider text-[#858585] mb-1.5">Price per Bag (€ optional)</label>
          <input id="soil-custom-price" type="number" min="0" step="0.5" value="" placeholder="e.g. 8.50" class="cyber-input" />
        </div>
        <div id="soil-custom-summary" class="rounded-lg border border-[#f3eb2c]/30 bg-black/60 px-3.5 py-2.5 font-fira text-xs"></div>
      </div>
    </div>
  `;

  const statsOutEl = outputEl.querySelector<HTMLElement>('#soil-stats-output')!;
  const customBagEl = outputEl.querySelector<HTMLInputElement>('#soil-custom-bag')!;
  const customPriceEl = outputEl.querySelector<HTMLInputElement>('#soil-custom-price')!;
  const customSummaryEl = outputEl.querySelector<HTMLElement>('#soil-custom-summary')!;

  const fmt = (n: number, digits = 2) =>
    new Intl.NumberFormat('en-IE', { maximumFractionDigits: digits }).format(n);

  const renderCustomSummary = (litres: number) => {
    const size = Math.max(1, Number(customBagLitres) || 40);
    const bags = litres > 0 ? Math.ceil(litres / size) : 0;
    const price = Math.max(0, Number(customBagPrice) || 0);
    const totalCost = bags * price;
    customSummaryEl.innerHTML = `
      <span class="text-[#858585] text-[10px] uppercase tracking-wider block">NEEDED (${size}L BAGS)</span>
      <span class="text-base font-bold text-[#f3eb2c]">${bags} bag${bags === 1 ? '' : 's'}</span>
      ${price > 0 ? `<span class="text-emerald-400 ml-2 font-bold">· €${fmt(totalCost, 2)}</span>` : ''}
    `;
  };

  const renderOutput = () => {
    const res = calculateSoilVolume(inputs);
    renderCustomSummary(res.litres);

    statsOutEl.innerHTML = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        ${statCard('TOTAL LITRES', `${fmt(res.litres, 0)} L`, 'green')}
        ${statCard('CUBIC METERS', `${fmt(res.volumeM3, 3)} m³`, 'yellow')}
        ${statCard('EST. WEIGHT', `${fmt(res.weightTonnes, 2)} t (${fmt(res.weightKg, 0)} kg)`, 'cyan')}
        ${statCard('SURFACE AREA', `${fmt(res.areaM2, 2)} m²`, 'white')}
      </div>

      <div class="rounded-xl border border-white/10 bg-[#050505] overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-black/60">
          <span class="font-fira text-[10px] font-bold uppercase tracking-[0.2em] text-[#858585]">BAGS &amp; BULK ORDER GUIDE</span>
          <span class="font-fira text-[11px] text-[#777]">${escapeHtml(res.material.note)}${inputs.bufferPercent > 0 ? ` · includes +${inputs.bufferPercent}% settling` : ''}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-white/8">
          ${res.bags
            .map(
              (b) => `
                <div class="p-4 flex flex-col justify-between gap-1">
                  <span class="font-fira text-[10px] uppercase tracking-wider text-[#858585]">${escapeHtml(b.label)}</span>
                  <span class="font-fira text-2xl font-black ${b.litresPerBag === 850 ? 'text-[#f3eb2c]' : 'text-white'}">${b.bagsNeeded}</span>
                  <span class="font-fira text-[10px] text-[#666]">Exact: ${fmt(b.bagsExact, 2)}</span>
                </div>
              `,
            )
            .join('')}
        </div>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5 border-t border-white/10 bg-black/40 font-fira text-[11px] text-[#858585]">
          <span>Imperial: <strong class="text-white">${fmt(res.cubicFeet, 1)} ft³</strong> / <strong class="text-white">${fmt(res.cubicYards, 2)} yd³</strong></span>
          <span>Base (0% buffer): <strong class="text-[#00ffff]">${fmt(res.baseVolumeM3 * 1000, 0)} L</strong> (${fmt(res.baseVolumeM3, 3)} m³)</span>
        </div>
      </div>
    `;
  };

  const syncInputs = () => {
    inputs.shape = shapeEl.value as SoilShape;
    inputs.material = materialEl.value as SoilMaterialId;
    inputs.beds = Math.max(1, Number(bedsEl.value) || 1);
    inputs.bufferPercent = Number(bufferEl.value) || 0;
    inputs.length = Number(lengthEl.value) || 0;
    inputs.lengthUnit = lengthUnitEl.value as SoilLengthUnit;
    inputs.width = Number(widthEl.value) || 0;
    inputs.widthUnit = widthUnitEl.value as SoilLengthUnit;
    inputs.depth = Number(depthEl.value) || 0;
    inputs.depthUnit = depthUnitEl.value as SoilLengthUnit;
    syncShapeLabels();
    renderOutput();
  };

  [
    shapeEl,
    materialEl,
    bedsEl,
    bufferEl,
    lengthEl,
    lengthUnitEl,
    widthEl,
    widthUnitEl,
    depthEl,
    depthUnitEl,
  ].forEach((el) => {
    el.addEventListener('input', syncInputs);
    el.addEventListener('change', syncInputs);
  });

  controlsEl.querySelectorAll<HTMLButtonElement>('[data-soil-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [l, lu, w, wu, d, du] = (btn.dataset.soilPreset ?? '').split(',');
      shapeEl.value = 'rectangle';
      lengthEl.value = l;
      lengthUnitEl.value = lu;
      widthEl.value = w;
      widthUnitEl.value = wu;
      depthEl.value = d;
      depthUnitEl.value = du;
      syncInputs();
    });
  });

  customBagEl.addEventListener('input', () => {
    customBagLitres = Number(customBagEl.value) || 40;
    renderCustomSummary(calculateSoilVolume(inputs).litres);
  });

  customPriceEl.addEventListener('input', () => {
    customBagPrice = Number(customPriceEl.value) || 0;
    renderCustomSummary(calculateSoilVolume(inputs).litres);
  });

  syncShapeLabels();
  renderOutput();
}

function mountPassword(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  outputEl.innerHTML = '';

  let pwType: PasswordType = 'random';
  const randomOpts: RandomPasswordOptions = { ...DEFAULT_RANDOM_OPTIONS };
  const memorableOpts: MemorablePasswordOptions = { ...DEFAULT_MEMORABLE_OPTIONS };
  const pinOpts: PinPasswordOptions = { ...DEFAULT_PIN_OPTIONS };
  let currentResult: PasswordResult = generatePassword({ type: 'random', random: randomOpts });
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  const strengthColor = (strength: PasswordResult['strength']): string => {
    switch (strength) {
      case 'Weak':
        return 'text-rose-400 border-rose-500/35 bg-rose-950/30';
      case 'Fair':
        return 'text-amber-300 border-amber-500/35 bg-amber-950/30';
      case 'Good':
        return 'text-[#f3eb2c] border-[#f3eb2c]/35 bg-[#f3eb2c]/10';
      case 'Strong':
        return 'text-[#00ffff] border-[#00ffff]/35 bg-[#00ffff]/10';
      case 'Very Strong':
        return 'text-emerald-400 border-emerald-500/35 bg-emerald-950/30';
    }
  };

  const renderTokensHtml = (result: PasswordResult): string => {
    return result.tokens
      .map((t) => {
        const ch = escapeHtml(t.char);
        if (t.kind === 'number') {
          return `<span class="text-[#38bdf8]">${ch}</span>`;
        }
        if (t.kind === 'symbol') {
          return `<span class="text-[#f3eb2c]">${ch}</span>`;
        }
        return `<span class="text-white">${ch}</span>`;
      })
      .join('');
  };

  const syncCliSnippet = () => {
    const snippetEl = document.getElementById('cli-snippet');
    if (!snippetEl) return;
    const origin = window.location.origin;
    if (pwType === 'random') {
      snippetEl.textContent = `curl -s "${origin}/api/password?type=random&length=${randomOpts.length}&numbers=${randomOpts.numbers}&symbols=${randomOpts.symbols}"`;
    } else if (pwType === 'memorable') {
      snippetEl.textContent = `curl -s "${origin}/api/password?type=memorable&words=${memorableOpts.words}&separator=${memorableOpts.separator}&capitalize=${memorableOpts.capitalize}&includeNumber=${memorableOpts.includeNumber}"`;
    } else {
      snippetEl.textContent = `curl -s "${origin}/api/password?type=pin&length=${pinOpts.length}"`;
    }
  };

  const renderToggle = (id: string, label: string, checked: boolean): string => `
    <label for="${id}" class="inline-flex items-center gap-3 cursor-pointer select-none">
      <span class="font-inter text-sm text-[#a8a8a8]">${escapeHtml(label)}</span>
      <button
        id="${id}"
        type="button"
        role="switch"
        aria-checked="${checked ? 'true' : 'false'}"
        aria-label="${escapeHtml(label)}"
        class="pw-toggle"
      >
        <span class="pw-toggle-knob" aria-hidden="true"></span>
      </button>
    </label>
  `;

  const renderCard = () => {
    const sliderMin =
      pwType === 'random' ? RANDOM_LENGTH_MIN : pwType === 'memorable' ? MEMORABLE_WORDS_MIN : PIN_LENGTH_MIN;
    const sliderMax =
      pwType === 'random' ? RANDOM_LENGTH_MAX : pwType === 'memorable' ? MEMORABLE_WORDS_MAX : PIN_LENGTH_MAX;
    const sliderVal =
      pwType === 'random' ? randomOpts.length : pwType === 'memorable' ? memorableOpts.words : pinOpts.length;
    const sliderLabel = pwType === 'memorable' ? 'Words' : 'Characters';
    const sliderPct = ((sliderVal - sliderMin) / (sliderMax - sliderMin)) * 100;

    const tabs: Array<{ id: PasswordType; label: string; icon: typeof Shuffle }> = [
      { id: 'random', label: 'Random', icon: Shuffle },
      { id: 'memorable', label: 'Memorable', icon: Lightbulb },
      { id: 'pin', label: 'PIN', icon: Hash },
    ];

    const optionsRowHtml =
      pwType === 'random'
        ? `
          <div class="border-t border-white/10 pt-5 pb-1 flex flex-wrap items-center gap-x-8 gap-y-4">
            ${renderToggle('pw-opt-numbers', 'Numbers', randomOpts.numbers)}
            ${renderToggle('pw-opt-symbols', 'Symbols', randomOpts.symbols)}
          </div>
        `
        : pwType === 'memorable'
          ? `
            <div class="border-t border-white/10 pt-5 pb-1 flex flex-wrap items-center justify-between gap-4">
              <div class="flex flex-wrap items-center gap-x-7 gap-y-3">
                ${renderToggle('pw-opt-capitalize', 'Capitalize', memorableOpts.capitalize)}
                ${renderToggle('pw-opt-inc-num', 'Numbers', memorableOpts.includeNumber)}
              </div>
              <label class="inline-flex items-center gap-2.5">
                <span class="font-inter text-sm text-[#a8a8a8]">Separator</span>
                <select id="pw-opt-sep" class="cyber-select !py-1.5 !pl-3 !pr-8 !text-xs">
                  <option value="hyphen" ${memorableOpts.separator === 'hyphen' ? 'selected' : ''}>Hyphen (-)</option>
                  <option value="space" ${memorableOpts.separator === 'space' ? 'selected' : ''}>Space ( )</option>
                  <option value="period" ${memorableOpts.separator === 'period' ? 'selected' : ''}>Period (.)</option>
                  <option value="underscore" ${memorableOpts.separator === 'underscore' ? 'selected' : ''}>Underscore (_)</option>
                  <option value="none" ${memorableOpts.separator === 'none' ? 'selected' : ''}>None</option>
                </select>
              </label>
            </div>
          `
          : '';

    const sizeClass =
      currentResult.length > 44
        ? 'text-sm sm:text-base'
        : currentResult.length > 26
          ? 'text-base sm:text-xl'
          : 'text-xl sm:text-2xl';

    controlsEl.innerHTML = `
      <div class="max-w-xl mx-auto rounded-2xl border border-white/15 bg-[#07090d] p-5 sm:p-7 shadow-[0_0_40px_rgba(0,255,255,0.06)] flex flex-col gap-5">
        <!-- Password Type Selector -->
        <div class="flex flex-col gap-3">
          <p class="font-inter text-sm font-semibold text-white">Choose password type</p>
          <div role="tablist" aria-label="Password type" class="grid grid-cols-3 gap-1.5 rounded-xl bg-white/[0.06] border border-white/10 p-1.5">
            ${tabs
              .map((t) => {
                const active = pwType === t.id;
                return `
                  <button
                    type="button"
                    role="tab"
                    data-pw-type="${t.id}"
                    aria-selected="${active ? 'true' : 'false'}"
                    class="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 font-inter text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
                      active
                        ? 'bg-[#101824] text-white border border-[#00ffff]/55 shadow-[0_0_16px_rgba(0,255,255,0.14)]'
                        : 'text-[#9a9a9a] hover:text-white border border-transparent'
                    }"
                  >
                    <span class="${active ? 'text-[#00ffff]' : 'text-[#888]'} inline-flex shrink-0">${renderIconSvg(t.icon, 15)}</span>
                    <span>${t.label}</span>
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- Customize Section -->
        <div class="flex flex-col gap-5">
          <p class="font-inter text-sm font-semibold text-white">Customize your new password</p>

          <div class="border-t border-white/10 pt-5 flex items-center gap-4">
            <label for="pw-length-slider" class="font-inter text-sm text-[#a8a8a8] shrink-0 min-w-[78px]">${sliderLabel}</label>
            <input
              id="pw-length-slider"
              type="range"
              min="${sliderMin}"
              max="${sliderMax}"
              value="${sliderVal}"
              style="--slider-pct: ${sliderPct.toFixed(2)}%"
              class="pw-range flex-1"
            />
            <input
              id="pw-length-num"
              type="number"
              min="${sliderMin}"
              max="${sliderMax}"
              value="${sliderVal}"
              aria-label="${sliderLabel} count"
              class="w-16 h-10 rounded-xl border border-white/15 bg-black/85 text-center font-fira text-sm font-semibold text-white outline-none transition-colors focus:border-[#00ffff]/75"
            />
          </div>

          ${optionsRowHtml}
        </div>

        <!-- Generated Password Display -->
        <div class="border-t border-white/10 pt-5 flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2">
            <p class="font-inter text-sm font-semibold text-white">Generated password</p>
            <span id="pw-strength-badge" class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-fira text-[10px] font-semibold uppercase tracking-wider ${strengthColor(currentResult.strength)}">
              <span>${currentResult.strength}</span>
              <span class="opacity-60">·</span>
              <span>${Math.round(currentResult.entropyBits)} bits</span>
            </span>
          </div>

          <div
            id="pw-display-box"
            role="status"
            aria-live="polite"
            title="Click to copy password"
            class="min-h-[88px] rounded-xl border border-white/15 bg-black/85 px-5 py-4 flex items-center justify-center text-center cursor-pointer transition-colors hover:border-[#00ffff]/45"
          >
            <code id="pw-display-text" class="font-fira ${sizeClass} font-semibold tracking-wider break-all leading-relaxed select-all">${renderTokensHtml(currentResult)}</code>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            id="pw-copy-btn"
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f3eb2c] px-5 py-3.5 font-inter text-sm font-bold text-black shadow-[0_0_24px_rgba(243,235,44,0.22)] transition-all hover:bg-[#fbf36a] active:scale-[0.99] cursor-pointer"
          >
            <span id="pw-copy-icon" class="inline-flex">${renderIconSvg(Copy, 15)}</span>
            <span id="pw-copy-label">Copy password</span>
          </button>

          <button
            id="pw-refresh-btn"
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-[#00ffff]/60 bg-black/60 px-5 py-3.5 font-inter text-sm font-semibold text-[#00ffff] transition-all hover:bg-[#00ffff]/10 hover:border-[#00ffff] active:scale-[0.99] cursor-pointer"
          >
            <span class="inline-flex">${renderIconSvg(RefreshCw, 15)}</span>
            <span>Refresh password</span>
          </button>
        </div>
      </div>
    `;

    bindCardEvents();
    syncCliSnippet();
  };

  const updateGeneratedDisplay = () => {
    currentResult = generatePassword({
      type: pwType,
      random: randomOpts,
      memorable: memorableOpts,
      pin: pinOpts,
    });

    const textEl = document.getElementById('pw-display-text');
    const badgeEl = document.getElementById('pw-strength-badge');
    if (textEl) {
      const sizeClass =
        currentResult.length > 44
          ? 'text-sm sm:text-base'
          : currentResult.length > 26
            ? 'text-base sm:text-xl'
            : 'text-xl sm:text-2xl';
      textEl.className = `font-fira ${sizeClass} font-semibold tracking-wider break-all leading-relaxed select-all`;
      textEl.innerHTML = renderTokensHtml(currentResult);
    }
    if (badgeEl) {
      badgeEl.className = `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-fira text-[10px] font-semibold uppercase tracking-wider ${strengthColor(currentResult.strength)}`;
      badgeEl.innerHTML = `<span>${currentResult.strength}</span><span class="opacity-60">·</span><span>${Math.round(currentResult.entropyBits)} bits</span>`;
    }
    syncCliSnippet();
  };

  const triggerCopy = async () => {
    const labelEl = document.getElementById('pw-copy-label');
    const iconEl = document.getElementById('pw-copy-icon');
    if (!labelEl || !iconEl) return;
    if (copyTimer) clearTimeout(copyTimer);

    try {
      await navigator.clipboard.writeText(currentResult.password);
      labelEl.textContent = 'Copied!';
      iconEl.innerHTML = renderIconSvg(Check, 15);
    } catch {
      labelEl.textContent = 'Copy failed';
    }

    copyTimer = setTimeout(() => {
      labelEl.textContent = 'Copy password';
      iconEl.innerHTML = renderIconSvg(Copy, 15);
      copyTimer = null;
    }, 1500);
  };

  const bindCardEvents = () => {
    controlsEl.querySelectorAll<HTMLButtonElement>('[data-pw-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.pwType as PasswordType;
        if (next === pwType) return;
        pwType = next;
        currentResult = generatePassword({
          type: pwType,
          random: randomOpts,
          memorable: memorableOpts,
          pin: pinOpts,
        });
        renderCard();
      });
    });

    const sliderEl = document.getElementById('pw-length-slider') as HTMLInputElement | null;
    const numEl = document.getElementById('pw-length-num') as HTMLInputElement | null;

    const applyCount = (raw: number, clampInputField: boolean) => {
      const min =
        pwType === 'random' ? RANDOM_LENGTH_MIN : pwType === 'memorable' ? MEMORABLE_WORDS_MIN : PIN_LENGTH_MIN;
      const max =
        pwType === 'random' ? RANDOM_LENGTH_MAX : pwType === 'memorable' ? MEMORABLE_WORDS_MAX : PIN_LENGTH_MAX;
      const clamped = Math.min(max, Math.max(min, Math.round(raw)));
      if (pwType === 'random') randomOpts.length = clamped;
      else if (pwType === 'memorable') memorableOpts.words = clamped;
      else pinOpts.length = clamped;

      if (sliderEl) {
        sliderEl.value = String(clamped);
        const pct = ((clamped - min) / (max - min)) * 100;
        sliderEl.style.setProperty('--slider-pct', `${pct.toFixed(2)}%`);
      }
      if (numEl && clampInputField) {
        numEl.value = String(clamped);
      }
      updateGeneratedDisplay();
    };

    sliderEl?.addEventListener('input', () => {
      applyCount(Number(sliderEl.value), true);
    });

    numEl?.addEventListener('input', () => {
      const parsed = Number(numEl.value);
      if (Number.isFinite(parsed) && numEl.value.trim() !== '') {
        applyCount(parsed, false);
      }
    });

    numEl?.addEventListener('blur', () => {
      const parsed = Number(numEl.value);
      const fallback =
        pwType === 'random' ? randomOpts.length : pwType === 'memorable' ? memorableOpts.words : pinOpts.length;
      applyCount(Number.isFinite(parsed) && numEl.value.trim() !== '' ? parsed : fallback, true);
    });

    const bindSwitch = (id: string, getVal: () => boolean, setVal: (next: boolean) => void) => {
      const el = document.getElementById(id);
      el?.addEventListener('click', () => {
        const next = !getVal();
        setVal(next);
        el.setAttribute('aria-checked', next ? 'true' : 'false');
        updateGeneratedDisplay();
      });
    };

    bindSwitch('pw-opt-numbers', () => randomOpts.numbers, (v) => { randomOpts.numbers = v; });
    bindSwitch('pw-opt-symbols', () => randomOpts.symbols, (v) => { randomOpts.symbols = v; });
    bindSwitch('pw-opt-capitalize', () => memorableOpts.capitalize, (v) => { memorableOpts.capitalize = v; });
    bindSwitch('pw-opt-inc-num', () => memorableOpts.includeNumber, (v) => { memorableOpts.includeNumber = v; });

    const sepEl = document.getElementById('pw-opt-sep') as HTMLSelectElement | null;
    sepEl?.addEventListener('change', () => {
      memorableOpts.separator = sepEl.value as MemorableSeparator;
      updateGeneratedDisplay();
    });

    document.getElementById('pw-copy-btn')?.addEventListener('click', () => {
      void triggerCopy();
    });
    document.getElementById('pw-display-box')?.addEventListener('click', () => {
      void triggerCopy();
    });
    document.getElementById('pw-refresh-btn')?.addEventListener('click', () => {
      updateGeneratedDisplay();
    });
  };

  activeToolCleanup = () => {
    if (copyTimer) {
      clearTimeout(copyTimer);
      copyTimer = null;
    }
  };

  renderCard();
}

function mountHash(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  let mode: 'text' | 'file' = 'text';
  let encoding: HashEncoding = 'hex';
  let inputText = 'hello world';
  let hmacKey = '';
  let expectedHash = '';
  let fileName = '';
  let fileBytes: Uint8Array | null = null;
  let lastResult: HashAllResult | null = null;
  let bcryptRounds = BCRYPT_ROUNDS_DEFAULT;
  let bcryptResult: BcryptResult | null = null;
  let bcryptComputing = false;
  let bcryptMatchState: 'idle' | 'checking' | 'match' | 'mismatch' = 'idle';
  let computeSeq = 0;
  let bcryptSeq = 0;
  let verifySeq = 0;
  let bcryptDebounce: ReturnType<typeof setTimeout> | null = null;

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
  };

  const syncCliSnippet = () => {
    const snippetEl = document.getElementById('cli-snippet');
    if (!snippetEl) return;
    const origin = window.location.origin;
    const sample = mode === 'text' ? inputText.slice(0, 120) : 'hello world';
    const params = new URLSearchParams({ text: sample, format: encoding });
    if (hmacKey.length > 0) params.set('key', hmacKey);
    snippetEl.textContent = `curl -s "${origin}/api/hash?${params.toString()}"`;
  };

  const runBcryptVerify = async () => {
    const seq = ++verifySeq;
    const trimmed = expectedHash.trim();
    if (mode !== 'text' || !isBcryptHash(trimmed)) {
      bcryptMatchState = 'idle';
      if (lastResult) renderDigests(lastResult);
      return;
    }
    bcryptMatchState = 'checking';
    if (lastResult) renderDigests(lastResult);
    const matched = await verifyBcryptHash(inputText, trimmed);
    if (seq !== verifySeq) return;
    bcryptMatchState = matched ? 'match' : 'mismatch';
    if (lastResult) renderDigests(lastResult);
  };

  const recomputeBcrypt = async () => {
    if (mode !== 'text') return;
    const seq = ++bcryptSeq;
    bcryptComputing = true;
    if (lastResult) renderDigests(lastResult);
    const res = await computeBcryptHash(inputText, bcryptRounds);
    if (seq !== bcryptSeq) return;
    bcryptResult = res;
    bcryptComputing = false;
    if (lastResult) renderDigests(lastResult);
  };

  const scheduleBcrypt = (delayMs = 260) => {
    if (bcryptDebounce) clearTimeout(bcryptDebounce);
    if (mode !== 'text') return;
    bcryptDebounce = setTimeout(() => {
      bcryptDebounce = null;
      void recomputeBcrypt();
    }, delayMs);
  };

  const renderDigests = (result: HashAllResult) => {
    lastResult = result;
    const trimmedExpected = expectedHash.trim();
    const hasExpected = trimmedExpected.length > 0;
    const expectedIsBcrypt = mode === 'text' && isBcryptHash(trimmedExpected);
    const matchedAlgo = expectedIsBcrypt ? null : matchExpectedHash(expectedHash, result.digests);

    let verifyBanner = '';
    if (hasExpected) {
      if (expectedIsBcrypt) {
        const rounds = parseBcryptRounds(trimmedExpected);
        if (bcryptMatchState === 'checking') {
          verifyBanner = `
            <div class="rounded-xl border border-[#00ffff]/35 bg-[#00ffff]/10 px-4 py-2.5 flex items-center justify-between gap-3 font-fira text-xs text-[#00ffff]">
              <span class="font-bold">VERIFYING BCRYPT...</span>
              <span>Checking against cost ${rounds ?? '?'} hash</span>
            </div>
          `;
        } else if (bcryptMatchState === 'match') {
          verifyBanner = `
            <div class="rounded-xl border border-emerald-500/40 bg-emerald-950/25 px-4 py-2.5 flex items-center justify-between gap-3 font-fira text-xs text-emerald-300">
              <span class="inline-flex items-center gap-2 font-bold">
                ${renderIconSvg(Check, 14)}
                <span>MATCH VERIFIED</span>
              </span>
              <span>Matches <strong>bcrypt (cost ${rounds ?? '?'})</strong></span>
            </div>
          `;
        } else {
          verifyBanner = `
            <div class="rounded-xl border border-rose-500/40 bg-rose-950/25 px-4 py-2.5 flex items-center justify-between gap-3 font-fira text-xs text-rose-300">
              <span class="inline-flex items-center gap-2 font-bold">
                ${renderIconSvg(X, 14)}
                <span>NO MATCH</span>
              </span>
              <span>Input does not match the provided bcrypt hash</span>
            </div>
          `;
        }
      } else if (matchedAlgo) {
        verifyBanner = `
          <div class="rounded-xl border border-emerald-500/40 bg-emerald-950/25 px-4 py-2.5 flex items-center justify-between gap-3 font-fira text-xs text-emerald-300">
            <span class="inline-flex items-center gap-2 font-bold">
              ${renderIconSvg(Check, 14)}
              <span>MATCH VERIFIED</span>
            </span>
            <span>Matches <strong>${escapeHtml(result.digests.find((d) => d.algorithm === matchedAlgo)?.label ?? matchedAlgo.toUpperCase())}</strong></span>
          </div>
        `;
      } else {
        verifyBanner = `
          <div class="rounded-xl border border-rose-500/40 bg-rose-950/25 px-4 py-2.5 flex items-center justify-between gap-3 font-fira text-xs text-rose-300">
            <span class="inline-flex items-center gap-2 font-bold">
              ${renderIconSvg(X, 14)}
              <span>NO MATCH</span>
            </span>
            <span>Expected digest does not match any computed algorithm</span>
          </div>
        `;
      }
    }

    const cardsHtml = result.digests
      .map((entry) => {
        const isMatch = matchedAlgo === entry.algorithm;
        const borderClass = isMatch
          ? 'border-emerald-400/70 bg-emerald-950/15 shadow-[0_0_20px_rgba(52,211,153,0.12)]'
          : 'border-white/10 bg-[#050505] hover:border-white/20';
        const statusBadge =
          entry.status === 'recommended'
            ? `<span class="rounded border border-[#00ffff]/30 bg-[#00ffff]/10 px-1.5 py-0.5 font-fira text-[9px] uppercase tracking-wider text-[#00ffff]">Recommended</span>`
            : `<span class="rounded border border-amber-500/30 bg-amber-950/30 px-1.5 py-0.5 font-fira text-[9px] uppercase tracking-wider text-amber-300">Legacy</span>`;
        const matchPill = isMatch
          ? `<span class="rounded border border-emerald-400/50 bg-emerald-500/20 px-1.5 py-0.5 font-fira text-[9px] font-bold uppercase tracking-wider text-emerald-300">MATCH</span>`
          : '';

        return `
          <div class="rounded-xl border ${borderClass} p-4 flex flex-col gap-2.5 transition-colors">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-fira text-xs font-bold uppercase tracking-wider text-white">${escapeHtml(entry.label)}</span>
                <span class="font-fira text-[10px] text-[#777]">${entry.bits}-bit</span>
                ${statusBadge}
                ${matchPill}
              </div>
              <button
                type="button"
                data-copy-hash="${entry.algorithm}"
                class="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black px-2.5 py-1 font-fira text-[10px] uppercase tracking-wider text-[#f3eb2c] hover:border-[#f3eb2c]/60 transition-colors cursor-pointer"
              >COPY</button>
            </div>
            <code class="block rounded-lg border border-white/8 bg-black/80 px-3 py-2.5 font-fira text-xs sm:text-[13px] text-[#e8e8e8] break-all leading-relaxed select-all">${escapeHtml(entry.digest)}</code>
          </div>
        `;
      })
      .join('');

    const bcryptBorderClass =
      expectedIsBcrypt && bcryptMatchState === 'match'
        ? 'border-emerald-400/70 bg-emerald-950/15 shadow-[0_0_20px_rgba(52,211,153,0.12)]'
        : 'border-white/10 bg-[#050505] hover:border-white/20';

    const bcryptRoundsOptions = Array.from(
      { length: BCRYPT_ROUNDS_MAX - BCRYPT_ROUNDS_MIN + 1 },
      (_, idx) => BCRYPT_ROUNDS_MIN + idx,
    )
      .map(
        (r) =>
          `<option value="${r}" ${r === bcryptRounds ? 'selected' : ''}>Cost ${r}${r === 10 ? ' (default)' : ''}</option>`,
      )
      .join('');

    const bcryptCardHtml =
      mode === 'text'
        ? `
          <div class="rounded-xl border ${bcryptBorderClass} p-4 flex flex-col gap-2.5 transition-colors">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-fira text-xs font-bold uppercase tracking-wider text-white">BCRYPT</span>
                <span class="font-fira text-[10px] text-[#777]">Password KDF · Salted</span>
                <span class="rounded border border-[#00ffff]/30 bg-[#00ffff]/10 px-1.5 py-0.5 font-fira text-[9px] uppercase tracking-wider text-[#00ffff]">Recommended</span>
                ${
                  expectedIsBcrypt && bcryptMatchState === 'match'
                    ? `<span class="rounded border border-emerald-400/50 bg-emerald-500/20 px-1.5 py-0.5 font-fira text-[9px] font-bold uppercase tracking-wider text-emerald-300">MATCH</span>`
                    : ''
                }
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <select id="hash-bcrypt-rounds" aria-label="bcrypt cost rounds" class="cyber-select !py-1 !pl-2.5 !pr-7 !text-[11px]">
                  ${bcryptRoundsOptions}
                </select>
                <button
                  id="hash-bcrypt-resalt"
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-black px-2.5 py-1 font-fira text-[10px] uppercase tracking-wider text-[#00ffff] hover:border-[#00ffff]/60 transition-colors cursor-pointer"
                >RE-SALT</button>
                <button
                  id="hash-bcrypt-copy"
                  type="button"
                  ${bcryptResult ? '' : 'disabled'}
                  class="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black px-2.5 py-1 font-fira text-[10px] uppercase tracking-wider text-[#f3eb2c] hover:border-[#f3eb2c]/60 disabled:opacity-40 transition-colors cursor-pointer"
                >COPY</button>
              </div>
            </div>
            <code class="block rounded-lg border border-white/8 bg-black/80 px-3 py-2.5 font-fira text-xs sm:text-[13px] ${bcryptComputing ? 'text-[#00ffff]/70' : 'text-[#e8e8e8]'} break-all leading-relaxed select-all">${
              bcryptComputing
                ? `Computing bcrypt (cost ${bcryptRounds})...`
                : escapeHtml(bcryptResult?.hash ?? '')
            }</code>
            ${
              bcryptResult?.truncated
                ? `<p class="font-fira text-[10px] text-amber-300">Note: bcrypt truncates inputs longer than 72 UTF-8 bytes (${bcryptResult.byteLength} bytes entered).</p>`
                : ''
            }
          </div>
        `
        : '';

    outputEl.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 font-fira text-[11px] text-[#858585]">
        <span>
          Input: <strong class="text-white">${formatSize(result.byteLength)}</strong>
          ${mode === 'file' && fileName ? ` · <span class="text-[#00ffff]">${escapeHtml(fileName)}</span>` : ''}
          ${result.hmac ? ' · <span class="text-[#f3eb2c]">HMAC Mode</span>' : ''}
        </span>
        <button
          id="hash-copy-all-btn"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#050505] px-2.5 py-1 font-fira text-[10px] uppercase tracking-wider text-[#00ffff] hover:border-[#00ffff]/60 transition-colors cursor-pointer"
        >COPY ALL</button>
      </div>
      ${verifyBanner}
      <div class="flex flex-col gap-3">
        ${cardsHtml}
        ${bcryptCardHtml}
      </div>
    `;

    outputEl.querySelectorAll<HTMLButtonElement>('[data-copy-hash]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const algo = btn.dataset.copyHash;
        const entry = result.digests.find((d) => d.algorithm === algo);
        if (entry) {
          void copyText(entry.digest, btn, 'COPY');
        }
      });
    });

    const bcryptRoundsEl = document.getElementById('hash-bcrypt-rounds') as HTMLSelectElement | null;
    bcryptRoundsEl?.addEventListener('change', () => {
      bcryptRounds = Number(bcryptRoundsEl.value) || BCRYPT_ROUNDS_DEFAULT;
      void recomputeBcrypt();
    });

    document.getElementById('hash-bcrypt-resalt')?.addEventListener('click', () => {
      void recomputeBcrypt();
    });

    const bcryptCopyBtn = document.getElementById('hash-bcrypt-copy');
    bcryptCopyBtn?.addEventListener('click', () => {
      if (bcryptResult) {
        void copyText(bcryptResult.hash, bcryptCopyBtn, 'COPY');
      }
    });

    const copyAllBtn = document.getElementById('hash-copy-all-btn');
    copyAllBtn?.addEventListener('click', () => {
      const lines = result.digests.map((d) => `${d.label}: ${d.digest}`);
      if (mode === 'text' && bcryptResult) {
        lines.push(`BCRYPT (cost ${bcryptResult.rounds}): ${bcryptResult.hash}`);
      }
      void copyText(lines.join('\n'), copyAllBtn, 'COPY ALL');
    });
  };

  const recompute = async () => {
    const seq = ++computeSeq;
    syncCliSnippet();
    if (mode === 'file' && !fileBytes) {
      lastResult = null;
      outputEl.innerHTML = `
        <div class="rounded-xl border border-dashed border-white/15 bg-[#050505] p-6 text-center font-fira text-xs text-[#777]">
          Drop a file above or click to browse. Hashing runs 100% locally in your browser — files are never uploaded.
        </div>
      `;
      return;
    }

    const payload = mode === 'file' && fileBytes ? fileBytes : inputText;
    const result = await computeAllHashes(payload, {
      encoding,
      key: hmacKey.length > 0 ? hmacKey : undefined,
    });
    if (seq !== computeSeq) return;
    renderDigests(result);
    if (mode === 'text' && isBcryptHash(expectedHash)) {
      void runBcryptVerify();
    }
  };

  const renderControls = () => {
    const formats: Array<{ id: HashEncoding; label: string }> = [
      { id: 'hex', label: 'hex (lower)' },
      { id: 'HEX', label: 'HEX (UPPER)' },
      { id: 'base64', label: 'Base64' },
    ];

    controlsEl.innerHTML = `
      <div class="flex flex-col gap-4">
        <!-- Mode & Format Row -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Hash input mode" class="inline-flex rounded-lg border border-white/10 bg-black/80 p-1 gap-1">
            <button
              type="button"
              role="tab"
              data-hash-mode="text"
              aria-selected="${mode === 'text' ? 'true' : 'false'}"
              class="rounded-md px-3.5 py-1.5 font-fira text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'text'
                  ? 'bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/45'
                  : 'text-[#888] hover:text-white border border-transparent'
              }"
            >Text</button>
            <button
              type="button"
              role="tab"
              data-hash-mode="file"
              aria-selected="${mode === 'file' ? 'true' : 'false'}"
              class="rounded-md px-3.5 py-1.5 font-fira text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'file'
                  ? 'bg-[#00ffff]/15 text-[#00ffff] border border-[#00ffff]/45'
                  : 'text-[#888] hover:text-white border border-transparent'
              }"
            >Local File</button>
          </div>

          <div role="group" aria-label="Output format" class="inline-flex rounded-lg border border-white/10 bg-black/80 p-1 gap-1">
            ${formats
              .map(
                (f) => `
                  <button
                    type="button"
                    data-hash-format="${f.id}"
                    class="rounded-md px-2.5 py-1.5 font-fira text-[11px] font-semibold transition-colors cursor-pointer ${
                      encoding === f.id
                        ? 'bg-[#f3eb2c]/15 text-[#f3eb2c] border border-[#f3eb2c]/45'
                        : 'text-[#888] hover:text-white border border-transparent'
                    }"
                  >${f.label}</button>
                `,
              )
              .join('')}
          </div>
        </div>

        <!-- Primary Input (Text or File) -->
        ${
          mode === 'text'
            ? `
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between">
                  <label for="tool-primary-input" class="font-fira text-[11px] uppercase tracking-[0.16em] text-[#858585]">Input Text</label>
                  <button id="hash-clear-text" type="button" class="font-fira text-[10px] uppercase tracking-wider text-[#777] hover:text-white cursor-pointer">Clear</button>
                </div>
                <textarea
                  id="tool-primary-input"
                  rows="4"
                  placeholder="Enter text to hash..."
                  spellcheck="false"
                  class="cyber-input resize-y min-h-[96px] leading-relaxed"
                >${escapeHtml(inputText)}</textarea>
              </div>
            `
            : `
              <div class="flex flex-col gap-2">
                <label
                  id="hash-dropzone"
                  for="hash-file-input"
                  class="rounded-xl border border-dashed border-[#00ffff]/35 bg-[#05080c] hover:border-[#00ffff]/70 hover:bg-[#071018] transition-colors p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer"
                >
                  <span class="text-[#00ffff]">${renderIconSvg(FileSearch, 24)}</span>
                  <span class="font-fira text-xs font-semibold text-white">
                    ${fileName ? escapeHtml(fileName) : 'Drop any file here or click to select'}
                  </span>
                  <span class="font-fira text-[10px] text-[#777]">
                    ${fileBytes ? `${formatSize(fileBytes.byteLength)} loaded in memory` : 'Processed locally in browser memory · Zero upload'}
                  </span>
                  <input id="hash-file-input" type="file" class="sr-only" />
                </label>
              </div>
            `
        }

        <!-- Optional HMAC Key & Verify Hash -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label for="hash-hmac-key" class="font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585]">HMAC Secret Key (Optional)</label>
            <input
              id="hash-hmac-key"
              type="text"
              value="${escapeHtml(hmacKey)}"
              placeholder="Leave blank for standard hash..."
              autocomplete="off"
              spellcheck="false"
              class="cyber-input !py-2 !text-xs"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="hash-verify-input" class="font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585]">Verify / Compare Digest (Optional)</label>
            <input
              id="hash-verify-input"
              type="text"
              value="${escapeHtml(expectedHash)}"
              placeholder="Paste expected hash to verify match..."
              autocomplete="off"
              spellcheck="false"
              class="cyber-input !py-2 !text-xs"
            />
          </div>
        </div>
      </div>
    `;

    controlsEl.querySelectorAll<HTMLButtonElement>('[data-hash-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.hashMode as 'text' | 'file';
        if (next === mode) return;
        mode = next;
        renderControls();
        void recompute();
      });
    });

    controlsEl.querySelectorAll<HTMLButtonElement>('[data-hash-format]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.hashFormat as HashEncoding;
        if (next === encoding) return;
        encoding = next;
        renderControls();
        void recompute();
      });
    });

    const textEl = document.getElementById('tool-primary-input') as HTMLTextAreaElement | null;
    textEl?.addEventListener('input', () => {
      inputText = textEl.value;
      void recompute();
      scheduleBcrypt();
    });

    document.getElementById('hash-clear-text')?.addEventListener('click', () => {
      inputText = '';
      if (textEl) {
        textEl.value = '';
        textEl.focus();
      }
      void recompute();
      scheduleBcrypt(0);
    });

    const loadFile = async (file: File) => {
      const buf = await file.arrayBuffer();
      fileName = file.name;
      fileBytes = new Uint8Array(buf);
      renderControls();
      void recompute();
    };

    const fileInput = document.getElementById('hash-file-input') as HTMLInputElement | null;
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) void loadFile(file);
    });

    const dropzone = document.getElementById('hash-dropzone');
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-[#f3eb2c]');
    });
    dropzone?.addEventListener('dragleave', () => {
      dropzone.classList.remove('border-[#f3eb2c]');
    });
    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-[#f3eb2c]');
      const file = e.dataTransfer?.files?.[0];
      if (file) void loadFile(file);
    });

    const hmacEl = document.getElementById('hash-hmac-key') as HTMLInputElement | null;
    hmacEl?.addEventListener('input', () => {
      hmacKey = hmacEl.value;
      void recompute();
    });

    const verifyEl = document.getElementById('hash-verify-input') as HTMLInputElement | null;
    verifyEl?.addEventListener('input', () => {
      expectedHash = verifyEl.value;
      if (mode === 'text' && isBcryptHash(expectedHash)) {
        void runBcryptVerify();
      } else {
        bcryptMatchState = 'idle';
        if (lastResult) {
          renderDigests(lastResult);
        }
      }
    });
  };

  activeToolCleanup = () => {
    if (bcryptDebounce) {
      clearTimeout(bcryptDebounce);
      bcryptDebounce = null;
    }
  };

  renderControls();
  void recompute();
  void recomputeBcrypt();
}

function mountColor(controlsEl: HTMLElement, outputEl: HTMLElement): void {
  outputEl.innerHTML = '';

  // Start with crisp neon cyan (#00ffff)
  let hue = 180;
  let sat = 100;
  let val = 100;
  let alpha = 1;

  const getCurrentRgba = (): RgbaColor => {
    const rgb = hsvToRgb(hue, sat, val);
    return { ...rgb, a: Math.round(alpha * 100) / 100 };
  };

  type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };
  const eyeDropperCtor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;

  controlsEl.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left Column: Interactive Picker -->
      <div class="lg:col-span-6 flex flex-col gap-4">
        <!-- 2D Saturation / Value Spectrum -->
        <div
          id="color-sv-pad"
          role="slider"
          tabindex="0"
          aria-label="Saturation and brightness picker"
          class="relative w-full h-60 sm:h-64 rounded-xl border border-white/15 overflow-hidden cursor-crosshair select-none touch-none"
          style="background-color: hsl(180, 100%, 50%);"
        >
          <div class="absolute inset-0 pointer-events-none" style="background: linear-gradient(to right, #ffffff, rgba(255,255,255,0));"></div>
          <div class="absolute inset-0 pointer-events-none" style="background: linear-gradient(to top, #000000, rgba(0,0,0,0));"></div>
          <div
            id="color-sv-thumb"
            class="pointer-events-none absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.85),0_2px_8px_rgba(0,0,0,0.65)]"
            style="left: 100%; top: 0%;"
          ></div>
        </div>

        <!-- Hue & Alpha Sliders -->
        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between font-fira text-[11px]">
              <label for="color-hue-slider" class="uppercase tracking-[0.16em] text-[#858585]">Hue</label>
              <span id="color-hue-val" class="text-white font-semibold">180°</span>
            </div>
            <input id="color-hue-slider" type="range" min="0" max="360" step="1" value="180" class="color-hue-range" />
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between font-fira text-[11px]">
              <label for="color-alpha-slider" class="uppercase tracking-[0.16em] text-[#858585]">Alpha</label>
              <span id="color-alpha-val" class="text-white font-semibold">100%</span>
            </div>
            <div class="relative h-[14px] rounded-full overflow-hidden color-checker border border-white/10">
              <div id="color-alpha-grad" class="pointer-events-none absolute inset-0 rounded-full"></div>
              <input id="color-alpha-slider" type="range" min="0" max="100" step="1" value="100" class="color-alpha-range relative z-10" />
            </div>
          </div>
        </div>

        <!-- Preview Swatch + Contrast + Picker Tools -->
        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-3">
          <div class="relative h-20 rounded-xl overflow-hidden border border-white/15 color-checker">
            <div id="color-preview-fill" class="absolute inset-0 flex items-center justify-between px-4 transition-none">
              <span id="color-contrast-white" class="rounded-md px-2.5 py-1 font-fira text-[11px] font-bold text-white bg-black/25 backdrop-blur-xs">Aa #FFF</span>
              <span id="color-contrast-black" class="rounded-md px-2.5 py-1 font-fira text-[11px] font-bold text-black bg-white/25 backdrop-blur-xs">Aa #000</span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <label class="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black px-3 py-1.5 font-fira text-[11px] text-[#e0e0e0] hover:border-[#00ffff]/60 transition-colors cursor-pointer">
              <input id="color-native-input" type="color" value="#00ffff" class="w-4 h-4 rounded border-0 bg-transparent cursor-pointer p-0" />
              <span>OS Picker</span>
            </label>
            ${
              eyeDropperCtor
                ? `
                  <button
                    id="color-eyedropper-btn"
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black px-3 py-1.5 font-fira text-[11px] text-[#00ffff] hover:border-[#00ffff]/60 transition-colors cursor-pointer"
                  >
                    ${renderIconSvg(Pipette, 13)}
                    <span>Eyedropper</span>
                  </button>
                `
                : ''
            }
            <button
              id="color-random-btn"
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black px-3 py-1.5 font-fira text-[11px] text-[#f3eb2c] hover:border-[#f3eb2c]/60 transition-colors cursor-pointer ml-auto"
            >
              ${renderIconSvg(Shuffle, 13)}
              <span>Random</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Right Column: Live Inputs, RGB/HEX/HSL/CSS Outputs, Harmonies -->
      <div class="lg:col-span-6 flex flex-col gap-4">
        <!-- Direct Input (HEX / CSS) + RGBA channels -->
        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-3.5">
          <div class="flex flex-col gap-1.5">
            <label for="tool-primary-input" class="font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585]">HEX or CSS Input (Live)</label>
            <input
              id="tool-primary-input"
              type="text"
              value="#00FFFF"
              placeholder="#00ffff, rgb(0, 255, 255), hsl(180, 100%, 50%)"
              autocomplete="off"
              spellcheck="false"
              class="cyber-input !py-2 !text-sm"
            />
          </div>

          <div class="grid grid-cols-4 gap-2">
            <label class="flex flex-col gap-1">
              <span class="font-fira text-[10px] uppercase tracking-wider text-rose-400">R</span>
              <input id="color-in-r" type="number" min="0" max="255" value="0" class="cyber-input !px-2.5 !py-1.5 !text-xs text-center" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-fira text-[10px] uppercase tracking-wider text-emerald-400">G</span>
              <input id="color-in-g" type="number" min="0" max="255" value="255" class="cyber-input !px-2.5 !py-1.5 !text-xs text-center" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-fira text-[10px] uppercase tracking-wider text-sky-400">B</span>
              <input id="color-in-b" type="number" min="0" max="255" value="255" class="cyber-input !px-2.5 !py-1.5 !text-xs text-center" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-fira text-[10px] uppercase tracking-wider text-[#aaa]">A %</span>
              <input id="color-in-a" type="number" min="0" max="100" value="100" class="cyber-input !px-2.5 !py-1.5 !text-xs text-center" />
            </label>
          </div>
        </div>

        <!-- Copyable Output Formats -->
        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-2.5">
          <div class="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/80 px-3 py-2">
            <div class="min-w-0">
              <span class="block font-fira text-[9px] uppercase tracking-[0.18em] text-[#777]">HEX</span>
              <code id="color-out-hex" class="font-fira text-xs sm:text-sm font-bold text-white select-all">#00FFFF</code>
            </div>
            <button type="button" data-copy-color="hex" class="rounded border border-white/15 bg-[#050505] px-2.5 py-1 font-fira text-[10px] uppercase tracking-wider text-[#f3eb2c] hover:border-[#f3eb2c]/60 cursor-pointer shrink-0">COPY</button>
          </div>

          <div class="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/80 px-3 py-2">
            <div class="min-w-0">
              <span class="block font-fira text-[9px] uppercase tracking-[0.18em] text-[#777]">RGB</span>
              <code id="color-out-rgb" class="font-fira text-xs sm:text-sm font-semibold text-[#00ffff] select-all">rgb(0, 255, 255)</code>
            </div>
            <button type="button" data-copy-color="rgb" class="rounded border border-white/15 bg-[#050505] px-2.5 py-1 font-fira text-[10px] uppercase tracking-wider text-[#f3eb2c] hover:border-[#f3eb2c]/60 cursor-pointer shrink-0">COPY</button>
          </div>

          <div class="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/80 px-3 py-2">
            <div class="min-w-0">
              <span class="block font-fira text-[9px] uppercase tracking-[0.18em] text-[#777]">HSL</span>
              <code id="color-out-hsl" class="font-fira text-xs sm:text-sm font-semibold text-[#d8d8d8] select-all">hsl(180, 100%, 50%)</code>
            </div>
            <button type="button" data-copy-color="hsl" class="rounded border border-white/15 bg-[#050505] px-2.5 py-1 font-fira text-[10px] uppercase tracking-wider text-[#f3eb2c] hover:border-[#f3eb2c]/60 cursor-pointer shrink-0">COPY</button>
          </div>

          <div class="rounded-lg border border-white/8 bg-black/80 overflow-hidden">
            <div class="flex items-center justify-between px-3 py-1.5 border-b border-white/8">
              <span class="font-fira text-[9px] uppercase tracking-[0.18em] text-[#777]">CSS Snippet</span>
              <button type="button" data-copy-color="css" class="rounded border border-white/15 bg-[#050505] px-2.5 py-0.5 font-fira text-[10px] uppercase tracking-wider text-[#00ffff] hover:border-[#00ffff]/60 cursor-pointer">COPY CSS</button>
            </div>
            <pre id="color-out-css" class="px-3 py-2 font-fira text-xs text-[#d6d6d6] leading-relaxed overflow-x-auto select-all"></pre>
          </div>
        </div>

        <!-- Harmony & Shades -->
        <div class="rounded-xl border border-white/10 bg-[#050505] p-4 flex flex-col gap-2.5">
          <span class="font-fira text-[10px] uppercase tracking-[0.16em] text-[#858585]">Harmonies &amp; Shades (Click to Select)</span>
          <div id="color-harmonies" class="grid grid-cols-3 sm:grid-cols-6 gap-2"></div>
        </div>
      </div>
    </div>
  `;

  const svPad = document.getElementById('color-sv-pad')!;
  const svThumb = document.getElementById('color-sv-thumb')!;
  const hueSlider = document.getElementById('color-hue-slider') as HTMLInputElement;
  const hueValEl = document.getElementById('color-hue-val')!;
  const alphaSlider = document.getElementById('color-alpha-slider') as HTMLInputElement;
  const alphaValEl = document.getElementById('color-alpha-val')!;
  const alphaGradEl = document.getElementById('color-alpha-grad')!;
  const previewFillEl = document.getElementById('color-preview-fill')!;
  const contrastWhiteEl = document.getElementById('color-contrast-white')!;
  const contrastBlackEl = document.getElementById('color-contrast-black')!;
  const nativeInput = document.getElementById('color-native-input') as HTMLInputElement;
  const primaryInput = document.getElementById('tool-primary-input') as HTMLInputElement;
  const inR = document.getElementById('color-in-r') as HTMLInputElement;
  const inG = document.getElementById('color-in-g') as HTMLInputElement;
  const inB = document.getElementById('color-in-b') as HTMLInputElement;
  const inA = document.getElementById('color-in-a') as HTMLInputElement;
  const outHex = document.getElementById('color-out-hex')!;
  const outRgb = document.getElementById('color-out-rgb')!;
  const outHsl = document.getElementById('color-out-hsl')!;
  const outCss = document.getElementById('color-out-css')!;
  const harmoniesEl = document.getElementById('color-harmonies')!;

  let currentOutputs = formatColorOutputs(getCurrentRgba());

  const syncUI = (skipTarget?: HTMLElement | null) => {
    const rgba = getCurrentRgba();
    currentOutputs = formatColorOutputs(rgba);

    // 2D Spectrum & thumb
    svPad.style.backgroundColor = `hsl(${Math.round(hue)}, 100%, 50%)`;
    svThumb.style.left = `${sat}%`;
    svThumb.style.top = `${100 - val}%`;
    svThumb.style.backgroundColor = rgbaToHex(rgba, false);

    // Sliders
    hueSlider.value = String(Math.round(hue));
    hueValEl.textContent = `${Math.round(hue)}°`;
    const alphaPct = Math.round(alpha * 100);
    alphaSlider.value = String(alphaPct);
    alphaValEl.textContent = `${alphaPct}%`;
    alphaGradEl.style.background = `linear-gradient(to right, rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, 0), rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, 1))`;

    // Preview & WCAG contrast
    previewFillEl.style.backgroundColor = currentOutputs.rgb;
    const onWhite = checkContrast({ r: 255, g: 255, b: 255 }, rgba);
    const onBlack = checkContrast({ r: 0, g: 0, b: 0 }, rgba);
    contrastWhiteEl.textContent = `Aa #FFF · ${onWhite.ratio}:1 ${onWhite.aaaNormal ? 'AAA' : onWhite.aaNormal ? 'AA' : onWhite.aaLarge ? 'AA+' : 'Fail'}`;
    contrastBlackEl.textContent = `Aa #000 · ${onBlack.ratio}:1 ${onBlack.aaaNormal ? 'AAA' : onBlack.aaNormal ? 'AA' : onBlack.aaLarge ? 'AA+' : 'Fail'}`;

    // Native input & editable fields
    nativeInput.value = rgbaToHex(rgba, false);
    if (skipTarget !== primaryInput) primaryInput.value = currentOutputs.hexUpper;
    if (skipTarget !== inR) inR.value = String(rgba.r);
    if (skipTarget !== inG) inG.value = String(rgba.g);
    if (skipTarget !== inB) inB.value = String(rgba.b);
    if (skipTarget !== inA) inA.value = String(alphaPct);

    // Output cards
    outHex.textContent = currentOutputs.hexUpper;
    outRgb.textContent = currentOutputs.rgb;
    outHsl.textContent = currentOutputs.hsl;
    outCss.textContent = currentOutputs.cssSnippet;

    // CLI snippet bar
    const snippetEl = document.getElementById('cli-snippet');
    if (snippetEl) {
      snippetEl.textContent = `/* CSS */ :root { --color-primary: ${currentOutputs.hex}; /* ${currentOutputs.rgb} */ }`;
    }

    // Harmonies
    const swatches = buildHarmonyPalette(rgba);
    harmoniesEl.innerHTML = swatches
      .map(
        (sw) => `
          <button
            type="button"
            data-swatch-hex="${sw.hex}"
            title="${escapeHtml(sw.label)} (${sw.hex})"
            class="group flex flex-col gap-1 rounded-lg border border-white/10 bg-black/70 p-1.5 hover:border-[#00ffff]/60 transition-colors cursor-pointer text-left"
          >
            <span class="block w-full h-8 rounded-md border border-white/10" style="background-color: ${sw.hex};"></span>
            <span class="font-fira text-[9px] text-[#888] group-hover:text-white truncate">${escapeHtml(sw.label)}</span>
            <span class="font-fira text-[9px] text-[#aaa] truncate">${sw.hex}</span>
          </button>
        `,
      )
      .join('');

    harmoniesEl.querySelectorAll<HTMLButtonElement>('[data-swatch-hex]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const parsed = parseColor(btn.dataset.swatchHex ?? '');
        if (parsed) applyRgba(parsed);
      });
    });
  };

  const applyRgba = (next: RgbaColor, skipTarget?: HTMLElement | null) => {
    const hsv = rgbToHsv(next.r, next.g, next.b);
    // Preserve hue when color is pure gray/black/white
    if (hsv.s > 0 && hsv.v > 0) {
      hue = hsv.h;
    }
    sat = hsv.s;
    val = hsv.v;
    alpha = next.a;
    syncUI(skipTarget);
  };

  // Pointer drag on 2D Saturation/Value pad
  const updateFromPointer = (clientX: number, clientY: number) => {
    const rect = svPad.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    sat = Math.round(x * 1000) / 10;
    val = Math.round((1 - y) * 1000) / 10;
    syncUI();
  };

  let dragging = false;
  svPad.addEventListener('pointerdown', (e) => {
    dragging = true;
    svPad.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  });
  svPad.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    updateFromPointer(e.clientX, e.clientY);
  });
  svPad.addEventListener('pointerup', (e) => {
    dragging = false;
    if (svPad.hasPointerCapture(e.pointerId)) {
      svPad.releasePointerCapture(e.pointerId);
    }
  });
  svPad.addEventListener('pointercancel', () => {
    dragging = false;
  });

  hueSlider.addEventListener('input', () => {
    hue = Number(hueSlider.value);
    syncUI();
  });

  alphaSlider.addEventListener('input', () => {
    alpha = Number(alphaSlider.value) / 100;
    syncUI();
  });

  nativeInput.addEventListener('input', () => {
    const parsed = parseColor(nativeInput.value);
    if (parsed) applyRgba({ ...parsed, a: alpha });
  });

  primaryInput.addEventListener('input', () => {
    const parsed = parseColor(primaryInput.value);
    if (parsed) {
      applyRgba(parsed, primaryInput);
    }
  });

  const syncFromChannels = (source: HTMLInputElement) => {
    const r = Number(inR.value);
    const g = Number(inG.value);
    const b = Number(inB.value);
    const aPct = Number(inA.value);
    if ([r, g, b, aPct].every(Number.isFinite)) {
      applyRgba({ r, g, b, a: Math.min(100, Math.max(0, aPct)) / 100 }, source);
    }
  };

  [inR, inG, inB, inA].forEach((el) => {
    el.addEventListener('input', () => syncFromChannels(el));
  });

  document.getElementById('color-random-btn')?.addEventListener('click', () => {
    const buf = new Uint8Array(3);
    globalThis.crypto.getRandomValues(buf);
    applyRgba({ r: buf[0]!, g: buf[1]!, b: buf[2]!, a: 1 });
  });

  document.getElementById('color-eyedropper-btn')?.addEventListener('click', async () => {
    if (!eyeDropperCtor) return;
    try {
      const picker = new eyeDropperCtor();
      const picked = await picker.open();
      const parsed = parseColor(picked.sRGBHex);
      if (parsed) applyRgba(parsed);
    } catch {
      // User cancelled eyedropper
    }
  });

  controlsEl.querySelectorAll<HTMLButtonElement>('[data-copy-color]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.copyColor;
      if (kind === 'hex') void copyText(currentOutputs.hexUpper, btn, 'COPY');
      else if (kind === 'rgb') void copyText(currentOutputs.rgb, btn, 'COPY');
      else if (kind === 'hsl') void copyText(currentOutputs.hsl, btn, 'COPY');
      else if (kind === 'css') void copyText(currentOutputs.cssSnippet, btn, 'COPY CSS');
    });
  });

  syncUI();
}

// --- NAVIGATION & BOOTSTRAP ---

function getFuzzyMatchedTools(query: string): ToolMeta[] {
  const q = query.trim();
  if (!q) return TOOLS;

  const scored = TOOLS.map((t) => ({
    tool: t,
    score: scoreFuzzyCandidate(q, { primary: t.name }),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((entry) => entry.tool);
}

function setPickerOpen(open: boolean): void {
  pickerOpen = open;
  const picker = document.getElementById('tool-picker');
  const panel = document.getElementById('tool-picker-panel');
  const trigger = document.getElementById('tool-picker-trigger');
  const chevron = document.getElementById('picker-trigger-chevron');
  const hint = document.getElementById('picker-hint');
  const searchInput = document.getElementById('picker-search-input') as HTMLInputElement | null;
  const clearBtn = document.getElementById('picker-search-clear');
  const countEl = document.getElementById('picker-search-count');
  if (!picker || !panel || !trigger) return;

  picker.dataset.open = open ? 'true' : 'false';
  panel.classList.toggle('hidden', !open);
  panel.classList.toggle('flex', open);
  trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  chevron?.classList.toggle('rotate-180', open);
  if (hint) {
    hint.textContent = open ? 'Close' : 'Select';
  }

  if (open) {
    // Auto-focus search on pointer-fine desktop devices; avoid forcing mobile soft keyboard
    if (searchInput && window.matchMedia('(pointer: fine)').matches) {
      requestAnimationFrame(() => searchInput.focus());
    }
  } else if (pickerQuery) {
    pickerQuery = '';
    pickerHighlightIdx = 0;
    if (searchInput) searchInput.value = '';
    clearBtn?.classList.add('hidden');
    if (countEl) countEl.textContent = '';
    renderToolOptions();
  }
}

function updatePickerTrigger(tool: ToolMeta): void {
  const iconEl = document.getElementById('picker-active-icon');
  const titleEl = document.getElementById('picker-active-tool');
  if (iconEl) iconEl.innerHTML = renderIconSvg(tool.icon, 15);
  if (titleEl) titleEl.textContent = tool.name;
}

function renderDropdownOption(
  t: ToolMeta,
  options: { showCategory?: boolean; highlighted?: boolean } = {},
): string {
  const isActive = t.id === activeTool;
  const cat = TOOL_CATEGORIES.find((c) => c.id === t.category);
  const catBadge =
    options.showCategory && cat
      ? `<span class="ml-auto font-fira text-[9px] uppercase tracking-wider text-[#777] shrink-0">${escapeHtml(cat.shortLabel)}</span>`
      : '';
  return `
    <button
      type="button"
      role="option"
      data-tool-id="${t.id}"
      data-active="${isActive ? 'true' : 'false'}"
      data-highlighted="${options.highlighted ? 'true' : 'false'}"
      aria-selected="${isActive ? 'true' : 'false'}"
      class="cyber-dropdown-item"
    >
      <span class="cyber-dropdown-icon text-[#00ffff]/85 shrink-0">${renderIconSvg(t.icon, 15)}</span>
      <span class="min-w-0 flex-1">
        <span class="cyber-dropdown-title block font-fira text-xs font-semibold text-[#d0d0d0] truncate">${escapeHtml(t.name)}</span>
      </span>
      ${catBadge}
    </button>
  `;
}

function renderToolOptions(): void {
  const container = document.getElementById('tool-options')!;
  const countEl = document.getElementById('picker-search-count');
  const q = pickerQuery.trim();

  if (q.length > 0) {
    const matches = getFuzzyMatchedTools(q);
    if (pickerHighlightIdx >= matches.length) pickerHighlightIdx = 0;
    if (countEl) {
      countEl.textContent = `${matches.length}`;
    }

    if (matches.length === 0) {
      container.innerHTML = `
        <div class="rounded-lg border border-white/10 bg-black/60 px-4 py-5 text-center font-fira text-xs text-[#858585]">
          No tools matching <span class="text-[#f3eb2c]">"${escapeHtml(q)}"</span>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
        ${matches
          .map((t, idx) =>
            renderDropdownOption(t, {
              showCategory: true,
              highlighted: idx === pickerHighlightIdx,
            }),
          )
          .join('')}
      </div>
    `;
  } else {
    if (countEl) countEl.textContent = '';
    container.innerHTML = TOOL_CATEGORIES.map((cat) => {
      const catTools = TOOLS.filter((t) => t.category === cat.id);
      return `
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2 px-0.5">
            <span class="text-[#00ffff]/85">${renderIconSvg(cat.icon, 12)}</span>
            <span class="font-fira text-[10px] font-bold uppercase tracking-[0.2em] text-[#00ffff]/85">${escapeHtml(cat.label)}</span>
            <span class="h-px flex-1 bg-white/8"></span>
            <span class="font-fira text-[10px] text-[#666]">${catTools.length}</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            ${catTools.map((t) => renderDropdownOption(t)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  container.querySelectorAll<HTMLButtonElement>('[data-tool-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toolId as ToolId;
      if (!id) return;
      if (id !== activeTool) {
        selectTool(id, true);
      }
      setPickerOpen(false);
    });
  });
}

function updateCliSnippet(tool: ToolMeta): void {
  const snippetEl = document.getElementById('cli-snippet')!;
  snippetEl.textContent = tool.cliTemplate(window.location.origin, visitorIp);
}

function selectTool(id: ToolId, updateHash = false, initialTab?: string): void {
  activeAbort?.abort();
  activeAbort = null;
  activeSpeedCleanup?.();
  activeSpeedCleanup = null;
  activeToolCleanup?.();
  activeToolCleanup = null;
  activeTool = id;

  if (updateHash) {
    history.replaceState(null, '', `#${id}`);
  }

  const tool = TOOLS.find((t) => t.id === id) ?? TOOLS[0];
  updatePickerTrigger(tool);
  renderToolOptions();

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

  const resetSubTool = () => {
    activeAbort?.abort();
    activeAbort = null;
    activeToolCleanup?.();
    activeToolCleanup = null;
  };

  switch (id) {
    case 'myip':
      mountTabbedTool(
        controlsEl,
        outputEl,
        [
          { id: 'myip', label: 'My IP & Headers', mount: mountMyIp },
          { id: 'geo', label: 'Lookup Any IP / Domain', mount: mountGeo },
        ],
        initialTab,
        resetSubTool,
      );
      break;
    case 'ping':
      mountPing(controlsEl, outputEl);
      break;
    case 'traceroute':
      mountTraceroute(controlsEl, outputEl);
      break;
    case 'dns':
      mountTabbedTool(
        controlsEl,
        outputEl,
        [
          { id: 'dns', label: 'Forward DNS', mount: mountDns },
          { id: 'reverse', label: 'Reverse DNS / FCrDNS', mount: mountReverse },
        ],
        initialTab,
        resetSubTool,
      );
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
    case 'mac':
      mountMacTool(controlsEl, outputEl);
      break;
    case 'proxy':
      mountProxy(controlsEl, outputEl);
      break;
    case 'rbl':
      mountRbl(controlsEl, outputEl);
      break;
    case 'spf':
      mountTabbedTool(
        controlsEl,
        outputEl,
        [
          { id: 'spf', label: 'SPF Policy Tester', mount: mountSpf },
          { id: 'dmarc', label: 'DMARC & DKIM', mount: mountDmarcDkimTool },
          { id: 'smtp', label: 'SMTP Banner / EHLO', mount: mountSmtpTool },
        ],
        initialTab,
        resetSubTool,
      );
      break;
    case 'tls':
      mountTlsTool(controlsEl, outputEl);
      break;
    case 'headers':
      mountHeadersTool(controlsEl, outputEl);
      break;
    case 'jwt':
      mountJwtTool(controlsEl, outputEl);
      break;
    case 'bandwidth':
      mountBandwidth(controlsEl, outputEl);
      break;
    case 'subnet':
      mountTabbedTool(
        controlsEl,
        outputEl,
        [
          { id: 'subnet', label: 'Subnet / CIDR', mount: mountSubnet },
          { id: 'ipv4to6', label: 'IPv4 ↔ IPv6', mount: mountIpv4ToIpv6 },
        ],
        initialTab,
        resetSubTool,
      );
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
      mountTabbedTool(
        controlsEl,
        outputEl,
        [
          { id: 'sort', label: 'Format & Sort', mount: mountJsonSort },
          { id: 'browser', label: 'Tree Browser', mount: mountJsonBrowser },
          { id: 'convert', label: 'Data Converter', mount: mountDataConvertTool },
          { id: 'xml', label: 'XML → JSON', mount: mountXmlToJson },
        ],
        initialTab,
        resetSubTool,
      );
      break;
    case 'base64':
      mountTabbedTool(
        controlsEl,
        outputEl,
        [
          { id: 'base64', label: 'Base64', mount: mountBase64 },
          { id: 'url', label: 'URL & Query Inspector', mount: mountUrl },
          { id: 'htmlhex', label: 'HTML Entities & Hex', mount: mountHtmlHexTool },
        ],
        initialTab,
        resetSubTool,
      );
      break;
    case 'cron':
      mountCron(controlsEl, outputEl);
      break;
    case 'regex':
      mountRegex(controlsEl, outputEl);
      break;
    case 'diff':
      mountDiffTool(controlsEl, outputEl);
      break;
    case 'uuid':
      mountUuidTool(controlsEl, outputEl);
      break;
    case 'chmod':
      mountChmodTool(controlsEl, outputEl);
      break;
    case 'markdown':
      mountMarkdownTool(controlsEl, outputEl);
      break;
    case 'ascii':
      mountAscii(controlsEl, outputEl);
      break;
    case 'units':
      mountUnits(controlsEl, outputEl);
      break;
    case 'hook':
      mountHook(controlsEl, outputEl);
      break;
    case 'irishtax':
      mountIrishTax(controlsEl, outputEl);
      break;
    case 'soil':
      mountSoil(controlsEl, outputEl);
      break;
    case 'paint':
      mountPaintTool(controlsEl, outputEl);
      break;
    case 'password':
      mountPassword(controlsEl, outputEl);
      break;
    case 'hash':
      mountHash(controlsEl, outputEl);
      break;
    case 'color':
      mountColor(controlsEl, outputEl);
      break;
    case 'image':
      activeToolCleanup = mountImageTool(controlsEl, outputEl);
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

function setupNavigationControls(): void {
  const picker = document.getElementById('tool-picker');
  const trigger = document.getElementById('tool-picker-trigger');
  const chevron = document.getElementById('picker-trigger-chevron');
  const searchIcon = document.getElementById('picker-search-icon');
  const searchInput = document.getElementById('picker-search-input') as HTMLInputElement | null;
  const clearBtn = document.getElementById('picker-search-clear');

  if (chevron) {
    chevron.innerHTML = renderIconSvg(ChevronDown, 14);
  }
  if (searchIcon) {
    searchIcon.innerHTML = renderIconSvg(Search, 14);
  }
  if (clearBtn) {
    clearBtn.innerHTML = renderIconSvg(X, 13);
  }

  trigger?.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    setPickerOpen(!pickerOpen);
  });

  const syncSearch = (val: string) => {
    pickerQuery = val;
    pickerHighlightIdx = 0;
    clearBtn?.classList.toggle('hidden', val.trim().length === 0);
    renderToolOptions();
  };

  searchInput?.addEventListener('input', () => {
    syncSearch(searchInput.value);
  });

  searchInput?.addEventListener('keydown', (e: KeyboardEvent) => {
    const q = pickerQuery.trim();
    if (e.key === 'ArrowDown' && q.length > 0) {
      const matches = getFuzzyMatchedTools(q);
      if (matches.length > 0) {
        e.preventDefault();
        pickerHighlightIdx = (pickerHighlightIdx + 1) % matches.length;
        renderToolOptions();
      }
    } else if (e.key === 'ArrowUp' && q.length > 0) {
      const matches = getFuzzyMatchedTools(q);
      if (matches.length > 0) {
        e.preventDefault();
        pickerHighlightIdx = (pickerHighlightIdx - 1 + matches.length) % matches.length;
        renderToolOptions();
      }
    } else if (e.key === 'Enter' && q.length > 0) {
      const matches = getFuzzyMatchedTools(q);
      const chosen = matches[pickerHighlightIdx] ?? matches[0];
      if (chosen) {
        e.preventDefault();
        if (chosen.id !== activeTool) {
          selectTool(chosen.id, true);
        }
        setPickerOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (pickerQuery.length > 0) {
        searchInput.value = '';
        syncSearch('');
      } else {
        setPickerOpen(false);
        trigger?.focus();
      }
    }
  });

  clearBtn?.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    syncSearch('');
  });

  document.addEventListener('click', (e: MouseEvent) => {
    if (!pickerOpen || !picker) return;
    const target = e.target as Node | null;
    if (target && !picker.contains(target)) {
      setPickerOpen(false);
    }
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && pickerOpen) {
      setPickerOpen(false);
      trigger?.focus();
    }
  });
}

function resolveHashTarget(rawHash: string): { tool: ToolId; tab?: string } {
  const key = rawHash.replace(/^#/, '');
  const alias = TOOL_HASH_ALIASES[key];
  if (alias) return alias;
  if (TOOLS.some((t) => t.id === key)) return { tool: key as ToolId };
  return { tool: 'myip' };
}

function init(): void {
  setupParentResizeSync();
  setupEmbeddedSearch();
  setupNavigationControls();
  const initial = resolveHashTarget(window.location.hash);

  // Wire up CLI copy
  const copyCliBtn = document.getElementById('copy-cli-btn')!;
  const copyCliLabel = document.getElementById('copy-cli-label')!;
  copyCliBtn.addEventListener('click', () => {
    const cmd = document.getElementById('cli-snippet')!.textContent ?? '';
    void copyText(cmd, copyCliLabel, 'COPY CMD');
  });

  window.addEventListener('hashchange', () => {
    const next = resolveHashTarget(window.location.hash);
    if (next.tool !== activeTool || next.tab) {
      selectTool(next.tool, false, next.tab);
    }
  });

  // Keep lucide icons used in bundle tree-shaking clean
  void Network;
  void Check;
  void Copy;
  void ArrowDownAZ;
  void EthernetPort;
  void Globe;
  void Link2;

  selectTool(initial.tool, false, initial.tab);
  void hydrateVisitorIp();
}

init();
