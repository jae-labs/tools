export type CountryCode =
  | 'IE'
  | 'US'
  | 'GB'
  | 'DE'
  | 'FR'
  | 'BR'
  | 'CA'
  | 'NL'
  | 'ES'
  | 'AU'
  | 'JP'
  | 'NONE';

export interface CountryConfig {
  code: CountryCode;
  name: string;
  standardHoursPerDay: number;
  workweekNote: string;
}

export interface HolidayMatch {
  date: string;
  name: string;
  weekday: string;
  wasWeekend: boolean;
}

export interface WorkdaysOffsetOptions {
  startDate: string; // YYYY-MM-DD
  direction: 'forward' | 'backward';
  amount: number; // days or hours depending on unit
  unit: 'days' | 'hours';
  countryCode: CountryCode;
  skipWeekends: boolean;
  skipHolidays: boolean;
  hoursPerDay?: number;
  customHolidayDates?: string[];
}

export interface WorkdaysOffsetResult {
  startDate: string;
  targetDate: string;
  targetWeekday: string;
  direction: 'forward' | 'backward';
  unit: 'days' | 'hours';
  inputAmount: number;
  hoursPerDay: number;
  countedDays: number;
  totalHours: number;
  partialFinalDayHours: number | null;
  calendarDays: number;
  skippedWeekends: number;
  skippedHolidaysCount: number;
  skippedHolidays: HolidayMatch[];
  country: CountryConfig;
}

export interface WorkdaysDiffOptions {
  startDate: string;
  endDate: string;
  countryCode: CountryCode;
  skipWeekends: boolean;
  skipHolidays: boolean;
  hoursPerDay?: number;
  customHolidayDates?: string[];
}

export interface WorkdaysDiffResult {
  startDate: string;
  endDate: string;
  isInverted: boolean;
  calendarDays: number;
  workingDays: number;
  hoursPerDay: number;
  totalWorkHours: number;
  weekendDays: number;
  holidaysCount: number;
  holidaysInRange: HolidayMatch[];
  country: CountryConfig;
}

export const COUNTRY_CONFIGS: readonly CountryConfig[] = [
  { code: 'IE', name: 'Ireland (IE)', standardHoursPerDay: 8, workweekNote: '40h/wk standard (8h/day)' },
  { code: 'US', name: 'United States (US)', standardHoursPerDay: 8, workweekNote: '40h/wk standard (8h/day)' },
  { code: 'GB', name: 'United Kingdom (UK)', standardHoursPerDay: 7.5, workweekNote: '37.5h/wk typical (7.5h/day)' },
  { code: 'DE', name: 'Germany (DE)', standardHoursPerDay: 8, workweekNote: '40h/wk standard (8h/day)' },
  { code: 'FR', name: 'France (FR)', standardHoursPerDay: 7, workweekNote: '35h/wk statutory (7h/day)' },
  { code: 'BR', name: 'Brazil (BR)', standardHoursPerDay: 8, workweekNote: '40-44h/wk standard (8h/day)' },
  { code: 'CA', name: 'Canada (CA)', standardHoursPerDay: 8, workweekNote: '40h/wk standard (8h/day)' },
  { code: 'NL', name: 'Netherlands (NL)', standardHoursPerDay: 8, workweekNote: '36-40h/wk typical (8h/day)' },
  { code: 'ES', name: 'Spain (ES)', standardHoursPerDay: 8, workweekNote: '40h/wk standard (8h/day)' },
  { code: 'AU', name: 'Australia (AU)', standardHoursPerDay: 7.6, workweekNote: '38h/wk national (7.6h/day)' },
  { code: 'JP', name: 'Japan (JP)', standardHoursPerDay: 8, workweekNote: '40h/wk statutory (8h/day)' },
  { code: 'NONE', name: 'No Public Holidays', standardHoursPerDay: 8, workweekNote: 'Custom / 8h default' },
] as const;

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getCountryConfig(code: CountryCode): CountryConfig {
  return COUNTRY_CONFIGS.find((c) => c.code === code) ?? COUNTRY_CONFIGS[COUNTRY_CONFIGS.length - 1]!;
}

export function formatIsoDateUtc(date: Date): string {
  const y = String(date.getUTCFullYear()).padStart(4, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoDateUtc(iso: string): Date {
  const trimmed = iso.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid date "${iso}". Use YYYY-MM-DD format.`);
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw new Error(`Calendar date out of bounds: "${iso}".`);
  }
  return dt;
}

function addUtcDays(date: Date, delta: number): Date {
  return new Date(date.getTime() + delta * 86_400_000);
}

// Anonymous Gregorian algorithm (Meeus/Jones/Butcher)
export function getEasterSundayUtc(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function nthWeekdayOfMonth(year: number, month1To12: number, weekday0SunTo6Sat: number, nth: number): Date {
  const first = new Date(Date.UTC(year, month1To12 - 1, 1));
  const shift = (weekday0SunTo6Sat - first.getUTCDay() + 7) % 7;
  return addUtcDays(first, shift + (nth - 1) * 7);
}

function lastWeekdayOfMonth(year: number, month1To12: number, weekday0SunTo6Sat: number): Date {
  const last = new Date(Date.UTC(year, month1To12, 0));
  const back = (last.getUTCDay() - weekday0SunTo6Sat + 7) % 7;
  return addUtcDays(last, -back);
}

function makeFixedDate(year: number, month1To12: number, day: number): Date {
  return new Date(Date.UTC(year, month1To12 - 1, day));
}

function observedUsFederal(d: Date): Date {
  const dow = d.getUTCDay();
  if (dow === 6) return addUtcDays(d, -1); // Saturday -> Friday
  if (dow === 0) return addUtcDays(d, 1); // Sunday -> Monday
  return d;
}

function addHoliday(map: Map<string, string>, d: Date, name: string): void {
  const iso = formatIsoDateUtc(d);
  if (!map.has(iso)) {
    map.set(iso, name);
  }
}

function addUkSubstitutes(
  map: Map<string, string>,
  entries: Array<{ date: Date; name: string }>,
): void {
  let nextSubShift = 0;
  for (const { date, name } of entries) {
    const dow = date.getUTCDay();
    if (dow === 0 || dow === 6) {
      let target = addUtcDays(date, dow === 6 ? 2 : 1);
      while (map.has(formatIsoDateUtc(target)) || target.getUTCDay() === 0 || target.getUTCDay() === 6) {
        target = addUtcDays(target, 1);
      }
      nextSubShift += 1;
      addHoliday(map, target, `${name} (Substitute Day${nextSubShift > 1 ? '' : ''})`);
    } else {
      addHoliday(map, date, name);
    }
  }
}

export function getHolidaysForYear(
  year: number,
  country: CountryCode,
  customHolidayDates: string[] = [],
): Map<string, string> {
  const map = new Map<string, string>();
  const easter = getEasterSundayUtc(year);
  const goodFriday = addUtcDays(easter, -2);
  const easterMonday = addUtcDays(easter, 1);
  const ascension = addUtcDays(easter, 39);
  const whitMonday = addUtcDays(easter, 50);
  const corpusChristi = addUtcDays(easter, 60);

  if (country === 'IE') {
    addHoliday(map, makeFixedDate(year, 1, 1), "New Year's Day");
    const feb1 = makeFixedDate(year, 2, 1);
    const brigid = feb1.getUTCDay() === 5 ? feb1 : nthWeekdayOfMonth(year, 2, 1, 1);
    addHoliday(map, brigid, "St. Brigid's Day");
    addHoliday(map, makeFixedDate(year, 3, 17), "St. Patrick's Day");
    addHoliday(map, easterMonday, 'Easter Monday');
    addHoliday(map, nthWeekdayOfMonth(year, 5, 1, 1), 'May Bank Holiday');
    addHoliday(map, nthWeekdayOfMonth(year, 6, 1, 1), 'June Bank Holiday');
    addHoliday(map, nthWeekdayOfMonth(year, 8, 1, 1), 'August Bank Holiday');
    addHoliday(map, lastWeekdayOfMonth(year, 10, 1), 'October Bank Holiday');
    addHoliday(map, makeFixedDate(year, 12, 25), 'Christmas Day');
    addHoliday(map, makeFixedDate(year, 12, 26), "St. Stephen's Day");
  } else if (country === 'US') {
    addHoliday(map, observedUsFederal(makeFixedDate(year, 1, 1)), "New Year's Day");
    addHoliday(map, nthWeekdayOfMonth(year, 1, 1, 3), 'Martin Luther King Jr. Day');
    addHoliday(map, nthWeekdayOfMonth(year, 2, 1, 3), "Presidents' Day");
    addHoliday(map, lastWeekdayOfMonth(year, 5, 1), 'Memorial Day');
    addHoliday(map, observedUsFederal(makeFixedDate(year, 6, 19)), 'Juneteenth National Independence Day');
    addHoliday(map, observedUsFederal(makeFixedDate(year, 7, 4)), 'Independence Day');
    addHoliday(map, nthWeekdayOfMonth(year, 9, 1, 1), 'Labor Day');
    addHoliday(map, nthWeekdayOfMonth(year, 10, 1, 2), 'Columbus Day');
    addHoliday(map, observedUsFederal(makeFixedDate(year, 11, 11)), 'Veterans Day');
    addHoliday(map, nthWeekdayOfMonth(year, 11, 4, 4), 'Thanksgiving Day');
    addHoliday(map, observedUsFederal(makeFixedDate(year, 12, 25)), 'Christmas Day');
  } else if (country === 'GB') {
    addUkSubstitutes(map, [{ date: makeFixedDate(year, 1, 1), name: "New Year's Day" }]);
    addHoliday(map, goodFriday, 'Good Friday');
    addHoliday(map, easterMonday, 'Easter Monday');
    addHoliday(map, nthWeekdayOfMonth(year, 5, 1, 1), 'Early May Bank Holiday');
    addHoliday(map, lastWeekdayOfMonth(year, 5, 1), 'Spring Bank Holiday');
    addHoliday(map, lastWeekdayOfMonth(year, 8, 1), 'Summer Bank Holiday');
    addUkSubstitutes(map, [
      { date: makeFixedDate(year, 12, 25), name: 'Christmas Day' },
      { date: makeFixedDate(year, 12, 26), name: 'Boxing Day' },
    ]);
  } else if (country === 'DE') {
    addHoliday(map, makeFixedDate(year, 1, 1), 'Neujahr');
    addHoliday(map, goodFriday, 'Karfreitag');
    addHoliday(map, easterMonday, 'Ostermontag');
    addHoliday(map, makeFixedDate(year, 5, 1), 'Tag der Arbeit');
    addHoliday(map, ascension, 'Christi Himmelfahrt');
    addHoliday(map, whitMonday, 'Pfingstmontag');
    addHoliday(map, makeFixedDate(year, 10, 3), 'Tag der Deutschen Einheit');
    addHoliday(map, makeFixedDate(year, 12, 25), '1. Weihnachtstag');
    addHoliday(map, makeFixedDate(year, 12, 26), '2. Weihnachtstag');
  } else if (country === 'FR') {
    addHoliday(map, makeFixedDate(year, 1, 1), "Jour de l'an");
    addHoliday(map, easterMonday, 'Lundi de Pâques');
    addHoliday(map, makeFixedDate(year, 5, 1), 'Fête du Travail');
    addHoliday(map, makeFixedDate(year, 5, 8), 'Victoire 1945');
    addHoliday(map, ascension, 'Ascension');
    addHoliday(map, whitMonday, 'Lundi de Pentecôte');
    addHoliday(map, makeFixedDate(year, 7, 14), 'Fête nationale');
    addHoliday(map, makeFixedDate(year, 8, 15), 'Assomption');
    addHoliday(map, makeFixedDate(year, 11, 1), 'Toussaint');
    addHoliday(map, makeFixedDate(year, 11, 11), 'Armistice 1918');
    addHoliday(map, makeFixedDate(year, 12, 25), 'Noël');
  } else if (country === 'BR') {
    addHoliday(map, makeFixedDate(year, 1, 1), 'Confraternização Universal');
    addHoliday(map, goodFriday, 'Sexta-feira Santa');
    addHoliday(map, makeFixedDate(year, 4, 21), 'Tiradentes');
    addHoliday(map, makeFixedDate(year, 5, 1), 'Dia do Trabalho');
    addHoliday(map, corpusChristi, 'Corpus Christi');
    addHoliday(map, makeFixedDate(year, 9, 7), 'Independência do Brasil');
    addHoliday(map, makeFixedDate(year, 10, 12), 'Nossa Senhora Aparecida');
    addHoliday(map, makeFixedDate(year, 11, 2), 'Finados');
    addHoliday(map, makeFixedDate(year, 11, 15), 'Proclamação da República');
    addHoliday(map, makeFixedDate(year, 11, 20), 'Consciência Negra');
    addHoliday(map, makeFixedDate(year, 12, 25), 'Natal');
  } else if (country === 'CA') {
    addHoliday(map, observedUsFederal(makeFixedDate(year, 1, 1)), "New Year's Day");
    addHoliday(map, goodFriday, 'Good Friday');
    addHoliday(map, lastWeekdayOfMonth(year, 5, 1), 'Victoria Day'); // Monday on or before May 24 approx
    addHoliday(map, observedUsFederal(makeFixedDate(year, 7, 1)), 'Canada Day');
    addHoliday(map, nthWeekdayOfMonth(year, 9, 1, 1), 'Labour Day');
    addHoliday(map, observedUsFederal(makeFixedDate(year, 9, 30)), 'Truth and Reconciliation Day');
    addHoliday(map, nthWeekdayOfMonth(year, 10, 1, 2), 'Thanksgiving Day');
    addHoliday(map, observedUsFederal(makeFixedDate(year, 11, 11)), 'Remembrance Day');
    addHoliday(map, observedUsFederal(makeFixedDate(year, 12, 25)), 'Christmas Day');
  } else if (country === 'NL') {
    addHoliday(map, makeFixedDate(year, 1, 1), 'Nieuwjaarsdag');
    addHoliday(map, goodFriday, 'Goede Vrijdag');
    addHoliday(map, easterMonday, 'Tweede Paasdag');
    const kings = makeFixedDate(year, 4, 27);
    addHoliday(map, kings.getUTCDay() === 0 ? addUtcDays(kings, -1) : kings, 'Koningsdag');
    addHoliday(map, ascension, 'Hemelvaartsdag');
    addHoliday(map, whitMonday, 'Tweede Pinksterdag');
    addHoliday(map, makeFixedDate(year, 12, 25), 'Eerste Kerstdag');
    addHoliday(map, makeFixedDate(year, 12, 26), 'Tweede Kerstdag');
  } else if (country === 'ES') {
    addHoliday(map, makeFixedDate(year, 1, 1), 'Año Nuevo');
    addHoliday(map, makeFixedDate(year, 1, 6), 'Epifanía del Señor');
    addHoliday(map, goodFriday, 'Viernes Santo');
    addHoliday(map, makeFixedDate(year, 5, 1), 'Fiesta del Trabajo');
    addHoliday(map, makeFixedDate(year, 8, 15), 'Asunción de la Virgen');
    addHoliday(map, makeFixedDate(year, 10, 12), 'Fiesta Nacional de España');
    addHoliday(map, makeFixedDate(year, 11, 1), 'Todos los Santos');
    addHoliday(map, makeFixedDate(year, 12, 6), 'Día de la Constitución');
    addHoliday(map, makeFixedDate(year, 12, 8), 'Inmaculada Concepción');
    addHoliday(map, makeFixedDate(year, 12, 25), 'Navidad');
  } else if (country === 'AU') {
    addUkSubstitutes(map, [
      { date: makeFixedDate(year, 1, 1), name: "New Year's Day" },
      { date: makeFixedDate(year, 1, 26), name: 'Australia Day' },
    ]);
    addHoliday(map, goodFriday, 'Good Friday');
    addHoliday(map, easterMonday, 'Easter Monday');
    addHoliday(map, makeFixedDate(year, 4, 25), 'Anzac Day');
    addUkSubstitutes(map, [
      { date: makeFixedDate(year, 12, 25), name: 'Christmas Day' },
      { date: makeFixedDate(year, 12, 26), name: 'Boxing Day' },
    ]);
  } else if (country === 'JP') {
    addHoliday(map, makeFixedDate(year, 1, 1), 'New Year Day (Ganjitsu)');
    addHoliday(map, nthWeekdayOfMonth(year, 1, 1, 2), 'Coming of Age Day');
    addHoliday(map, makeFixedDate(year, 2, 11), 'National Foundation Day');
    addHoliday(map, makeFixedDate(year, 2, 23), "Emperor's Birthday");
    addHoliday(map, makeFixedDate(year, 4, 29), 'Showa Day');
    addHoliday(map, makeFixedDate(year, 5, 3), 'Constitution Memorial Day');
    addHoliday(map, makeFixedDate(year, 5, 4), 'Greenery Day');
    addHoliday(map, makeFixedDate(year, 5, 5), "Children's Day");
    addHoliday(map, nthWeekdayOfMonth(year, 7, 1, 3), 'Marine Day');
    addHoliday(map, makeFixedDate(year, 8, 11), 'Mountain Day');
    addHoliday(map, nthWeekdayOfMonth(year, 9, 1, 3), 'Respect for the Aged Day');
    addHoliday(map, nthWeekdayOfMonth(year, 10, 1, 2), 'Sports Day');
    addHoliday(map, makeFixedDate(year, 11, 3), 'Culture Day');
    addHoliday(map, makeFixedDate(year, 11, 23), 'Labour Thanksgiving Day');
  }

  for (const rawCustom of customHolidayDates) {
    const trimmed = rawCustom.trim();
    if (!trimmed) continue;
    const dt = parseIsoDateUtc(trimmed);
    if (dt.getUTCFullYear() === year) {
      map.set(trimmed, 'Custom Holiday');
    }
  }

  return map;
}

function resolveDayState(
  date: Date,
  country: CountryCode,
  skipWeekends: boolean,
  skipHolidays: boolean,
  holidayCache: Map<number, Map<string, string>>,
  customDates: string[],
): { isWorkingDay: boolean; isWeekend: boolean; holidayName: string | null } {
  const dow = date.getUTCDay();
  const isWeekend = dow === 0 || dow === 6;
  const yr = date.getUTCFullYear();
  let yrMap = holidayCache.get(yr);
  if (!yrMap) {
    yrMap = getHolidaysForYear(yr, country, customDates);
    holidayCache.set(yr, yrMap);
  }
  const iso = formatIsoDateUtc(date);
  const holidayName = yrMap.get(iso) ?? null;

  const blockedByWeekend = skipWeekends && isWeekend;
  const blockedByHoliday = skipHolidays && holidayName !== null;
  return {
    isWorkingDay: !blockedByWeekend && !blockedByHoliday,
    isWeekend,
    holidayName,
  };
}

export function calculateWorkdaysOffset(options: WorkdaysOffsetOptions): WorkdaysOffsetResult {
  const start = parseIsoDateUtc(options.startDate);
  const country = getCountryConfig(options.countryCode);
  const hoursPerDay =
    options.hoursPerDay !== undefined && options.hoursPerDay > 0
      ? options.hoursPerDay
      : country.standardHoursPerDay;

  if (!Number.isFinite(options.amount) || options.amount < 0) {
    throw new Error('Days or hours amount must be zero or positive.');
  }

  const countedDays =
    options.unit === 'hours' ? Math.ceil(options.amount / hoursPerDay) : Math.round(options.amount);
  const partialRaw = options.unit === 'hours' ? options.amount % hoursPerDay : 0;
  const partialFinalDayHours =
    options.unit === 'hours' && partialRaw > 1e-6 ? Number(partialRaw.toFixed(2)) : null;
  const totalHours =
    options.unit === 'hours'
      ? Number(options.amount.toFixed(2))
      : Number((countedDays * hoursPerDay).toFixed(2));

  if (countedDays > 50_000) {
    throw new Error('Range too large (maximum 50,000 days).');
  }

  const step = options.direction === 'forward' ? 1 : -1;
  const holidayCache = new Map<number, Map<string, string>>();
  const customDates = options.customHolidayDates ?? [];

  let cursor = start;
  let remaining = countedDays;
  let calendarDays = 0;
  let skippedWeekends = 0;
  const skippedHolidays: HolidayMatch[] = [];

  while (remaining > 0) {
    cursor = addUtcDays(cursor, step);
    calendarDays += 1;
    const state = resolveDayState(
      cursor,
      country.code,
      options.skipWeekends,
      options.skipHolidays,
      holidayCache,
      customDates,
    );

    if (state.isWorkingDay) {
      remaining -= 1;
    } else {
      if (options.skipHolidays && state.holidayName) {
        skippedHolidays.push({
          date: formatIsoDateUtc(cursor),
          name: state.holidayName,
          weekday: WEEKDAY_NAMES[cursor.getUTCDay()] ?? '',
          wasWeekend: state.isWeekend,
        });
      }
      if (options.skipWeekends && state.isWeekend) {
        skippedWeekends += 1;
      }
    }
  }

  return {
    startDate: formatIsoDateUtc(start),
    targetDate: formatIsoDateUtc(cursor),
    targetWeekday: WEEKDAY_NAMES[cursor.getUTCDay()] ?? '',
    direction: options.direction,
    unit: options.unit,
    inputAmount: options.amount,
    hoursPerDay,
    countedDays,
    totalHours,
    partialFinalDayHours,
    calendarDays,
    skippedWeekends,
    skippedHolidaysCount: skippedHolidays.length,
    skippedHolidays,
    country,
  };
}

export function calculateWorkdaysDiff(options: WorkdaysDiffOptions): WorkdaysDiffResult {
  let d1 = parseIsoDateUtc(options.startDate);
  let d2 = parseIsoDateUtc(options.endDate);
  const country = getCountryConfig(options.countryCode);
  const hoursPerDay =
    options.hoursPerDay !== undefined && options.hoursPerDay > 0
      ? options.hoursPerDay
      : country.standardHoursPerDay;

  let isInverted = false;
  if (d2.getTime() < d1.getTime()) {
    isInverted = true;
    [d1, d2] = [d2, d1];
  }

  const calendarDays = Math.round((d2.getTime() - d1.getTime()) / 86_400_000);
  if (calendarDays > 50_000) {
    throw new Error('Date range exceeds maximum 50,000 calendar days.');
  }

  const holidayCache = new Map<number, Map<string, string>>();
  const customDates = options.customHolidayDates ?? [];
  let workingDays = 0;
  let weekendDays = 0;
  const holidaysInRange: HolidayMatch[] = [];

  for (let i = 1; i <= calendarDays; i += 1) {
    const cur = addUtcDays(d1, i);
    const state = resolveDayState(
      cur,
      country.code,
      options.skipWeekends,
      options.skipHolidays,
      holidayCache,
      customDates,
    );
    if (state.isWeekend) weekendDays += 1;
    if (state.holidayName) {
      holidaysInRange.push({
        date: formatIsoDateUtc(cur),
        name: state.holidayName,
        weekday: WEEKDAY_NAMES[cur.getUTCDay()] ?? '',
        wasWeekend: state.isWeekend,
      });
    }
    if (state.isWorkingDay) {
      workingDays += 1;
    }
  }

  return {
    startDate: formatIsoDateUtc(d1),
    endDate: formatIsoDateUtc(d2),
    isInverted,
    calendarDays,
    workingDays,
    hoursPerDay,
    totalWorkHours: Number((workingDays * hoursPerDay).toFixed(2)),
    weekendDays,
    holidaysCount: holidaysInRange.length,
    holidaysInRange,
    country,
  };
}
