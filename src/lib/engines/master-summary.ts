// ---------------------------------------------------------------------------
// Master Deal Summary – assembles outputs from all three analysis engines
// (Analyzer, Protocol, Benchmark) into a single cohesive summary, then
// calls the Verdict Engine to render a final GO / NO-GO / CONDITIONAL.
// ---------------------------------------------------------------------------

import { determineVerdict, type VerdictInput, type VerdictResult } from './verdict';

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface MasterSummaryInput {
  deal: {
    businessName: string | null;
    industry: string | null;
    city: string | null;
    state: string | null;
    askingPrice: number | null;
    standaloneBusPrice: number | null;
    revenueYear1: number | null;
    sdeYear1: number | null;
    realEstateValue: number;
    realEstateIncluded: boolean;
  };
  analyzerResult: {
    askingMultiple: number | null;
    standaloneMultiple: number | null;
    grossMarginYear1: number | null;
    sdeMarginYear1: number | null;
    revenueGrowthYoy1: number | null;
    dscrScenario1: number | null;
    dscrScenario2: number | null;
    annualDebtServiceS1: number | null;
    dealGrade: string | null;
    gradeExplanation: string | null;
    workingCapitalFromSpread: number | null;
  };
  protocolResult: {
    industryOverview: string | null;
    competitiveLandscape: string | null;
    digitalFootprintScore: number | null;
    googleReviews: { count: number; avgRating: number; sentiment: string } | null;
    distressSignals: Array<{ signal: string; severity: string; evidence: string }> | null;
    protocolVerdict: string | null;
    scorecard: { totalScore: number; maxScore: number } | null;
  };
  benchmarkResult: {
    screening: {
      traits: Array<{
        name: string;
        score: string;
        value: string;
        threshold: string;
        notes: string;
      }>;
      passCount: number;
      discussCount: number;
      failCount: number;
      overallVerdict: string;
    } | null;
    industryBenchmarks: Record<string, unknown> | null;
    sensitivity: { keyInsights: string[] } | null;
  };
  memberProfile: {
    minAnnualRevenue: number;
    minSde: number;
    dscrFloor: number;
    maxMultiple: number;
    targetIndustries: string[];
    targetGeographies: string[];
    minYearsInBusiness: number;
    minEmployeeCount: number;
  };
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface DealSnapshot {
  businessName: string;
  industry: string;
  location: string;
  askingPrice: string;
  standaloneBusPrice: string;
  askingMultiple: string;
  standaloneMultiple: string;
  realEstateValue: string;
  realEstateIncluded: boolean;
  dealGrade: string;
  gradeExplanation: string;
}

export interface FinancialHealth {
  revenueYear1: string;
  sdeYear1: string;
  grossMarginYear1: string;
  sdeMarginYear1: string;
  revenueGrowthYoy1: string;
  dscrScenario1: string;
  dscrScenario2: string;
  annualDebtServiceS1: string;
  workingCapitalFromSpread: string;
  screeningVerdict: string;
}

export interface MarketPosition {
  industryBenchmarks: Record<string, unknown> | null;
  screeningTraits: Array<{
    name: string;
    score: string;
    value: string;
    threshold: string;
    notes: string;
  }>;
  screeningSummary: string;
}

export interface BusinessIntelligence {
  industryOverview: string;
  competitiveLandscape: string;
  digitalFootprintScore: string;
  googleReviews: { count: number; avgRating: number; sentiment: string } | null;
  distressSignals: Array<{ signal: string; severity: string; evidence: string }>;
  protocolVerdict: string;
  protocolScorecard: string;
}

export interface FlagItem {
  flag: string;
  severity: 'critical' | 'moderate' | 'low';
  source: string;
  dataPoint: string;
}

export interface BuyBoxAlignmentItem {
  criterion: string;
  memberThreshold: string;
  dealValue: string;
  meets: boolean;
}

export interface MasterSummaryResult {
  dealSnapshot: DealSnapshot;
  financialHealth: FinancialHealth;
  marketPosition: MarketPosition;
  businessIntelligence: BusinessIntelligence;
  redFlags: FlagItem[];
  greenFlags: FlagItem[];
  buyBoxAlignment: BuyBoxAlignmentItem[];
  sensitivityHighlights: string[];
  verdict: VerdictResult;
  recommendedNextSteps: string[];
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtCurrency(value: number | null): string {
  if (value === null) return 'N/A';
  return '$' + Math.round(value).toLocaleString('en-US');
}

function fmtPercent(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

function fmtMultiple(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(2)}x`;
}

function fmtDscr(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(2)}x`;
}

function fallback(value: string | null, placeholder: string): string {
  return value ?? placeholder;
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildDealSnapshot(input: MasterSummaryInput): DealSnapshot {
  const { deal, analyzerResult } = input;
  const city = deal.city ?? '';
  const state = deal.state ?? '';
  const location = city && state ? `${city}, ${state}` : city || state || 'N/A';

  return {
    businessName: fallback(deal.businessName, 'Unknown Business'),
    industry: fallback(deal.industry, 'Unknown Industry'),
    location,
    askingPrice: fmtCurrency(deal.askingPrice),
    standaloneBusPrice: fmtCurrency(deal.standaloneBusPrice),
    askingMultiple: fmtMultiple(analyzerResult.askingMultiple),
    standaloneMultiple: fmtMultiple(analyzerResult.standaloneMultiple),
    realEstateValue: fmtCurrency(deal.realEstateValue),
    realEstateIncluded: deal.realEstateIncluded,
    dealGrade: fallback(analyzerResult.dealGrade, 'N/A'),
    gradeExplanation: fallback(analyzerResult.gradeExplanation, 'No explanation available'),
  };
}

function buildFinancialHealth(input: MasterSummaryInput): FinancialHealth {
  const { deal, analyzerResult, benchmarkResult } = input;

  return {
    revenueYear1: fmtCurrency(deal.revenueYear1),
    sdeYear1: fmtCurrency(deal.sdeYear1),
    grossMarginYear1: fmtPercent(analyzerResult.grossMarginYear1),
    sdeMarginYear1: fmtPercent(analyzerResult.sdeMarginYear1),
    revenueGrowthYoy1: fmtPercent(analyzerResult.revenueGrowthYoy1),
    dscrScenario1: fmtDscr(analyzerResult.dscrScenario1),
    dscrScenario2: fmtDscr(analyzerResult.dscrScenario2),
    annualDebtServiceS1: fmtCurrency(analyzerResult.annualDebtServiceS1),
    workingCapitalFromSpread: fmtCurrency(analyzerResult.workingCapitalFromSpread),
    screeningVerdict: benchmarkResult.screening?.overallVerdict ?? 'N/A',
  };
}

function buildMarketPosition(input: MasterSummaryInput): MarketPosition {
  const screening = input.benchmarkResult.screening;
  const traits = screening?.traits ?? [];
  const pass = screening?.passCount ?? 0;
  const discuss = screening?.discussCount ?? 0;
  const fail = screening?.failCount ?? 0;

  return {
    industryBenchmarks: input.benchmarkResult.industryBenchmarks,
    screeningTraits: traits,
    screeningSummary: `${pass} PASS, ${discuss} DISCUSS, ${fail} FAIL — ${screening?.overallVerdict ?? 'N/A'}`,
  };
}

function buildBusinessIntelligence(input: MasterSummaryInput): BusinessIntelligence {
  const p = input.protocolResult;
  const scorecard = p.scorecard
    ? `${p.scorecard.totalScore} / ${p.scorecard.maxScore}`
    : 'N/A';

  return {
    industryOverview: fallback(p.industryOverview, 'No industry overview available'),
    competitiveLandscape: fallback(p.competitiveLandscape, 'No competitive landscape data'),
    digitalFootprintScore:
      p.digitalFootprintScore !== null ? `${p.digitalFootprintScore}/100` : 'N/A',
    googleReviews: p.googleReviews,
    distressSignals: p.distressSignals ?? [],
    protocolVerdict: fallback(p.protocolVerdict, 'N/A'),
    protocolScorecard: scorecard,
  };
}

// ---------------------------------------------------------------------------
// Flag collection
// ---------------------------------------------------------------------------

function collectRedFlags(input: MasterSummaryInput): FlagItem[] {
  const flags: FlagItem[] = [];
  const { analyzerResult, benchmarkResult, protocolResult } = input;

  // Screening: FAIL and DISCUSS items
  if (benchmarkResult.screening) {
    for (const trait of benchmarkResult.screening.traits) {
      const upper = trait.score.toUpperCase();
      if (upper === 'FAIL') {
        flags.push({
          flag: `${trait.name} failed screening`,
          severity: 'critical',
          source: 'Benchmark Screening',
          dataPoint: `Value: ${trait.value} (threshold: ${trait.threshold}). ${trait.notes}`,
        });
      } else if (upper === 'DISCUSS') {
        flags.push({
          flag: `${trait.name} flagged for discussion`,
          severity: 'moderate',
          source: 'Benchmark Screening',
          dataPoint: `Value: ${trait.value} (threshold: ${trait.threshold}). ${trait.notes}`,
        });
      }
    }
  }

  // Low DSCR (below 1.50x in any scenario)
  if (analyzerResult.dscrScenario1 !== null && analyzerResult.dscrScenario1 < 1.50) {
    flags.push({
      flag: 'Low debt service coverage in Scenario 1',
      severity: analyzerResult.dscrScenario1 < 1.25 ? 'critical' : 'moderate',
      source: 'Deal Analyzer',
      dataPoint: `DSCR S1: ${analyzerResult.dscrScenario1.toFixed(2)}x`,
    });
  }
  if (analyzerResult.dscrScenario2 !== null && analyzerResult.dscrScenario2 < 1.50) {
    flags.push({
      flag: 'Low debt service coverage in Scenario 2',
      severity: analyzerResult.dscrScenario2 < 1.25 ? 'critical' : 'moderate',
      source: 'Deal Analyzer',
      dataPoint: `DSCR S2: ${analyzerResult.dscrScenario2.toFixed(2)}x`,
    });
  }

  // Declining revenue
  if (analyzerResult.revenueGrowthYoy1 !== null && analyzerResult.revenueGrowthYoy1 < 0) {
    const severity = analyzerResult.revenueGrowthYoy1 < -30 ? 'critical' : 'moderate';
    flags.push({
      flag: 'Revenue is declining year-over-year',
      severity,
      source: 'Deal Analyzer',
      dataPoint: `YoY growth: ${analyzerResult.revenueGrowthYoy1.toFixed(1)}%`,
    });
  }

  // Declining SDE margin
  if (analyzerResult.sdeMarginYear1 !== null && analyzerResult.sdeMarginYear1 < 15) {
    flags.push({
      flag: 'Low SDE margin',
      severity: analyzerResult.sdeMarginYear1 < 10 ? 'critical' : 'moderate',
      source: 'Deal Analyzer',
      dataPoint: `SDE margin: ${analyzerResult.sdeMarginYear1.toFixed(1)}%`,
    });
  }

  // Distress signals from protocol
  if (protocolResult.distressSignals) {
    for (const signal of protocolResult.distressSignals) {
      flags.push({
        flag: signal.signal,
        severity: signal.severity.toLowerCase() === 'high' ? 'critical' : 'moderate',
        source: 'Due Diligence Protocol',
        dataPoint: signal.evidence,
      });
    }
  }

  // Low digital footprint
  if (
    protocolResult.digitalFootprintScore !== null &&
    protocolResult.digitalFootprintScore < 40
  ) {
    flags.push({
      flag: 'Weak digital footprint',
      severity: protocolResult.digitalFootprintScore < 20 ? 'critical' : 'moderate',
      source: 'Due Diligence Protocol',
      dataPoint: `Digital score: ${protocolResult.digitalFootprintScore}/100`,
    });
  }

  // Low Google reviews
  if (protocolResult.googleReviews) {
    const reviews = protocolResult.googleReviews;
    if (reviews.avgRating < 3.5) {
      flags.push({
        flag: 'Below-average Google review rating',
        severity: reviews.avgRating < 3.0 ? 'critical' : 'moderate',
        source: 'Due Diligence Protocol',
        dataPoint: `${reviews.avgRating.toFixed(1)} avg rating across ${reviews.count} reviews (${reviews.sentiment})`,
      });
    }
  }

  // Sort: critical first, then moderate, then low
  const severityOrder: Record<string, number> = { critical: 0, moderate: 1, low: 2 };
  flags.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

  return flags;
}

function collectGreenFlags(input: MasterSummaryInput): FlagItem[] {
  const flags: FlagItem[] = [];
  const { analyzerResult, benchmarkResult, protocolResult } = input;

  // Screening: PASS items
  if (benchmarkResult.screening) {
    for (const trait of benchmarkResult.screening.traits) {
      if (trait.score.toUpperCase() === 'PASS') {
        flags.push({
          flag: `${trait.name} passed screening`,
          severity: 'low',
          source: 'Benchmark Screening',
          dataPoint: `Value: ${trait.value} (threshold: ${trait.threshold}). ${trait.notes}`,
        });
      }
    }
  }

  // Strong DSCR (>= 1.50x)
  if (analyzerResult.dscrScenario1 !== null && analyzerResult.dscrScenario1 >= 1.50) {
    flags.push({
      flag: 'Strong debt service coverage in Scenario 1',
      severity: 'low',
      source: 'Deal Analyzer',
      dataPoint: `DSCR S1: ${analyzerResult.dscrScenario1.toFixed(2)}x`,
    });
  }
  if (analyzerResult.dscrScenario2 !== null && analyzerResult.dscrScenario2 >= 1.50) {
    flags.push({
      flag: 'Strong debt service coverage in Scenario 2',
      severity: 'low',
      source: 'Deal Analyzer',
      dataPoint: `DSCR S2: ${analyzerResult.dscrScenario2.toFixed(2)}x`,
    });
  }

  // Growing revenue
  if (analyzerResult.revenueGrowthYoy1 !== null && analyzerResult.revenueGrowthYoy1 > 0) {
    flags.push({
      flag: 'Revenue growing year-over-year',
      severity: 'low',
      source: 'Deal Analyzer',
      dataPoint: `YoY growth: +${analyzerResult.revenueGrowthYoy1.toFixed(1)}%`,
    });
  }

  // Healthy SDE margin
  if (analyzerResult.sdeMarginYear1 !== null && analyzerResult.sdeMarginYear1 >= 20) {
    flags.push({
      flag: 'Healthy SDE margin',
      severity: 'low',
      source: 'Deal Analyzer',
      dataPoint: `SDE margin: ${analyzerResult.sdeMarginYear1.toFixed(1)}%`,
    });
  }

  // Good Google reviews
  if (protocolResult.googleReviews) {
    const reviews = protocolResult.googleReviews;
    if (reviews.avgRating >= 4.0) {
      flags.push({
        flag: 'Strong Google review profile',
        severity: 'low',
        source: 'Due Diligence Protocol',
        dataPoint: `${reviews.avgRating.toFixed(1)} avg rating across ${reviews.count} reviews (${reviews.sentiment})`,
      });
    }
  }

  // Good digital footprint
  if (
    protocolResult.digitalFootprintScore !== null &&
    protocolResult.digitalFootprintScore >= 60
  ) {
    flags.push({
      flag: 'Solid digital footprint',
      severity: 'low',
      source: 'Due Diligence Protocol',
      dataPoint: `Digital score: ${protocolResult.digitalFootprintScore}/100`,
    });
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Buy-box alignment
// ---------------------------------------------------------------------------

function buildBuyBoxAlignment(input: MasterSummaryInput): BuyBoxAlignmentItem[] {
  const { deal, analyzerResult, memberProfile } = input;
  const items: BuyBoxAlignmentItem[] = [];

  // Revenue
  items.push({
    criterion: 'Minimum Annual Revenue',
    memberThreshold: fmtCurrency(memberProfile.minAnnualRevenue),
    dealValue: fmtCurrency(deal.revenueYear1),
    meets: deal.revenueYear1 !== null && deal.revenueYear1 >= memberProfile.minAnnualRevenue,
  });

  // SDE
  items.push({
    criterion: 'Minimum SDE',
    memberThreshold: fmtCurrency(memberProfile.minSde),
    dealValue: fmtCurrency(deal.sdeYear1),
    meets: deal.sdeYear1 !== null && deal.sdeYear1 >= memberProfile.minSde,
  });

  // DSCR floor
  const bestDscr = Math.max(
    analyzerResult.dscrScenario1 ?? 0,
    analyzerResult.dscrScenario2 ?? 0,
  );
  items.push({
    criterion: 'DSCR Floor',
    memberThreshold: fmtDscr(memberProfile.dscrFloor),
    dealValue: fmtDscr(bestDscr > 0 ? bestDscr : null),
    meets: bestDscr >= memberProfile.dscrFloor,
  });

  // Multiple
  items.push({
    criterion: 'Max Asking Multiple',
    memberThreshold: fmtMultiple(memberProfile.maxMultiple),
    dealValue: fmtMultiple(analyzerResult.askingMultiple),
    meets:
      analyzerResult.askingMultiple !== null &&
      analyzerResult.askingMultiple <= memberProfile.maxMultiple,
  });

  // Industry
  const industryMatch =
    deal.industry !== null &&
    memberProfile.targetIndustries.length > 0 &&
    memberProfile.targetIndustries.some(
      (t) => t.toLowerCase() === deal.industry!.toLowerCase(),
    );
  items.push({
    criterion: 'Target Industry',
    memberThreshold: memberProfile.targetIndustries.join(', ') || 'Any',
    dealValue: deal.industry ?? 'N/A',
    meets: memberProfile.targetIndustries.length === 0 || industryMatch,
  });

  // Geography
  const geoValue = deal.state ?? deal.city ?? 'N/A';
  const geoMatch =
    memberProfile.targetGeographies.length === 0 ||
    memberProfile.targetGeographies.some(
      (g) =>
        g.toLowerCase() === (deal.state ?? '').toLowerCase() ||
        g.toLowerCase() === (deal.city ?? '').toLowerCase(),
    );
  items.push({
    criterion: 'Target Geography',
    memberThreshold: memberProfile.targetGeographies.join(', ') || 'Any',
    dealValue: geoValue,
    meets: geoMatch,
  });

  return items;
}

// ---------------------------------------------------------------------------
// Sensitivity highlights
// ---------------------------------------------------------------------------

function buildSensitivityHighlights(input: MasterSummaryInput): string[] {
  return input.benchmarkResult.sensitivity?.keyInsights ?? [];
}

// ---------------------------------------------------------------------------
// Recommended next steps
// ---------------------------------------------------------------------------

function buildRecommendedNextSteps(
  verdict: VerdictResult,
  redFlags: FlagItem[],
): string[] {
  const steps: string[] = [];

  switch (verdict.verdict) {
    case 'go':
      steps.push('Submit Letter of Intent (LOI) with proposed terms.');
      steps.push('Request complete financial package (3 years of tax returns, P&L, balance sheets).');
      steps.push('Schedule introductory call with seller or broker.');
      steps.push('Engage legal counsel for asset purchase agreement review.');
      steps.push('Begin Phase 2 due diligence checklist.');
      break;

    case 'conditional':
      steps.push('Request additional documentation to address flagged concerns.');
      if (redFlags.some((f) => f.flag.toLowerCase().includes('dscr'))) {
        steps.push('Model alternative deal structures to improve debt service coverage.');
      }
      if (redFlags.some((f) => f.flag.toLowerCase().includes('revenue'))) {
        steps.push('Request month-over-month revenue detail to understand decline trajectory.');
      }
      steps.push('Schedule a call with the broker to discuss conditional items.');
      steps.push('Re-evaluate after additional information is received.');
      steps.push('Determine if seller is willing to adjust price or terms to mitigate identified risks.');
      break;

    case 'no_go':
      steps.push('Prepare broker decline communication (email template provided).');
      steps.push('Archive deal file for future reference.');
      steps.push('Document specific disqualification reasons for pattern tracking.');
      if (redFlags.length > 0) {
        steps.push(
          'If conditions change significantly, deal may be re-evaluated with updated financials.',
        );
      }
      steps.push('Continue reviewing pipeline for deals that meet underwriting criteria.');
      break;
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function generateMasterSummary(input: MasterSummaryInput): MasterSummaryResult {
  // 1. Deal snapshot
  const dealSnapshot = buildDealSnapshot(input);

  // 2. Financial health
  const financialHealth = buildFinancialHealth(input);

  // 3. Market position
  const marketPosition = buildMarketPosition(input);

  // 4. Business intelligence
  const businessIntelligence = buildBusinessIntelligence(input);

  // 5. Red flags from all engines
  const redFlags = collectRedFlags(input);

  // 6. Green flags from all engines
  const greenFlags = collectGreenFlags(input);

  // 7. Buy-box alignment
  const buyBoxAlignment = buildBuyBoxAlignment(input);

  // 8. Sensitivity highlights
  const sensitivityHighlights = buildSensitivityHighlights(input);

  // 9. Verdict
  const screening = input.benchmarkResult.screening;
  const criticalRedFlagCount = redFlags.filter((f) => f.severity === 'critical').length;

  const verdictInput: VerdictInput = {
    dealGrade: input.analyzerResult.dealGrade,
    dscrScenario1: input.analyzerResult.dscrScenario1,
    dscrScenario2: input.analyzerResult.dscrScenario2,
    revenueGrowthYoy1: input.analyzerResult.revenueGrowthYoy1,
    sdeYear1: input.deal.sdeYear1,
    screeningPassCount: screening?.passCount ?? 0,
    screeningDiscussCount: screening?.discussCount ?? 0,
    screeningFailCount: screening?.failCount ?? 0,
    screeningVerdict: screening?.overallVerdict ?? 'N/A',
    protocolVerdict: input.protocolResult.protocolVerdict,
    criticalRedFlagCount,
    memberDscrFloor: input.memberProfile.dscrFloor,
  };

  const verdict = determineVerdict(verdictInput);

  // 10. Recommended next steps
  const recommendedNextSteps = buildRecommendedNextSteps(verdict, redFlags);

  return {
    dealSnapshot,
    financialHealth,
    marketPosition,
    businessIntelligence,
    redFlags,
    greenFlags,
    buyBoxAlignment,
    sensitivityHighlights,
    verdict,
    recommendedNextSteps,
  };
}
