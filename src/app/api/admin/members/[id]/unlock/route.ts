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

export async function PUT(
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
    });

    if (!member) return notFoundError("Member not found");

    if (member.status === "active") {
      return errorResponse("ALREADY_ACTIVE", "Member account is already active", 409);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: "active" },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    // Log the admin action
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        actionType: "profile_updated",
        details: {
          action: "member_unlocked",
          targetUserId: id,
          targetEmail: member.email,
        },
      },
    });

    return successResponse(updatedUser);
  } catch (error) {
    console.error("[PUT /api/admin/members/[id]/unlock] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to unlock member", 500);
  }
}
