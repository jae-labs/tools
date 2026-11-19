import deployedNodesRaw from './deployed-nodes.json' with { type: 'json' };

export const PRISMA_REGIONS = [
  'us-east-1',
  'us-west-1',
  'eu-west-3',
  'eu-central-1',
  'ap-northeast-1',
  'ap-southeast-1',
] as const;

export type PrismaRegion = (typeof PRISMA_REGIONS)[number];

export interface RegionDefinition {
  id: PrismaRegion;
  appName: string;
  label: string;
  shortCode: string;
  city: string;
  country: string;
  countryCode: string;
  continent: 'NA' | 'EU' | 'AP';
  latitude: number;
  longitude: number;
  accent: string;
}

export interface RegionNode extends RegionDefinition {
  url: string | null;
  isCurrentHost: boolean;
}

export const REGION_DEFINITIONS: readonly RegionDefinition[] = [
  {
    id: 'us-east-1',
    appName: 'jae-tools-us-east-1',
    label: 'US East · Virginia',
    shortCode: 'IAD',
    city: 'Ashburn',
    country: 'United States',
    countryCode: 'US',
    continent: 'NA',
    latitude: 39.0438,
    longitude: -77.4874,
    accent: '#00ffff',
  },
  {
    id: 'us-west-1',
    appName: 'jae-tools-us-west-1',
    label: 'US West · California',
    shortCode: 'SJC',
    city: 'San Jose',
    country: 'United States',
    countryCode: 'US',
    continent: 'NA',
    latitude: 37.3382,
    longitude: -121.8863,
    accent: '#f3eb2c',
  },
  {
    id: 'eu-west-3',
    appName: 'jae-tools-eu-west-3',
    label: 'EU West · Paris',
    shortCode: 'CDG',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    continent: 'EU',
    latitude: 48.8566,
    longitude: 2.3522,
    accent: '#00ffff',
  },
  {
    id: 'eu-central-1',
    appName: 'jae-tools',
    label: 'EU Central · Frankfurt',
    shortCode: 'FRA',
    city: 'Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    continent: 'EU',
    latitude: 50.1109,
    longitude: 8.6821,
    accent: '#f3eb2c',
  },
  {
    id: 'ap-northeast-1',
    appName: 'jae-tools-ap-northeast-1',
    label: 'AP Northeast · Tokyo',
    shortCode: 'NRT',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    continent: 'AP',
    latitude: 35.6762,
    longitude: 139.6503,
    accent: '#00ffff',
  },
  {
    id: 'ap-southeast-1',
    appName: 'jae-tools-ap-southeast-1',
    label: 'AP Southeast · Singapore',
    shortCode: 'SIN',
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    continent: 'AP',
    latitude: 1.3521,
    longitude: 103.8198,
    accent: '#f3eb2c',
  },
] as const;

const deployedUrls: Record<string, string | null> = deployedNodesRaw;

export function isPrismaRegion(value: string | null | undefined): value is PrismaRegion {
  return Boolean(value && (PRISMA_REGIONS as readonly string[]).includes(value));
}

export function getRegionDefinition(regionId: string): RegionDefinition | null {
  return REGION_DEFINITIONS.find((region) => region.id === regionId) ?? null;
}

export function normalizeNodeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function resolveRegionNodes(options?: {
  currentOrigin?: string | null;
  currentRegion?: string | null;
  overrides?: Partial<Record<PrismaRegion, string | null>>;
}): RegionNode[] {
  const normalizedCurrentOrigin = normalizeNodeUrl(options?.currentOrigin ?? null);
  const currentRegion = options?.currentRegion ?? null;

  return REGION_DEFINITIONS.map((def) => {
    const overrideUrl = normalizeNodeUrl(options?.overrides?.[def.id] ?? null);
    const configuredUrl = normalizeNodeUrl(deployedUrls[def.id] ?? null);
    const matchedSelf =
      currentRegion === def.id && normalizedCurrentOrigin ? normalizedCurrentOrigin : null;
    // Never allow an internal HTTP proxy origin to downgrade a configured HTTPS endpoint.
    const canUseMatchedSelf =
      matchedSelf !== null &&
      (!configuredUrl ||
        matchedSelf.startsWith('https://') ||
        configuredUrl.startsWith('http://'));
    const url = overrideUrl ?? (canUseMatchedSelf ? matchedSelf : null) ?? configuredUrl ?? matchedSelf;

    let sameHost = false;
    if (normalizedCurrentOrigin && url) {
      try {
        sameHost = new URL(url).host.toLowerCase() === new URL(normalizedCurrentOrigin).host.toLowerCase();
      } catch {
        sameHost = false;
      }
    }

    const isCurrentHost = sameHost || currentRegion === def.id;

    return {
      ...def,
      url,
      isCurrentHost,
    };
  });
}

export function detectRegionFromHost(
  host: string | null | undefined,
  explicitRegion?: string | null,
): PrismaRegion | 'local' {
  if (isPrismaRegion(explicitRegion)) {
    return explicitRegion;
  }
  if (!host) return 'local';
  const cleanHost = host.toLowerCase();
  for (const def of REGION_DEFINITIONS) {
    const url = normalizeNodeUrl(deployedUrls[def.id] ?? null);
    if (url) {
      try {
        if (new URL(url).host.toLowerCase() === cleanHost) {
          return def.id;
        }
      } catch {
        // Ignore malformed configured URL.
      }
    }
    if (cleanHost.includes(def.id)) {
      return def.id;
    }
  }
  return 'local';
}
