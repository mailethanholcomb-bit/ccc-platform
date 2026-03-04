import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
} from "@/lib/api-response";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();

    const profile = await prisma.memberProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        targetIndustries: true,
        minAnnualRevenue: true,
        minSde: true,
        dscrFloor: true,
        targetGeographies: true,
        dealSizeMin: true,
        dealSizeMax: true,
        preferredDealStructures: true,
        maxMultiple: true,
        minYearsInBusiness: true,
        minEmployeeCount: true,
      },
    });

    if (!profile) {
      return notFoundError("Member profile not found. Please complete your profile first.");
    }

    return successResponse(profile);
  } catch (error) {
    console.error("[GET /api/profile/buybox] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch buy box", 500);
  }
}
