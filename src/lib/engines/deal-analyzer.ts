// ============================================================
// CCC Platform - Deal Analyzer Engine
// Core financial analysis engine that computes multiples,
// margins, DSCR, projections, IRR, grading, and strategy.
// ============================================================

import type {
  DealGrade,
  DealAnalyzerResult,
  YearProjection,
  StrategyTier,
} from '@/types';

// ---- Input / Output Contracts ----

export interface DealInput {
  askingPrice: number;
  realEstateValue: number;
  revenueYear1: number;
  revenueYear2: number | null;
  revenueYear3: number | null;
  cogsYear1: number | null;
  cogsYear2: number | null;
  cogsYear3: number | null;
  sdeYear1: number;
  sdeYear2: number | null;
  sdeYear3: number | null;
  ownerSalary: number | null;
  operatingExpenses: number | null;
  employeesW2: number | null;
  employees1099: number | null;
  ownerHoursPerWeek: number | null;
  monthlyRent: number | null;
  realEstateIncluded: boolean;
}

/** The subset of DealAnalyzerResult that this engine produces (excludes DB fields). */
export type DealAnalyzerOutput = Omit<DealAnalyzerResult, 'id' | 'dealId'>;

// ---- DSCR Scenario Parameters ----

interface DscrScenarioParams {
  label: string;
  downPct: number;
  annualRate: number;
  termYears: number;
}

const SCENARIO_1: DscrScenarioParams = {
  label: 'Scenario 1 (10% down)',
  downPct: 0.10,
  annualRate: 0.105,
  termYears: 10,
};

const SCENARIO_2: DscrScenarioParams = {
  label: 'Scenario 2 (5% down)',
  downPct: 0.05,
  annualRate: 0.105,
  termYears: 10,
};

// ---- Grade Thresholds ----

interface GradeThresholds {
  dscr: number;
  multiple: number;
  sdeMargin: number;
  cashFlow: number;
}

const GRADE_THRESHOLDS: Record<DealGrade, GradeThresholds> = {
  A: { dscr: 1.80, multiple: 3.5, sdeMargin: 0.12, cashFlow: 300_000 },
  B: { dscr: 1.50, multiple: 4.5, sdeMargin: 0.10, cashFlow: 200_000 },
  C: { dscr: 1.25, multiple: 5.5, sdeMargin: 0.08, cashFlow: 150_000 },
  D: { dscr: 1.00, multiple: 6.5, sdeMargin: 0.05, cashFlow: 100_000 },
  F: { dscr: -Infinity, multiple: Infinity, sdeMargin: -Infinity, cashFlow: -Infinity },
};

// Ordered from best to worst for iteration
const GRADE_ORDER: DealGrade[] = ['A', 'B', 'C', 'D', 'F'];

// ---- Projection Defaults ----

const DEFAULT_GROWTH_RATE = 0.05;
const DEFAULT_EXIT_MULTIPLE = 3.5;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future discounted CF analysis
const DEFAULT_DISCOUNT_RATE = 0.15;

// ---- Working Capital Defaults ----

const BANK_MIN_DSCR = 1.25;
const WC_RATE = 0.08;
const WC_TERM = 5;

// ---- IRR Solver Parameters ----

const IRR_MAX_ITERATIONS = 200;
const IRR_TOLERANCE = 1e-10;
const IRR_INITIAL_GUESS = 0.15;

// ============================================================
// Utility Helpers
// ============================================================

/**
 * Compute the fixed monthly payment on an amortizing loan.
 * Uses the standard annuity formula:
 *   M = P * r(1+r)^n / ((1+r)^n - 1)
 * where r = monthly rate, n = total months.
 */
function computeMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number,
): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  const compounded = Math.pow(1 + r, n);
  return principal * (r * compounded) / (compounded - 1);
}

/**
 * Compute remaining loan balance after `periodsElapsed` monthly payments.
 * Balance = P * [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
 * where n = total periods, p = periods elapsed.
 */
function computeRemainingBalance(
  principal: number,
  annualRate: number,
  termYears: number,
  yearsElapsed: number,
): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = termYears * 12;
  const p = yearsElapsed * 12;
  if (r === 0) return principal * (1 - p / n);
  const compoundedN = Math.pow(1 + r, n);
  const compoundedP = Math.pow(1 + r, p);
  return principal * (compoundedN - compoundedP) / (compoundedN - 1);
}

/**
 * Compute YoY growth rate: (newer - older) / older.
 * Returns null if either input is null or the denominator is zero.
 */
function yoyGrowth(newer: number | null, older: number | null): number | null {
  if (newer === null || older === null || older === 0) return null;
  return (newer - older) / older;
}

/**
 * Compute margin: (numerator) / denominator.
 * Returns null if either input is null or denominator is zero.
 */
function safeMargin(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return numerator / denominator;
}

/**
 * Compute the NPV of a series of cash flows at a given discount rate.
 * cashFlows[0] = year 0 (not discounted), cashFlows[1] = year 1, etc.
 */
function computeNpv(rate: number, cashFlows: number[]): number {
  let npv = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    npv += cashFlows[i] / Math.pow(1 + rate, i);
  }
  return npv;
}

/**
 * Compute the derivative of NPV with respect to rate.
 * d(NPV)/dr = sum of -i * CF_i / (1+r)^(i+1)
 */
function computeNpvDerivative(rate: number, cashFlows: number[]): number {
  let deriv = 0;
  for (let i = 1; i < cashFlows.length; i++) {
    deriv -= i * cashFlows[i] / Math.pow(1 + rate, i + 1);
  }
  return deriv;
}

/**
 * Solve for IRR using Newton's method.
 * Returns null if convergence is not achieved.
 */
function solveIrr(cashFlows: number[]): number | null {
  // Quick sanity: need at least 2 cash flows, and at least one sign change
  if (cashFlows.length < 2) return null;

  let rate = IRR_INITIAL_GUESS;

  for (let i = 0; i < IRR_MAX_ITERATIONS; i++) {
    const npv = computeNpv(rate, cashFlows);
    const deriv = computeNpvDerivative(rate, cashFlows);

    if (Math.abs(deriv) < 1e-14) {
      // Derivative too small; try a perturbation to escape flat region
      rate += 0.01;
      continue;
    }

    const newRate = rate - npv / deriv;

    // Guard against divergence to absurd values
    if (newRate < -0.99) {
      rate = -0.99;
      continue;
    }
    if (newRate > 100) {
      rate = 100;
      continue;
    }

    if (Math.abs(newRate - rate) < IRR_TOLERANCE) {
      return newRate;
    }

    rate = newRate;
  }

  // Fallback: bisection method if Newton fails
  return solveIrrBisection(cashFlows);
}

/**
 * Fallback IRR solver using bisection method.
 * Searches between -50% and 1000%.
 */
function solveIrrBisection(cashFlows: number[]): number | null {
  let lo = -0.50;
  let hi = 10.0;

  let npvLo = computeNpv(lo, cashFlows);
  const npvHi = computeNpv(hi, cashFlows);

  // If no sign change exists in this range, IRR is undefined
  if (npvLo * npvHi > 0) return null;

  for (let i = 0; i < 1000; i++) {
    const mid = (lo + hi) / 2;
    const npvMid = computeNpv(mid, cashFlows);

    if (Math.abs(npvMid) < IRR_TOLERANCE || (hi - lo) / 2 < IRR_TOLERANCE) {
      return mid;
    }

    if (npvLo * npvMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      npvLo = npvMid;
    }
  }

  return null;
}

/**
 * Present value of an annuity: PMT * [1 - (1+r)^(-n)] / r
 */
function pvAnnuity(annualPayment: number, rate: number, years: number): number {
  if (rate === 0) return annualPayment * years;
  return annualPayment * (1 - Math.pow(1 + rate, -years)) / rate;
}

/**
 * Round to 4 decimal places for percentage-type values.
 */
function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * Round to 2 decimal places for currency-type values.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Apply rounding to a nullable number.
 */
function roundNullable(value: number | null, decimals: 2 | 4): number | null {
  if (value === null) return null;
  return decimals === 2 ? round2(value) : round4(value);
}

// ============================================================
// Grade Logic
// ============================================================

type MetricName = 'dscr' | 'multiple' | 'sdeMargin' | 'cashFlow';

const METRIC_LABELS: Record<MetricName, string> = {
  dscr: 'DSCR',
  multiple: 'Asking Multiple',
  sdeMargin: 'SDE Margin',
  cashFlow: 'Cash Flow (SDE - Debt Service)',
};

/**
 * Determine the grade for a single metric.
 * For DSCR, SDE Margin, and Cash Flow: higher is better (value >= threshold).
 * For Multiple: lower is better (value <= threshold).
 */
function gradeMetric(metric: MetricName, value: number): DealGrade {
  for (const grade of GRADE_ORDER) {
    if (grade === 'F') return 'F';
    const t = GRADE_THRESHOLDS[grade];
    if (metric === 'multiple') {
      if (value <= t.multiple) return grade;
    } else {
      if (value >= t[metric]) return grade;
    }
  }
  return 'F';
}

/**
 * Determine the overall deal grade (lowest across all metrics)
 * and produce a human-readable explanation.
 */
function computeGrade(
  dscr: number | null,
  askingMultiple: number | null,
  sdeMarginYear1: number | null,
  cashFlow: number | null,
): { grade: DealGrade | null; explanation: string | null } {
  // All four metrics must be available to assign a grade
  if (dscr === null || askingMultiple === null || sdeMarginYear1 === null || cashFlow === null) {
    return { grade: null, explanation: null };
  }

  const metricGrades: { metric: MetricName; value: number; grade: DealGrade }[] = [
    { metric: 'dscr', value: dscr, grade: gradeMetric('dscr', dscr) },
    { metric: 'multiple', value: askingMultiple, grade: gradeMetric('multiple', askingMultiple) },
    { metric: 'sdeMargin', value: sdeMarginYear1, grade: gradeMetric('sdeMargin', sdeMarginYear1) },
    { metric: 'cashFlow', value: cashFlow, grade: gradeMetric('cashFlow', cashFlow) },
  ];

  // Overall grade = worst (highest index in GRADE_ORDER) across all metrics
  let worstIdx = 0;
  for (const mg of metricGrades) {
    const idx = GRADE_ORDER.indexOf(mg.grade);
    if (idx > worstIdx) worstIdx = idx;
  }
  const overallGrade = GRADE_ORDER[worstIdx];

  // Find which metric(s) are the limiting factor (i.e. match the overall grade)
  const limitingMetrics = metricGrades.filter(
    (mg) => GRADE_ORDER.indexOf(mg.grade) === worstIdx,
  );

  // Build explanation
  const parts: string[] = [];
  parts.push(`Overall Grade: ${overallGrade}.`);

  // Per-metric breakdown
  for (const mg of metricGrades) {
    const formattedValue =
      mg.metric === 'dscr'
        ? mg.value.toFixed(2) + 'x'
        : mg.metric === 'multiple'
          ? mg.value.toFixed(2) + 'x'
          : mg.metric === 'sdeMargin'
            ? (mg.value * 100).toFixed(1) + '%'
            : '$' + Math.round(mg.value).toLocaleString('en-US');
    parts.push(`  ${METRIC_LABELS[mg.metric]}: ${formattedValue} (Grade ${mg.grade})`);
  }

  // Explain what is needed for next grade up
  if (overallGrade !== 'A') {
    const nextGradeIdx = worstIdx - 1;
    const nextGrade = GRADE_ORDER[nextGradeIdx];
    const nextThresholds = GRADE_THRESHOLDS[nextGrade];

    parts.push('');
    parts.push(`Limiting factor${limitingMetrics.length > 1 ? 's' : ''}:`);

    for (const lm of limitingMetrics) {
      const threshold = nextThresholds[lm.metric];
      if (lm.metric === 'dscr') {
        parts.push(
          `  ${METRIC_LABELS[lm.metric]} needs to reach ${threshold.toFixed(2)}x for Grade ${nextGrade}.`,
        );
      } else if (lm.metric === 'multiple') {
        parts.push(
          `  ${METRIC_LABELS[lm.metric]} needs to be at or below ${threshold.toFixed(2)}x for Grade ${nextGrade}.`,
        );
      } else if (lm.metric === 'sdeMargin') {
        parts.push(
          `  ${METRIC_LABELS[lm.metric]} needs to reach ${(threshold * 100).toFixed(1)}% for Grade ${nextGrade}.`,
        );
      } else {
        parts.push(
          `  ${METRIC_LABELS[lm.metric]} needs to reach $${Math.round(threshold).toLocaleString('en-US')} for Grade ${nextGrade}.`,
        );
      }
    }
  } else {
    parts.push('');
    parts.push('All metrics meet the highest grade thresholds.');
  }

  return { grade: overallGrade, explanation: parts.join('\n') };
}

// ============================================================
// Strategy Ladder
// ============================================================

/**
 * Build the 4-tier strategy ladder: Anchor, Target, Ceiling, Walk-Away.
 * Each tier adjusts the offer price and deal structure relative to the
 * standalone business price, SDE, and DSCR parameters.
 */
function buildStrategyLadder(
  standaloneBusPrice: number,
  sdeYear1: number,
  annualDebtServiceS1: number,
  dscrFloor: number,
): StrategyTier[] {
  // Anchor: aggressive offer at 70% of asking
  // Target: fair value at 85% of asking
  // Ceiling: maximum acceptable at 95% of asking
  // Walk-Away: the asking price itself (buyer's absolute ceiling)
  const tiers: { tier: string; label: string; pricePct: number; downPct: number; sellerFinPct: number; earnOutPct: number; notes: string }[] = [
    {
      tier: '1',
      label: 'Anchor (Aggressive)',
      pricePct: 0.70,
      downPct: 0.05,
      sellerFinPct: 0.20,
      earnOutPct: 0.15,
      notes: 'Open low to create negotiation room. Emphasize risk factors and required improvements. Propose seller financing with performance-linked earnout to align incentives.',
    },
    {
      tier: '2',
      label: 'Target',
      pricePct: 0.85,
      downPct: 0.10,
      sellerFinPct: 0.15,
      earnOutPct: 0.10,
      notes: 'Primary target price reflecting fair market value with buyer risk premium. Moderate seller note with standard earnout. Most probable close point.',
    },
    {
      tier: '3',
      label: 'Ceiling',
      pricePct: 0.95,
      downPct: 0.10,
      sellerFinPct: 0.10,
      earnOutPct: 0.05,
      notes: 'Maximum price with minimal creative structuring. Only acceptable if seller provides robust transition support, non-compete, and favorable lease terms.',
    },
    {
      tier: '4',
      label: 'Walk-Away',
      pricePct: 1.00,
      downPct: 0.10,
      sellerFinPct: 0.0,
      earnOutPct: 0.0,
      notes: 'Full asking price with standard SBA terms. If deal cannot close at or below this tier, walk away. DSCR and cash flow must still meet minimum thresholds.',
    },
  ];

  return tiers.map((t) => {
    const price = round2(standaloneBusPrice * t.pricePct);
    const downPayment = round2(price * t.downPct);
    const sellerFinancing = round2(price * t.sellerFinPct);
    const earnOut = round2(price * t.earnOutPct);
    const sbaLoan = price - downPayment - sellerFinancing - earnOut;
    const totalSources = round2(downPayment + sellerFinancing + earnOut + sbaLoan);

    // Compute DSCR for the SBA loan portion at scenario 1 rates
    const sbaMonthly = computeMonthlyPayment(sbaLoan, SCENARIO_1.annualRate, SCENARIO_1.termYears);
    // Seller financing: assume 5% interest, 5-year term for simplicity
    const sellerMonthly = computeMonthlyPayment(sellerFinancing, 0.05, 5);
    const totalAnnualDebtService = (sbaMonthly + sellerMonthly) * 12;
    const tierDscr = totalAnnualDebtService > 0
      ? round4(sdeYear1 / totalAnnualDebtService)
      : 0;

    return {
      tier: t.tier,
      label: t.label,
      price,
      downPayment,
      sellerFinancing,
      earnOut,
      totalSources,
      dscr: tierDscr,
      notes: t.notes,
    };
  });
}

// ============================================================
// Main Engine Function
// ============================================================

/**
 * Run the full Deal Analyzer engine.
 *
 * @param deal - The deal financial inputs.
 * @param dscrFloor - The member's personal DSCR floor from their buy box profile.
 * @returns A DealAnalyzerOutput containing all computed metrics.
 */
export function runDealAnalyzer(deal: DealInput, dscrFloor: number): DealAnalyzerOutput {
  const {
    askingPrice,
    realEstateValue,
    revenueYear1,
    revenueYear2,
    revenueYear3,
    cogsYear1,
    cogsYear2,
    cogsYear3,
    sdeYear1,
    sdeYear2,
    sdeYear3,
  } = deal;

  // ---- 1. Standalone Business Price ----

  const standaloneBusPrice = askingPrice - realEstateValue;

  // ---- 2. Multiples ----

  const askingMultiple = sdeYear1 !== 0
    ? round4(askingPrice / sdeYear1)
    : null;

  const standaloneMultiple = sdeYear1 !== 0
    ? round4(standaloneBusPrice / sdeYear1)
    : null;

  // ---- 3. Margins ----

  const grossMarginYear1 = computeGrossMargin(revenueYear1, cogsYear1);
  const grossMarginYear2 = computeGrossMargin(revenueYear2, cogsYear2);
  const grossMarginYear3 = computeGrossMargin(revenueYear3, cogsYear3);

  const sdeMarginYear1 = safeMargin(sdeYear1, revenueYear1);
  const sdeMarginYear2 = safeMargin(sdeYear2, revenueYear2);
  const sdeMarginYear3 = safeMargin(sdeYear3, revenueYear3);

  // ---- 4. YoY Growth ----

  const revenueGrowthYoy1 = yoyGrowth(revenueYear1, revenueYear2);
  const revenueGrowthYoy2 = yoyGrowth(revenueYear2, revenueYear3);
  const sdeGrowthYoy1 = yoyGrowth(sdeYear1, sdeYear2);
  const sdeGrowthYoy2 = yoyGrowth(sdeYear2, sdeYear3);

  // ---- 5. DSCR Scenarios ----

  const s1 = computeDscrScenario(standaloneBusPrice, sdeYear1, SCENARIO_1);
  const s2 = computeDscrScenario(standaloneBusPrice, sdeYear1, SCENARIO_2);

  const dscrScenario1 = s1.dscr;
  const dscrScenario2 = s2.dscr;
  const annualDebtServiceS1 = s1.annualDebtService;
  const annualDebtServiceS2 = s2.annualDebtService;
  const downPaymentS1 = s1.downPayment;
  const loanAmountS1 = s1.loanAmount;

  // ---- 6. Working Capital from DSCR Spread ----

  const workingCapitalFromSpread = computeWorkingCapital(sdeYear1, dscrFloor);

  // ---- 7. Deal Grade ----

  const cashFlowForGrade = annualDebtServiceS1 !== null
    ? round2(sdeYear1 - annualDebtServiceS1)
    : null;

  const { grade: dealGrade, explanation: gradeExplanation } = computeGrade(
    dscrScenario1,
    askingMultiple,
    sdeMarginYear1 !== null ? round4(sdeMarginYear1) : null,
    cashFlowForGrade,
  );

  // ---- 8. 5-Year Projections ----

  const projections = annualDebtServiceS1 !== null
    ? buildProjections(revenueYear1, sdeYear1, annualDebtServiceS1)
    : null;

  // ---- 9. Exit Value & IRR ----

  let exitValue: number | null = null;
  let irr: number | null = null;

  if (projections !== null && downPaymentS1 !== null && loanAmountS1 !== null && annualDebtServiceS1 !== null) {
    const sdeYear5 = projections[4].sde;
    exitValue = round2(sdeYear5 * DEFAULT_EXIT_MULTIPLE);

    const remainingBalance = round2(
      computeRemainingBalance(loanAmountS1, SCENARIO_1.annualRate, SCENARIO_1.termYears, 5),
    );
    const netProceeds = exitValue - remainingBalance;

    // Build IRR cash flow series
    const irrCashFlows: number[] = [
      -downPaymentS1, // Year 0
    ];
    for (let i = 0; i < 4; i++) {
      irrCashFlows.push(projections[i].freeCashFlow); // Years 1-4
    }
    irrCashFlows.push(projections[4].freeCashFlow + netProceeds); // Year 5

    irr = solveIrr(irrCashFlows);
    if (irr !== null) {
      irr = round4(irr);
    }
  }

  // ---- 10. Strategy Ladder ----

  let strategyLadder: StrategyTier[] | null = null;
  if (annualDebtServiceS1 !== null) {
    strategyLadder = buildStrategyLadder(
      standaloneBusPrice,
      sdeYear1,
      annualDebtServiceS1,
      dscrFloor,
    );
  }

  // ---- Assemble Result ----

  return {
    askingMultiple: roundNullable(askingMultiple, 4),
    standaloneMultiple: roundNullable(standaloneMultiple, 4),
    grossMarginYear1: roundNullable(grossMarginYear1, 4),
    grossMarginYear2: roundNullable(grossMarginYear2, 4),
    grossMarginYear3: roundNullable(grossMarginYear3, 4),
    sdeMarginYear1: roundNullable(sdeMarginYear1, 4),
    sdeMarginYear2: roundNullable(sdeMarginYear2, 4),
    sdeMarginYear3: roundNullable(sdeMarginYear3, 4),
    revenueGrowthYoy1: roundNullable(revenueGrowthYoy1, 4),
    revenueGrowthYoy2: roundNullable(revenueGrowthYoy2, 4),
    sdeGrowthYoy1: roundNullable(sdeGrowthYoy1, 4),
    sdeGrowthYoy2: roundNullable(sdeGrowthYoy2, 4),
    dscrScenario1: roundNullable(dscrScenario1, 4),
    dscrScenario2: roundNullable(dscrScenario2, 4),
    annualDebtServiceS1: roundNullable(annualDebtServiceS1, 2),
    annualDebtServiceS2: roundNullable(annualDebtServiceS2, 2),
    workingCapitalFromSpread: roundNullable(workingCapitalFromSpread, 2),
    dealGrade,
    gradeExplanation,
    projections,
    exitValue,
    irr,
    dealStack: null, // Deal stack is populated by a separate engine / manual input
    creativeFinancing: null, // Populated downstream
    strategyLadder,
  };
}

// ============================================================
// Internal Computation Helpers
// ============================================================

/**
 * Compute gross margin: (revenue - cogs) / revenue.
 * Returns null if revenue or cogs is null, or revenue is zero.
 */
function computeGrossMargin(
  revenue: number | null,
  cogs: number | null,
): number | null {
  if (revenue === null || cogs === null || revenue === 0) return null;
  return (revenue - cogs) / revenue;
}

/**
 * Compute DSCR metrics for a given scenario.
 */
function computeDscrScenario(
  standaloneBusPrice: number,
  sdeYear1: number,
  scenario: DscrScenarioParams,
): {
  dscr: number | null;
  annualDebtService: number | null;
  downPayment: number | null;
  loanAmount: number | null;
} {
  if (standaloneBusPrice <= 0) {
    return { dscr: null, annualDebtService: null, downPayment: null, loanAmount: null };
  }

  const downPayment = round2(standaloneBusPrice * scenario.downPct);
  const loanAmount = round2(standaloneBusPrice - downPayment);
  const monthlyPayment = computeMonthlyPayment(loanAmount, scenario.annualRate, scenario.termYears);
  const annualDebtService = round2(monthlyPayment * 12);

  const dscr = annualDebtService > 0
    ? sdeYear1 / annualDebtService
    : null;

  return { dscr, annualDebtService, downPayment, loanAmount };
}

/**
 * Compute the working capital available from the spread between
 * the bank's minimum DSCR and the member's personal DSCR floor.
 */
function computeWorkingCapital(
  sdeYear1: number,
  dscrFloor: number,
): number | null {
  if (dscrFloor <= 0) return null;

  const maxDebtServiceBank = sdeYear1 / BANK_MIN_DSCR;
  const maxDebtServiceMember = sdeYear1 / dscrFloor;
  const annualSpread = maxDebtServiceBank - maxDebtServiceMember;

  // If the member's DSCR floor is lower than the bank's, the spread is negative
  // (i.e. the member is more aggressive than the bank) — return 0 in that case
  if (annualSpread <= 0) return 0;

  return round2(pvAnnuity(annualSpread, WC_RATE, WC_TERM));
}

/**
 * Build the 5-year projection table.
 */
function buildProjections(
  revenueYear1: number,
  sdeYear1: number,
  annualDebtServiceS1: number,
): YearProjection[] {
  const projections: YearProjection[] = [];
  let cumulativeCashFlow = 0;

  for (let n = 1; n <= 5; n++) {
    const growthFactor = Math.pow(1 + DEFAULT_GROWTH_RATE, n - 1);
    const revenue = round2(revenueYear1 * growthFactor);
    const sde = round2(sdeYear1 * growthFactor);
    const freeCashFlow = round2(sde - annualDebtServiceS1);
    cumulativeCashFlow = round2(cumulativeCashFlow + freeCashFlow);

    projections.push({
      year: n,
      revenue,
      sde,
      annualDebtService: annualDebtServiceS1,
      freeCashFlow,
      cumulativeCashFlow,
    });
  }

  return projections;
}
