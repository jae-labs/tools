import { describe, expect, it } from 'vitest';
import {
  MAX_PORTS_PER_SCAN,
  formatPortExpression,
  parsePortExpression,
} from '../src/shared/ports.ts';

describe('Port range expression parser', () => {
  it('parses single ports, ranges, and combinations like 1,2,5-20', () => {
    const res = parsePortExpression('1,2,5-20');
    expect(res.error).toBeUndefined();
    expect(res.ports).toEqual([1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('deduplicates overlapping ports and ranges while preserving order', () => {
    const res = parsePortExpression('80, 443, 79-81, 443');
    expect(res.error).toBeUndefined();
    expect(res.ports).toEqual([80, 443, 79, 81]);
  });

  it('rejects reversed ranges, out-of-range ports, and oversized scans', () => {
    expect(parsePortExpression('20-5').error).toMatch(/greater than end/i);
    expect(parsePortExpression('0,80').error).toMatch(/between 1 and 65535/i);
    expect(parsePortExpression('70000').error).toMatch(/between 1 and 65535/i);
    expect(parsePortExpression('abc').error).toMatch(/invalid port/i);
    expect(parsePortExpression(`1-${MAX_PORTS_PER_SCAN + 1}`).error).toMatch(/max/i);
  });

  it('formats consecutive ports compactly into ranges', () => {
    expect(formatPortExpression([80, 1, 2, 5, 6, 7, 8, 443])).toBe('1, 2, 5-8, 80, 443');
  });
});
