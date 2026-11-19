export type SlaPeriodId = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface SlaPeriodDefinition {
  id: SlaPeriodId;
  label: string;
  shortLabel: string;
  seconds: number;
}

export interface SlaIntervalBreakdown {
  id: SlaPeriodId;
  label: string;
  shortLabel: string;
  periodSeconds: number;
  downtimeSeconds: number;
  downtimeFormatted: string;
  uptimeSeconds: number;
  uptimeFormatted: string;
}

export interface SlaSimpleResult {
  percentage: number;
  downtimePercentage: number;
  ninesLabel: string;
  intervals: SlaIntervalBreakdown[];
}

export interface SlaCompareInterval {
  id: SlaPeriodId;
  label: string;
  downtimeASeconds: number;
  downtimeAFormatted: string;
  downtimeBSeconds: number;
  downtimeBFormatted: string;
  diffSeconds: number;
  diffFormatted: string;
  betterTarget: 'A' | 'B' | 'equal';
}

export interface SlaCompareResult {
  pctA: number;
  pctB: number;
  multiplierLabel: string;
  intervals: SlaCompareInterval[];
}

export interface SlaTierCheck {
  percentage: number;
  name: string;
  allowedSeconds: number;
  allowedFormatted: string;
  deltaSeconds: number;
  deltaFormatted: string;
  passed: boolean;
}

export interface SlaReverseResult {
  periodLabel: string;
  periodSeconds: number;
  downtimeSeconds: number;
  downtimeFormatted: string;
  uptimeSeconds: number;
  uptimePercentage: number;
  downtimePercentage: number;
  uptimeFormattedPct: string;
  highestTierMet: string;
  tierChecks: SlaTierCheck[];
}

const DAY_SECONDS = 86_400;
const YEAR_SECONDS = 365.25 * DAY_SECONDS;

export const SLA_PERIODS: readonly SlaPeriodDefinition[] = [
  { id: 'daily', label: 'Daily (24h)', shortLabel: 'Daily', seconds: DAY_SECONDS },
  { id: 'weekly', label: 'Weekly (7d)', shortLabel: 'Weekly', seconds: 7 * DAY_SECONDS },
  { id: 'monthly', label: 'Monthly (avg)', shortLabel: 'Monthly', seconds: YEAR_SECONDS / 12 },
  { id: 'quarterly', label: 'Quarterly (avg)', shortLabel: 'Quarterly', seconds: YEAR_SECONDS / 4 },
  { id: 'yearly', label: 'Yearly (365.25d)', shortLabel: 'Yearly', seconds: YEAR_SECONDS },
] as const;

export const SLA_PRESET_TIERS: ReadonlyArray<{ percentage: number; name: string; badge: string }> = [
  { percentage: 99, name: 'Two Nines', badge: '99%' },
  { percentage: 99.5, name: '99.5% Standard', badge: '99.5%' },
  { percentage: 99.9, name: 'Three Nines', badge: '99.9%' },
  { percentage: 99.95, name: 'Three & Half Nines', badge: '99.95%' },
  { percentage: 99.99, name: 'Four Nines', badge: '99.99%' },
  { percentage: 99.999, name: 'Five Nines', badge: '99.999%' },
];

export function validateSlaPercentage(rawPct: number): number {
  if (!Number.isFinite(rawPct) || rawPct < 0 || rawPct > 100) {
    throw new Error('SLA percentage must be between 0 and 100.');
  }
  return rawPct;
}

export function classifyNines(pct: number): string {
  if (pct >= 99.9999) return 'Six Nines+ (99.9999%)';
  if (pct >= 99.999) return 'Five Nines (99.999%)';
  if (pct >= 99.99) return 'Four Nines (99.99%)';
  if (pct >= 99.95) return 'Three & Half Nines (99.95%)';
  if (pct >= 99.9) return 'Three Nines (99.9%)';
  if (pct >= 99.5) return '99.5% Availability';
  if (pct >= 99) return 'Two Nines (99%)';
  if (pct >= 90) return 'One Nine (90%)';
  return 'Below 90%';
}

export function formatSlaDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '--';
  if (totalSeconds === 0) return '0s';
  if (totalSeconds < 1) {
    const ms = Math.round(totalSeconds * 1000);
    return ms > 0 ? `${ms}ms` : '<1ms';
  }

  let rem = totalSeconds;
  const days = Math.floor(rem / DAY_SECONDS);
  rem -= days * DAY_SECONDS;
  const hours = Math.floor(rem / 3600);
  rem -= hours * 3600;
  const minutes = Math.floor(rem / 60);
  const seconds = rem - minutes * 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  if (seconds > 0 || parts.length === 0) {
    const rounded = days > 0 || hours > 0 ? Math.round(seconds) : Number(seconds.toFixed(1));
    if (rounded > 0 || parts.length === 0) {
      parts.push(`${rounded}s`);
    }
  }

  return parts.join(' ');
}

export function formatUptimePct(pct: number): string {
  if (pct === 100) return '100%';
  if (pct === 0) return '0%';
  return `${Number(pct.toFixed(5))}%`;
}

export function calculateSlaBreakdown(rawPct: number): SlaSimpleResult {
  const percentage = validateSlaPercentage(rawPct);
  const downtimeRatio = Math.max(0, (100 - percentage) / 100);
  const uptimeRatio = 1 - downtimeRatio;

  const intervals: SlaIntervalBreakdown[] = SLA_PERIODS.map((p) => {
    const downtimeSeconds = p.seconds * downtimeRatio;
    const uptimeSeconds = p.seconds * uptimeRatio;
    return {
      id: p.id,
      label: p.label,
      shortLabel: p.shortLabel,
      periodSeconds: p.seconds,
      downtimeSeconds,
      downtimeFormatted: formatSlaDuration(downtimeSeconds),
      uptimeSeconds,
      uptimeFormatted: formatSlaDuration(uptimeSeconds),
    };
  });

  return {
    percentage,
    downtimePercentage: Number((100 - percentage).toFixed(6)),
    ninesLabel: classifyNines(percentage),
    intervals,
  };
}

export function compareSlas(rawPctA: number, rawPctB: number): SlaCompareResult {
  const pctA = validateSlaPercentage(rawPctA);
  const pctB = validateSlaPercentage(rawPctB);
  const downA = (100 - pctA) / 100;
  const downB = (100 - pctB) / 100;

  let multiplierLabel = 'Equal downtime';
  if (downA > 0 && downB > 0 && Math.abs(downA - downB) > 1e-12) {
    if (downA > downB) {
      multiplierLabel = `SLA B allows ${Number((downA / downB).toFixed(2))}x less downtime`;
    } else {
      multiplierLabel = `SLA A allows ${Number((downB / downA).toFixed(2))}x less downtime`;
    }
  } else if (downA === 0 && downB > 0) {
    multiplierLabel = 'SLA A allows 0 downtime';
  } else if (downB === 0 && downA > 0) {
    multiplierLabel = 'SLA B allows 0 downtime';
  }

  const intervals: SlaCompareInterval[] = SLA_PERIODS.map((p) => {
    const aSec = p.seconds * downA;
    const bSec = p.seconds * downB;
    const diffSeconds = Math.abs(aSec - bSec);
    const betterTarget = Math.abs(aSec - bSec) < 1e-9 ? 'equal' : aSec < bSec ? 'A' : 'B';
    return {
      id: p.id,
      label: p.label,
      downtimeASeconds: aSec,
      downtimeAFormatted: formatSlaDuration(aSec),
      downtimeBSeconds: bSec,
      downtimeBFormatted: formatSlaDuration(bSec),
      diffSeconds,
      diffFormatted: formatSlaDuration(diffSeconds),
      betterTarget,
    };
  });

  return {
    pctA,
    pctB,
    multiplierLabel,
    intervals,
  };
}

export function parseDurationString(raw: string): number {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    throw new Error('Enter a downtime duration (e.g. 45m, 1h 12m 30s, or 300s).');
  }

  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const secs = Number(trimmed);
    if (!Number.isFinite(secs) || secs < 0) {
      throw new Error('Downtime must be zero or positive.');
    }
    return secs;
  }

  const tokenRegex = /(\d+(?:\.\d+)?)\s*(ms|d|day|days|h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)/g;
  let totalSeconds = 0;
  let matchedChars = 0;

  for (const match of trimmed.matchAll(tokenRegex)) {
    const value = Number(match[1]);
    const unit = match[2] ?? '';
    matchedChars += match[0].length;
    if (unit === 'ms') totalSeconds += value / 1000;
    else if (unit.startsWith('d')) totalSeconds += value * DAY_SECONDS;
    else if (unit.startsWith('h')) totalSeconds += value * 3600;
    else if (unit.startsWith('m')) totalSeconds += value * 60;
    else totalSeconds += value;
  }

  const nonSpaceChars = trimmed.replace(/\s+/g, '').length;
  const matchedNonSpace = trimmed
    .match(tokenRegex)
    ?.join('')
    .replace(/\s+/g, '').length ?? 0;

  if (matchedChars === 0 || matchedNonSpace !== nonSpaceChars) {
    throw new Error('Could not parse duration. Use formats like "1h 15m 30s", "45m", or "120s".');
  }

  return totalSeconds;
}

export function calculateReverseSla(
  downtimeSeconds: number,
  period: SlaPeriodId | { customDays: number } = 'monthly',
): SlaReverseResult {
  if (!Number.isFinite(downtimeSeconds) || downtimeSeconds < 0) {
    throw new Error('Downtime seconds must be zero or positive.');
  }

  let periodLabel: string;
  let periodSeconds: number;

  if (typeof period === 'object') {
    if (!Number.isFinite(period.customDays) || period.customDays <= 0) {
      throw new Error('Custom reporting period days must be greater than zero.');
    }
    periodLabel = `Custom (${period.customDays}d)`;
    periodSeconds = period.customDays * DAY_SECONDS;
  } else {
    const def = SLA_PERIODS.find((p) => p.id === period) ?? SLA_PERIODS[2];
    periodLabel = def.label;
    periodSeconds = def.seconds;
  }

  const clampedDowntime = Math.min(downtimeSeconds, periodSeconds);
  const uptimeSeconds = Math.max(0, periodSeconds - downtimeSeconds);
  const uptimePercentage = Math.max(0, (uptimeSeconds / periodSeconds) * 100);
  const downtimePercentage = Math.min(100, (clampedDowntime / periodSeconds) * 100);

  const tierChecks: SlaTierCheck[] = SLA_PRESET_TIERS.map((tier) => {
    const allowedSeconds = periodSeconds * ((100 - tier.percentage) / 100);
    const deltaSeconds = Math.abs(allowedSeconds - downtimeSeconds);
    return {
      percentage: tier.percentage,
      name: tier.name,
      allowedSeconds,
      allowedFormatted: formatSlaDuration(allowedSeconds),
      deltaSeconds,
      deltaFormatted: formatSlaDuration(deltaSeconds),
      passed: downtimeSeconds <= allowedSeconds + 1e-9,
    };
  });

  const highestMet = [...tierChecks].reverse().find((t) => t.passed);

  return {
    periodLabel,
    periodSeconds,
    downtimeSeconds,
    downtimeFormatted: formatSlaDuration(downtimeSeconds),
    uptimeSeconds,
    uptimePercentage,
    downtimePercentage,
    uptimeFormattedPct: formatUptimePct(uptimePercentage),
    highestTierMet: highestMet ? `${highestMet.name} (${highestMet.percentage}%)` : 'Below 99%',
    tierChecks,
  };
}
