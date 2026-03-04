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

    const deal = await prisma.deal.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        analysisStatus: true,
        verdict: true,
      },
    });

    if (!deal) return notFoundError("Deal not found");

    // Must belong to current user unless admin
    if (deal.userId !== session.user.id && session.user.role !== "admin") {
      return forbiddenError();
    }

    return successResponse({
      dealId: deal.id,
      analysisStatus: deal.analysisStatus,
      verdict: deal.verdict,
    });
  } catch (error) {
    console.error("[GET /api/deals/[id]/status] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch deal status", 500);
  }
}
