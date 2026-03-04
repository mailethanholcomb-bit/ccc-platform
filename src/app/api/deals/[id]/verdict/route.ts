import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
  forbiddenError,
} from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();

    const { id } = await params;

    // Verify deal ownership
    const deal = await prisma.deal.findUnique({
      where: { id },
      select: { id: true, userId: true, verdict: true },
    });

    if (!deal) return notFoundError("Deal not found");
    if (deal.userId !== session.user.id && session.user.role !== "admin") {
      return forbiddenError();
    }

    // Fetch verdict reasoning from master summary
    const summary = await prisma.masterSummary.findUnique({
      where: { dealId: id },
      select: {
        verdict: true,
        verdictReasoning: true,
        redFlags: true,
        greenFlags: true,
        buyboxAlignment: true,
        recommendedNextSteps: true,
      },
    });

    return successResponse({
      dealId: deal.id,
      verdict: deal.verdict,
      reasoning: summary?.verdictReasoning ?? null,
      redFlags: summary?.redFlags ?? [],
      greenFlags: summary?.greenFlags ?? [],
      buyboxAlignment: summary?.buyboxAlignment ?? [],
      recommendedNextSteps: summary?.recommendedNextSteps ?? null,
    });
  } catch (error) {
    console.error("[GET /api/deals/[id]/verdict] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch verdict", 500);
  }
}
