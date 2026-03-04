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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();
    if (session.user.role !== "admin") return forbiddenError();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      role: "member",
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        {
          memberProfile: {
            fullName: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          memberProfile: {
            select: {
              fullName: true,
              companyName: true,
              title: true,
              phone: true,
            },
          },
          _count: {
            select: {
              deals: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // Get last activity for each member
    const memberIds = members.map((m) => m.id);
    const lastActivities = await prisma.activityLog.findMany({
      where: { userId: { in: memberIds } },
      orderBy: { createdAt: "desc" },
      distinct: ["userId"],
      select: {
        userId: true,
        actionType: true,
        createdAt: true,
      },
    });

    const lastActivityMap = new Map(
      lastActivities.map((a) => [a.userId, a]),
    );

    const enrichedMembers = members.map((member) => ({
      ...member,
      dealCount: member._count.deals,
      lastActivity: lastActivityMap.get(member.id) ?? null,
    }));

    return successResponse({
      members: enrichedMembers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/members] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch members", 500);
  }
}
