import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.ts';
import {
  calculateReverseSla,
  calculateSlaBreakdown,
  compareSlas,
  formatSlaDuration,
  parseDurationString,
} from '../src/shared/sla.ts';

describe('sla calculator & /api/sla', () => {
  it('calculates downtime intervals accurately for standard SLA percentages', () => {
    const threeNines = calculateSlaBreakdown(99.9);
    expect(threeNines.ninesLabel).toBe('Three Nines (99.9%)');
    expect(threeNines.intervals.find((i) => i.id === 'daily')?.downtimeFormatted).toBe('1m 26.4s');
    expect(threeNines.intervals.find((i) => i.id === 'weekly')?.downtimeFormatted).toBe('10m 4.8s');
    expect(threeNines.intervals.find((i) => i.id === 'monthly')?.downtimeFormatted).toBe('43m 49.8s');
    expect(threeNines.intervals.find((i) => i.id === 'yearly')?.downtimeFormatted).toBe('8h 45m 58s');

    expect(formatSlaDuration(0.864)).toBe('864ms');
    expect(() => calculateSlaBreakdown(101)).toThrow(/between 0 and 100/i);
  });

  it('compares two SLA levels and computes downtime multiplier', () => {
    const cmp = compareSlas(99.9, 99.99);
    expect(cmp.multiplierLabel).toBe('SLA B allows 10x less downtime');
    const daily = cmp.intervals.find((i) => i.id === 'daily');
    expect(daily?.betterTarget).toBe('B');
    expect(daily?.diffFormatted).toBe('1m 17.8s');
  });

  it('parses human duration strings and computes reverse SLA tier checks', () => {
    expect(parseDurationString('45m')).toBe(2700);
    expect(parseDurationString('1h 12m 30s')).toBe(4350);
    expect(parseDurationString('300')).toBe(300);
    expect(() => parseDurationString('abc')).toThrow(/Could not parse duration/i);

    const rev = calculateReverseSla(parseDurationString('45m'), 'monthly');
    expect(rev.uptimePercentage).toBeGreaterThan(99.8);
    expect(rev.uptimePercentage).toBeLessThan(99.9);
    expect(rev.highestTierMet).toBe('99.5% Standard (99.5%)');
    expect(rev.tierChecks.find((t) => t.percentage === 99.9)?.passed).toBe(false);
    expect(rev.tierChecks.find((t) => t.percentage === 99.5)?.passed).toBe(true);
  });

  it('serves simple, compare, reverse, and validation errors on /api/sla', async () => {
    const app = createApp();

    const simpleRes = await app.fetch(new Request('http://localhost/api/sla?pct=99.99'));
    expect(simpleRes.status).toBe(200);
    const simpleBody = (await simpleRes.json()) as { ninesLabel: string };
    expect(simpleBody.ninesLabel).toBe('Four Nines (99.99%)');

    const cmpRes = await app.fetch(new Request('http://localhost/api/sla?pct=99.9&compare=99.99'));
    expect(cmpRes.status).toBe(200);
    const cmpBody = (await cmpRes.json()) as { multiplierLabel: string };
    expect(cmpBody.multiplierLabel).toContain('10x');

    const revRes = await app.fetch(new Request('http://localhost/api/sla?down=45m&period=yearly'));
    expect(revRes.status).toBe(200);
    const revBody = (await revRes.json()) as { highestTierMet: string };
    expect(revBody.highestTierMet).toContain('Four Nines');

    const badRes = await app.fetch(new Request('http://localhost/api/sla?pct=150'));
    expect(badRes.status).toBe(400);
  });
});
