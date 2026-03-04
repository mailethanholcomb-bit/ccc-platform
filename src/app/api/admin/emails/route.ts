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
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const memberId = searchParams.get("member");
    const status = searchParams.get("status");

    const where: Prisma.EmailGeneratedWhereInput = {};

    if (memberId) {
      where.userId = memberId;
    }
    if (status) {
      where.status = status as Prisma.EnumEmailStatusFilter;
    }

    const [emails, total] = await Promise.all([
      prisma.emailGenerated.findMany({
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
              industry: true,
              verdict: true,
            },
          },
        },
      }),
      prisma.emailGenerated.count({ where }),
    ]);

    return successResponse({
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/emails] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch emails", 500);
  }
}
