import { compressIpv6Groups } from './ipv4to6.ts';

export function detectIpVersion(input: string): 0 | 4 | 6 {
  const ip = input.trim().split('%')[0] ?? '';
  if (/^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(ip)) {
    return 4;
  }
  if (ip.includes(':') && /^[0-9a-fA-F:]+$/.test(ip)) {
    const parts = ip.split('::');
    if (parts.length > 2) return 0;
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];
    if (left.some((g) => g.length === 0 || g.length > 4) || right.some((g) => g.length === 0 || g.length > 4)) {
      return 0;
    }
    if (parts.length === 1) {
      return left.length === 8 ? 6 : 0;
    }
    return left.length + right.length < 8 ? 6 : 0;
  }
  return 0;
}

export interface Ipv4SubnetResult {
  version: 4;
  input: string;
  ip: string;
  cidr: number;
  subnetMask: string;
  wildcardMask: string;
  networkAddress: string;
  broadcastAddress: string;
  firstUsable: string;
  lastUsable: string;
  totalAddresses: number;
  usableHosts: number;
  ipClass: string;
  scope: string;
  binaryIp: string;
  binaryMask: string;
  binaryNetwork: string;
  subnets: Array<{ cidr: string; network: string; broadcast: string; range: string }>;
}

export interface Ipv6SubnetResult {
  version: 6;
  input: string;
  ip: string;
  cidr: number;
  hostBits: number;
  expandedIp: string;
  compressedIp: string;
  networkAddress: string;
  compressedNetwork: string;
  lastAddress: string;
  compressedLast: string;
  firstUsable: string;
  lastUsable: string;
  subnetMask: string;
  wildcardMask: string;
  totalAddresses: string;
  slash64Count: string | null;
  ipv6PtrArpa: string;
  scope: string;
  subnets: Array<{ cidr: string; network: string; range: string }>;
}

export type SubnetResult = Ipv4SubnetResult | Ipv6SubnetResult;

function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0);
}

function intToIpv4(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join('.');
}

function intToBinaryOctets(num: number): string {
  return [
    ((num >>> 24) & 255).toString(2).padStart(8, '0'),
    ((num >>> 16) & 255).toString(2).padStart(8, '0'),
    ((num >>> 8) & 255).toString(2).padStart(8, '0'),
    (num & 255).toString(2).padStart(8, '0'),
  ].join('.');
}

export function maskToCidr(mask: string): number | null {
  if (detectIpVersion(mask) !== 4) return null;
  const num = ipv4ToInt(mask);
  const bin = num.toString(2).padStart(32, '0');
  if (!/^1*0*$/.test(bin)) return null;
  return bin.indexOf('0') === -1 ? 32 : bin.indexOf('0');
}

function detectIpv4Class(firstOctet: number): string {
  if (firstOctet < 128) return 'Class A';
  if (firstOctet < 192) return 'Class B';
  if (firstOctet < 224) return 'Class C';
  if (firstOctet < 240) return 'Class D (Multicast)';
  return 'Class E (Reserved)';
}

function detectIpv4Scope(ip: string): string {
  const [a, b, c] = ip.split('.').map(Number);
  if (a === 10) return 'Private (RFC 1918)';
  if (a === 172 && b >= 16 && b <= 31) return 'Private (RFC 1918)';
  if (a === 192 && b === 168) return 'Private (RFC 1918)';
  if (a === 127) return 'Loopback (RFC 1122)';
  if (a === 169 && b === 254) return 'Link-Local (RFC 3927)';
  if (a === 100 && b >= 64 && b <= 127) return 'CGNAT / Shared (RFC 6598)';
  if (a === 0) return 'Current Network (RFC 1122)';
  if (a === 192 && b === 0 && c === 2) return 'Documentation (TEST-NET-1)';
  if (a === 198 && b === 51 && c === 100) return 'Documentation (TEST-NET-2)';
  if (a === 203 && b === 0 && c === 113) return 'Documentation (TEST-NET-3)';
  if (a >= 224 && a <= 239) return 'Multicast';
  if (a >= 240) return 'Reserved';
  return 'Public Routable';
}

function expandIpv6(ip: string): string {
  const [head, tail] = ip.toLowerCase().split('::');
  const headParts = head ? head.split(':').filter(Boolean) : [];
  const tailParts = tail !== undefined ? tail.split(':').filter(Boolean) : [];
  const missing = 8 - headParts.length - tailParts.length;
  const full = [
    ...headParts,
    ...Array.from({ length: Math.max(0, missing) }, () => '0'),
    ...tailParts,
  ];
  return full.map((part) => part.padStart(4, '0')).join(':');
}

function ipv6ToBigInt(expanded: string): bigint {
  return BigInt(`0x${expanded.replaceAll(':', '')}`);
}

function bigIntToIpv6(val: bigint): string {
  const hex = val.toString(16).padStart(32, '0');
  const groups: string[] = [];
  for (let i = 0; i < 32; i += 4) {
    groups.push(hex.slice(i, i + 4));
  }
  return groups.join(':');
}

function detectIpv6Scope(expanded: string): string {
  if (expanded === '0000:0000:0000:0000:0000:0000:0000:0001') return 'Loopback (::1)';
  if (expanded === '0000:0000:0000:0000:0000:0000:0000:0000') return 'Unspecified (::)';
  const firstWord = Number.parseInt(expanded.slice(0, 4), 16);
  if ((firstWord & 0xffc0) === 0xfe80) return 'Link-Local (fe80::/10)';
  if ((firstWord & 0xfe00) === 0xfc00) return 'Unique Local (fc00::/7)';
  if ((firstWord & 0xff00) === 0xff00) return 'Multicast (ff00::/8)';
  if (expanded.startsWith('0000:0000:0000:0000:0000:ffff:')) return 'IPv4-Mapped (::ffff:0:0/96)';
  if (expanded.startsWith('0064:ff9b:0000:0000:')) return 'NAT64 Well-Known (64:ff9b::/96)';
  if (expanded.startsWith('2001:0db8:')) return 'Documentation (2001:db8::/32)';
  if (expanded.startsWith('2002:')) return '6to4 Transition (2002::/16)';
  return 'Global Unicast (2000::/3)';
}

function formatBigCount(val: bigint, powerExp: number): string {
  if (val <= 1_000_000_000_000n) {
    return val.toLocaleString('en-US');
  }
  const str = val.toString();
  const lead = `${str[0]}.${str.slice(1, 3)}e+${str.length - 1}`;
  return `2^${powerExp} (≈ ${lead})`;
}

export function calculateSubnet(rawIpOrCidr: string, rawMaskOrPrefix?: string): SubnetResult {
  const trimmed = rawIpOrCidr.trim();
  if (!trimmed) {
    throw new Error('Enter an IPv4 or IPv6 address (e.g. 192.168.1.0/24).');
  }

  let ipPart = trimmed;
  let prefixPart = rawMaskOrPrefix?.trim() ?? '';

  if (trimmed.includes('/')) {
    const [ip, prefix] = trimmed.split('/');
    ipPart = ip.trim();
    if (!prefixPart) prefixPart = (prefix ?? '').trim();
  }

  const version = detectIpVersion(ipPart);
  if (version === 4) {
    let cidr = 24;
    if (prefixPart) {
      if (prefixPart.includes('.')) {
        const converted = maskToCidr(prefixPart);
        if (converted === null) {
          throw new Error('Invalid IPv4 subnet mask (must be contiguous 1s followed by 0s).');
        }
        cidr = converted;
      } else {
        const parsed = Number(prefixPart.replace(/^\//, ''));
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 32) {
          throw new Error('IPv4 CIDR prefix must be an integer between 0 and 32.');
        }
        cidr = parsed;
      }
    }

    const ipInt = ipv4ToInt(ipPart);
    const maskInt = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
    const wildcardInt = (~maskInt) >>> 0;
    const networkInt = (ipInt & maskInt) >>> 0;
    const broadcastInt = (networkInt | wildcardInt) >>> 0;
    const totalAddresses = Math.pow(2, 32 - cidr);
    const usableHosts = cidr === 32 ? 1 : cidr === 31 ? 2 : Math.max(0, totalAddresses - 2);
    const firstUsableInt = cidr >= 31 ? networkInt : (networkInt + 1) >>> 0;
    const lastUsableInt = cidr >= 31 ? broadcastInt : (broadcastInt - 1) >>> 0;

    const subnets: Array<{ cidr: string; network: string; broadcast: string; range: string }> = [];
    if (cidr < 31) {
      const nextCidr = cidr + 1;
      const step = Math.pow(2, 32 - nextCidr);
      for (let i = 0; i < 2; i++) {
        const net = (networkInt + i * step) >>> 0;
        const bcast = (net + step - 1) >>> 0;
        const first = nextCidr >= 31 ? net : (net + 1) >>> 0;
        const last = nextCidr >= 31 ? bcast : (bcast - 1) >>> 0;
        subnets.push({
          cidr: `${intToIpv4(net)}/${nextCidr}`,
          network: intToIpv4(net),
          broadcast: intToIpv4(bcast),
          range: `${intToIpv4(first)} – ${intToIpv4(last)}`,
        });
      }
    }

    return {
      version: 4,
      input: `${ipPart}/${cidr}`,
      ip: ipPart,
      cidr,
      subnetMask: intToIpv4(maskInt),
      wildcardMask: intToIpv4(wildcardInt),
      networkAddress: intToIpv4(networkInt),
      broadcastAddress: intToIpv4(broadcastInt),
      firstUsable: intToIpv4(firstUsableInt),
      lastUsable: intToIpv4(lastUsableInt),
      totalAddresses,
      usableHosts,
      ipClass: detectIpv4Class(Number(ipPart.split('.')[0])),
      scope: detectIpv4Scope(ipPart),
      binaryIp: intToBinaryOctets(ipInt),
      binaryMask: intToBinaryOctets(maskInt),
      binaryNetwork: intToBinaryOctets(networkInt),
      subnets,
    };
  }

  if (version === 6) {
    const cleanIp = ipPart.split('%')[0]?.trim() ?? ipPart;
    let cidr = 64;
    if (prefixPart) {
      const parsed = Number(prefixPart.replace(/^\//, ''));
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 128) {
        throw new Error('IPv6 CIDR prefix must be an integer between 0 and 128.');
      }
      cidr = parsed;
    }

    const expanded = expandIpv6(cleanIp);
    const ipBig = ipv6ToBigInt(expanded);
    const hostBits = 128 - cidr;
    const hostBitsBig = BigInt(hostBits);
    const allOnes = (1n << 128n) - 1n;
    const maskBig = cidr === 0 ? 0n : (allOnes << hostBitsBig) & allOnes;
    const wildcardBig = allOnes ^ maskBig;
    const networkBig = ipBig & maskBig;
    const lastBig = networkBig | wildcardBig;
    const firstUsableBig = cidr >= 127 ? networkBig : networkBig + 1n;
    const total = 1n << hostBitsBig;

    const expandedNetwork = bigIntToIpv6(networkBig);
    const expandedLast = bigIntToIpv6(lastBig);
    const compressedIp = compressIpv6Groups(expanded.split(':'));
    const compressedNetwork = compressIpv6Groups(expandedNetwork.split(':'));
    const compressedLast = compressIpv6Groups(expandedLast.split(':'));
    const firstUsable = compressIpv6Groups(bigIntToIpv6(firstUsableBig).split(':'));

    const subnets: Array<{ cidr: string; network: string; range: string }> = [];
    if (cidr < 128) {
      const nextCidr = cidr + 1;
      const step = 1n << BigInt(128 - nextCidr);
      for (let i = 0n; i < 2n; i += 1n) {
        const subNetBig = networkBig + i * step;
        const subEndBig = subNetBig + step - 1n;
        const subNetComp = compressIpv6Groups(bigIntToIpv6(subNetBig).split(':'));
        const subEndComp = compressIpv6Groups(bigIntToIpv6(subEndBig).split(':'));
        subnets.push({
          cidr: `${subNetComp}/${nextCidr}`,
          network: subNetComp,
          range: `${subNetComp} – ${subEndComp}`,
        });
      }
    }

    const slash64Exp = cidr <= 64 ? 64 - cidr : -1;
    const slash64Count = slash64Exp >= 0 ? formatBigCount(1n << BigInt(slash64Exp), slash64Exp) : null;
    const ipv6PtrArpa = `${expanded.replaceAll(':', '').split('').reverse().join('.')}.ip6.arpa`;

    return {
      version: 6,
      input: `${cleanIp}/${cidr}`,
      ip: cleanIp,
      cidr,
      hostBits,
      expandedIp: expanded,
      compressedIp,
      networkAddress: expandedNetwork,
      compressedNetwork,
      lastAddress: expandedLast,
      compressedLast,
      firstUsable,
      lastUsable: compressedLast,
      subnetMask: bigIntToIpv6(maskBig),
      wildcardMask: bigIntToIpv6(wildcardBig),
      totalAddresses: formatBigCount(total, hostBits),
      slash64Count,
      ipv6PtrArpa,
      scope: detectIpv6Scope(expanded),
      subnets,
    };
  }

  throw new Error('Invalid IPv4 or IPv6 address.');
}
