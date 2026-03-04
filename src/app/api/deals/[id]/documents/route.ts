import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  errorResponse,
  unauthorizedError,
  notFoundError,
  forbiddenError,
  validationError,
} from "@/lib/api-response";
import ExcelJS from "exceljs";

// ---------------------------------------------------------------------------
// GET /api/deals/[id]/documents?type=summary|case-study|loi|benchmark|analyzer
// ---------------------------------------------------------------------------

const VALID_TYPES = ["summary", "case-study", "loi", "benchmark", "analyzer"] as const;
type DocType = (typeof VALID_TYPES)[number];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();

    const { id } = await params;
    const type = request.nextUrl.searchParams.get("type") as DocType | null;

    if (!type || !VALID_TYPES.includes(type)) {
      return validationError(
        `Invalid document type. Must be one of: ${VALID_TYPES.join(", ")}`,
      );
    }

    // Verify deal ownership
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        dealAnalyzerResult: true,
        protocolResult: true,
        benchmarkResult: true,
        masterSummary: true,
      },
    });

    if (!deal) return notFoundError("Deal not found");
    if (deal.userId !== session.user.id && session.user.role !== "admin") {
      return forbiddenError();
    }

    switch (type) {
      case "summary":
        return generateSummaryPdf(deal);
      case "case-study":
        return generateCaseStudy(deal);
      case "loi":
        return generateLoi(deal, session.user.id);
      case "benchmark":
        return generateBenchmarkXlsx(deal);
      case "analyzer":
        return generateAnalyzerXlsx(deal);
    }
  } catch (error) {
    console.error("[GET /api/deals/[id]/documents] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to generate document", 500);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(v: number | null | undefined): string {
  if (v == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function pct(v: number | null | undefined): string {
  if (v == null) return "N/A";
  return `${(v * 100).toFixed(1)}%`;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function htmlResponse(html: string, filename: string): NextResponse {
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// ---------------------------------------------------------------------------
// 1. Master Deal Summary (HTML for print-to-PDF)
// ---------------------------------------------------------------------------

function generateSummaryPdf(deal: DealWithRelations): NextResponse {
  const ms = deal.masterSummary;
  if (!ms) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "NOT_READY", message: "Run analysis first" } },
      { status: 404 },
    );
  }

  const snap = (ms.dealSnapshot ?? {}) as Record<string, string>;
  const fin = (ms.financialHealth ?? {}) as Record<string, string>;
  const flags = (ms.redFlags ?? []) as Array<{ flag: string; severity: string }>;
  const greens = (ms.greenFlags ?? []) as string[];
  const stepsRaw = ms.recommendedNextSteps;
  const steps = (Array.isArray(stepsRaw) ? stepsRaw : stepsRaw ? [stepsRaw] : []) as string[];

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Master Deal Summary</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
  h1 { color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
  h2 { color: #2563eb; margin-top: 32px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f1f5f9; }
  .verdict { font-size: 24px; font-weight: bold; padding: 12px; border-radius: 8px; text-align: center; margin: 16px 0; }
  .verdict.go { background: #dcfce7; color: #166534; }
  .verdict.no_go { background: #fef2f2; color: #991b1b; }
  .verdict.conditional { background: #fefce8; color: #854d0e; }
  .flag-critical { color: #dc2626; }
  .flag-warning { color: #d97706; }
  .green { color: #16a34a; }
  @media print { body { padding: 20px; } }
</style></head><body>
<h1>Master Deal Summary — ${snap.businessName || deal.businessName || "Deal"}</h1>
<div class="verdict ${ms.verdict}">${(ms.verdict ?? "").toUpperCase().replace("_", "-")}</div>
<p>${ms.verdictReasoning ?? ""}</p>

<h2>Deal Snapshot</h2>
<table>
  <tr><th>Industry</th><td>${snap.industry || deal.industry || "N/A"}</td></tr>
  <tr><th>Location</th><td>${snap.location || [deal.city, deal.state].filter(Boolean).join(", ") || "N/A"}</td></tr>
  <tr><th>Asking Price</th><td>${snap.askingPrice || fmt(num(deal.askingPrice))}</td></tr>
  <tr><th>Standalone Biz Price</th><td>${snap.standaloneBusPrice || "N/A"}</td></tr>
  <tr><th>Asking Multiple</th><td>${snap.askingMultiple || "N/A"}</td></tr>
  <tr><th>Deal Grade</th><td>${snap.dealGrade || "N/A"}</td></tr>
</table>

<h2>Financial Health</h2>
<table>
  <tr><th>Revenue (Year 1)</th><td>${fin.revenueYear1 || fmt(num(deal.revenueYear1))}</td></tr>
  <tr><th>SDE (Year 1)</th><td>${fin.sdeYear1 || fmt(num(deal.sdeYear1))}</td></tr>
  <tr><th>Gross Margin</th><td>${fin.grossMarginYear1 || "N/A"}</td></tr>
  <tr><th>SDE Margin</th><td>${fin.sdeMarginYear1 || "N/A"}</td></tr>
  <tr><th>DSCR Scenario 1</th><td>${fin.dscrScenario1 || "N/A"}</td></tr>
  <tr><th>DSCR Scenario 2</th><td>${fin.dscrScenario2 || "N/A"}</td></tr>
  <tr><th>Screening Verdict</th><td>${fin.screeningVerdict || "N/A"}</td></tr>
</table>

${flags.length > 0 ? `<h2>Red Flags</h2><ul>${flags.map((f) => `<li class="flag-${f.severity}">[${f.severity.toUpperCase()}] ${f.flag}</li>`).join("")}</ul>` : ""}
${greens.length > 0 ? `<h2>Green Flags</h2><ul>${greens.map((g) => `<li class="green">${g}</li>`).join("")}</ul>` : ""}
${steps.length > 0 ? `<h2>Recommended Next Steps</h2><ol>${steps.map((s) => `<li>${s}</li>`).join("")}</ol>` : ""}

<p style="margin-top:40px;font-size:12px;color:#999;">Generated by CCC Platform &bull; Print this page to save as PDF</p>
</body></html>`;

  return htmlResponse(html, `Master_Deal_Summary_${deal.businessName || deal.id}.html`);
}

// ---------------------------------------------------------------------------
// 2. Case Study (from Protocol result)
// ---------------------------------------------------------------------------

function generateCaseStudy(deal: DealWithRelations): NextResponse {
  const pr = deal.protocolResult;
  if (!pr) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "NOT_READY", message: "Run analysis first" } },
      { status: 404 },
    );
  }

  const phase1 = {
    industryOverview: pr.industryOverview,
    marketSize: pr.marketSize,
    growthTrends: pr.growthTrends,
    competitiveLandscape: pr.competitiveLandscape,
    seasonalPatterns: pr.seasonalPatterns,
    industryRisks: pr.industryRisks,
  };
  const phase2 = {
    websiteAudit: pr.websiteAudit,
    googleReviews: pr.googleReviews,
    socialMedia: pr.socialMedia,
    digitalFootprintScore: pr.digitalFootprintScore,
  };
  const phase3 = {
    distressSignals: pr.distressSignals,
    successionIndicators: pr.successionIndicators,
    operationalFatigueMarkers: pr.operationalFatigueMarkers,
    financialStressSignals: pr.financialStressSignals,
    ownerMotivationAnalysis: pr.ownerMotivationAnalysis,
  };
  const phase4 = {
    scorecard: pr.scorecard,
    protocolVerdict: pr.protocolVerdict,
    protocolAssessment: pr.protocolAssessment,
    caseStudyNarrative: pr.caseStudyNarrative,
  };

  const phases = [
    { title: "Phase 1: Industry Research", data: phase1 },
    { title: "Phase 2: Digital Footprint", data: phase2 },
    { title: "Phase 3: Distress Signals", data: phase3 },
    { title: "Phase 4: Weighted Scorecard", data: phase4 },
  ];

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Case Study</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
  h1 { color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
  h2 { color: #2563eb; margin-top: 32px; }
  pre { background: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; white-space: pre-wrap; }
</style></head><body>
<h1>30-Minute Protocol Case Study</h1>
<h2>${deal.businessName || "Deal"} — ${deal.industry || "N/A"}</h2>
<p>Verdict: <strong>${(pr.protocolVerdict ?? "N/A").toUpperCase()}</strong></p>
<p>Score: ${pr.digitalFootprintScore ?? "N/A"}/100</p>

${phases.map((p) => `<h2>${p.title}</h2><pre>${JSON.stringify(p.data, null, 2)}</pre>`).join("\n")}

<p style="margin-top:40px;font-size:12px;color:#999;">Generated by CCC Platform</p>
</body></html>`;

  return htmlResponse(html, `Case_Study_${deal.businessName || deal.id}.html`);
}

// ---------------------------------------------------------------------------
// 3. Letter of Intent
// ---------------------------------------------------------------------------

async function generateLoi(deal: DealWithRelations, userId: string): Promise<NextResponse> {
  const profile = await prisma.memberProfile.findUnique({
    where: { userId },
  });

  const buyerName = profile?.fullName ?? "___________________";
  const buyerCompany = profile?.companyName ?? "___________________";
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Letter of Intent</title>
<style>
  body { font-family: "Times New Roman", serif; max-width: 700px; margin: 0 auto; padding: 60px 40px; color: #333; line-height: 1.6; }
  h1 { text-align: center; font-size: 22px; margin-bottom: 40px; }
  .field { border-bottom: 1px solid #333; display: inline-block; min-width: 180px; }
  .section { margin: 24px 0; }
  .signature { margin-top: 60px; }
</style></head><body>
<h1>LETTER OF INTENT</h1>

<p><strong>Date:</strong> ${today}</p>
<p><strong>To:</strong> The Owner(s) of ${deal.businessName || "___________________"}</p>
<p><strong>From:</strong> ${buyerName}, ${buyerCompany}</p>

<div class="section">
<p>Dear Sir or Madam,</p>
<p>This Letter of Intent ("LOI") sets forth the principal terms under which <strong>${buyerCompany}</strong> ("Buyer") proposes to acquire substantially all of the assets of <strong>${deal.businessName || "___________________"}</strong> ("Seller"), located in ${deal.city || "___________"}, ${deal.state || "____"} (the "Business").</p>
</div>

<div class="section">
<h3>1. Purchase Price</h3>
<p>The total proposed purchase price is <strong>${fmt(num(deal.askingPrice))}</strong>, subject to adjustment based on due diligence findings, allocated as follows:</p>
<ul>
  <li>Business assets and goodwill: <strong>${fmt(num(deal.standaloneBusPrice) ?? num(deal.askingPrice))}</strong></li>
  ${num(deal.realEstateValue) ? `<li>Real estate: <strong>${fmt(num(deal.realEstateValue))}</strong></li>` : ""}
</ul>
</div>

<div class="section">
<h3>2. Due Diligence Period</h3>
<p>Buyer shall have sixty (60) calendar days from the date of mutual execution to conduct due diligence on the Business, including review of financial statements, tax returns, customer and vendor contracts, and employee matters.</p>
</div>

<div class="section">
<h3>3. Financing</h3>
<p>The acquisition is expected to be financed through a combination of SBA 7(a) lending and buyer equity. Final terms are subject to lender approval.</p>
</div>

<div class="section">
<h3>4. Confidentiality</h3>
<p>Both parties agree to maintain strict confidentiality regarding all information exchanged during this process.</p>
</div>

<div class="section">
<h3>5. Non-Binding Nature</h3>
<p>This LOI is non-binding and is intended solely as a basis for further discussion. No binding obligation shall arise until a definitive purchase agreement is executed by both parties.</p>
</div>

<div class="signature">
<p>Sincerely,</p>
<br><br>
<p>____________________________</p>
<p>${buyerName}<br>${buyerCompany}</p>
${profile?.phone ? `<p>${profile.phone}</p>` : ""}
</div>

<p style="margin-top:60px;font-size:11px;color:#999;">Generated by CCC Platform</p>
</body></html>`;

  return htmlResponse(html, `LOI_${deal.businessName || deal.id}.html`);
}

// ---------------------------------------------------------------------------
// 4. Benchmark Report (XLSX)
// ---------------------------------------------------------------------------

async function generateBenchmarkXlsx(deal: DealWithRelations): Promise<NextResponse> {
  const br = deal.benchmarkResult;
  if (!br) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "NOT_READY", message: "Run analysis first" } },
      { status: 404 },
    );
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "CCC Platform";

  // Tab 1: Screening Scorecard
  const screeningData = br.screening as { traits?: Array<Record<string, string>> } | null;
  const ws1 = wb.addWorksheet("Screening Scorecard");
  ws1.columns = [
    { header: "Trait", key: "name", width: 30 },
    { header: "Score", key: "score", width: 12 },
    { header: "Value", key: "value", width: 20 },
    { header: "Threshold", key: "threshold", width: 20 },
    { header: "Notes", key: "notes", width: 40 },
  ];
  styleHeader(ws1);
  if (screeningData?.traits) {
    for (const t of screeningData.traits) {
      ws1.addRow(t);
    }
  }

  // Tab 2: Industry Benchmarks
  const benchData = br.industryBenchmarks as Record<string, unknown> | null;
  const ws2 = wb.addWorksheet("Industry Benchmarks");
  ws2.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Deal Value", key: "deal", width: 20 },
    { header: "Industry Avg", key: "industry", width: 20 },
    { header: "Delta", key: "delta", width: 20 },
  ];
  styleHeader(ws2);
  if (benchData && typeof benchData === "object") {
    for (const [key, val] of Object.entries(benchData)) {
      const v = val as Record<string, unknown> | null;
      if (v && typeof v === "object") {
        ws2.addRow({
          metric: key,
          deal: v.dealValue ?? "N/A",
          industry: v.industryAvg ?? "N/A",
          delta: v.delta ?? "N/A",
        });
      }
    }
  }

  // Tab 3: DSCR Scenarios
  const sensitivityData = br.sensitivity as { matrix?: Array<Record<string, unknown>>; keyInsights?: string[] } | null;
  const ws3 = wb.addWorksheet("DSCR Scenarios");
  ws3.columns = [
    { header: "Scenario", key: "scenario", width: 30 },
    { header: "Price", key: "price", width: 18 },
    { header: "Down Payment", key: "down", width: 18 },
    { header: "DSCR", key: "dscr", width: 12 },
    { header: "Monthly Payment", key: "payment", width: 18 },
  ];
  styleHeader(ws3);
  if (sensitivityData?.matrix) {
    for (const row of sensitivityData.matrix) {
      ws3.addRow(row);
    }
  }

  // Tab 4: Key Insights
  const ws4 = wb.addWorksheet("Key Insights");
  ws4.columns = [{ header: "Insight", key: "insight", width: 80 }];
  styleHeader(ws4);
  if (sensitivityData?.keyInsights) {
    for (const insight of sensitivityData.keyInsights) {
      ws4.addRow({ insight });
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Benchmark_Report_${deal.businessName || deal.id}.xlsx"`,
    },
  });
}

// ---------------------------------------------------------------------------
// 5. Deal Analyzer Export (XLSX)
// ---------------------------------------------------------------------------

async function generateAnalyzerXlsx(deal: DealWithRelations): Promise<NextResponse> {
  const ar = deal.dealAnalyzerResult;
  if (!ar) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "NOT_READY", message: "Run analysis first" } },
      { status: 404 },
    );
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "CCC Platform";

  // Tab 1: Deal Overview
  const ws1 = wb.addWorksheet("Deal Overview");
  ws1.columns = [
    { header: "Metric", key: "metric", width: 35 },
    { header: "Value", key: "value", width: 25 },
  ];
  styleHeader(ws1);
  const overview = [
    ["Deal Grade", ar.dealGrade ?? "N/A"],
    ["Asking Multiple", ar.askingMultiple != null ? `${Number(ar.askingMultiple).toFixed(2)}x` : "N/A"],
    ["Standalone Multiple", ar.standaloneMultiple != null ? `${Number(ar.standaloneMultiple).toFixed(2)}x` : "N/A"],
    ["Gross Margin (Year 1)", ar.grossMarginYear1 != null ? pct(Number(ar.grossMarginYear1)) : "N/A"],
    ["SDE Margin (Year 1)", ar.sdeMarginYear1 != null ? pct(Number(ar.sdeMarginYear1)) : "N/A"],
    ["Revenue Growth YoY 1→2", ar.revenueGrowthYoy1 != null ? pct(Number(ar.revenueGrowthYoy1)) : "N/A"],
    ["Revenue Growth YoY 2→3", ar.revenueGrowthYoy2 != null ? pct(Number(ar.revenueGrowthYoy2)) : "N/A"],
    ["DSCR Scenario 1 (10% down)", ar.dscrScenario1 != null ? `${Number(ar.dscrScenario1).toFixed(2)}x` : "N/A"],
    ["DSCR Scenario 2 (5% down)", ar.dscrScenario2 != null ? `${Number(ar.dscrScenario2).toFixed(2)}x` : "N/A"],
    ["Annual Debt Service (S1)", ar.annualDebtServiceS1 != null ? fmt(Number(ar.annualDebtServiceS1)) : "N/A"],
    ["Working Capital from Spread", ar.workingCapitalFromSpread != null ? fmt(Number(ar.workingCapitalFromSpread)) : "N/A"],
    ["5-Year IRR", ar.irr != null ? pct(Number(ar.irr)) : "N/A"],
    ["Exit Value (5yr)", ar.exitValue != null ? fmt(Number(ar.exitValue)) : "N/A"],
  ];
  for (const [metric, value] of overview) {
    ws1.addRow({ metric, value });
  }

  // Tab 2: Projections
  const projections = ar.projections as Array<Record<string, unknown>> | null;
  const ws2 = wb.addWorksheet("5-Year Projections");
  ws2.columns = [
    { header: "Year", key: "year", width: 10 },
    { header: "Revenue", key: "revenue", width: 18 },
    { header: "SDE", key: "sde", width: 18 },
    { header: "Debt Service", key: "debtService", width: 18 },
    { header: "Free Cash Flow", key: "freeCashFlow", width: 18 },
    { header: "Cumulative CF", key: "cumulativeCf", width: 18 },
  ];
  styleHeader(ws2);
  if (projections) {
    for (const p of projections) {
      ws2.addRow(p);
    }
  }

  // Tab 3: Strategy Tiers
  const strategy = ar.strategyLadder as Array<Record<string, unknown>> | null;
  const ws3 = wb.addWorksheet("Strategy Tiers");
  ws3.columns = [
    { header: "Tier", key: "tier", width: 20 },
    { header: "Price", key: "price", width: 18 },
    { header: "Multiple", key: "multiple", width: 12 },
    { header: "DSCR", key: "dscr", width: 12 },
    { header: "Rationale", key: "rationale", width: 50 },
  ];
  styleHeader(ws3);
  if (strategy) {
    for (const s of strategy) {
      ws3.addRow(s);
    }
  }

  // Tab 4: Grade Details
  const ws4 = wb.addWorksheet("Grade Details");
  ws4.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 60 },
  ];
  styleHeader(ws4);
  ws4.addRow({ metric: "Deal Grade", value: ar.dealGrade ?? "N/A" });
  ws4.addRow({ metric: "Grade Explanation", value: ar.gradeExplanation ?? "N/A" });

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Deal_Analyzer_${deal.businessName || deal.id}.xlsx"`,
    },
  });
}

// ---------------------------------------------------------------------------
// Shared XLSX styling
// ---------------------------------------------------------------------------

function styleHeader(ws: ExcelJS.Worksheet) {
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2563EB" },
  };
  headerRow.alignment = { vertical: "middle" };
}

// ---------------------------------------------------------------------------
// Type for deal with included relations
// ---------------------------------------------------------------------------

type DealWithRelations = Prisma.DealGetPayload<{
  include: {
    dealAnalyzerResult: true;
    protocolResult: true;
    benchmarkResult: true;
    masterSummary: true;
  };
}>;
