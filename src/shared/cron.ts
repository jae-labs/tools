export interface CronFieldSpec {
  raw: string;
  values: number[];
  isWildcard: boolean;
  description: string;
}

export interface CronExplanation {
  expression: string;
  normalized: string;
  summary: string;
  fields: {
    minute: CronFieldSpec;
    hour: CronFieldSpec;
    dayOfMonth: CronFieldSpec;
    month: CronFieldSpec;
    dayOfWeek: CronFieldSpec;
  };
  nextRuns: string[];
}

export const CRON_MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseAtom(token: string, min: number, max: number, aliases?: string[]): number {
  const upper = token.trim().toUpperCase();
  if (aliases) {
    const idx = aliases.indexOf(upper);
    if (idx !== -1) return min + idx;
  }
  if (!/^\d+$/.test(upper)) {
    throw new Error(`Invalid cron token "${token}".`);
  }
  let num = Number(upper);
  if (max === 7 && num === 7) num = 0; // Sunday alias in day-of-week
  const effectiveMax = max === 7 ? 6 : max;
  if (num < min || num > effectiveMax) {
    throw new Error(`Value "${token}" out of range [${min}-${effectiveMax}].`);
  }
  return num;
}

function parseCronField(
  raw: string,
  min: number,
  max: number,
  aliases?: string[],
): { values: number[]; isWildcard: boolean } {
  const cleaned = raw.trim();
  if (!cleaned) throw new Error('Empty cron field.');

  const effectiveMax = max === 7 ? 6 : max;
  if (cleaned === '*') {
    return {
      values: Array.from({ length: effectiveMax - min + 1 }, (_, i) => min + i),
      isWildcard: true,
    };
  }

  const out = new Set<number>();
  for (const part of cleaned.split(',')) {
    const [rangePart, stepPart, extra] = part.split('/');
    if (extra !== undefined) {
      throw new Error(`Invalid step syntax "${part}".`);
    }

    let step = 1;
    if (stepPart !== undefined) {
      if (!/^\d+$/.test(stepPart) || Number(stepPart) <= 0) {
        throw new Error(`Invalid step "${stepPart}".`);
      }
      step = Number(stepPart);
    }

    let start: number;
    let end: number;

    if (rangePart === '*' || rangePart === undefined || rangePart === '') {
      start = min;
      end = effectiveMax;
    } else if (rangePart.includes('-')) {
      const [loStr, hiStr, extraDash] = rangePart.split('-');
      if (!loStr || !hiStr || extraDash !== undefined) {
        throw new Error(`Invalid range "${rangePart}".`);
      }
      start = parseAtom(loStr, min, max, aliases);
      end = parseAtom(hiStr, min, max, aliases);
      if (start > end) {
        throw new Error(`Range start "${loStr}" exceeds end "${hiStr}".`);
      }
    } else {
      start = parseAtom(rangePart, min, max, aliases);
      end = stepPart !== undefined ? effectiveMax : start;
    }

    for (let v = start; v <= end; v += step) {
      out.add(v);
    }
  }

  const values = Array.from(out).sort((a, b) => a - b);
  return { values, isWildcard: false };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function describeField(
  raw: string,
  unit: string,
  values: number[],
  isWildcard: boolean,
  labelMap?: string[],
  offset = 0,
): string {
  if (isWildcard) return `every ${unit}`;
  if (raw.startsWith('*/')) {
    return `every ${raw.slice(2)} ${unit}s`;
  }
  const formatVal = (v: number) => (labelMap ? (labelMap[v - offset] ?? String(v)) : String(v));
  if (values.length <= 5) {
    return `at ${unit} ${values.map(formatVal).join(', ')}`;
  }
  return `at ${values.length} ${unit}s`;
}

function buildCronSummary(
  minRaw: string,
  hrRaw: string,
  domRaw: string,
  monRaw: string,
  dowRaw: string,
  minVals: number[],
  hrVals: number[],
  domVals: number[],
  monVals: number[],
  dowVals: number[],
): string {
  const parts: string[] = [];

  if (minRaw === '*' && hrRaw === '*') {
    parts.push('Every minute');
  } else if (minRaw.startsWith('*/') && hrRaw === '*') {
    parts.push(`Every ${minRaw.slice(2)} minutes`);
  } else if (minVals.length === 1 && hrRaw === '*') {
    parts.push(`At minute ${pad2(minVals[0]!)} past every hour`);
  } else if (minVals.length === 1 && hrRaw.startsWith('*/')) {
    parts.push(`At minute ${pad2(minVals[0]!)} past every ${hrRaw.slice(2)} hours`);
  } else if (minVals.length === 1 && hrVals.length === 1) {
    parts.push(`At ${pad2(hrVals[0]!)}:${pad2(minVals[0]!)}`);
  } else {
    parts.push(
      `${describeField(minRaw, 'minute', minVals, minRaw === '*')}, ${describeField(hrRaw, 'hour', hrVals, hrRaw === '*')}`,
    );
  }

  if (domRaw !== '*') {
    parts.push(`on day-of-month ${domVals.join(', ')}`);
  }
  if (monRaw !== '*') {
    parts.push(`in ${monVals.map((m) => MONTH_FULL[m - 1] ?? String(m)).join(', ')}`);
  }
  if (dowRaw !== '*') {
    parts.push(`on ${dowVals.map((d) => WEEKDAY_FULL[d] ?? String(d)).join(', ')}`);
  }

  return `${parts.join(' ')}.`;
}

export function computeNextCronRuns(
  fields: {
    minute: Set<number>;
    hour: Set<number>;
    dayOfMonth: Set<number>;
    month: Set<number>;
    dayOfWeek: Set<number>;
    domWildcard: boolean;
    dowWildcard: boolean;
  },
  count = 10,
  fromDate = new Date(),
): string[] {
  const runs: string[] = [];
  const cursor = new Date(fromDate.getTime());
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);

  // Standard 5-year bound (~2.6M minutes max) avoids infinite loops on unreachable dates like Feb 31
  const maxIterations = 525_960 * 5;
  for (let i = 0; i < maxIterations && runs.length < count; i += 1) {
    const mon = cursor.getUTCMonth() + 1;
    if (!fields.month.has(mon)) {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
      cursor.setUTCHours(0, 0, 0, 0);
      continue;
    }

    const dom = cursor.getUTCDate();
    const dow = cursor.getUTCDay();
    const domMatch = fields.dayOfMonth.has(dom);
    const dowMatch = fields.dayOfWeek.has(dow);

    // POSIX cron rule: when both day-of-month and day-of-week are restricted, EITHER matches
    const dayMatches =
      fields.domWildcard || fields.dowWildcard ? domMatch && dowMatch : domMatch || dowMatch;

    if (!dayMatches) {
      cursor.setUTCDate(dom + 1);
      cursor.setUTCHours(0, 0, 0, 0);
      continue;
    }

    const hr = cursor.getUTCHours();
    if (!fields.hour.has(hr)) {
      cursor.setUTCHours(hr + 1, 0, 0, 0);
      continue;
    }

    const min = cursor.getUTCMinutes();
    if (!fields.minute.has(min)) {
      cursor.setUTCMinutes(min + 1, 0, 0);
      continue;
    }

    runs.push(cursor.toISOString());
    cursor.setUTCMinutes(min + 1, 0, 0);
  }

  return runs;
}

export function parseCronExpression(rawInput: string, nextCount = 10, now = new Date()): CronExplanation {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Enter a 5-field cron expression (e.g. */5 * * * *) or macro (@daily).');
  }

  const macroExpanded = CRON_MACROS[trimmed.toLowerCase()];
  const normalized = macroExpanded ?? trimmed.replace(/\s+/g, ' ');
  const tokens = normalized.split(' ');
  if (tokens.length !== 5) {
    throw new Error(
      `Expected 5 cron fields (minute hour day-of-month month day-of-week), got ${tokens.length}.`,
    );
  }

  const [minRaw, hrRaw, domRaw, monRaw, dowRaw] = tokens as [string, string, string, string, string];
  const min = parseCronField(minRaw, 0, 59);
  const hr = parseCronField(hrRaw, 0, 23);
  const dom = parseCronField(domRaw, 1, 31);
  const mon = parseCronField(monRaw, 1, 12, MONTH_NAMES);
  const dow = parseCronField(dowRaw, 0, 7, WEEKDAY_NAMES);

  const summary = buildCronSummary(
    minRaw,
    hrRaw,
    domRaw,
    monRaw,
    dowRaw,
    min.values,
    hr.values,
    dom.values,
    mon.values,
    dow.values,
  );

  const nextRuns = computeNextCronRuns(
    {
      minute: new Set(min.values),
      hour: new Set(hr.values),
      dayOfMonth: new Set(dom.values),
      month: new Set(mon.values),
      dayOfWeek: new Set(dow.values),
      domWildcard: dom.isWildcard,
      dowWildcard: dow.isWildcard,
    },
    nextCount,
    now,
  );

  return {
    expression: trimmed,
    normalized,
    summary,
    fields: {
      minute: { raw: minRaw, values: min.values, isWildcard: min.isWildcard, description: describeField(minRaw, 'minute', min.values, min.isWildcard) },
      hour: { raw: hrRaw, values: hr.values, isWildcard: hr.isWildcard, description: describeField(hrRaw, 'hour', hr.values, hr.isWildcard) },
      dayOfMonth: { raw: domRaw, values: dom.values, isWildcard: dom.isWildcard, description: describeField(domRaw, 'day', dom.values, dom.isWildcard) },
      month: { raw: monRaw, values: mon.values, isWildcard: mon.isWildcard, description: describeField(monRaw, 'month', mon.values, mon.isWildcard, MONTH_FULL, 1) },
      dayOfWeek: { raw: dowRaw, values: dow.values, isWildcard: dow.isWildcard, description: describeField(dowRaw, 'weekday', dow.values, dow.isWildcard, WEEKDAY_FULL, 0) },
    },
    nextRuns,
  };
}
