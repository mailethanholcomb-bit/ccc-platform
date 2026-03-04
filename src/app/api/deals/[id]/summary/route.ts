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
      select: { id: true, userId: true },
    });

    if (!deal) return notFoundError("Deal not found");
    if (deal.userId !== session.user.id && session.user.role !== "admin") {
      return forbiddenError();
    }

    const result = await prisma.masterSummary.findUnique({
      where: { dealId: id },
    });

    if (!result) {
      return notFoundError("Master summary not found. Run analysis first.");
    }

    return successResponse(result);
  } catch (error) {
    console.error("[GET /api/deals/[id]/summary] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch master summary", 500);
  }
}
