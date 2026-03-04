// ============================================================
// CCC Platform - Core Type Definitions
// ============================================================

export type Role = 'admin' | 'member';
export type UserStatus = 'active' | 'locked' | 'pending';
export type DealPhase = 'phase_1' | 'phase_2' | 'complete';
export type AnalysisStatus =
  | 'pending'
  | 'queued'
  | 'running_analyzer'
  | 'running_protocol'
  | 'running_benchmark'
  | 'generating_summary'
  | 'complete'
  | 'error';
export type Verdict = 'go' | 'no_go' | 'conditional';
export type DealGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type ScreeningScore = 'PASS' | 'DISCUSS' | 'FAIL';
export type EmailType = 'option_a' | 'option_b';
export type EmailStatus = 'draft' | 'sent' | 'failed';
export type DeadlineStatus = 'ON_TIME' | 'WARNING' | 'OVERDUE';
export type FlagSeverity = 'critical' | 'warning';

// ---- User & Profile ----

export interface User {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface BuyBox {
  targetIndustries: string[];
  minAnnualRevenue: number;
  minSde: number;
  dscrFloor: number;
  targetGeographies: string[];
  dealSizeMin: number | null;
  dealSizeMax: number | null;
  preferredDealStructures: string[];
  maxMultiple: number;
  minYearsInBusiness: number;
  minEmployeeCount: number;
}

export interface MemberProfile {
  id: string;
  userId: string;
  fullName: string;
  companyName: string | null;
  title: string | null;
  phone: string | null;
  mailingAddress: string | null;
  signatureBlock: string | null;
  profilePhotoUrl: string | null;
  // Buy box fields inline
  targetIndustries: string[];
  minAnnualRevenue: number;
  minSde: number;
  dscrFloor: number;
  targetGeographies: string[];
  dealSizeMin: number | null;
  dealSizeMax: number | null;
  preferredDealStructures: string[];
  maxMultiple: number;
  minYearsInBusiness: number;
  minEmployeeCount: number;
}

// ---- Deals ----

export interface BuyBoxFlag {
  field: string;
  dealValue: number | string;
  memberThreshold: number | string;
  message: string;
}

export interface Deal {
  id: string;
  userId: string;
  phase: DealPhase;
  analysisStatus: AnalysisStatus;
  verdict: Verdict | null;

  // Phase 1: Listing
  listingUrl: string | null;
  listingPlatform: string | null;
  listingTitle: string | null;
  listingDescription: string | null;

  // Identification
  businessName: string | null;
  businessAddress: string | null;
  city: string | null;
  state: string | null;
  industry: string | null;
  naicsCode: string | null;
  websiteUrl: string | null;

  // Broker
  brokerName: string | null;
  brokerCompany: string | null;
  brokerEmail: string | null;
  brokerPhone: string | null;

  // Financial
  askingPrice: number | null;
  realEstateValue: number;
  standaloneBusPrice: number | null;
  revenueYear1: number | null;
  revenueYear2: number | null;
  revenueYear3: number | null;
  cogsYear1: number | null;
  cogsYear2: number | null;
  cogsYear3: number | null;
  sdeYear1: number | null;
  sdeYear2: number | null;
  sdeYear3: number | null;
  ownerSalary: number | null;
  operatingExpenses: number | null;

  // Operational
  yearsInBusiness: number | null;
  employeesW2: number | null;
  employees1099: number | null;
  ownerHoursPerWeek: number | null;
  customerConcentrationTopPct: number | null;
  recurringRevenuePct: number | null;
  reasonForSelling: string | null;

  // Real Estate
  realEstateIncluded: boolean;
  monthlyRent: number | null;
  leaseTermRemainingMonths: number | null;
  leaseRenewalOptions: string | null;

  // Assets
  accountsReceivable: number | null;
  accountsPayable: number | null;
  inventoryValue: number | null;
  equipmentFfeValue: number | null;

  memberNotes: string | null;
  buyboxFlags: BuyBoxFlag[];
  cimReceivedAt: string | null;
  responseDeadline: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- Deal Analyzer Results ----

export interface YearProjection {
  year: number;
  revenue: number;
  sde: number;
  annualDebtService: number;
  freeCashFlow: number;
  cumulativeCashFlow: number;
}

export interface DealStackParty {
  role: string;
  name: string;
  cashInvested: number;
  ownershipPct: number;
  projectedAnnualReturn: number;
}

export interface StrategyTier {
  tier: string;
  label: string;
  price: number;
  downPayment: number;
  sellerFinancing: number;
  earnOut: number;
  totalSources: number;
  dscr: number;
  notes: string;
}

export interface DealAnalyzerResult {
  id: string;
  dealId: string;
  askingMultiple: number | null;
  standaloneMultiple: number | null;
  grossMarginYear1: number | null;
  grossMarginYear2: number | null;
  grossMarginYear3: number | null;
  sdeMarginYear1: number | null;
  sdeMarginYear2: number | null;
  sdeMarginYear3: number | null;
  revenueGrowthYoy1: number | null;
  revenueGrowthYoy2: number | null;
  sdeGrowthYoy1: number | null;
  sdeGrowthYoy2: number | null;
  dscrScenario1: number | null;
  dscrScenario2: number | null;
  annualDebtServiceS1: number | null;
  annualDebtServiceS2: number | null;
  workingCapitalFromSpread: number | null;
  dealGrade: DealGrade | null;
  gradeExplanation: string | null;
  projections: YearProjection[] | null;
  exitValue: number | null;
  irr: number | null;
  dealStack: DealStackParty[] | null;
  creativeFinancing: Record<string, unknown> | null;
  strategyLadder: StrategyTier[] | null;
}

// ---- Protocol Results ----

export interface WebsiteAudit {
  url: string;
  ssl: boolean;
  mobileResponsive: boolean;
  lastUpdated: string;
  qualityScore: number;
}

export interface GoogleReviews {
  count: number;
  avgRating: number;
  sentiment: string;
  recentTrend: string;
  flaggedReviews?: string[];
}

export interface DistressSignal {
  signal: string;
  severity: 'high' | 'moderate' | 'low';
  evidence: string;
}

export interface ScorecardItem {
  name: string;
  score: number;
  weight: number;
  notes: string;
}

export interface ProtocolResult {
  id: string;
  dealId: string;
  phase1Complete: boolean;
  industryOverview: string | null;
  marketSize: string | null;
  growthTrends: string | null;
  competitiveLandscape: string | null;
  seasonalPatterns: string | null;
  industryRisks: string | null;
  phase2Complete: boolean;
  websiteAudit: WebsiteAudit | null;
  googleReviews: GoogleReviews | null;
  socialMedia: Record<string, unknown> | null;
  digitalFootprintScore: number | null;
  phase3Complete: boolean;
  distressSignals: DistressSignal[] | null;
  successionIndicators: Record<string, unknown> | null;
  operationalFatigueMarkers: Record<string, unknown> | null;
  financialStressSignals: Record<string, unknown> | null;
  ownerMotivationAnalysis: string | null;
  phase4Complete: boolean;
  scorecard: { criteria: ScorecardItem[]; totalScore: number; maxScore: number } | null;
  protocolVerdict: string | null;
  protocolAssessment: string | null;
  caseStudyNarrative: string | null;
}

// ---- Benchmark Results ----

export interface ScreeningTrait {
  name: string;
  score: ScreeningScore;
  value: string;
  threshold: string;
  notes: string;
}

export interface Screening {
  traits: ScreeningTrait[];
  passCount: number;
  discussCount: number;
  failCount: number;
  overallVerdict: string;
}

export interface DscrScenario {
  scenarioName: string;
  price: number;
  downPct: number;
  rate: number;
  term: number;
  monthlyPayment: number;
  annualDs: number;
  dscr: number;
  meetsFloor: boolean;
}

export interface SensitivityCell {
  revenueGrowth: number;
  marginScenario: string;
  resultingAcf: number;
  resultingDscr: number;
}

export interface BenchmarkResult {
  id: string;
  dealId: string;
  screening: Screening | null;
  industryBenchmarks: Record<string, unknown> | null;
  dealVsBenchmark: Record<string, unknown> | null;
  dscrScenarios: DscrScenario[] | null;
  sensitivity: { matrix: SensitivityCell[]; keyInsights: string[] } | null;
}

// ---- Master Summary ----

export interface RedFlag {
  flag: string;
  severity: FlagSeverity;
  sourceEngine: string;
  dataPoint: string;
}

export interface GreenFlag {
  flag: string;
  sourceEngine: string;
  dataPoint: string;
}

export interface BuyBoxAlignmentItem {
  criteria: string;
  dealValue: string;
  memberTarget: string;
  status: 'match' | 'mismatch';
}

export interface MasterSummary {
  id: string;
  dealId: string;
  verdict: Verdict;
  verdictReasoning: string | null;
  dealSnapshot: Record<string, unknown> | null;
  financialHealth: Record<string, unknown> | null;
  marketPosition: Record<string, unknown> | null;
  businessIntelligence: Record<string, unknown> | null;
  redFlags: RedFlag[];
  greenFlags: GreenFlag[];
  buyboxAlignment: BuyBoxAlignmentItem[];
  sensitivityHighlights: Record<string, unknown> | null;
  recommendedNextSteps: string | null;
}

// ---- Emails ----

export interface EmailGenerated {
  id: string;
  dealId: string;
  userId: string;
  emailType: EmailType;
  subject: string;
  body: string;
  brokerName: string | null;
  businessName: string | null;
  redFlagsIncluded: RedFlag[];
  status: EmailStatus;
  sentAt: string | null;
  sentToEmail: string | null;
  createdAt: string;
}

// ---- Activity Log ----

export type ActivityType =
  | 'deal_created'
  | 'deal_updated'
  | 'analysis_started'
  | 'analysis_complete'
  | 'email_generated'
  | 'email_sent'
  | 'profile_updated'
  | 'buybox_updated'
  | 'login'
  | 'logout';

export interface ActivityLogEntry {
  id: string;
  userId: string;
  dealId: string | null;
  actionType: ActivityType;
  details: Record<string, unknown> | null;
  createdAt: string;
}

// ---- API Response ----

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
}

// ---- Industry Benchmark Reference ----

export interface IndustryBenchmark {
  id: string;
  industry: string;
  naicsCode: string | null;
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
