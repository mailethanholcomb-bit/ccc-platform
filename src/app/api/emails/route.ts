import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
} from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where = {
      userId: session.user.id,
      status: "sent" as const,
    };

    const [emails, total] = await Promise.all([
      prisma.emailGenerated.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
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
    console.error("[GET /api/emails] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch emails", 500);
  }
}
