import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.ts';
import {
  breakdownSeconds,
  convertDateStringToEpoch,
  convertEpochToDate,
  convertHumanPartsToEpoch,
  detectEpochUnit,
  formatRelativeTime,
} from '../src/shared/epoch.ts';
import { sortJsonString } from '../src/shared/jsonsort.ts';

describe('epoch converter & /api/epoch', () => {
  it('auto-detects seconds, milliseconds, microseconds, and nanoseconds', () => {
    expect(detectEpochUnit(1_700_000_000)).toBe('seconds');
    expect(detectEpochUnit(1_700_000_000_000)).toBe('milliseconds');
    expect(detectEpochUnit(1_700_000_000_000_000)).toBe('microseconds');
    expect(detectEpochUnit(1_700_000_000_000_000_000)).toBe('nanoseconds');

    const res = convertEpochToDate('1700000000', 'auto', 1_700_000_000_000);
    expect(res.detectedUnit).toBe('seconds');
    expect(res.epochSeconds).toBe(1_700_000_000);
    expect(res.iso8601).toBe('2023-11-14T22:13:20.000Z');
    expect(res.relative).toBe('just now');
  });

  it('converts human UTC dates, date strings, relative offsets, and duration breakdowns', () => {
    const human = convertHumanPartsToEpoch({
      year: 2026,
      month: 11,
      day: 19,
      hour: 19,
      minute: 59,
      second: 10,
      timezone: 'utc',
    });
    expect(human.iso8601).toBe('2026-11-19T19:59:10.000Z');
    expect(human.epochSeconds).toBe(1_795_118_350);

    const parsed = convertDateStringToEpoch('2026-11-19T19:59:10Z');
    expect(parsed.epochSeconds).toBe(1_795_118_350);

    expect(formatRelativeTime(1_000_000, 1_000_000 + 7200 * 1000)).toBe('2 hours ago');
    expect(formatRelativeTime(1_000_000 + 86_400 * 1000, 1_000_000)).toBe('in 1 day');

    expect(breakdownSeconds(90061)).toEqual({
      days: 1,
      hours: 1,
      minutes: 1,
      seconds: 1,
      formatted: '1 day, 1 hour, 1 minute, 1 second',
    });
  });

  it('serves /api/epoch timestamp and date conversions and rejects bad input', async () => {
    const app = createApp();
    const res1 = await app.fetch(new Request('http://localhost/api/epoch?ts=1700000000'));
    expect(res1.status).toBe(200);
    const body1 = (await res1.json()) as { iso8601: string };
    expect(body1.iso8601).toBe('2023-11-14T22:13:20.000Z');

    const res2 = await app.fetch(new Request('http://localhost/api/epoch?date=2026-11-19T19:59:10Z'));
    expect(res2.status).toBe(200);
    const body2 = (await res2.json()) as { epochSeconds: number };
    expect(body2.epochSeconds).toBe(1_795_118_350);

    const bad = await app.fetch(new Request('http://localhost/api/epoch?ts=not-a-timestamp'));
    expect(bad.status).toBe(400);
  });
});

describe('json sort', () => {
  it('recursively sorts nested object keys while preserving arrays by default', () => {
    const raw = '{"z":1,"b":{"d":4,"a":[3,1,2]},"a":"hello"}';
    const res = sortJsonString(raw);
    expect(JSON.parse(res.formatted)).toEqual({
      a: 'hello',
      b: { a: [3, 1, 2], d: 4 },
      z: 1,
    });
    expect(Object.keys(JSON.parse(res.formatted) as Record<string, unknown>)).toEqual(['a', 'b', 'z']);
    expect(res.stats.objectKeys).toBe(5);
    expect(res.stats.arrayCount).toBe(1);
  });

  it('supports array sorting, descending order, and minified output', () => {
    const raw = '{"b":["banana","Apple"],"a":{"x":1,"y":2}}';
    const sortedWithArrays = sortJsonString(raw, { sortArrays: true, indent: 0 });
    expect(sortedWithArrays.formatted).toBe('{"a":{"x":1,"y":2},"b":["Apple","banana"]}');

    const desc = sortJsonString(raw, { descending: true, indent: 0 });
    expect(desc.formatted).toBe('{"b":["banana","Apple"],"a":{"y":2,"x":1}}');

    expect(() => sortJsonString('{bad json')).toThrow(/Invalid JSON/i);
  });
});
