// ============================================================
// CCC Platform - 30-Minute Research Protocol Engine
// ============================================================
// Uses the Claude API to perform structured business research
// across four phases: Industry, Digital Footprint, Distress
// Signals, and Scorecard generation.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import type {
  WebsiteAudit,
  GoogleReviews,
  DistressSignal,
  ScorecardItem,
} from '@/types';

// ---- Client ----------------------------------------------------

const client = new Anthropic(); // uses ANTHROPIC_API_KEY env var
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

// ---- Input / Output types --------------------------------------

export interface ProtocolDealInput {
  businessName: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  websiteUrl: string | null;
  reasonForSelling: string | null;
  ownerHoursPerWeek: number | null;
  employeesW2: number | null;
  employees1099: number | null;
  yearsInBusiness: number | null;
  revenueYear1: number | null;
  sdeYear1: number | null;
  customerConcentrationTopPct: number | null;
  recurringRevenuePct: number | null;
}

export interface Phase1Result {
  industryOverview: string | null;
  marketSize: string | null;
  growthTrends: string | null;
  competitiveLandscape: string | null;
  seasonalPatterns: string | null;
  industryRisks: string | null;
}

export interface Phase2Result {
  websiteAudit: WebsiteAudit | null;
  googleReviews: GoogleReviews | null;
  socialMedia: Record<string, unknown> | null;
  digitalFootprintScore: number | null;
}

export interface Phase3Result {
  distressSignals: DistressSignal[] | null;
  successionIndicators: Record<string, unknown> | null;
  operationalFatigueMarkers: Record<string, unknown> | null;
  financialStressSignals: Record<string, unknown> | null;
  ownerMotivationAnalysis: string | null;
}

export interface Phase4Result {
  scorecard: { criteria: ScorecardItem[]; totalScore: number; maxScore: number } | null;
  protocolVerdict: string | null;
  protocolAssessment: string | null;
  caseStudyNarrative: string | null;
}

export interface FullProtocolResult {
  phase1: Phase1Result;
  phase2: Phase2Result;
  phase3: Phase3Result;
  phase4: Phase4Result;
}

// ---- Helpers ---------------------------------------------------

/**
 * Call the Claude API with the given system & user prompts and
 * attempt to parse the response as JSON of type T.
 * Returns null on any failure so callers can degrade gracefully.
 */
async function callClaude<T>(systemPrompt: string, userPrompt: string): Promise<T | null> {
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Extract text from the response content blocks
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;

    const raw = textBlock.text.trim();

    // Try to extract JSON from the response – Claude sometimes wraps
    // the JSON in markdown code fences.
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw;

    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error('[Protocol Engine] Claude API call failed:', error);
    return null;
  }
}

/** Build a concise location string from city/state. */
function locationStr(deal: ProtocolDealInput): string {
  const parts: string[] = [];
  if (deal.city) parts.push(deal.city);
  if (deal.state) parts.push(deal.state);
  return parts.length > 0 ? parts.join(', ') : 'United States (location not specified)';
}

/** Build a financial context snippet for prompts that need it. */
function financialContext(deal: ProtocolDealInput): string {
  const lines: string[] = [];
  if (deal.revenueYear1 != null) lines.push(`Annual Revenue: $${deal.revenueYear1.toLocaleString()}`);
  if (deal.sdeYear1 != null) lines.push(`SDE: $${deal.sdeYear1.toLocaleString()}`);
  if (deal.yearsInBusiness != null) lines.push(`Years in business: ${deal.yearsInBusiness}`);
  if (deal.employeesW2 != null) lines.push(`W-2 employees: ${deal.employeesW2}`);
  if (deal.employees1099 != null) lines.push(`1099 contractors: ${deal.employees1099}`);
  if (deal.ownerHoursPerWeek != null) lines.push(`Owner hours/week: ${deal.ownerHoursPerWeek}`);
  if (deal.customerConcentrationTopPct != null) lines.push(`Top customer concentration: ${deal.customerConcentrationTopPct}%`);
  if (deal.recurringRevenuePct != null) lines.push(`Recurring revenue: ${deal.recurringRevenuePct}%`);
  if (deal.reasonForSelling) lines.push(`Reason for selling: ${deal.reasonForSelling}`);
  return lines.join('\n');
}

// ---- Phase 1: Industry Research --------------------------------

const PHASE1_SYSTEM = `You are an expert business research analyst specializing in small-to-medium business acquisitions.
Your task is to provide a thorough industry analysis for a potential acquisition target.
You MUST respond with valid JSON only – no commentary outside the JSON object.
The JSON schema:
{
  "industryOverview": "string — 2-3 paragraph overview of the industry",
  "marketSize": "string — estimated market size with sources/reasoning",
  "growthTrends": "string — growth trajectory, key drivers, headwinds",
  "competitiveLandscape": "string — competitor density, barriers to entry, fragmentation in the specified geography",
  "seasonalPatterns": "string — any seasonal revenue/demand patterns",
  "industryRisks": "string — regulatory, technological, or macro risks"
}`;

export async function runProtocolPhase1(deal: ProtocolDealInput): Promise<Phase1Result> {
  const location = locationStr(deal);
  const industry = deal.industry ?? 'general small business';

  const userPrompt = `Perform a comprehensive industry analysis for the following:

Industry: ${industry}
Geography: ${location}

Please analyze:
1. Industry overview and estimated market size
2. Growth trends (historical and projected)
3. Competitive landscape specifically in ${location}
4. Seasonal patterns that affect revenue or demand
5. Key industry-specific risks (regulatory, technology disruption, macroeconomic)

${financialContext(deal) ? `Additional business context:\n${financialContext(deal)}` : ''}

Return your analysis as a JSON object matching the required schema.`;

  const result = await callClaude<Phase1Result>(PHASE1_SYSTEM, userPrompt);

  return {
    industryOverview: result?.industryOverview ?? null,
    marketSize: result?.marketSize ?? null,
    growthTrends: result?.growthTrends ?? null,
    competitiveLandscape: result?.competitiveLandscape ?? null,
    seasonalPatterns: result?.seasonalPatterns ?? null,
    industryRisks: result?.industryRisks ?? null,
  };
}

// ---- Phase 2: Digital Footprint --------------------------------

interface Phase2ApiResponse {
  websiteAudit: WebsiteAudit | null;
  googleReviews: GoogleReviews | null;
  socialMedia: Record<string, unknown> | null;
  digitalFootprintScore: number | null;
}

const PHASE2_SYSTEM = `You are a digital marketing and online presence analyst specializing in evaluating small-to-medium businesses.
Your task is to assess the digital footprint of a specific business based on the information provided.
You MUST respond with valid JSON only.
The JSON schema:
{
  "websiteAudit": {
    "url": "string",
    "ssl": boolean,
    "mobileResponsive": boolean,
    "lastUpdated": "string — estimated date or 'unknown'",
    "qualityScore": number (1-5)
  } | null,
  "googleReviews": {
    "count": number,
    "avgRating": number,
    "sentiment": "string — overall sentiment summary",
    "recentTrend": "string — improving / declining / stable",
    "flaggedReviews": ["string — any concerning review themes"]
  } | null,
  "socialMedia": {
    "platforms": ["string — detected platforms"],
    "activityLevel": "string — active / moderate / inactive / none",
    "followerEstimate": "string",
    "contentQuality": "string",
    "notes": "string"
  } | null,
  "digitalFootprintScore": number (1-5, where 5 is excellent)
}`;

export async function runProtocolPhase2(deal: ProtocolDealInput): Promise<Phase2Result> {
  const businessName = deal.businessName ?? 'Unknown Business';
  const location = locationStr(deal);
  const industry = deal.industry ?? 'unknown industry';

  const userPrompt = `Analyze the digital footprint of the following business:

Business Name: ${businessName}
Industry: ${industry}
Location: ${location}
${deal.websiteUrl ? `Website URL: ${deal.websiteUrl}` : 'Website URL: Not provided'}

Based on what you can infer about a business with this name, industry, and location, provide your best assessment of:
1. Website quality — evaluate the URL if provided, otherwise assess likelihood of having a quality site
2. Google Reviews — estimate review presence and sentiment for a business of this type/location
3. Social media presence — which platforms they are likely on and how active
4. Overall digital footprint score (1-5)

If you cannot determine specific data points, provide reasonable estimates based on the industry and location, and note that they are estimates.

Return your analysis as a JSON object matching the required schema.`;

  const result = await callClaude<Phase2ApiResponse>(PHASE2_SYSTEM, userPrompt);

  return {
    websiteAudit: result?.websiteAudit ?? null,
    googleReviews: result?.googleReviews ?? null,
    socialMedia: result?.socialMedia ?? null,
    digitalFootprintScore: result?.digitalFootprintScore ?? null,
  };
}

// ---- Phase 3: Distress Signals ---------------------------------

interface Phase3ApiResponse {
  distressSignals: DistressSignal[];
  successionIndicators: Record<string, unknown>;
  operationalFatigueMarkers: Record<string, unknown>;
  financialStressSignals: Record<string, unknown>;
  ownerMotivationAnalysis: string;
}

const PHASE3_SYSTEM = `You are a business due-diligence analyst who specializes in identifying distress signals and owner-transition risks for small-to-medium business acquisitions.
Your task is to analyze the provided business information and identify potential red flags.
You MUST respond with valid JSON only.
The JSON schema:
{
  "distressSignals": [
    {
      "signal": "string — name of the signal",
      "severity": "high" | "moderate" | "low",
      "evidence": "string — what data point or pattern led to this conclusion"
    }
  ],
  "successionIndicators": {
    "ownerAge": "string — any indications",
    "successionPlanExists": "string — assessment",
    "keyPersonRisk": "string — how dependent is the business on the owner",
    "managementTeamReadiness": "string"
  },
  "operationalFatigueMarkers": {
    "ownerWorkload": "string — assessment based on hours/week",
    "staffingAdequacy": "string",
    "processMaturity": "string — are systems in place or owner-dependent",
    "burnoutIndicators": "string"
  },
  "financialStressSignals": {
    "revenueStability": "string",
    "marginPressure": "string",
    "customerConcentrationRisk": "string",
    "cashFlowConcerns": "string"
  },
  "ownerMotivationAnalysis": "string — 2-3 paragraph analysis of the owner's likely true motivation for selling and what that means for the buyer"
}`;

export async function runProtocolPhase3(deal: ProtocolDealInput): Promise<Phase3Result> {
  const businessName = deal.businessName ?? 'Unknown Business';
  const industry = deal.industry ?? 'unknown industry';
  const location = locationStr(deal);

  const userPrompt = `Analyze the following business for distress signals, transition risks, and owner motivation:

Business Name: ${businessName}
Industry: ${industry}
Location: ${location}

Business Data:
${financialContext(deal)}

Please identify:
1. All distress signals with severity level (high/moderate/low) and supporting evidence
2. Succession indicators — key person dependency, management readiness
3. Operational fatigue markers — based on owner hours, staffing levels, process maturity
4. Financial stress signals — revenue stability, margin pressure, concentration risk
5. Owner motivation analysis — what does the stated reason for selling ("${deal.reasonForSelling ?? 'not provided'}") suggest about the true situation?

Be specific and evidence-based. Reference the actual data points provided. If a data point is missing, note that as a gap.

Return your analysis as a JSON object matching the required schema.`;

  const result = await callClaude<Phase3ApiResponse>(PHASE3_SYSTEM, userPrompt);

  return {
    distressSignals: result?.distressSignals ?? null,
    successionIndicators: result?.successionIndicators ?? null,
    operationalFatigueMarkers: result?.operationalFatigueMarkers ?? null,
    financialStressSignals: result?.financialStressSignals ?? null,
    ownerMotivationAnalysis: result?.ownerMotivationAnalysis ?? null,
  };
}

// ---- Phase 4: Scorecard & Verdict ------------------------------

interface Phase4ApiResponse {
  scorecard: {
    criteria: ScorecardItem[];
    totalScore: number;
    maxScore: number;
  };
  protocolVerdict: string;
  protocolAssessment: string;
  caseStudyNarrative: string;
}

const PHASE4_SYSTEM = `You are a senior M&A analyst creating a final acquisition scorecard and recommendation.
You will receive the results of three prior research phases and must synthesize them into a weighted scorecard, verdict, and case study narrative.
You MUST respond with valid JSON only.

The scorecard MUST use these five criteria with these exact weights:
- Financial Fundamentals: 30% weight (score 0-30)
- Market Position: 20% weight (score 0-20)
- Digital Presence: 15% weight (score 0-15)
- Operational Stability: 20% weight (score 0-20)
- Owner/Transition Risk: 15% weight (score 0-15)

Total max score = 100.

Verdict rules:
- GO: total score >= 70
- CONDITIONAL: total score >= 50 and < 70
- NO-GO: total score < 50

The JSON schema:
{
  "scorecard": {
    "criteria": [
      {
        "name": "string — criterion name",
        "score": number,
        "weight": number (as decimal, e.g. 0.30),
        "notes": "string — justification for this score"
      }
    ],
    "totalScore": number,
    "maxScore": 100
  },
  "protocolVerdict": "GO" | "CONDITIONAL" | "NO-GO",
  "protocolAssessment": "string — 2-3 paragraph executive summary assessment",
  "caseStudyNarrative": "string — 3-5 paragraph narrative case study suitable for presentation to an investment committee"
}`;

export async function runProtocolPhase4(
  deal: ProtocolDealInput,
  phase1: Phase1Result,
  phase2: Phase2Result,
  phase3: Phase3Result,
): Promise<Phase4Result> {
  const businessName = deal.businessName ?? 'Unknown Business';
  const industry = deal.industry ?? 'unknown industry';
  const location = locationStr(deal);

  const userPrompt = `Create a final acquisition scorecard and recommendation for:

Business: ${businessName}
Industry: ${industry}
Location: ${location}

Business Financials:
${financialContext(deal)}

=== PHASE 1 — Industry Research ===
Industry Overview: ${phase1.industryOverview ?? 'Not available'}
Market Size: ${phase1.marketSize ?? 'Not available'}
Growth Trends: ${phase1.growthTrends ?? 'Not available'}
Competitive Landscape: ${phase1.competitiveLandscape ?? 'Not available'}
Seasonal Patterns: ${phase1.seasonalPatterns ?? 'Not available'}
Industry Risks: ${phase1.industryRisks ?? 'Not available'}

=== PHASE 2 — Digital Footprint ===
Website Audit: ${phase2.websiteAudit ? JSON.stringify(phase2.websiteAudit) : 'Not available'}
Google Reviews: ${phase2.googleReviews ? JSON.stringify(phase2.googleReviews) : 'Not available'}
Social Media: ${phase2.socialMedia ? JSON.stringify(phase2.socialMedia) : 'Not available'}
Digital Footprint Score: ${phase2.digitalFootprintScore ?? 'Not available'}/5

=== PHASE 3 — Distress Signals ===
Distress Signals: ${phase3.distressSignals ? JSON.stringify(phase3.distressSignals) : 'Not available'}
Succession Indicators: ${phase3.successionIndicators ? JSON.stringify(phase3.successionIndicators) : 'Not available'}
Operational Fatigue: ${phase3.operationalFatigueMarkers ? JSON.stringify(phase3.operationalFatigueMarkers) : 'Not available'}
Financial Stress: ${phase3.financialStressSignals ? JSON.stringify(phase3.financialStressSignals) : 'Not available'}
Owner Motivation: ${phase3.ownerMotivationAnalysis ?? 'Not available'}

Based on ALL of the above data, generate:
1. A weighted scorecard with the five required criteria
2. A verdict (GO / CONDITIONAL / NO-GO) based on the total score
3. An executive assessment (2-3 paragraphs)
4. A case study narrative (3-5 paragraphs) suitable for an investment committee

Return your analysis as a JSON object matching the required schema.`;

  const result = await callClaude<Phase4ApiResponse>(PHASE4_SYSTEM, userPrompt);

  return {
    scorecard: result?.scorecard ?? null,
    protocolVerdict: result?.protocolVerdict ?? null,
    protocolAssessment: result?.protocolAssessment ?? null,
    caseStudyNarrative: result?.caseStudyNarrative ?? null,
  };
}

// ---- Full Protocol Runner --------------------------------------

/**
 * Run all four phases of the 30-Minute Research Protocol in sequence.
 * Phases 1-3 are independent and run in parallel for speed.
 * Phase 4 depends on the results of phases 1-3.
 */
export async function runFullProtocol(deal: ProtocolDealInput): Promise<FullProtocolResult> {
  // Run phases 1-3 in parallel
  const [phase1, phase2, phase3] = await Promise.all([
    runProtocolPhase1(deal),
    runProtocolPhase2(deal),
    runProtocolPhase3(deal),
  ]);

  // Phase 4 depends on phases 1-3
  const phase4 = await runProtocolPhase4(deal, phase1, phase2, phase3);

  return { phase1, phase2, phase3, phase4 };
}
