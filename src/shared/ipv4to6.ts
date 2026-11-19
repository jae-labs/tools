export interface Ipv4ToIpv6Result {
  input: string;
  direction: 'ipv4-to-ipv6' | 'ipv6-to-ipv4';
  sourceType: string;
  ipv4: string;
  ipv4Decimal: number;
  ipv4Hex: string;
  ipv4Binary: string;
  ipv4MappedDotted: string;
  ipv4MappedCompressed: string;
  ipv4MappedExpanded: string;
  ipv4CompatibleCompressed: string;
  ipv4CompatibleExpanded: string;
  sixToFourPrefix: string;
  sixToFourCompressed: string;
  sixToFourExpanded: string;
  nat64Dotted: string;
  nat64Compressed: string;
  nat64Expanded: string;
  isatapSuffix: string;
  ipv6PtrArpa: string;
}

function parseIpv4Octets(raw: string): [number, number, number, number] | null {
  const parts = raw.trim().split('.');
  if (parts.length !== 4) return null;
  const nums: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    if (part.length > 1 && part.startsWith('0')) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    nums.push(n);
  }
  return nums as [number, number, number, number];
}

function expandIpv6Groups(raw: string): string[] | null {
  const clean = raw.trim().toLowerCase().split('%')[0] ?? '';
  if (!clean || clean.includes('::') && clean.indexOf('::') !== clean.lastIndexOf('::')) {
    return null;
  }

  let normalized = clean;
  // Support embedded trailing IPv4 like ::ffff:192.0.2.1
  const lastColon = clean.lastIndexOf(':');
  const tail = lastColon >= 0 ? clean.slice(lastColon + 1) : '';
  if (tail.includes('.')) {
    const octets = parseIpv4Octets(tail);
    if (!octets) return null;
    const hi = ((octets[0] << 8) | octets[1]).toString(16);
    const lo = ((octets[2] << 8) | octets[3]).toString(16);
    normalized = `${clean.slice(0, lastColon + 1)}${hi}:${lo}`;
  }

  const [leftRaw, rightRaw] = normalized.split('::');
  const left = leftRaw ? leftRaw.split(':') : [];
  const right = rightRaw !== undefined ? (rightRaw ? rightRaw.split(':') : []) : [];

  if (rightRaw !== undefined) {
    const missing = 8 - (left.length + right.length);
    if (missing < 0) return null;
    const merged = [...left, ...Array<string>(missing).fill('0'), ...right];
    if (merged.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
    return merged.map((g) => g.padStart(4, '0'));
  }

  if (left.length !== 8 || left.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) {
    return null;
  }
  return left.map((g) => g.padStart(4, '0'));
}

// RFC 5952 longest zero-run compression
export function compressIpv6Groups(expandedGroups: readonly string[]): string {
  const short = expandedGroups.map((g) => g.replace(/^0+/, '') || '0');
  let bestStart = -1;
  let bestLen = 1;
  let curStart = -1;
  let curLen = 0;

  for (let i = 0; i < short.length; i += 1) {
    if (short[i] === '0') {
      if (curStart === -1) curStart = i;
      curLen += 1;
      if (curLen > bestLen) {
        bestStart = curStart;
        bestLen = curLen;
      }
    } else {
      curStart = -1;
      curLen = 0;
    }
  }

  if (bestStart === -1) {
    return short.join(':');
  }

  const head = short.slice(0, bestStart).join(':');
  const tail = short.slice(bestStart + bestLen).join(':');
  return `${head}::${tail}`;
}

function groupsToOctets(g1Hex: string, g2Hex: string): [number, number, number, number] {
  const hi = Number.parseInt(g1Hex, 16);
  const lo = Number.parseInt(g2Hex, 16);
  return [(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff];
}

function extractEmbeddedIpv4FromGroups(groups: string[]): {
  octets: [number, number, number, number];
  sourceType: string;
} | null {
  // IPv4-mapped ::ffff:a.b.c.d
  if (groups.slice(0, 5).every((g) => g === '0000') && groups[5] === 'ffff') {
    return { octets: groupsToOctets(groups[6]!, groups[7]!), sourceType: 'IPv4-mapped (::ffff:0:0/96)' };
  }
  // IPv4-compatible ::a.b.c.d (non-zero tail)
  if (groups.slice(0, 6).every((g) => g === '0000') && (groups[6] !== '0000' || groups[7] !== '0000')) {
    return { octets: groupsToOctets(groups[6]!, groups[7]!), sourceType: 'IPv4-compatible (::/96)' };
  }
  // 6to4 2002:AABB:CCDD::/48
  if (groups[0] === '2002') {
    return { octets: groupsToOctets(groups[1]!, groups[2]!), sourceType: '6to4 (2002::/16)' };
  }
  // NAT64 64:ff9b::a.b.c.d
  if (
    groups[0] === '0064' &&
    groups[1] === 'ff9b' &&
    groups.slice(2, 6).every((g) => g === '0000')
  ) {
    return { octets: groupsToOctets(groups[6]!, groups[7]!), sourceType: 'NAT64 Well-Known Prefix (64:ff9b::/96)' };
  }
  return null;
}

function buildResult(
  rawInput: string,
  octets: [number, number, number, number],
  direction: 'ipv4-to-ipv6' | 'ipv6-to-ipv4',
  sourceType: string,
): Ipv4ToIpv6Result {
  const [a, b, c, d] = octets;
  const ipv4 = `${a}.${b}.${c}.${d}`;
  const ipv4Decimal = (((a << 24) >>> 0) + (b << 16) + (c << 8) + d) >>> 0;
  const hiGroup = ((a << 8) | b).toString(16).padStart(4, '0');
  const loGroup = ((c << 8) | d).toString(16).padStart(4, '0');

  const mappedGroups = ['0000', '0000', '0000', '0000', '0000', 'ffff', hiGroup, loGroup];
  const compatGroups = ['0000', '0000', '0000', '0000', '0000', '0000', hiGroup, loGroup];
  const sixToFourGroups = ['2002', hiGroup, loGroup, '0000', '0000', '0000', '0000', '0000'];
  const nat64Groups = ['0064', 'ff9b', '0000', '0000', '0000', '0000', hiGroup, loGroup];

  const ipv6PtrArpa = `${mappedGroups.join('').split('').reverse().join('.')}.ip6.arpa`;

  return {
    input: rawInput.trim(),
    direction,
    sourceType,
    ipv4,
    ipv4Decimal,
    ipv4Hex: `0x${ipv4Decimal.toString(16).padStart(8, '0')}`,
    ipv4Binary: octets.map((o) => o.toString(2).padStart(8, '0')).join('.'),
    ipv4MappedDotted: `::ffff:${ipv4}`,
    ipv4MappedCompressed: compressIpv6Groups(mappedGroups),
    ipv4MappedExpanded: mappedGroups.join(':'),
    ipv4CompatibleCompressed: compressIpv6Groups(compatGroups),
    ipv4CompatibleExpanded: compatGroups.join(':'),
    sixToFourPrefix: `${compressIpv6Groups(sixToFourGroups)}/48`,
    sixToFourCompressed: compressIpv6Groups(sixToFourGroups),
    sixToFourExpanded: sixToFourGroups.join(':'),
    nat64Dotted: `64:ff9b::${ipv4}`,
    nat64Compressed: compressIpv6Groups(nat64Groups),
    nat64Expanded: nat64Groups.join(':'),
    isatapSuffix: `::5efe:${ipv4}`,
    ipv6PtrArpa,
  };
}

export function convertIpv4ToIpv6(rawInput: string): Ipv4ToIpv6Result {
  const cleaned = rawInput.trim().split('/')[0]?.trim() ?? '';
  if (!cleaned) {
    throw new Error('Enter an IPv4 address (e.g. 192.0.2.1) or an embedded IPv6 transition address.');
  }

  const v4Octets = parseIpv4Octets(cleaned);
  if (v4Octets) {
    return buildResult(rawInput, v4Octets, 'ipv4-to-ipv6', 'Standard IPv4 Address');
  }

  const v6Groups = expandIpv6Groups(cleaned);
  if (v6Groups) {
    const embedded = extractEmbeddedIpv4FromGroups(v6Groups);
    if (!embedded) {
      throw new Error(
        'IPv6 address does not embed an IPv4 address (expected ::ffff:x.x.x.x, 2002::/16, 64:ff9b::/96, or ::/96).',
      );
    }
    return buildResult(rawInput, embedded.octets, 'ipv6-to-ipv4', embedded.sourceType);
  }

  throw new Error(`Invalid IPv4 or IPv6 address: "${cleaned}".`);
}
