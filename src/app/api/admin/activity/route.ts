import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
} from "@/lib/api-response";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();
    if (session.user.role !== "admin") return forbiddenError();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const memberId = searchParams.get("member");
    const actionType = searchParams.get("actionType");

    const where: Prisma.ActivityLogWhereInput = {};

    if (memberId) {
      where.userId = memberId;
    }
    if (actionType) {
      where.actionType = actionType;
    }

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              memberProfile: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          deal: {
            select: {
              id: true,
              businessName: true,
              listingTitle: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return successResponse({
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/activity] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch activity feed", 500);
  }
}
