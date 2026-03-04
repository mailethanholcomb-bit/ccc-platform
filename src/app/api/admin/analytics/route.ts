import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
} from "@/lib/api-response";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();
    if (session.user.role !== "admin") return forbiddenError();

    // Run all aggregate queries in parallel
    const [
      totalDeals,
      totalMembers,
      activeMembers,
      dealsByVerdict,
      dealsByPhase,
      dealsByIndustry,
      recentDeals,
      recentActivity,
      emailStats,
    ] = await Promise.all([
      // Total deals
      prisma.deal.count(),

      // Total members
      prisma.user.count({ where: { role: "member" } }),

      // Active members (logged in within last 30 days)
      prisma.user.count({
        where: {
          role: "member",
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Deals by verdict
      prisma.deal.groupBy({
        by: ["verdict"],
        _count: { id: true },
      }),

      // Deals by phase
      prisma.deal.groupBy({
        by: ["phase"],
        _count: { id: true },
      }),

      // Deals by industry (top 10)
      prisma.deal.groupBy({
        by: ["industry"],
        _count: { id: true },
        where: { industry: { not: null } },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),

      // Recent deals (last 30 days)
      prisma.deal.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Recent activity (last 7 days)
      prisma.activityLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Email stats
      prisma.emailGenerated.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    // Compute average DSCR from deal analyzer results
    const dscrResults = await prisma.dealAnalyzerResult.findMany({
      where: {
        dscrScenario1: { not: null },
      },
      select: {
        dscrScenario1: true,
      },
    });

    const dscrValues = dscrResults
      .map((r) => Number(r.dscrScenario1))
      .filter((v) => !isNaN(v));
    const avgDscr =
      dscrValues.length > 0
        ? dscrValues.reduce((sum, v) => sum + v, 0) / dscrValues.length
        : null;

    // Compute pass rate
    const verdictMap: Record<string, number> = {};
    for (const v of dealsByVerdict) {
      verdictMap[v.verdict ?? "pending"] = v._count.id;
    }
    const totalWithVerdict =
      (verdictMap.go ?? 0) + (verdictMap.no_go ?? 0) + (verdictMap.conditional ?? 0);
    const passRate =
      totalWithVerdict > 0
        ? ((verdictMap.go ?? 0) / totalWithVerdict) * 100
        : null;

    // Get most common red flags from master summaries
    const summaries = await prisma.masterSummary.findMany({
      where: { redFlags: { not: undefined } },
      select: { redFlags: true },
      take: 100,
    });

    const redFlagCounts: Record<string, number> = {};
    for (const summary of summaries) {
      const flags = summary.redFlags as Array<{ flag: string; severity: string }> | null;
      if (Array.isArray(flags)) {
        for (const flag of flags) {
          if (flag.flag) {
            redFlagCounts[flag.flag] = (redFlagCounts[flag.flag] ?? 0) + 1;
          }
        }
      }
    }

    const mostCommonRedFlags = Object.entries(redFlagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([flag, count]) => ({ flag, count }));

    // Industry breakdown
    const industryBreakdown = dealsByIndustry.map((d) => ({
      industry: d.industry ?? "Unspecified",
      count: d._count.id,
    }));

    // Phase breakdown
    const phaseBreakdown: Record<string, number> = {};
    for (const p of dealsByPhase) {
      phaseBreakdown[p.phase] = p._count.id;
    }

    // Email status breakdown
    const emailBreakdown: Record<string, number> = {};
    for (const e of emailStats) {
      emailBreakdown[e.status] = e._count.id;
    }

    return successResponse({
      overview: {
        totalDeals,
        totalMembers,
        activeMembers,
        recentDeals,
        recentActivity,
      },
      financials: {
        avgDscr: avgDscr != null ? Number(avgDscr.toFixed(4)) : null,
        passRate: passRate != null ? Number(passRate.toFixed(1)) : null,
      },
      verdictBreakdown: verdictMap,
      phaseBreakdown,
      industryBreakdown,
      mostCommonRedFlags,
      emailBreakdown,
      memberEngagement: {
        totalMembers,
        activeMembers,
        activePct:
          totalMembers > 0
            ? Number(((activeMembers / totalMembers) * 100).toFixed(1))
            : 0,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/analytics] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to compute analytics", 500);
  }
}
