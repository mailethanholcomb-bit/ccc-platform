import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  validationError,
  unauthorizedError,
  notFoundError,
  forbiddenError,
} from "@/lib/api-response";
import { runDealAnalyzer } from "@/lib/engines/deal-analyzer";
import { runBenchmark } from "@/lib/engines/benchmark";
import { runFullProtocol } from "@/lib/engines/protocol";
import { generateMasterSummary } from "@/lib/engines/master-summary";
import { determineVerdict } from "@/lib/engines/verdict";
import { generateEmails } from "@/lib/engines/email-generator";

// Helper to convert a value to Prisma-compatible JSON or DbNull
function toJsonOrNull(val: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (val === null || val === undefined) return Prisma.DbNull;
  return val as Prisma.InputJsonValue;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();

    const { id } = await params;

    // Fetch the deal
    const deal = await prisma.deal.findUnique({
      where: { id },
    });

    if (!deal) return notFoundError("Deal not found");

    // Must belong to current user unless admin
    if (deal.userId !== session.user.id && session.user.role !== "admin") {
      return forbiddenError();
    }

    // Validate that deal has sufficient data for analysis
    if (!deal.askingPrice || !deal.sdeYear1 || !deal.revenueYear1) {
      return validationError(
        "Deal requires at minimum: asking price, SDE (year 1), and revenue (year 1) to run analysis",
      );
    }

    // Check that the deal is not already being analyzed
    if (
      deal.analysisStatus !== "pending" &&
      deal.analysisStatus !== "complete" &&
      deal.analysisStatus !== "error"
    ) {
      return errorResponse(
        "ANALYSIS_IN_PROGRESS",
        "Analysis is already running for this deal",
        409,
      );
    }

    // Update status to queued
    await prisma.deal.update({
      where: { id },
      data: { analysisStatus: "queued" },
    });

    // Log analysis started
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        dealId: id,
        actionType: "analysis_started",
        details: { businessName: deal.businessName ?? deal.listingTitle },
      },
    });

    // Fetch the member's profile for DSCR floor and other buy box params
    const profile = await prisma.memberProfile.findUnique({
      where: { userId: deal.userId },
    });

    const dscrFloor = profile ? Number(profile.dscrFloor) : 1.75;

    // Run the analysis pipeline
    try {
      // ---- Step 1: Deal Analyzer ----
      await prisma.deal.update({
        where: { id },
        data: { analysisStatus: "running_analyzer" },
      });

      const analyzerInput = {
        askingPrice: Number(deal.askingPrice),
        realEstateValue: Number(deal.realEstateValue),
        revenueYear1: Number(deal.revenueYear1),
        revenueYear2: deal.revenueYear2 ? Number(deal.revenueYear2) : null,
        revenueYear3: deal.revenueYear3 ? Number(deal.revenueYear3) : null,
        cogsYear1: deal.cogsYear1 ? Number(deal.cogsYear1) : null,
        cogsYear2: deal.cogsYear2 ? Number(deal.cogsYear2) : null,
        cogsYear3: deal.cogsYear3 ? Number(deal.cogsYear3) : null,
        sdeYear1: Number(deal.sdeYear1),
        sdeYear2: deal.sdeYear2 ? Number(deal.sdeYear2) : null,
        sdeYear3: deal.sdeYear3 ? Number(deal.sdeYear3) : null,
        ownerSalary: deal.ownerSalary ? Number(deal.ownerSalary) : null,
        operatingExpenses: deal.operatingExpenses
          ? Number(deal.operatingExpenses)
          : null,
        employeesW2: deal.employeesW2,
        employees1099: deal.employees1099,
        ownerHoursPerWeek: deal.ownerHoursPerWeek,
        monthlyRent: deal.monthlyRent ? Number(deal.monthlyRent) : null,
        realEstateIncluded: deal.realEstateIncluded,
      };
      const analyzerResult = runDealAnalyzer(analyzerInput, dscrFloor);

      // Prepare analyzer data for Prisma (convert complex types to JSON)
      const analyzerData = {
        askingMultiple: analyzerResult.askingMultiple,
        standaloneMultiple: analyzerResult.standaloneMultiple,
        grossMarginYear1: analyzerResult.grossMarginYear1,
        grossMarginYear2: analyzerResult.grossMarginYear2,
        grossMarginYear3: analyzerResult.grossMarginYear3,
        sdeMarginYear1: analyzerResult.sdeMarginYear1,
        sdeMarginYear2: analyzerResult.sdeMarginYear2,
        sdeMarginYear3: analyzerResult.sdeMarginYear3,
        revenueGrowthYoy1: analyzerResult.revenueGrowthYoy1,
        revenueGrowthYoy2: analyzerResult.revenueGrowthYoy2,
        sdeGrowthYoy1: analyzerResult.sdeGrowthYoy1,
        sdeGrowthYoy2: analyzerResult.sdeGrowthYoy2,
        dscrScenario1: analyzerResult.dscrScenario1,
        dscrScenario2: analyzerResult.dscrScenario2,
        annualDebtServiceS1: analyzerResult.annualDebtServiceS1,
        annualDebtServiceS2: analyzerResult.annualDebtServiceS2,
        workingCapitalFromSpread: analyzerResult.workingCapitalFromSpread,
        dealGrade: analyzerResult.dealGrade,
        gradeExplanation: analyzerResult.gradeExplanation,
        projections: toJsonOrNull(analyzerResult.projections),
        exitValue: analyzerResult.exitValue,
        irr: analyzerResult.irr,
        dealStack: toJsonOrNull(analyzerResult.dealStack),
        creativeFinancing: toJsonOrNull(analyzerResult.creativeFinancing),
        strategyLadder: toJsonOrNull(analyzerResult.strategyLadder),
      };

      await prisma.dealAnalyzerResult.upsert({
        where: { dealId: id },
        update: analyzerData,
        create: { dealId: id, ...analyzerData },
      });

      // ---- Step 2: Protocol ----
      await prisma.deal.update({
        where: { id },
        data: { analysisStatus: "running_protocol" },
      });

      const protocolInput = {
        businessName: deal.businessName,
        industry: deal.industry,
        city: deal.city,
        state: deal.state,
        websiteUrl: deal.websiteUrl,
        reasonForSelling: deal.reasonForSelling,
        ownerHoursPerWeek: deal.ownerHoursPerWeek,
        employeesW2: deal.employeesW2,
        employees1099: deal.employees1099,
        yearsInBusiness: deal.yearsInBusiness,
        revenueYear1: deal.revenueYear1 ? Number(deal.revenueYear1) : null,
        sdeYear1: deal.sdeYear1 ? Number(deal.sdeYear1) : null,
        customerConcentrationTopPct: deal.customerConcentrationTopPct
          ? Number(deal.customerConcentrationTopPct)
          : null,
        recurringRevenuePct: deal.recurringRevenuePct
          ? Number(deal.recurringRevenuePct)
          : null,
      };
      const protocolResult = await runFullProtocol(protocolInput);

      // Upsert protocol results
      const protocolData = {
        phase1Complete: true,
        industryOverview: protocolResult.phase1.industryOverview,
        marketSize: protocolResult.phase1.marketSize,
        growthTrends: protocolResult.phase1.growthTrends,
        competitiveLandscape: protocolResult.phase1.competitiveLandscape,
        seasonalPatterns: protocolResult.phase1.seasonalPatterns,
        industryRisks: protocolResult.phase1.industryRisks,
        phase2Complete: true,
        websiteAudit: toJsonOrNull(protocolResult.phase2.websiteAudit),
        googleReviews: toJsonOrNull(protocolResult.phase2.googleReviews),
        socialMedia: toJsonOrNull(protocolResult.phase2.socialMedia),
        digitalFootprintScore: protocolResult.phase2.digitalFootprintScore,
        phase3Complete: true,
        distressSignals: toJsonOrNull(protocolResult.phase3.distressSignals),
        successionIndicators: toJsonOrNull(protocolResult.phase3.successionIndicators),
        operationalFatigueMarkers: toJsonOrNull(protocolResult.phase3.operationalFatigueMarkers),
        financialStressSignals: toJsonOrNull(protocolResult.phase3.financialStressSignals),
        ownerMotivationAnalysis: protocolResult.phase3.ownerMotivationAnalysis,
        phase4Complete: true,
        scorecard: toJsonOrNull(protocolResult.phase4.scorecard),
        protocolVerdict: protocolResult.phase4.protocolVerdict,
        protocolAssessment: protocolResult.phase4.protocolAssessment,
        caseStudyNarrative: protocolResult.phase4.caseStudyNarrative,
      };

      await prisma.protocolResult.upsert({
        where: { dealId: id },
        update: protocolData,
        create: { dealId: id, ...protocolData },
      });

      // ---- Step 3: Benchmark ----
      await prisma.deal.update({
        where: { id },
        data: { analysisStatus: "running_benchmark" },
      });

      // Fetch industry benchmark for the deal's industry
      const industryBenchmark = deal.industry
        ? await prisma.industryBenchmark.findFirst({
            where: { industry: deal.industry },
          })
        : null;

      const benchmarkDealInput = {
        askingPrice: Number(deal.askingPrice),
        realEstateValue: Number(deal.realEstateValue),
        standaloneBusPrice: deal.standaloneBusPrice
          ? Number(deal.standaloneBusPrice)
          : Number(deal.askingPrice) - Number(deal.realEstateValue),
        revenueYear1: Number(deal.revenueYear1),
        revenueYear2: deal.revenueYear2 ? Number(deal.revenueYear2) : null,
        revenueYear3: deal.revenueYear3 ? Number(deal.revenueYear3) : null,
        cogsYear1: deal.cogsYear1 ? Number(deal.cogsYear1) : null,
        sdeYear1: Number(deal.sdeYear1),
        sdeYear2: deal.sdeYear2 ? Number(deal.sdeYear2) : null,
        sdeYear3: deal.sdeYear3 ? Number(deal.sdeYear3) : null,
        operatingExpenses: deal.operatingExpenses
          ? Number(deal.operatingExpenses)
          : null,
        yearsInBusiness: deal.yearsInBusiness,
        employeesW2: deal.employeesW2,
        employees1099: deal.employees1099,
        ownerHoursPerWeek: deal.ownerHoursPerWeek,
        customerConcentrationTopPct: deal.customerConcentrationTopPct
          ? Number(deal.customerConcentrationTopPct)
          : null,
        recurringRevenuePct: deal.recurringRevenuePct
          ? Number(deal.recurringRevenuePct)
          : null,
        realEstateIncluded: deal.realEstateIncluded,
        leaseTermRemainingMonths: deal.leaseTermRemainingMonths,
        leaseRenewalOptions: deal.leaseRenewalOptions,
        memberNotes: deal.memberNotes,
        dscrScenario1: analyzerResult.dscrScenario1 ?? 0,
        annualDebtServiceS1: analyzerResult.annualDebtServiceS1 ?? 0,
        grossMarginYear1: analyzerResult.grossMarginYear1,
        standaloneMultiple: analyzerResult.standaloneMultiple,
      };

      const memberProfileInput = profile
        ? {
            dscrFloor: Number(profile.dscrFloor),
            minEmployeeCount: profile.minEmployeeCount,
            minYearsInBusiness: profile.minYearsInBusiness,
            maxMultiple: Number(profile.maxMultiple),
          }
        : null;

      const industryBenchmarkInput = industryBenchmark
        ? {
            avgGrossMargin: Number(industryBenchmark.avgGrossMargin),
            avgNetMargin: Number(industryBenchmark.avgNetMargin),
            avgSdeMargin: Number(industryBenchmark.avgSdeMargin),
            avgRevenuePerEmployee: Number(industryBenchmark.avgRevenuePerEmployee),
            avgMultiple: Number(industryBenchmark.avgMultiple),
            multipleRangeLow: Number(industryBenchmark.multipleRangeLow),
            multipleRangeHigh: Number(industryBenchmark.multipleRangeHigh),
            avgGrowthRate: Number(industryBenchmark.avgGrowthRate),
            avgCustomerConcentration: Number(industryBenchmark.avgCustomerConcentration),
            avgRecurringRevenuePct: Number(industryBenchmark.avgRecurringRevenuePct),
          }
        : {
            avgGrossMargin: 0.45,
            avgNetMargin: 0.12,
            avgSdeMargin: 0.2,
            avgRevenuePerEmployee: 200000,
            avgMultiple: 3.0,
            multipleRangeLow: 2.0,
            multipleRangeHigh: 4.5,
            avgGrowthRate: 0.05,
            avgCustomerConcentration: 0.25,
            avgRecurringRevenuePct: 0.3,
          };

      const benchmarkResult = runBenchmark(
        benchmarkDealInput,
        memberProfileInput,
        industryBenchmarkInput,
      );

      // Upsert benchmark results
      const benchmarkData = {
        screening: toJsonOrNull(benchmarkResult.screening),
        industryBenchmarks: toJsonOrNull(benchmarkResult.industryComparison),
        dealVsBenchmark: Prisma.DbNull as typeof Prisma.DbNull,
        dscrScenarios: toJsonOrNull(benchmarkResult.dscrScenarios),
        sensitivity: toJsonOrNull(benchmarkResult.sensitivityAnalysis),
      };

      await prisma.benchmarkResult.upsert({
        where: { dealId: id },
        update: benchmarkData,
        create: { dealId: id, ...benchmarkData },
      });

      // ---- Step 4: Generate Master Summary ----
      await prisma.deal.update({
        where: { id },
        data: { analysisStatus: "generating_summary" },
      });

      const screeningSummary = benchmarkResult.screening;
      const masterSummaryInput = {
        deal: {
          businessName: deal.businessName,
          industry: deal.industry,
          city: deal.city,
          state: deal.state,
          askingPrice: deal.askingPrice ? Number(deal.askingPrice) : null,
          standaloneBusPrice: deal.standaloneBusPrice
            ? Number(deal.standaloneBusPrice)
            : null,
          revenueYear1: deal.revenueYear1 ? Number(deal.revenueYear1) : null,
          sdeYear1: deal.sdeYear1 ? Number(deal.sdeYear1) : null,
          realEstateValue: Number(deal.realEstateValue),
          realEstateIncluded: deal.realEstateIncluded,
        },
        analyzerResult: {
          askingMultiple: analyzerResult.askingMultiple,
          standaloneMultiple: analyzerResult.standaloneMultiple,
          grossMarginYear1: analyzerResult.grossMarginYear1,
          sdeMarginYear1: analyzerResult.sdeMarginYear1,
          revenueGrowthYoy1: analyzerResult.revenueGrowthYoy1,
          dscrScenario1: analyzerResult.dscrScenario1,
          dscrScenario2: analyzerResult.dscrScenario2,
          annualDebtServiceS1: analyzerResult.annualDebtServiceS1,
          dealGrade: analyzerResult.dealGrade,
          gradeExplanation: analyzerResult.gradeExplanation,
          workingCapitalFromSpread: analyzerResult.workingCapitalFromSpread,
        },
        protocolResult: {
          industryOverview: protocolResult.phase1.industryOverview,
          competitiveLandscape: protocolResult.phase1.competitiveLandscape,
          digitalFootprintScore: protocolResult.phase2.digitalFootprintScore,
          googleReviews: protocolResult.phase2.googleReviews
            ? {
                count: protocolResult.phase2.googleReviews.count,
                avgRating: protocolResult.phase2.googleReviews.avgRating,
                sentiment: protocolResult.phase2.googleReviews.sentiment,
              }
            : null,
          distressSignals: protocolResult.phase3.distressSignals,
          protocolVerdict: protocolResult.phase4.protocolVerdict,
          scorecard: protocolResult.phase4.scorecard
            ? {
                totalScore: protocolResult.phase4.scorecard.totalScore,
                maxScore: protocolResult.phase4.scorecard.maxScore,
              }
            : null,
        },
        benchmarkResult: {
          screening: screeningSummary
            ? {
                traits: screeningSummary.traits.map((t) => ({
                  name: t.trait,
                  score: t.score,
                  value: "",
                  threshold: "",
                  notes: t.rationale,
                })),
                passCount: screeningSummary.summary.passCount,
                discussCount: screeningSummary.summary.discussCount,
                failCount: screeningSummary.summary.failCount,
                overallVerdict: screeningSummary.verdict,
              }
            : null,
          industryBenchmarks: benchmarkResult.industryComparison
            ? (benchmarkResult.industryComparison as unknown as Record<string, unknown>)
            : null,
          sensitivity: benchmarkResult.sensitivityAnalysis
            ? { keyInsights: benchmarkResult.sensitivityAnalysis.keyInsights }
            : null,
        },
        memberProfile: {
          minAnnualRevenue: profile ? Number(profile.minAnnualRevenue) : 1000000,
          minSde: profile ? Number(profile.minSde) : 200000,
          dscrFloor,
          maxMultiple: profile ? Number(profile.maxMultiple) : 4.0,
          targetIndustries: profile ? profile.targetIndustries : [],
          targetGeographies: profile ? profile.targetGeographies : [],
          minYearsInBusiness: profile ? profile.minYearsInBusiness : 3,
          minEmployeeCount: profile ? profile.minEmployeeCount : 2,
        },
      };

      const masterSummary = generateMasterSummary(masterSummaryInput);

      // Upsert master summary
      const summaryData = {
        verdict: masterSummary.verdict.verdict,
        verdictReasoning: masterSummary.verdict.reasoning,
        dealSnapshot: toJsonOrNull(masterSummary.dealSnapshot),
        financialHealth: toJsonOrNull(masterSummary.financialHealth),
        marketPosition: toJsonOrNull(masterSummary.marketPosition),
        businessIntelligence: toJsonOrNull(masterSummary.businessIntelligence),
        redFlags: toJsonOrNull(masterSummary.redFlags),
        greenFlags: toJsonOrNull(masterSummary.greenFlags),
        buyboxAlignment: toJsonOrNull(masterSummary.buyBoxAlignment),
        sensitivityHighlights: masterSummary.sensitivityHighlights,
        recommendedNextSteps: masterSummary.recommendedNextSteps.join("\n"),
      };

      await prisma.masterSummary.upsert({
        where: { dealId: id },
        update: summaryData,
        create: { dealId: id, ...summaryData },
      });

      // ---- Step 5: Determine Verdict ----
      const verdictInput = {
        dealGrade: analyzerResult.dealGrade,
        dscrScenario1: analyzerResult.dscrScenario1,
        dscrScenario2: analyzerResult.dscrScenario2,
        revenueGrowthYoy1: analyzerResult.revenueGrowthYoy1,
        sdeYear1: deal.sdeYear1 ? Number(deal.sdeYear1) : null,
        screeningPassCount: screeningSummary?.summary.passCount ?? 0,
        screeningDiscussCount: screeningSummary?.summary.discussCount ?? 0,
        screeningFailCount: screeningSummary?.summary.failCount ?? 0,
        screeningVerdict: screeningSummary?.verdict ?? "N/A",
        protocolVerdict: protocolResult.phase4.protocolVerdict,
        criticalRedFlagCount:
          masterSummary.redFlags?.filter(
            (f: { severity: string }) => f.severity === "critical",
          ).length ?? 0,
        memberDscrFloor: dscrFloor,
      };
      const verdictResult = determineVerdict(verdictInput);

      // Update deal with verdict
      await prisma.deal.update({
        where: { id },
        data: { verdict: verdictResult.verdict },
      });

      // ---- Step 6: Generate Emails (if no_go or conditional) ----
      if (
        verdictResult.verdict === "no_go" ||
        verdictResult.verdict === "conditional"
      ) {
        const emailRedFlags = masterSummary.redFlags.map(
          (f: { flag: string; severity: string; dataPoint: string }) => ({
            flag: f.flag,
            severity: f.severity,
            dataPoint: f.dataPoint,
          }),
        );

        const emailInput = {
          deal: {
            businessName: deal.businessName,
            brokerName: deal.brokerName,
          },
          profile: {
            fullName: profile?.fullName ?? "Member",
            companyName: profile?.companyName ?? null,
            title: profile?.title ?? null,
            phone: profile?.phone ?? null,
            signatureBlock: profile?.signatureBlock ?? null,
            minAnnualRevenue: profile
              ? Number(profile.minAnnualRevenue)
              : 1000000,
            minSde: profile ? Number(profile.minSde) : 200000,
            dscrFloor,
          },
          redFlags: emailRedFlags,
          verdict: verdictResult.verdict as "no_go" | "conditional",
        };

        const emails = generateEmails(emailInput);

        // Save Option A
        await prisma.emailGenerated.create({
          data: {
            dealId: id,
            userId: deal.userId,
            emailType: emails.optionA.emailType,
            subject: emails.optionA.subject,
            body: emails.optionA.body,
            brokerName: deal.brokerName,
            businessName: deal.businessName,
            redFlagsIncluded: emailRedFlags as Prisma.InputJsonValue,
            status: "draft",
          },
        });

        // Save Option B
        await prisma.emailGenerated.create({
          data: {
            dealId: id,
            userId: deal.userId,
            emailType: emails.optionB.emailType,
            subject: emails.optionB.subject,
            body: emails.optionB.body,
            brokerName: deal.brokerName,
            businessName: deal.businessName,
            redFlagsIncluded: emailRedFlags as Prisma.InputJsonValue,
            status: "draft",
          },
        });
      }

      // ---- Mark Complete ----
      await prisma.deal.update({
        where: { id },
        data: { analysisStatus: "complete" },
      });

      // Log analysis complete
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          dealId: id,
          actionType: "analysis_complete",
          details: {
            businessName: deal.businessName ?? deal.listingTitle,
            verdict: verdictResult.verdict,
          },
        },
      });

      return successResponse({
        dealId: id,
        analysisStatus: "complete",
        verdict: verdictResult.verdict,
        message: "Analysis pipeline completed successfully",
      });
    } catch (analysisError) {
      console.error(
        "[POST /api/deals/[id]/analyze] Analysis pipeline error:",
        analysisError,
      );

      await prisma.deal.update({
        where: { id },
        data: { analysisStatus: "error" },
      });

      return errorResponse(
        "ANALYSIS_ERROR",
        "Analysis pipeline encountered an error. You can retry the analysis.",
        500,
      );
    }
  } catch (error) {
    console.error("[POST /api/deals/[id]/analyze] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to start analysis", 500);
  }
}
