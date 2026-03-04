import { NextRequest } from "next/server";
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { memberProfile: true },
    });

    if (!user) return notFoundError("User not found");

    const { passwordHash: _pw, ...userWithoutPassword } = user;

    return successResponse({
      ...userWithoutPassword,
      memberProfile: user.memberProfile,
    });
  } catch (error) {
    console.error("[GET /api/profile] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch profile", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();

    const body = await request.json();

    const {
      fullName,
      companyName,
      title,
      phone,
      mailingAddress,
      signatureBlock,
      profilePhotoUrl,
      targetIndustries,
      minAnnualRevenue,
      minSde,
      dscrFloor,
      targetGeographies,
      dealSizeMin,
      dealSizeMax,
      preferredDealStructures,
      maxMultiple,
      minYearsInBusiness,
      minEmployeeCount,
    } = body;

    // Build the profile data object, only including fields that are present in the body
    const profileData: Record<string, unknown> = {};
    if (fullName !== undefined) profileData.fullName = fullName;
    if (companyName !== undefined) profileData.companyName = companyName;
    if (title !== undefined) profileData.title = title;
    if (phone !== undefined) profileData.phone = phone;
    if (mailingAddress !== undefined) profileData.mailingAddress = mailingAddress;
    if (signatureBlock !== undefined) profileData.signatureBlock = signatureBlock;
    if (profilePhotoUrl !== undefined) profileData.profilePhotoUrl = profilePhotoUrl;
    if (targetIndustries !== undefined) profileData.targetIndustries = targetIndustries;
    if (minAnnualRevenue !== undefined) profileData.minAnnualRevenue = minAnnualRevenue;
    if (minSde !== undefined) profileData.minSde = minSde;
    if (dscrFloor !== undefined) profileData.dscrFloor = dscrFloor;
    if (targetGeographies !== undefined) profileData.targetGeographies = targetGeographies;
    if (dealSizeMin !== undefined) profileData.dealSizeMin = dealSizeMin;
    if (dealSizeMax !== undefined) profileData.dealSizeMax = dealSizeMax;
    if (preferredDealStructures !== undefined) profileData.preferredDealStructures = preferredDealStructures;
    if (maxMultiple !== undefined) profileData.maxMultiple = maxMultiple;
    if (minYearsInBusiness !== undefined) profileData.minYearsInBusiness = minYearsInBusiness;
    if (minEmployeeCount !== undefined) profileData.minEmployeeCount = minEmployeeCount;

    // Upsert the member profile
    const updatedProfile = await prisma.memberProfile.upsert({
      where: { userId: session.user.id },
      update: profileData,
      create: {
        userId: session.user.id,
        fullName: fullName ?? "Member",
        ...profileData,
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        actionType: "profile_updated",
        details: { updatedFields: Object.keys(profileData) },
      },
    });

    return successResponse(updatedProfile);
  } catch (error) {
    console.error("[PUT /api/profile] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to update profile", 500);
  }
}
