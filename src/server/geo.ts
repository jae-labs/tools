import { detectIpFamily, isPublicIp, normalizeIp, type IpFamily } from './ip.ts';

export interface GeoInfo {
  ip: string;
  family: IpFamily;
  localNetwork: boolean;
  provider: string;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  postal: string | null;
  timezone: string | null;
  isp: string | null;
  org: string | null;
  asn: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface CacheEntry {
  value: GeoInfo;
  expiresAt: number;
}

interface IpWhoIsResponse {
  success?: boolean;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
  timezone?: { id?: string };
  connection?: { asn?: number; org?: string; isp?: string };
}

interface IpInfoResponse {
  city?: string;
  region?: string;
  country?: string;
  postal?: string;
  timezone?: string;
  org?: string;
  loc?: string;
}

const DEFAULT_TTL_MS = 15 * 60_000;
const MAX_CACHE_ENTRIES = 500;

function buildLocalGeo(ip: string): GeoInfo {
  return {
    ip,
    family: detectIpFamily(ip),
    localNetwork: true,
    provider: 'local',
    city: 'Local / Private Network',
    region: 'Loopback or RFC1918',
    country: 'Localhost',
    countryCode: null,
    postal: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    isp: 'Local Runtime Interface',
    org: 'Prisma Compute Dev / Private Net',
    asn: null,
    latitude: null,
    longitude: null,
  };
}

function buildFallbackGeo(ip: string): GeoInfo {
  return {
    ip,
    family: detectIpFamily(ip),
    localNetwork: false,
    provider: 'unavailable',
    city: null,
    region: null,
    country: null,
    countryCode: null,
    postal: null,
    timezone: null,
    isp: null,
    org: null,
    asn: null,
    latitude: null,
    longitude: null,
  };
}

function parseIpInfoOrg(rawOrg?: string): { asn: string | null; org: string | null } {
  if (!rawOrg) return { asn: null, org: null };
  const match = /^(AS\d+)\s+(.*)$/.exec(rawOrg.trim());
  if (!match) return { asn: null, org: rawOrg.trim() };
  return { asn: match[1], org: match[2].trim() || null };
}

function parseLatLon(loc?: string): { latitude: number | null; longitude: number | null } {
  if (!loc) return { latitude: null, longitude: null };
  const [latStr, lonStr] = loc.split(',');
  const lat = Number(latStr);
  const lon = Number(lonStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { latitude: null, longitude: null };
  }
  return { latitude: lat, longitude: lon };
}

export interface GeoLookupOptions {
  fetchImpl?: typeof fetch;
  ttlMs?: number;
}

export function createGeoLookup(options: GeoLookupOptions = {}) {
  const fetchFn = options.fetchImpl ?? fetch;
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const cache = new Map<string, CacheEntry>();

  function setCache(ip: string, value: GeoInfo): void {
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(ip, { value, expiresAt: Date.now() + ttlMs });
  }

  async function queryIpWhoIs(ip: string): Promise<GeoInfo | null> {
    const response = await fetchFn(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as IpWhoIsResponse;
    if (data.success === false) return null;

    return {
      ip,
      family: detectIpFamily(ip),
      localNetwork: false,
      provider: 'ipwho.is',
      city: data.city ?? null,
      region: data.region ?? null,
      country: data.country ?? null,
      countryCode: data.country_code ?? null,
      postal: data.postal ?? null,
      timezone: data.timezone?.id ?? null,
      isp: data.connection?.isp ?? data.connection?.org ?? null,
      org: data.connection?.org ?? null,
      asn: data.connection?.asn ? `AS${data.connection.asn}` : null,
      latitude: typeof data.latitude === 'number' ? data.latitude : null,
      longitude: typeof data.longitude === 'number' ? data.longitude : null,
    };
  }

  async function queryIpInfo(ip: string): Promise<GeoInfo | null> {
    const response = await fetchFn(`https://ipinfo.io/${encodeURIComponent(ip)}/json`, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as IpInfoResponse;
    const { asn, org } = parseIpInfoOrg(data.org);
    const { latitude, longitude } = parseLatLon(data.loc);

    return {
      ip,
      family: detectIpFamily(ip),
      localNetwork: false,
      provider: 'ipinfo.io',
      city: data.city ?? null,
      region: data.region ?? null,
      country: data.country ?? null,
      countryCode: data.country ?? null,
      postal: data.postal ?? null,
      timezone: data.timezone ?? null,
      isp: org,
      org,
      asn,
      latitude,
      longitude,
    };
  }

  return async function lookupGeo(rawIp: string): Promise<GeoInfo | null> {
    const ip = normalizeIp(rawIp);
    if (!ip) return null;

    if (!isPublicIp(ip)) {
      return buildLocalGeo(ip);
    }

    const cached = cache.get(ip);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const providers = [queryIpWhoIs, queryIpInfo];
    for (const provider of providers) {
      try {
        const result = await provider(ip);
        if (result) {
          setCache(ip, result);
          return result;
        }
      } catch {
        // Fall through to next provider
      }
    }

    return buildFallbackGeo(ip);
  };
}
