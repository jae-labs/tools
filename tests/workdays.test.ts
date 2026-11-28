import { describe, expect, it } from 'vitest';
import {
  calculateWorkdaysDiff,
  calculateWorkdaysOffset,
  formatIsoDateUtc,
  getEasterSundayUtc,
  getHolidaysForYear,
} from '../src/shared/workdays.ts';

describe('working days & date calculator', () => {
  it('computes Easter Sunday and country holidays accurately', () => {
    expect(formatIsoDateUtc(getEasterSundayUtc(2026))).toBe('2026-04-05');

    const ie2026 = getHolidaysForYear(2026, 'IE');
    expect(ie2026.get('2026-03-17')).toBe("St. Patrick's Day");
    expect(ie2026.get('2026-04-06')).toBe('Easter Monday');

    const us2026 = getHolidaysForYear(2026, 'US');
    // July 4, 2026 falls on Saturday -> observed Friday July 3
    expect(us2026.get('2026-07-03')).toBe('Independence Day');
  });

  it('adds and subtracts days skipping weekends & holidays or counting calendar days', () => {
    // 2026-12-23 (Wed) + 3 IE working days: Dec 24 (1), skip Dec 25/26/27, Dec 28 (2), Dec 29 (3)
    const forward = calculateWorkdaysOffset({
      startDate: '2026-12-23',
      direction: 'forward',
      amount: 3,
      unit: 'days',
      countryCode: 'IE',
      skipWeekends: true,
      skipHolidays: true,
    });
    expect(forward.targetDate).toBe('2026-12-29');
    expect(forward.skippedHolidaysCount).toBe(2);
    expect(forward.skippedWeekends).toBe(2); // Sat Dec 26 (St. Stephen's) + Sun Dec 27

    // Backward 15 calendar days with weekends/holidays enabled
    const backwardCal = calculateWorkdaysOffset({
      startDate: '2026-11-19',
      direction: 'backward',
      amount: 15,
      unit: 'days',
      countryCode: 'NONE',
      skipWeekends: false,
      skipHolidays: false,
    });
    expect(backwardCal.targetDate).toBe('2026-11-04');
    expect(backwardCal.calendarDays).toBe(15);
  });

  it('converts work hours using country standard daily hours and custom overrides', () => {
    // France standard = 7h/day; 21 hours = 3 working days from Mon 2026-11-16 -> Thu 2026-11-19
    const fr = calculateWorkdaysOffset({
      startDate: '2026-11-16',
      direction: 'forward',
      amount: 21,
      unit: 'hours',
      countryCode: 'FR',
      skipWeekends: true,
      skipHolidays: true,
    });
    expect(fr.hoursPerDay).toBe(7);
    expect(fr.countedDays).toBe(3);
    expect(fr.partialFinalDayHours).toBeNull();
    expect(fr.targetDate).toBe('2026-11-19');

    // UK standard = 7.5h/day; 10 hours = 2 working days with 2.5h final day
    const uk = calculateWorkdaysOffset({
      startDate: '2026-11-16',
      direction: 'forward',
      amount: 10,
      unit: 'hours',
      countryCode: 'GB',
      skipWeekends: true,
      skipHolidays: false,
    });
    expect(uk.countedDays).toBe(2);
    expect(uk.partialFinalDayHours).toBe(2.5);
    expect(uk.targetDate).toBe('2026-11-18');
  });

  it('calculates working days and total hours between two dates', () => {
    const diff = calculateWorkdaysDiff({
      startDate: '2026-03-13',
      endDate: '2026-03-20',
      countryCode: 'IE',
      skipWeekends: true,
      skipHolidays: true,
    });
    // Mar 14(Sat), 15(Sun), 16(Mon), 17(Tue St Patrick), 18(Wed), 19(Thu), 20(Fri) -> 4 working days
    expect(diff.calendarDays).toBe(7);
    expect(diff.weekendDays).toBe(2);
    expect(diff.holidaysCount).toBe(1);
    expect(diff.workingDays).toBe(4);
    expect(diff.totalWorkHours).toBe(32);
  });
});
