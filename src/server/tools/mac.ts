import ouiRaw from 'oui-data';

const ouiTable = ouiRaw as Record<string, string>;

export type MacBlockType = 'MA-L (24-bit)' | 'MA-M (28-bit)' | 'MA-S (36-bit)' | 'Unknown';

export interface MacLookupResult {
  input: string;
  normalizedHex: string;
  isFullMac: boolean;
  found: boolean;
  prefix: string | null;
  prefixFormatted: string | null;
  blockType: MacBlockType;
  vendor: string | null;
  address: string | null;
  country: string | null;
  formats: {
    colon: string;
    hyphen: string;
    cisco: string;
    bare: string;
  };
  flags: {
    unicast: boolean;
    multicast: boolean;
    universal: boolean;
    locallyAdministered: boolean;
  };
}

export interface VendorSearchEntry {
  prefix: string;
  prefixFormatted: string;
  blockType: MacBlockType;
  vendor: string;
  address: string | null;
  country: string | null;
}

export interface VendorSearchResult {
  query: string;
  totalMatches: number;
  truncated: boolean;
  databaseSize: number;
  results: VendorSearchEntry[];
}

interface ParsedOuiRecord {
  vendor: string;
  address: string | null;
  country: string | null;
}

let cachedIndex: Array<{ prefix: string; searchText: string; parsed: ParsedOuiRecord }> | null = null;

function parseOuiValue(raw: string): ParsedOuiRecord {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const vendor = lines[0] ?? 'Unknown';
  if (lines.length === 1) {
    return { vendor, address: null, country: null };
  }
  const country = lines[lines.length - 1] ?? null;
  const addressLines = lines.slice(1, -1);
  return {
    vendor,
    address: addressLines.length > 0 ? addressLines.join(', ') : null,
    country,
  };
}

function getBlockType(prefixLen: number): MacBlockType {
  if (prefixLen === 9) return 'MA-S (36-bit)';
  if (prefixLen === 7) return 'MA-M (28-bit)';
  if (prefixLen === 6) return 'MA-L (24-bit)';
  return 'Unknown';
}

function formatColon(hex: string): string {
  const pairs: string[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    pairs.push(hex.slice(i, i + 2));
  }
  return pairs.join(':');
}

function formatCisco(hex: string): string {
  const lower = hex.toLowerCase();
  const groups: string[] = [];
  for (let i = 0; i < lower.length; i += 4) {
    groups.push(lower.slice(i, i + 4));
  }
  return groups.join('.');
}

function getSearchIndex(): Array<{ prefix: string; searchText: string; parsed: ParsedOuiRecord }> {
  if (cachedIndex) return cachedIndex;
  cachedIndex = Object.entries(ouiTable).map(([prefix, raw]) => {
    const parsed = parseOuiValue(raw);
    return {
      prefix,
      searchText: `${parsed.vendor} ${parsed.country ?? ''}`.toLowerCase(),
      parsed,
    };
  });
  return cachedIndex;
}

export function normalizeMacHex(raw: string): string {
  const stripped = raw.trim().replace(/[:.\-\s]/g, '').toUpperCase();
  if (!/^[0-9A-F]{6,12}$/.test(stripped)) {
    throw new Error('Enter a valid MAC address or OUI prefix (6 to 12 hex characters, e.g. 00:1A:2B:3C:4D:5E).');
  }
  return stripped;
}

export function looksLikeMacInput(raw: string): boolean {
  const stripped = raw.trim().replace(/[:.\-\s]/g, '');
  return /^[0-9a-fA-F]{6,12}$/.test(stripped) && (raw.includes(':') || raw.includes('-') || raw.includes('.') || stripped.length === 12 || stripped.length === 6);
}

export function lookupMacVendor(rawInput: string): MacLookupResult {
  const hex = normalizeMacHex(rawInput);
  const firstByte = parseInt(hex.slice(0, 2), 16);
  const multicast = (firstByte & 0x01) !== 0;
  const locallyAdministered = (firstByte & 0x02) !== 0;

  let matchedPrefix: string | null = null;
  let matchedRaw: string | null = null;

  for (const len of [9, 7, 6]) {
    if (hex.length >= len) {
      const candidate = hex.slice(0, len);
      const val = ouiTable[candidate];
      if (val) {
        matchedPrefix = candidate;
        matchedRaw = val;
        break;
      }
    }
  }

  const parsed = matchedRaw ? parseOuiValue(matchedRaw) : null;

  return {
    input: rawInput.trim(),
    normalizedHex: hex,
    isFullMac: hex.length === 12,
    found: Boolean(parsed),
    prefix: matchedPrefix,
    prefixFormatted: matchedPrefix ? formatColon(matchedPrefix) : null,
    blockType: matchedPrefix ? getBlockType(matchedPrefix.length) : 'Unknown',
    vendor: parsed?.vendor ?? null,
    address: parsed?.address ?? null,
    country: parsed?.country ?? null,
    formats: {
      colon: formatColon(hex),
      hyphen: formatColon(hex).replaceAll(':', '-'),
      cisco: formatCisco(hex),
      bare: hex,
    },
    flags: {
      unicast: !multicast,
      multicast,
      universal: !locallyAdministered,
      locallyAdministered,
    },
  };
}

export function searchMacByVendor(rawQuery: string, limit = 50): VendorSearchResult {
  const query = rawQuery.trim();
  if (query.length < 2) {
    throw new Error('Enter at least 2 characters to search by vendor name.');
  }
  const safeLimit = Math.min(200, Math.max(1, Math.round(Number.isFinite(limit) ? limit : 50)));
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const index = getSearchIndex();

  const results: VendorSearchEntry[] = [];
  let totalMatches = 0;

  for (const entry of index) {
    if (terms.every((t) => entry.searchText.includes(t))) {
      totalMatches++;
      if (results.length < safeLimit) {
        results.push({
          prefix: entry.prefix,
          prefixFormatted: formatColon(entry.prefix),
          blockType: getBlockType(entry.prefix.length),
          vendor: entry.parsed.vendor,
          address: entry.parsed.address,
          country: entry.parsed.country,
        });
      }
    }
  }

  return {
    query,
    totalMatches,
    truncated: totalMatches > safeLimit,
    databaseSize: index.length,
    results,
  };
}

const MAC_EXTRACT_RE =
  /\b(?:[0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}\b|\b(?:[0-9a-fA-F]{4}\.){2}[0-9a-fA-F]{4}\b|\b[0-9a-fA-F]{12}\b/g;

export function bulkLookupMacs(rawText: string, maxItems = 100): MacLookupResult[] {
  const matches = rawText.match(MAC_EXTRACT_RE) ?? [];
  const seen = new Set<string>();
  const results: MacLookupResult[] = [];

  for (const m of matches) {
    const hex = m.replace(/[:.\-\s]/g, '').toUpperCase();
    if (seen.has(hex)) continue;
    seen.add(hex);
    results.push(lookupMacVendor(m));
    if (results.length >= maxItems) break;
  }

  return results;
}
