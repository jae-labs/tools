import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTRACTOR_INPUTS,
  DEFAULT_TAX_INPUTS,
  calculateContractComparison,
  calculateIrishTax2026,
} from '../src/shared/irishtax.ts';

describe('calculateIrishTax2026', () => {
  it('applies the 2026 single income tax band and PAYE credits', () => {
    const result = calculateIrishTax2026({ ...DEFAULT_TAX_INPUTS, employmentIncome: 44_000 });
    expect(result.standardRateTax).toBe(8_800);
    expect(result.higherRateTax).toBe(0);
    expect(result.incomeTax).toBe(4_800);
  });

  it('adds a jointly assessed spouse band transfer only up to €35,000', () => {
    const result = calculateIrishTax2026({
      ...DEFAULT_TAX_INPUTS,
      filingStatus: 'marriedJoint',
      employmentIncome: 70_000,
      partnerEmploymentIncome: 50_000,
    });
    expect(result.standardBand).toBe(88_000);
  });

  it('caps pension relief at the age-related earnings limit', () => {
    const result = calculateIrishTax2026({
      ...DEFAULT_TAX_INPUTS,
      age: 35,
      employmentIncome: 100_000,
      pensionContribution: 50_000,
    });
    expect(result.pensionReliefEligible).toBe(20_000);
  });

  it('applies joint-assessment partner pension against partner age and earnings limit', () => {
    const result = calculateIrishTax2026({
      ...DEFAULT_TAX_INPUTS,
      filingStatus: 'marriedJoint',
      partnerEmploymentIncome: 100_000,
      partnerAge: 35,
      partnerPensionContribution: 50_000,
    });
    expect(result.partnerPensionReliefEligible).toBe(20_000);
    expect(result.annualNetPay).toBeLessThan(
      calculateIrishTax2026({
        ...DEFAULT_TAX_INPUTS,
        filingStatus: 'marriedJoint',
        partnerEmploymentIncome: 100_000,
      }).annualNetPay,
    );
  });

  it('computes contractor umbrella and limited company comparisons', () => {
    const perm = calculateIrishTax2026(DEFAULT_TAX_INPUTS);
    const cmp = calculateContractComparison(DEFAULT_TAX_INPUTS, perm, DEFAULT_CONTRACTOR_INPUTS);
    expect(cmp.revenue).toBe(110_000);
    expect(cmp.umbrellaNet).toBeGreaterThan(0);
    expect(cmp.limitedCompanyNet).toBeGreaterThan(0);
    expect(cmp.permanentNet).toBe(perm.annualNetPay);
  });
});
