export type FilingStatus = 'single' | 'marriedJoint' | 'marriedSeparate';

export interface TaxInputs {
  employmentIncome: number;
  bonus: number;
  taxableBenefits: number;
  stockGains: number;
  otherIncome: number;
  rentalIncome: number;
  age: number;
  partnerAge: number;
  numberOfChildren: number;
  pensionContribution: number;
  partnerPensionContribution: number;
  filingStatus: FilingStatus;
  partnerEmploymentIncome: number;
  partnerPaye: boolean;
  payeWorker: boolean;
  selfEmployed: boolean;
}

export interface UscBandRow {
  label: string;
  rate: number;
  amount: number;
}

export interface TaxResult {
  cashIncome: number;
  taxableIncome: number;
  pensionReliefEligible: number;
  partnerPensionReliefEligible: number;
  incomeTaxBeforeCredits: number;
  taxCredits: number;
  incomeTax: number;
  prsi: number;
  usc: number;
  cgt: number;
  totalTax: number;
  annualNetPay: number;
  effectiveRate: number;
  standardBand: number;
  standardRateTax: number;
  higherRateTax: number;
  uscBands: UscBandRow[];
}

export interface ContractorInputs {
  dailyRate: number;
  billableDays: number;
  umbrellaFeeMonthly: number;
  accountancy: number;
  insurance: number;
  health: number;
  pension: number;
  matchPermanentPackage: boolean;
}

export interface ContractComparisonResult {
  revenue: number;
  partnerIncome: number;
  permanentNet: number;
  permanentIncome: number;
  permanentDeductionRate: number;
  umbrellaGrossSalary: number;
  umbrellaNet: number;
  umbrellaDeductionRate: number;
  directorGrossSalary: number;
  limitedCompanyNet: number;
  limitedCompanyDeductionRate: number;
}

const clampMoney = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0);

export function pensionReliefRate(age: number): number {
  if (age < 30) return 0.15;
  if (age < 40) return 0.2;
  if (age < 50) return 0.25;
  if (age < 55) return 0.3;
  if (age < 60) return 0.35;
  return 0.4;
}

function uscForIncome(income: number): { total: number; rows: UscBandRow[] } {
  const bands: Array<[number, number, string]> = [
    [12_012, 0.005, '€0–€12,012'],
    [28_700, 0.02, '€12,012–€28,700'],
    [70_044, 0.03, '€28,700–€70,044'],
    [Number.POSITIVE_INFINITY, 0.08, 'Over €70,044'],
  ];
  const rows = bands.map(([limit, rate, label], index) => {
    const previous = index === 0 ? 0 : bands[index - 1][0];
    const amount = Math.max(0, Math.min(income, limit) - previous) * rate;
    return { label, rate, amount };
  });
  return { total: rows.reduce((sum, row) => sum + row.amount, 0), rows };
}

/**
 * Transparent annual Irish PAYE estimate using announced 2026 headline rates.
 */
export function calculateIrishTax2026(raw: TaxInputs): TaxResult {
  const employment = clampMoney(raw.employmentIncome);
  const bonus = clampMoney(raw.bonus);
  const benefits = clampMoney(raw.taxableBenefits);
  const stockGains = clampMoney(raw.stockGains);
  const otherIncome = clampMoney(raw.otherIncome);
  const rentalIncome = clampMoney(raw.rentalIncome);
  const partnerIncome = raw.filingStatus === 'marriedJoint' ? clampMoney(raw.partnerEmploymentIncome) : 0;
  const partnerPensionContribution =
    raw.filingStatus === 'marriedJoint' ? clampMoney(raw.partnerPensionContribution) : 0;

  const payeIncome = employment + bonus;
  const taxableGross = payeIncome + benefits + otherIncome + rentalIncome + partnerIncome;
  const reliefLimit = Math.min(115_000, payeIncome) * pensionReliefRate(raw.age);
  const pensionReliefEligible = Math.min(clampMoney(raw.pensionContribution), reliefLimit);
  const partnerReliefLimit = Math.min(115_000, partnerIncome) * pensionReliefRate(raw.partnerAge);
  const partnerPensionReliefEligible = Math.min(partnerPensionContribution, partnerReliefLimit);

  const taxableIncome = Math.max(0, taxableGross - pensionReliefEligible - partnerPensionReliefEligible);
  const partnerBandTransfer = raw.filingStatus === 'marriedJoint' ? Math.min(35_000, partnerIncome) : 0;
  const standardBand = raw.filingStatus === 'single' ? 44_000 : 53_000 + partnerBandTransfer;
  const standardRateTax = Math.min(taxableIncome, standardBand) * 0.2;
  const higherRateTax = Math.max(0, taxableIncome - standardBand) * 0.4;
  const incomeTaxBeforeCredits = standardRateTax + higherRateTax;

  const personalCredit = raw.filingStatus === 'single' ? 2_000 : 4_000;
  const employeeCredit =
    (raw.payeWorker && !raw.selfEmployed ? 2_000 : 0) +
    (raw.filingStatus === 'marriedJoint' && raw.partnerPaye && partnerIncome > 0 ? 2_000 : 0);
  const taxCredits = personalCredit + employeeCredit;
  const incomeTax = Math.max(0, incomeTaxBeforeCredits - taxCredits);

  const primaryUscIncome = payeIncome + benefits + otherIncome + rentalIncome;
  const primaryUsc = uscForIncome(primaryUscIncome);
  const partnerUsc = uscForIncome(partnerIncome);

  // Annual blend of 4.20% Jan–Sep and 4.35% Oct–Dec for a standard Class A PAYE employee.
  const prsi = raw.selfEmployed
    ? (payeIncome + otherIncome + rentalIncome) * 0.042375
    : (payeIncome + benefits) * 0.042375 + partnerIncome * 0.042375;

  const cgt = Math.max(0, stockGains - 1_270) * 0.33;
  const totalTax = incomeTax + prsi + primaryUsc.total + partnerUsc.total + cgt;
  const cashIncome = payeIncome + otherIncome + rentalIncome + partnerIncome + stockGains;
  const totalPension = clampMoney(raw.pensionContribution) + partnerPensionContribution;
  const annualNetPay = Math.max(0, cashIncome - totalTax - totalPension);

  return {
    cashIncome,
    taxableIncome,
    pensionReliefEligible,
    partnerPensionReliefEligible,
    incomeTaxBeforeCredits,
    taxCredits,
    incomeTax,
    prsi,
    usc: primaryUsc.total + partnerUsc.total,
    cgt,
    totalTax,
    annualNetPay,
    effectiveRate: cashIncome > 0 ? (totalTax + totalPension) / cashIncome : 0,
    standardBand,
    standardRateTax,
    higherRateTax,
    uscBands: primaryUsc.rows,
  };
}

export function calculateContractComparison(
  taxInputs: TaxInputs,
  permanentResult: TaxResult,
  rawContract: ContractorInputs,
): ContractComparisonResult {
  const dailyRate = clampMoney(rawContract.dailyRate);
  const billableDays = Math.min(365, Math.max(0, Math.round(rawContract.billableDays)));
  const umbrellaFeeMonthly = clampMoney(rawContract.umbrellaFeeMonthly);
  const accountancy = clampMoney(rawContract.accountancy);
  const insurance = clampMoney(rawContract.insurance);
  const contractorHealth = rawContract.matchPermanentPackage
    ? clampMoney(taxInputs.taxableBenefits)
    : clampMoney(rawContract.health);
  const contractorPension = rawContract.matchPermanentPackage
    ? clampMoney(taxInputs.pensionContribution)
    : clampMoney(rawContract.pension);

  const partnerIncome =
    taxInputs.filingStatus === 'marriedJoint' ? clampMoney(taxInputs.partnerEmploymentIncome) : 0;
  const revenue = dailyRate * billableDays;
  const sharedCosts = accountancy + insurance + contractorHealth + contractorPension;

  const umbrellaAssignmentBudget = Math.max(
    0,
    revenue - umbrellaFeeMonthly * 12 - contractorHealth - contractorPension,
  );
  // Employer PRSI (11.25%) funded out of assignment rate before worker gross pay.
  const umbrellaGrossSalary = umbrellaAssignmentBudget / 1.1125;
  const umbrellaNet = calculateIrishTax2026({
    ...taxInputs,
    employmentIncome: umbrellaGrossSalary,
    bonus: 0,
    taxableBenefits: 0,
    otherIncome: 0,
    rentalIncome: 0,
    stockGains: 0,
    pensionContribution: 0,
  }).annualNetPay;

  const directorGrossSalary = Math.max(0, (revenue - sharedCosts) / 1.1125);
  const limitedCompanyNet = calculateIrishTax2026({
    ...taxInputs,
    employmentIncome: directorGrossSalary,
    bonus: 0,
    taxableBenefits: 0,
    otherIncome: 0,
    rentalIncome: 0,
    stockGains: 0,
    pensionContribution: 0,
  }).annualNetPay;

  const permanentIncome = permanentResult.cashIncome;
  const permanentNet = permanentResult.annualNetPay;
  const totalContractGross = revenue + partnerIncome;

  return {
    revenue,
    partnerIncome,
    permanentNet,
    permanentIncome,
    permanentDeductionRate: permanentIncome > 0 ? 1 - permanentNet / permanentIncome : 0,
    umbrellaGrossSalary,
    umbrellaNet,
    umbrellaDeductionRate: totalContractGross > 0 ? 1 - umbrellaNet / totalContractGross : 0,
    directorGrossSalary,
    limitedCompanyNet,
    limitedCompanyDeductionRate: totalContractGross > 0 ? 1 - limitedCompanyNet / totalContractGross : 0,
  };
}

export const DEFAULT_TAX_INPUTS: TaxInputs = {
  employmentIncome: 72_000,
  bonus: 0,
  taxableBenefits: 0,
  stockGains: 0,
  otherIncome: 0,
  rentalIncome: 0,
  age: 35,
  partnerAge: 35,
  numberOfChildren: 0,
  pensionContribution: 0,
  partnerPensionContribution: 0,
  filingStatus: 'single',
  partnerEmploymentIncome: 0,
  partnerPaye: true,
  payeWorker: true,
  selfEmployed: false,
};

export const DEFAULT_CONTRACTOR_INPUTS: ContractorInputs = {
  dailyRate: 500,
  billableDays: 220,
  umbrellaFeeMonthly: 125,
  accountancy: 2_000,
  insurance: 1_500,
  health: 1_200,
  pension: 0,
  matchPermanentPackage: false,
};
