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

    // Prevent admins from locking themselves
    if (id === session.user.id) {
      return errorResponse("SELF_LOCK", "Cannot lock your own account", 400);
    }

    const member = await prisma.user.findUnique({
      where: { id },
    });

    if (!member) return notFoundError("Member not found");

    if (member.status === "locked") {
      return errorResponse("ALREADY_LOCKED", "Member account is already locked", 409);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: "locked" },
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
          action: "member_locked",
          targetUserId: id,
          targetEmail: member.email,
        },
      },
    });

    return successResponse(updatedUser);
  } catch (error) {
    console.error("[PUT /api/admin/members/[id]/lock] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to lock member", 500);
  }
}
