import { describe, expect, it } from 'vitest';
import { fuzzyScoreText, scoreFuzzyCandidate } from '../src/shared/fuzzy.ts';

describe('Fuzzy search scoring', () => {
  it('ranks exact and prefix matches above loose subsequences', () => {
    const exact = fuzzyScoreText('dns', 'DNS');
    const prefix = fuzzyScoreText('dns', 'DNS Lookup');
    const subseq = fuzzyScoreText('jsbr', 'JSON Browser');
    const miss = fuzzyScoreText('xyz', 'JSON Browser');

    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(subseq);
    expect(subseq).toBeGreaterThan(0);
    expect(miss).toBe(0);
  });

  it('matches multi-word queries across primary and secondary fields', () => {
    const score = scoreFuzzyCandidate('irish tax', {
      primary: 'Irish Salary Calculator',
      secondary: ['Calculators', 'paye', 'usc', 'tax'],
    });
    expect(score).toBeGreaterThan(0);

    const noMatch = scoreFuzzyCandidate('irish regex', {
      primary: 'Irish Salary Calculator',
      secondary: ['Calculators', 'paye', 'usc', 'tax'],
    });
    expect(noMatch).toBe(0);
  });
});
