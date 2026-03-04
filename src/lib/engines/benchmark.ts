// ---------------------------------------------------------------------------
// Benchmark Analysis Engine
// ---------------------------------------------------------------------------
// Performs deal screening, industry benchmark comparison, DSCR scenario
// modeling, and sensitivity analysis for acquisition deal evaluation.
// ---------------------------------------------------------------------------

// ---- Input Types ----------------------------------------------------------

export interface DealInput {
  askingPrice: number;
  realEstateValue: number;
  standaloneBusPrice: number;
  revenueYear1: number;
  revenueYear2: number | null;
  revenueYear3: number | null;
  cogsYear1: number | null;
  sdeYear1: number;
  sdeYear2: number | null;
  sdeYear3: number | null;
  operatingExpenses: number | null;
  yearsInBusiness: number | null;
  employeesW2: number | null;
  employees1099: number | null;
  ownerHoursPerWeek: number | null;
  customerConcentrationTopPct: number | null;
  recurringRevenuePct: number | null;
  realEstateIncluded: boolean;
  leaseTermRemainingMonths: number | null;
  leaseRenewalOptions: string | null;
  memberNotes: string | null;
  dscrScenario1: number;
  annualDebtServiceS1: number;
  grossMarginYear1: number | null;
  standaloneMultiple: number | null;
}

export interface MemberProfileInput {
  dscrFloor: number;
  minEmployeeCount: number;
  minYearsInBusiness: number;
  maxMultiple: number;
}

export interface IndustryBenchmarkInput {
  avgGrossMargin: number;
  avgNetMargin: number;
  avgSdeMargin: number;
  avgRevenuePerEmployee: number;
  avgMultiple: number;
  multipleRangeLow: number;
  multipleRangeHigh: number;
  avgGrowthRate: number;
  avgCustomerConcentration: number;
  avgRecurringRevenuePct: number;
}

// ---- Output Types ---------------------------------------------------------

export type TraitScore = 'PASS' | 'DISCUSS' | 'FAIL';
export type ScreeningVerdict = 'GO' | 'CONDITIONAL' | 'NO-GO';
export type BenchmarkComparisonStatus = 'Above' | 'Within' | 'Below';

export interface ScorecardTrait {
  trait: string;
  score: TraitScore;
  rationale: string;
}

export interface ScreeningResult {
  traits: ScorecardTrait[];
  summary: {
    passCount: number;
    discussCount: number;
    failCount: number;
  };
  verdict: ScreeningVerdict;
}

export interface BenchmarkComparison {
  name: string;
  dealValue: number | null;
  industryAvg: number;
  industryRange: [number, number] | null;
  status: BenchmarkComparisonStatus;
}

export interface DscrScenario {
  label: string;
  price: number;
  downPayment: number;
  downPaymentPct: number;
  loanAmount: number;
  interestRate: number;
  monthlyPayment: number;
  annualDebtService: number;
  dscr: number;
  meetsFloor: boolean;
}

export interface SensitivityCell {
  revenueGrowthLabel: string;
  marginLabel: string;
  adjustedRevenue: number;
  adjustedCogs: number;
  adjustedSde: number;
  adjustedDscr: number;
  adjustedCashFlow: number;
}

export interface SensitivityAnalysis {
  revenueGrowthScenarios: number[];
  marginScenarios: { label: string; margin: number }[];
  grid: SensitivityCell[][];
  keyInsights: string[];
}

export interface BenchmarkResult {
  screening: ScreeningResult;
  industryComparison: BenchmarkComparison[];
  dscrScenarios: DscrScenario[];
  sensitivityAnalysis: SensitivityAnalysis;
}

// ---- Helpers --------------------------------------------------------------

const DEFAULT_MEMBER_PROFILE: MemberProfileInput = {
  dscrFloor: 1.75,
  minEmployeeCount: 3,
  minYearsInBusiness: 5,
  maxMultiple: 4.0,
};

/** Standard 10-year amortization monthly payment (fully-amortizing). */
function calcMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number = 10,
): number {
  if (principal <= 0) return 0;
  if (annualRate <= 0) return principal / (termYears * 12);
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}

/** Round to 2 decimal places. */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Round to 4 decimal places (for ratios). */
function r4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Safely get a number or fall back to a default. */
function num(v: number | null | undefined, fallback: number = 0): number {
  return v != null && !Number.isNaN(v) ? v : fallback;
}

/** Percentage formatting helper (returns raw decimal for calculations). */
function pct(v: number | null | undefined, fallback: number = 0): number {
  return num(v, fallback);
}

/**
 * Detect whether the member notes indicate a management bench.
 * Looks for keywords like "manager", "management", "supervisor" that appear
 * in context with tenure-related words, or simply their presence as a
 * reasonable signal.
 */
function hasManagementBench(notes: string | null): boolean {
  if (!notes) return false;
  const lower = notes.toLowerCase();
  const managementKeywords = [
    'manager',
    'management',
    'supervisor',
    'team lead',
    'team leader',
    'director',
    'foreman',
    'operations lead',
    'general manager',
    'gm',
    'shift lead',
  ];
  const tenureKeywords = [
    'years',
    'yr',
    'tenure',
    'experience',
    'senior',
    'long-term',
    'longterm',
    'veteran',
    'seasoned',
  ];

  const hasMgmtKeyword = managementKeywords.some((kw) => lower.includes(kw));
  const hasTenureKeyword = tenureKeywords.some((kw) => lower.includes(kw));

  // Strong signal: both management and tenure references present
  // Moderate signal: management keyword alone is still meaningful
  return hasMgmtKeyword && hasTenureKeyword ? true : hasMgmtKeyword;
}

// ---- 1. Deal Screening Scorecard ------------------------------------------

function scoreDscr(
  deal: DealInput,
  member: MemberProfileInput,
): ScorecardTrait {
  const dscr = deal.dscrScenario1;
  const floor = member.dscrFloor;

  if (dscr >= floor) {
    return {
      trait: 'DSCR',
      score: 'PASS',
      rationale: `DSCR of ${r2(dscr)} meets or exceeds floor of ${r2(floor)}.`,
    };
  }
  if (dscr >= 1.25) {
    return {
      trait: 'DSCR',
      score: 'DISCUSS',
      rationale: `DSCR of ${r2(dscr)} is above 1.25 but below floor of ${r2(floor)}.`,
    };
  }
  return {
    trait: 'DSCR',
    score: 'FAIL',
    rationale: `DSCR of ${r2(dscr)} is below the minimum threshold of 1.25.`,
  };
}

function scoreRevenueTrend(deal: DealInput): ScorecardTrait {
  if (deal.revenueYear2 == null) {
    return {
      trait: 'Revenue Trend',
      score: 'DISCUSS',
      rationale: 'Prior year revenue data unavailable for trend analysis.',
    };
  }
  const y1 = deal.revenueYear1;
  const y2 = deal.revenueYear2;
  if (y2 === 0) {
    return {
      trait: 'Revenue Trend',
      score: 'DISCUSS',
      rationale: 'Prior year revenue is zero; trend cannot be calculated.',
    };
  }
  const changePct = (y1 - y2) / Math.abs(y2);

  if (y1 > y2) {
    return {
      trait: 'Revenue Trend',
      score: 'PASS',
      rationale: `Revenue grew ${r2(changePct * 100)}% year-over-year ($${y2.toLocaleString()} to $${y1.toLocaleString()}).`,
    };
  }
  if (changePct >= -0.02) {
    return {
      trait: 'Revenue Trend',
      score: 'DISCUSS',
      rationale: `Revenue is essentially flat (${r2(changePct * 100)}% change YoY).`,
    };
  }
  return {
    trait: 'Revenue Trend',
    score: 'FAIL',
    rationale: `Revenue declined ${r2(Math.abs(changePct) * 100)}% year-over-year.`,
  };
}

function scoreGrossMargin(
  deal: DealInput,
  benchmark: IndustryBenchmarkInput,
): ScorecardTrait {
  const gm = deal.grossMarginYear1;
  if (gm == null) {
    return {
      trait: 'Gross Margin',
      score: 'DISCUSS',
      rationale: 'Gross margin data not available.',
    };
  }
  const industryAvg = benchmark.avgGrossMargin;

  if (gm >= industryAvg) {
    return {
      trait: 'Gross Margin',
      score: 'PASS',
      rationale: `Gross margin of ${r2(gm * 100)}% meets or exceeds industry average of ${r2(industryAvg * 100)}%.`,
    };
  }
  if (gm >= industryAvg * 0.75) {
    return {
      trait: 'Gross Margin',
      score: 'DISCUSS',
      rationale: `Gross margin of ${r2(gm * 100)}% is below industry average (${r2(industryAvg * 100)}%) but within 75% threshold.`,
    };
  }
  return {
    trait: 'Gross Margin',
    score: 'FAIL',
    rationale: `Gross margin of ${r2(gm * 100)}% is significantly below industry average of ${r2(industryAvg * 100)}%.`,
  };
}

function scoreEmployeeCount(
  deal: DealInput,
  member: MemberProfileInput,
): ScorecardTrait {
  const total = num(deal.employeesW2) + num(deal.employees1099);
  const minRequired = member.minEmployeeCount;

  if (total >= minRequired) {
    return {
      trait: 'Employee Count',
      score: 'PASS',
      rationale: `${total} total employees meets minimum of ${minRequired}.`,
    };
  }
  if (total >= 2) {
    return {
      trait: 'Employee Count',
      score: 'DISCUSS',
      rationale: `${total} employees is below preferred minimum of ${minRequired} but meets minimum of 2.`,
    };
  }
  return {
    trait: 'Employee Count',
    score: 'FAIL',
    rationale: `Only ${total} employee(s); fewer than the minimum of 2.`,
  };
}

function scoreCustomerConcentration(deal: DealInput): ScorecardTrait {
  const topPct = deal.customerConcentrationTopPct;
  if (topPct == null) {
    return {
      trait: 'Customer Concentration',
      score: 'DISCUSS',
      rationale: 'Customer concentration data not provided.',
    };
  }
  // topPct is stored as a percentage value (e.g. 15 means 15%)
  const pctValue = topPct > 1 ? topPct : topPct * 100;

  if (pctValue <= 15) {
    return {
      trait: 'Customer Concentration',
      score: 'PASS',
      rationale: `Top client represents ${r2(pctValue)}% of revenue (threshold: 15%).`,
    };
  }
  if (pctValue <= 30) {
    return {
      trait: 'Customer Concentration',
      score: 'DISCUSS',
      rationale: `Top client represents ${r2(pctValue)}% of revenue; between 15-30% range.`,
    };
  }
  return {
    trait: 'Customer Concentration',
    score: 'FAIL',
    rationale: `Top client represents ${r2(pctValue)}% of revenue; exceeds 30% threshold.`,
  };
}

function scoreYearsInBusiness(
  deal: DealInput,
  member: MemberProfileInput,
): ScorecardTrait {
  const years = deal.yearsInBusiness;
  if (years == null) {
    return {
      trait: 'Years in Business',
      score: 'DISCUSS',
      rationale: 'Years in business data not available.',
    };
  }
  const min = member.minYearsInBusiness;

  if (years >= min) {
    return {
      trait: 'Years in Business',
      score: 'PASS',
      rationale: `${years} years in business meets minimum of ${min}.`,
    };
  }
  if (years >= 3) {
    return {
      trait: 'Years in Business',
      score: 'DISCUSS',
      rationale: `${years} years in business is below preferred ${min} but meets 3-year minimum.`,
    };
  }
  return {
    trait: 'Years in Business',
    score: 'FAIL',
    rationale: `Only ${years} year(s) in business; below minimum of 3.`,
  };
}

function scoreOwnerDependency(deal: DealInput): ScorecardTrait {
  const hours = deal.ownerHoursPerWeek;
  const bench = hasManagementBench(deal.memberNotes);

  if (hours == null) {
    return {
      trait: 'Owner Dependency',
      score: 'DISCUSS',
      rationale: `Owner hours data not available. Management bench: ${bench ? 'indicated' : 'not indicated'}.`,
    };
  }

  const highHours = hours > 50;
  const moderateHours = hours >= 36 && hours <= 50;
  const lowHours = hours <= 35;

  if (lowHours && bench) {
    return {
      trait: 'Owner Dependency',
      score: 'PASS',
      rationale: `Owner works ${hours} hrs/wk with management bench in place.`,
    };
  }
  if (highHours && !bench) {
    return {
      trait: 'Owner Dependency',
      score: 'FAIL',
      rationale: `Owner works ${hours} hrs/wk with no management bench identified.`,
    };
  }
  // DISCUSS: moderate hours OR no bench (but not both high hours AND no bench)
  const reasons: string[] = [];
  if (moderateHours) reasons.push(`owner works ${hours} hrs/wk`);
  if (lowHours && !bench) reasons.push('no management bench identified');
  if (highHours && bench)
    reasons.push(
      `owner works ${hours} hrs/wk (high) but management bench exists`,
    );
  if (moderateHours && !bench) reasons.push('no management bench identified');
  if (moderateHours && bench)
    reasons.push(
      `owner works ${hours} hrs/wk (moderate) but management bench exists`,
    );

  return {
    trait: 'Owner Dependency',
    score: 'DISCUSS',
    rationale: `Needs discussion: ${reasons.join('; ')}.`,
  };
}

function scoreIndustryOutlook(
  benchmark: IndustryBenchmarkInput,
): ScorecardTrait {
  // avgGrowthRate stored as decimal (e.g. 0.05 = 5%)
  const growthRate = benchmark.avgGrowthRate;
  const growthPct = growthRate > 1 ? growthRate : growthRate * 100;

  if (growthPct > 3) {
    return {
      trait: 'Industry Outlook',
      score: 'PASS',
      rationale: `Industry growth rate of ${r2(growthPct)}% exceeds 3% threshold.`,
    };
  }
  if (growthPct >= 0) {
    return {
      trait: 'Industry Outlook',
      score: 'DISCUSS',
      rationale: `Industry growth rate of ${r2(growthPct)}% is between 0-3%.`,
    };
  }
  return {
    trait: 'Industry Outlook',
    score: 'FAIL',
    rationale: `Industry is declining at ${r2(growthPct)}% growth rate.`,
  };
}

function scoreRecurringRevenue(deal: DealInput): ScorecardTrait {
  const rrPct = deal.recurringRevenuePct;
  if (rrPct == null) {
    return {
      trait: 'Recurring Revenue',
      score: 'DISCUSS',
      rationale: 'Recurring revenue data not provided.',
    };
  }
  // Normalize: could be 25 (meaning 25%) or 0.25
  const pctValue = rrPct > 1 ? rrPct : rrPct * 100;

  if (pctValue >= 25) {
    return {
      trait: 'Recurring Revenue',
      score: 'PASS',
      rationale: `${r2(pctValue)}% recurring revenue exceeds 25% threshold.`,
    };
  }
  if (pctValue >= 10) {
    return {
      trait: 'Recurring Revenue',
      score: 'DISCUSS',
      rationale: `${r2(pctValue)}% recurring revenue is between 10-25%.`,
    };
  }
  return {
    trait: 'Recurring Revenue',
    score: 'FAIL',
    rationale: `Only ${r2(pctValue)}% recurring revenue; below 10% threshold.`,
  };
}

function scoreRealEstate(deal: DealInput): ScorecardTrait {
  if (deal.realEstateIncluded) {
    return {
      trait: 'Real Estate',
      score: 'PASS',
      rationale: 'Real estate included in the deal.',
    };
  }

  const leaseMonths = deal.leaseTermRemainingMonths;
  const hasRenewal =
    deal.leaseRenewalOptions != null &&
    deal.leaseRenewalOptions.trim().length > 0;

  if (leaseMonths == null) {
    return {
      trait: 'Real Estate',
      score: 'DISCUSS',
      rationale:
        'Real estate not included and lease term data not available.',
    };
  }

  const leaseYears = leaseMonths / 12;

  if (leaseYears >= 5) {
    return {
      trait: 'Real Estate',
      score: 'PASS',
      rationale: `Lease has ${r2(leaseYears)} years remaining (5+ year threshold met).`,
    };
  }
  if (leaseYears >= 2) {
    return {
      trait: 'Real Estate',
      score: 'DISCUSS',
      rationale: `Lease has ${r2(leaseYears)} years remaining (between 2-5 years).`,
    };
  }
  // Less than 2 years
  if (hasRenewal) {
    return {
      trait: 'Real Estate',
      score: 'DISCUSS',
      rationale: `Lease has only ${r2(leaseYears)} years remaining but renewal options exist: ${deal.leaseRenewalOptions}.`,
    };
  }
  return {
    trait: 'Real Estate',
    score: 'FAIL',
    rationale: `Lease has only ${r2(leaseYears)} years remaining with no renewal options.`,
  };
}

function scoreDealStructure(
  deal: DealInput,
  member: MemberProfileInput,
  dscrScenarios: DscrScenario[],
): ScorecardTrait {
  const dscrMeetsFloor = deal.dscrScenario1 >= member.dscrFloor;
  const multiple = deal.standaloneMultiple;
  const multipleOk =
    multiple != null ? multiple <= member.maxMultiple : true;
  const multipleSlightlyAbove =
    multiple != null
      ? multiple > member.maxMultiple &&
        multiple <= member.maxMultiple * 1.15
      : false;

  // Check if any scenario with creative financing (lower price) meets floor
  const anyScenarioMeetsFloor = dscrScenarios.some((s) => s.meetsFloor);

  if (dscrMeetsFloor && multipleOk) {
    return {
      trait: 'Deal Structure',
      score: 'PASS',
      rationale: `DSCR of ${r2(deal.dscrScenario1)} meets floor and multiple${multiple != null ? ` of ${r2(multiple)}x` : ''} is within acceptable range.`,
    };
  }

  // DISCUSS conditions: creative financing needed or multiple slightly above
  if (
    (!dscrMeetsFloor && anyScenarioMeetsFloor) ||
    (dscrMeetsFloor && multipleSlightlyAbove) ||
    multipleSlightlyAbove
  ) {
    const reasons: string[] = [];
    if (!dscrMeetsFloor && anyScenarioMeetsFloor) {
      reasons.push(
        'DSCR meets floor only with price negotiation or creative financing',
      );
    }
    if (multipleSlightlyAbove) {
      reasons.push(
        `multiple of ${r2(multiple!)}x is slightly above max of ${r2(member.maxMultiple)}x`,
      );
    }
    return {
      trait: 'Deal Structure',
      score: 'DISCUSS',
      rationale: `Needs discussion: ${reasons.join('; ')}.`,
    };
  }

  if (!anyScenarioMeetsFloor) {
    return {
      trait: 'Deal Structure',
      score: 'FAIL',
      rationale: `No pricing scenario produces an acceptable DSCR above floor of ${r2(member.dscrFloor)}.`,
    };
  }

  return {
    trait: 'Deal Structure',
    score: 'DISCUSS',
    rationale: `Deal structure needs further analysis; multiple${multiple != null ? ` of ${r2(multiple)}x` : ''} exceeds max of ${r2(member.maxMultiple)}x.`,
  };
}

function deriveScreeningVerdict(traits: ScorecardTrait[]): ScreeningVerdict {
  const failCount = traits.filter((t) => t.score === 'FAIL').length;
  const discussCount = traits.filter((t) => t.score === 'DISCUSS').length;

  if (failCount >= 4) return 'NO-GO';
  if (failCount <= 1 && discussCount <= 3) return 'GO';
  // CONDITIONAL: 0-1 FAIL and 4+ DISCUSS, OR 2-3 FAIL
  return 'CONDITIONAL';
}

function buildScreening(
  deal: DealInput,
  member: MemberProfileInput,
  benchmark: IndustryBenchmarkInput,
  dscrScenarios: DscrScenario[],
): ScreeningResult {
  const traits: ScorecardTrait[] = [
    scoreDscr(deal, member),
    scoreRevenueTrend(deal),
    scoreGrossMargin(deal, benchmark),
    scoreEmployeeCount(deal, member),
    scoreCustomerConcentration(deal),
    scoreYearsInBusiness(deal, member),
    scoreOwnerDependency(deal),
    scoreIndustryOutlook(benchmark),
    scoreRecurringRevenue(deal),
    scoreRealEstate(deal),
    scoreDealStructure(deal, member, dscrScenarios),
  ];

  const passCount = traits.filter((t) => t.score === 'PASS').length;
  const discussCount = traits.filter((t) => t.score === 'DISCUSS').length;
  const failCount = traits.filter((t) => t.score === 'FAIL').length;

  return {
    traits,
    summary: { passCount, discussCount, failCount },
    verdict: deriveScreeningVerdict(traits),
  };
}

// ---- 2. Industry Benchmark Comparison -------------------------------------

function buildIndustryComparison(
  deal: DealInput,
  benchmark: IndustryBenchmarkInput,
): BenchmarkComparison[] {
  const totalEmployees = num(deal.employeesW2) + num(deal.employees1099);
  const revenuePerEmployee =
    totalEmployees > 0 ? deal.revenueYear1 / totalEmployees : null;

  // Compute deal growth rate if year2 is available
  let dealGrowthRate: number | null = null;
  if (deal.revenueYear2 != null && deal.revenueYear2 > 0) {
    dealGrowthRate = (deal.revenueYear1 - deal.revenueYear2) / deal.revenueYear2;
  }

  // Normalize customer concentration and recurring revenue for comparison
  const dealCustConc = deal.customerConcentrationTopPct;
  const dealRecurring = deal.recurringRevenuePct;

  // Net margin: SDE margin can serve as a proxy; compute if operating expenses known
  let dealNetMargin: number | null = null;
  if (deal.operatingExpenses != null && deal.revenueYear1 > 0) {
    const grossProfit = deal.grossMarginYear1 != null
      ? deal.grossMarginYear1 * deal.revenueYear1
      : deal.revenueYear1 - num(deal.cogsYear1);
    const netIncome = grossProfit - deal.operatingExpenses;
    dealNetMargin = netIncome / deal.revenueYear1;
  }

  // SDE margin
  const dealSdeMargin =
    deal.revenueYear1 > 0 ? deal.sdeYear1 / deal.revenueYear1 : null;

  function compare(
    dealVal: number | null,
    avgVal: number,
    tolerance: number = 0.05,
  ): BenchmarkComparisonStatus {
    if (dealVal == null) return 'Below';
    if (dealVal >= avgVal * (1 + tolerance)) return 'Above';
    if (dealVal >= avgVal * (1 - tolerance)) return 'Within';
    return 'Below';
  }

  /** For metrics where lower is better (e.g. customer concentration). */
  function compareInverse(
    dealVal: number | null,
    avgVal: number,
    tolerance: number = 0.05,
  ): BenchmarkComparisonStatus {
    if (dealVal == null) return 'Below';
    if (dealVal <= avgVal * (1 - tolerance)) return 'Above';
    if (dealVal <= avgVal * (1 + tolerance)) return 'Within';
    return 'Below';
  }

  return [
    {
      name: 'Gross Margin',
      dealValue: deal.grossMarginYear1,
      industryAvg: benchmark.avgGrossMargin,
      industryRange: null,
      status: compare(deal.grossMarginYear1, benchmark.avgGrossMargin),
    },
    {
      name: 'Net Margin',
      dealValue: dealNetMargin != null ? r4(dealNetMargin) : null,
      industryAvg: benchmark.avgNetMargin,
      industryRange: null,
      status: compare(dealNetMargin, benchmark.avgNetMargin),
    },
    {
      name: 'SDE Margin',
      dealValue: dealSdeMargin != null ? r4(dealSdeMargin) : null,
      industryAvg: benchmark.avgSdeMargin,
      industryRange: null,
      status: compare(dealSdeMargin, benchmark.avgSdeMargin),
    },
    {
      name: 'Revenue per Employee',
      dealValue: revenuePerEmployee != null ? r2(revenuePerEmployee) : null,
      industryAvg: benchmark.avgRevenuePerEmployee,
      industryRange: null,
      status: compare(revenuePerEmployee, benchmark.avgRevenuePerEmployee),
    },
    {
      name: 'Multiple',
      dealValue: deal.standaloneMultiple,
      industryAvg: benchmark.avgMultiple,
      industryRange: [benchmark.multipleRangeLow, benchmark.multipleRangeHigh],
      status: compareInverse(deal.standaloneMultiple, benchmark.avgMultiple),
    },
    {
      name: 'Growth Rate',
      dealValue: dealGrowthRate != null ? r4(dealGrowthRate) : null,
      industryAvg: benchmark.avgGrowthRate,
      industryRange: null,
      status: compare(dealGrowthRate, benchmark.avgGrowthRate),
    },
    {
      name: 'Customer Concentration',
      dealValue: dealCustConc,
      industryAvg: benchmark.avgCustomerConcentration,
      industryRange: null,
      status: compareInverse(dealCustConc, benchmark.avgCustomerConcentration),
    },
    {
      name: 'Recurring Revenue',
      dealValue: dealRecurring,
      industryAvg: benchmark.avgRecurringRevenuePct,
      industryRange: null,
      status: compare(dealRecurring, benchmark.avgRecurringRevenuePct),
    },
  ];
}

// ---- 3. DSCR 6-Scenario Modeling ------------------------------------------

function buildDscrScenarios(
  deal: DealInput,
  member: MemberProfileInput,
): DscrScenario[] {
  const sde = deal.sdeYear1;
  const rate = 0.105;
  const termYears = 10;

  const scenarios: {
    label: string;
    priceMultiplier: number;
    downPct: number;
  }[] = [
    { label: 'Asking Price, 10% Down', priceMultiplier: 1.0, downPct: 0.1 },
    { label: 'Asking Price, 5% Down', priceMultiplier: 1.0, downPct: 0.05 },
    { label: '10% Discount, 10% Down', priceMultiplier: 0.9, downPct: 0.1 },
    { label: '15% Discount, 10% Down', priceMultiplier: 0.85, downPct: 0.1 },
    { label: '20% Discount, 10% Down', priceMultiplier: 0.8, downPct: 0.1 },
    { label: '25% Discount, 10% Down', priceMultiplier: 0.75, downPct: 0.1 },
  ];

  return scenarios.map((s) => {
    const price = r2(deal.askingPrice * s.priceMultiplier);
    const downPayment = r2(price * s.downPct);
    const loanAmount = r2(price - downPayment);
    const monthlyPayment = r2(calcMonthlyPayment(loanAmount, rate, termYears));
    const annualDebtService = r2(monthlyPayment * 12);
    const dscr = annualDebtService > 0 ? r4(sde / annualDebtService) : 0;

    return {
      label: s.label,
      price,
      downPayment,
      downPaymentPct: s.downPct,
      loanAmount,
      interestRate: rate,
      monthlyPayment,
      annualDebtService,
      dscr,
      meetsFloor: dscr >= member.dscrFloor,
    };
  });
}

// ---- 4. Sensitivity Analysis ----------------------------------------------

function buildSensitivityAnalysis(
  deal: DealInput,
  benchmark: IndustryBenchmarkInput,
): SensitivityAnalysis {
  const revenueGrowthScenarios = [-0.1, -0.05, 0, 0.05, 0.1, 0.15];

  // Derive current margin. Prefer grossMarginYear1; fall back to COGS-based calc.
  let currentMargin: number;
  if (deal.grossMarginYear1 != null) {
    currentMargin = deal.grossMarginYear1;
  } else if (deal.cogsYear1 != null && deal.revenueYear1 > 0) {
    currentMargin = (deal.revenueYear1 - deal.cogsYear1) / deal.revenueYear1;
  } else {
    // Best-effort: derive from SDE + operating expenses
    currentMargin = benchmark.avgGrossMargin;
  }

  const industryAvgMargin = benchmark.avgGrossMargin;
  const improvedMargin = industryAvgMargin + 0.05; // avg + 5 percentage points
  const pessimisticMargin = currentMargin - 0.05; // current - 5 percentage points

  const marginScenarios = [
    { label: 'Current Margin', margin: currentMargin },
    { label: 'Industry Average', margin: industryAvgMargin },
    { label: 'Improved (Avg + 5pp)', margin: improvedMargin },
    { label: 'Pessimistic (Current - 5pp)', margin: pessimisticMargin },
  ];

  const opEx = num(deal.operatingExpenses);
  const annualDebtServiceS1 = deal.annualDebtServiceS1;

  const grid: SensitivityCell[][] = marginScenarios.map((ms) =>
    revenueGrowthScenarios.map((growthRate) => {
      const adjustedRevenue = r2(deal.revenueYear1 * (1 + growthRate));
      const adjustedCogs = r2(adjustedRevenue * (1 - ms.margin));
      const adjustedSde = r2(adjustedRevenue - adjustedCogs - opEx);
      const adjustedDscr =
        annualDebtServiceS1 > 0
          ? r4(adjustedSde / annualDebtServiceS1)
          : 0;
      const adjustedCashFlow = r2(adjustedSde - annualDebtServiceS1);

      return {
        revenueGrowthLabel: `${growthRate >= 0 ? '+' : ''}${r2(growthRate * 100)}%`,
        marginLabel: ms.label,
        adjustedRevenue,
        adjustedCogs,
        adjustedSde,
        adjustedDscr,
        adjustedCashFlow,
      };
    }),
  );

  const keyInsights = generateKeyInsights(
    deal,
    benchmark,
    grid,
    marginScenarios,
    revenueGrowthScenarios,
    annualDebtServiceS1,
    currentMargin,
  );

  return {
    revenueGrowthScenarios,
    marginScenarios,
    grid,
    keyInsights,
  };
}

function generateKeyInsights(
  deal: DealInput,
  benchmark: IndustryBenchmarkInput,
  grid: SensitivityCell[][],
  marginScenarios: { label: string; margin: number }[],
  revenueGrowthScenarios: number[],
  annualDebtServiceS1: number,
  currentMargin: number,
): string[] {
  const insights: string[] = [];

  // 1. Breakeven analysis: find the minimum growth needed at current margin
  //    to maintain DSCR >= 1.25
  const currentMarginRow = grid[0]; // index 0 = Current Margin
  const breakevenScenario = currentMarginRow.find((cell) => cell.adjustedDscr >= 1.25);
  if (breakevenScenario) {
    insights.push(
      `At current margins, the deal maintains a DSCR above 1.25 even with revenue growth as low as ${breakevenScenario.revenueGrowthLabel}.`,
    );
  } else {
    insights.push(
      'At current margins, no tested revenue scenario produces a DSCR above 1.25, indicating high debt service risk.',
    );
  }

  // 2. Margin gap analysis
  const industryAvg = benchmark.avgGrossMargin;
  if (currentMargin < industryAvg) {
    const gapPp = r2((industryAvg - currentMargin) * 100);
    const sdeUplift = r2(deal.revenueYear1 * (industryAvg - currentMargin));
    insights.push(
      `Closing the ${gapPp} percentage point gross margin gap to industry average would add approximately $${sdeUplift.toLocaleString()} to annual SDE.`,
    );
  } else {
    const abovePp = r2((currentMargin - industryAvg) * 100);
    insights.push(
      `Gross margin exceeds industry average by ${abovePp} percentage points, providing a buffer against margin compression.`,
    );
  }

  // 3. Downside resilience: check the pessimistic row at -5% revenue
  const pessimisticRow = grid[3]; // index 3 = Pessimistic
  const pessimisticNeg5 = pessimisticRow[1]; // index 1 = -5%
  if (pessimisticNeg5.adjustedDscr >= 1.0) {
    insights.push(
      `Even in the pessimistic scenario (margin -5pp, revenue -5%), DSCR remains at ${pessimisticNeg5.adjustedDscr}x with $${pessimisticNeg5.adjustedCashFlow.toLocaleString()} annual cash flow.`,
    );
  } else {
    insights.push(
      `In the pessimistic scenario (margin -5pp, revenue -5%), DSCR drops to ${pessimisticNeg5.adjustedDscr}x, indicating limited downside cushion.`,
    );
  }

  // 4. Upside potential: improved margin at +10% revenue
  const improvedRow = grid[2]; // index 2 = Improved
  const improvedPlus10 = improvedRow[4]; // index 4 = +10%
  insights.push(
    `With improved margins and 10% revenue growth, DSCR reaches ${improvedPlus10.adjustedDscr}x with $${improvedPlus10.adjustedCashFlow.toLocaleString()} annual cash flow.`,
  );

  // 5. Cash flow at status quo
  const statusQuo = grid[0][2]; // Current margin, 0% growth
  if (statusQuo.adjustedCashFlow > 0) {
    insights.push(
      `At current performance levels (no growth, current margins), the deal generates $${statusQuo.adjustedCashFlow.toLocaleString()} in annual free cash flow after debt service.`,
    );
  } else {
    insights.push(
      `At current performance levels, the deal produces negative cash flow of $${Math.abs(statusQuo.adjustedCashFlow).toLocaleString()} after debt service, requiring operational improvements.`,
    );
  }

  // Return 3-5 insights; trim to 5 max
  return insights.slice(0, 5);
}

// ---- Main Export ----------------------------------------------------------

export function runBenchmark(
  deal: DealInput,
  memberProfile: Partial<MemberProfileInput> | null | undefined,
  industryBenchmark: IndustryBenchmarkInput,
): BenchmarkResult {
  // Merge member profile with defaults
  const member: MemberProfileInput = {
    ...DEFAULT_MEMBER_PROFILE,
    ...(memberProfile ?? {}),
  };

  // Build DSCR scenarios first (needed by screening)
  const dscrScenarios = buildDscrScenarios(deal, member);

  // Build all sections
  const screening = buildScreening(deal, member, industryBenchmark, dscrScenarios);
  const industryComparison = buildIndustryComparison(deal, industryBenchmark);
  const sensitivityAnalysis = buildSensitivityAnalysis(deal, industryBenchmark);

  return {
    screening,
    industryComparison,
    dscrScenarios,
    sensitivityAnalysis,
  };
}
