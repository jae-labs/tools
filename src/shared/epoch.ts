export type EpochPrecision = 'auto' | 'seconds' | 'milliseconds' | 'microseconds' | 'nanoseconds';

export type ResolvedEpochUnit = Exclude<EpochPrecision, 'auto'>;

export interface EpochConversionResult {
  input: string;
  detectedUnit: ResolvedEpochUnit;
  epochSeconds: number;
  epochMilliseconds: number;
  epochMicroseconds: number;
  epochNanoseconds: number;
  iso8601: string;
  utcString: string;
  utcDateTime: string;
  dayStartSeconds: number;
  dayEndSeconds: number;
  relative: string;
}

export interface HumanToEpochInput {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  timezone: 'utc' | 'local';
}

export function detectEpochUnit(rawValue: number): ResolvedEpochUnit {
  const abs = Math.abs(rawValue);
  // Heuristic magnitude thresholds (dates around 1970-2286+):
  // >= 1e16 -> nanoseconds (~19 digits, >= 1970-04)
  // >= 1e14 -> microseconds (~16 digits)
  // >= 1e11 -> milliseconds (~12-13 digits, > 1973 in ms / > 5138 in sec)
  if (abs >= 1e16) return 'nanoseconds';
  if (abs >= 1e14) return 'microseconds';
  if (abs >= 1e11) return 'milliseconds';
  return 'seconds';
}

export function formatRelativeTime(targetMs: number, nowMs = Date.now()): string {
  const diffSec = Math.round((targetMs - nowMs) / 1000);
  const absSec = Math.abs(diffSec);
  if (absSec < 5) return 'just now';

  const units: Array<[number, string]> = [
    [31_557_600, 'year'],
    [2_629_800, 'month'],
    [604_800, 'week'],
    [86_400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
    [1, 'second'],
  ];

  for (const [unitSec, name] of units) {
    if (absSec >= unitSec) {
      const count = Math.floor(absSec / unitSec);
      const label = count === 1 ? name : `${name}s`;
      return diffSec < 0 ? `${count} ${label} ago` : `in ${count} ${label}`;
    }
  }
  return 'just now';
}

export function formatUtcDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;
}

export function buildEpochResult(inputLabel: string, epochMs: number, unit: ResolvedEpochUnit, nowMs = Date.now()): EpochConversionResult {
  if (!Number.isFinite(epochMs)) {
    throw new Error('Timestamp produces an invalid date.');
  }
  const date = new Date(epochMs);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Timestamp is outside valid JavaScript Date bounds.');
  }

  const epochSeconds = Math.trunc(epochMs / 1000);
  const dayStartMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0);
  const dayStartSeconds = Math.floor(dayStartMs / 1000);

  return {
    input: inputLabel,
    detectedUnit: unit,
    epochSeconds,
    epochMilliseconds: Math.trunc(epochMs),
    epochMicroseconds: Math.trunc(epochMs * 1000),
    epochNanoseconds: Math.trunc(epochMs * 1_000_000),
    iso8601: date.toISOString(),
    utcString: date.toUTCString(),
    utcDateTime: formatUtcDateTime(date),
    dayStartSeconds,
    dayEndSeconds: dayStartSeconds + 86_399,
    relative: formatRelativeTime(epochMs, nowMs),
  };
}

export function convertEpochToDate(
  rawTimestamp: string | number,
  precision: EpochPrecision = 'auto',
  nowMs = Date.now(),
): EpochConversionResult {
  const str = String(rawTimestamp).trim();
  if (!str) {
    throw new Error('Enter a numeric Unix timestamp.');
  }
  const num = Number(str);
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid numeric timestamp: "${str}"`);
  }

  const unit: ResolvedEpochUnit = precision === 'auto' ? detectEpochUnit(num) : precision;
  let ms: number;
  switch (unit) {
    case 'seconds':
      ms = num * 1000;
      break;
    case 'milliseconds':
      ms = num;
      break;
    case 'microseconds':
      ms = num / 1000;
      break;
    case 'nanoseconds':
      ms = num / 1_000_000;
      break;
  }

  return buildEpochResult(str, ms, unit, nowMs);
}

export function convertHumanPartsToEpoch(parts: HumanToEpochInput, nowMs = Date.now()): EpochConversionResult {
  const vals = [parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second];
  if (vals.some((v) => !Number.isFinite(v))) {
    throw new Error('Enter valid numeric date and time components.');
  }

  let ms: number;
  if (parts.timezone === 'utc') {
    ms = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  } else {
    ms = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second).getTime();
  }

  if (Number.isNaN(ms)) {
    throw new Error('Date components out of range.');
  }

  return buildEpochResult(new Date(ms).toISOString(), ms, 'seconds', nowMs);
}

export function convertDateStringToEpoch(rawDate: string, nowMs = Date.now()): EpochConversionResult {
  const trimmed = rawDate.trim();
  if (!trimmed) {
    throw new Error('Enter a date/time string (e.g. 2026-11-19T19:59:10Z).');
  }
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) {
    throw new Error(`Could not parse date string: "${trimmed}"`);
  }
  return buildEpochResult(trimmed, ms, 'seconds', nowMs);
}

export function breakdownSeconds(rawSeconds: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  if (!Number.isFinite(rawSeconds) || rawSeconds < 0) {
    throw new Error('Seconds must be zero or positive.');
  }
  const total = Math.floor(rawSeconds);
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);

  return { days, hours, minutes, seconds, formatted: parts.join(', ') };
}
