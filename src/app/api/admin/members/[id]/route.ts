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
    if (session.user.role !== "admin") return forbiddenError();

    const { id } = await params;

    const member = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        memberProfile: true,
        deals: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            phase: true,
            analysisStatus: true,
            verdict: true,
            businessName: true,
            listingTitle: true,
            industry: true,
            askingPrice: true,
            sdeYear1: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            actionType: true,
            details: true,
            createdAt: true,
            dealId: true,
          },
        },
      },
    });

    if (!member) return notFoundError("Member not found");

    return successResponse(member);
  } catch (error) {
    console.error("[GET /api/admin/members/[id]] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch member details", 500);
  }
}
