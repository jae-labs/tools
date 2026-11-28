import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAINT_INPUTS,
  calculatePaint,
  recommendOptimalTins,
} from '../src/shared/paint.ts';

describe('paint calculator', () => {
  it('calculates room wall area, door/window deductions, coats, and litres accurately', () => {
    const res = calculatePaint({
      ...DEFAULT_PAINT_INPUTS,
      length: 4,
      width: 3,
      height: 2.5,
      doors: 1,
      windows: 1,
      includeCeiling: false,
      finish: 'matt', // 12 m²/L
      coats: 2,
      bufferPercent: 0,
    });

    // Gross wall = 2 * (4 + 3) * 2.5 = 35 m²
    expect(res.grossWallAreaM2).toBeCloseTo(35, 3);
    // Deductions = 1.89 + 1.44 = 3.33 m² -> net = 31.67 m²
    expect(res.netWallAreaM2).toBeCloseTo(31.67, 2);
    // 2 coats / 12 m²/L = 5.278 L
    expect(res.totalLitres).toBeCloseTo(5.278, 2);
  });

  it('includes ceiling area and supports single-wall & imperial feet modes', () => {
    const withCeiling = calculatePaint({
      ...DEFAULT_PAINT_INPUTS,
      length: 5,
      width: 4,
      height: 2.4,
      includeCeiling: true,
      doors: 0,
      windows: 0,
      coats: 2,
      bufferPercent: 10,
    });
    expect(withCeiling.ceilingAreaM2).toBe(20);
    expect(withCeiling.ceilingLitres).toBeGreaterThan(0);

    const wall = calculatePaint({
      ...DEFAULT_PAINT_INPUTS,
      mode: 'wall',
      length: 10,
      height: 8,
      unit: 'ft',
      doors: 0,
      windows: 0,
      coats: 1,
      bufferPercent: 0,
    });
    // 80 ft² ≈ 7.432 m²
    expect(wall.totalSurfaceAreaM2).toBeCloseTo(7.432, 2);
  });

  it('recommends optimal standard tin combinations with minimal waste', () => {
    const rec = recommendOptimalTins(6.2);
    expect(rec.totalLitres).toBeGreaterThanOrEqual(6.2);
    expect(rec.totalLitres).toBeLessThanOrEqual(7);
    expect(rec.items.length).toBeGreaterThan(0);

    const rec5 = recommendOptimalTins(4.8);
    expect(rec5.items).toEqual([{ sizeLitres: 5, count: 1 }]);
    expect(rec5.leftoverLitres).toBeCloseTo(0.2, 2);
  });
});
