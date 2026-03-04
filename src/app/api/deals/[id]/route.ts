import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addBusinessDays } from "@/lib/utils";
import {
  successResponse,
  errorResponse,
  validationError,
  unauthorizedError,
  notFoundError,
  forbiddenError,
} from "@/lib/api-response";

// ---- Buy Box Flag Checker (same logic as in deals/route.ts) ----

interface BuyBoxFlag {
  field: string;
  dealValue: number | string;
  memberThreshold: number | string;
  message: string;
}

function checkBuyBox(
  deal: Record<string, unknown>,
  profile: {
    targetIndustries: string[];
    minAnnualRevenue: unknown;
    minSde: unknown;
    dscrFloor: unknown;
    targetGeographies: string[];
    dealSizeMin: unknown;
    dealSizeMax: unknown;
    maxMultiple: unknown;
    minYearsInBusiness: number;
    minEmployeeCount: number;
  },
): BuyBoxFlag[] {
  const flags: BuyBoxFlag[] = [];

  const rev = Number(deal.revenueYear1);
  const minRev = Number(profile.minAnnualRevenue);
  if (deal.revenueYear1 != null && rev < minRev) {
    flags.push({
      field: "revenueYear1",
      dealValue: rev,
      memberThreshold: minRev,
      message: `Revenue ($${rev.toLocaleString()}) below minimum ($${minRev.toLocaleString()})`,
    });
  }

  const sde = Number(deal.sdeYear1);
  const minSde = Number(profile.minSde);
  if (deal.sdeYear1 != null && sde < minSde) {
    flags.push({
      field: "sdeYear1",
      dealValue: sde,
      memberThreshold: minSde,
      message: `SDE ($${sde.toLocaleString()}) below minimum ($${minSde.toLocaleString()})`,
    });
  }

  const yib = Number(deal.yearsInBusiness);
  if (deal.yearsInBusiness != null && yib < profile.minYearsInBusiness) {
    flags.push({
      field: "yearsInBusiness",
      dealValue: yib,
      memberThreshold: profile.minYearsInBusiness,
      message: `Years in business (${yib}) below minimum (${profile.minYearsInBusiness})`,
    });
  }

  const w2 = Number(deal.employeesW2 ?? 0);
  const c1099 = Number(deal.employees1099 ?? 0);
  const totalEmp = w2 + c1099;
  if ((deal.employeesW2 != null || deal.employees1099 != null) && totalEmp < profile.minEmployeeCount) {
    flags.push({
      field: "employeeCount",
      dealValue: totalEmp,
      memberThreshold: profile.minEmployeeCount,
      message: `Total employees (${totalEmp}) below minimum (${profile.minEmployeeCount})`,
    });
  }

  const asking = Number(deal.askingPrice);
  const reValue = Number(deal.realEstateValue ?? 0);
  const standalone = asking - reValue;
  const maxMult = Number(profile.maxMultiple);
  if (deal.askingPrice != null && deal.sdeYear1 != null && sde > 0) {
    const mult = standalone / sde;
    if (mult > maxMult) {
      flags.push({
        field: "askingMultiple",
        dealValue: Number(mult.toFixed(2)),
        memberThreshold: maxMult,
        message: `Asking multiple (${mult.toFixed(2)}x) exceeds maximum (${maxMult}x)`,
      });
    }
  }

  if (deal.askingPrice != null) {
    if (profile.dealSizeMin != null && asking < Number(profile.dealSizeMin)) {
      flags.push({
        field: "askingPrice",
        dealValue: asking,
        memberThreshold: Number(profile.dealSizeMin),
        message: `Asking price below deal size minimum`,
      });
    }
    if (profile.dealSizeMax != null && asking > Number(profile.dealSizeMax)) {
      flags.push({
        field: "askingPrice",
        dealValue: asking,
        memberThreshold: Number(profile.dealSizeMax),
        message: `Asking price exceeds deal size maximum`,
      });
    }
  }

  if (
    deal.industry != null &&
    profile.targetIndustries.length > 0 &&
    !profile.targetIndustries.some((ti) =>
      (deal.industry as string).toLowerCase().includes(ti.toLowerCase()),
    )
  ) {
    flags.push({
      field: "industry",
      dealValue: deal.industry as string,
      memberThreshold: profile.targetIndustries.join(", "),
      message: `Industry "${deal.industry}" not in target industries`,
    });
  }

  if (
    deal.state != null &&
    profile.targetGeographies.length > 0 &&
    !profile.targetGeographies.some(
      (tg) => tg.toLowerCase() === (deal.state as string).toLowerCase(),
    )
  ) {
    flags.push({
      field: "state",
      dealValue: deal.state as string,
      memberThreshold: profile.targetGeographies.join(", "),
      message: `State "${deal.state}" not in target geographies`,
    });
  }

  return flags;
}

// ---- GET: Get deal detail by ID ----

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();

    const { id } = await params;

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        dealAnalyzerResult: true,
        protocolResult: true,
        benchmarkResult: true,
        masterSummary: true,
        emailsGenerated: true,
      },
    });

    if (!deal) return notFoundError("Deal not found");

    // Must belong to current user unless admin
    if (deal.userId !== session.user.id && session.user.role !== "admin") {
      return forbiddenError();
    }

    return successResponse(deal);
  } catch (error) {
    console.error("[GET /api/deals/[id]] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch deal", 500);
  }
}

// ---- PUT: Update deal ----

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();

    const { id } = await params;

    // Verify ownership
    const existingDeal = await prisma.deal.findUnique({
      where: { id },
    });

    if (!existingDeal) return notFoundError("Deal not found");
    if (existingDeal.userId !== session.user.id && session.user.role !== "admin") {
      return forbiddenError();
    }

    const body = await request.json();

    // Build update data, only including fields present in the body
    const updateData: Record<string, unknown> = {};

    // Listing info
    if (body.listingUrl !== undefined) updateData.listingUrl = body.listingUrl;
    if (body.listingPlatform !== undefined) updateData.listingPlatform = body.listingPlatform;
    if (body.listingTitle !== undefined) updateData.listingTitle = body.listingTitle;
    if (body.listingDescription !== undefined) updateData.listingDescription = body.listingDescription;

    // Business info
    if (body.businessName !== undefined) updateData.businessName = body.businessName;
    if (body.businessAddress !== undefined) updateData.businessAddress = body.businessAddress;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.state !== undefined) updateData.state = body.state;
    if (body.industry !== undefined) updateData.industry = body.industry;
    if (body.naicsCode !== undefined) updateData.naicsCode = body.naicsCode;
    if (body.websiteUrl !== undefined) updateData.websiteUrl = body.websiteUrl;

    // Broker info
    if (body.brokerName !== undefined) updateData.brokerName = body.brokerName;
    if (body.brokerCompany !== undefined) updateData.brokerCompany = body.brokerCompany;
    if (body.brokerEmail !== undefined) updateData.brokerEmail = body.brokerEmail;
    if (body.brokerPhone !== undefined) updateData.brokerPhone = body.brokerPhone;

    // Financial info
    if (body.askingPrice !== undefined) updateData.askingPrice = body.askingPrice;
    if (body.realEstateValue !== undefined) updateData.realEstateValue = body.realEstateValue;
    if (body.revenueYear1 !== undefined) updateData.revenueYear1 = body.revenueYear1;
    if (body.revenueYear2 !== undefined) updateData.revenueYear2 = body.revenueYear2;
    if (body.revenueYear3 !== undefined) updateData.revenueYear3 = body.revenueYear3;
    if (body.cogsYear1 !== undefined) updateData.cogsYear1 = body.cogsYear1;
    if (body.cogsYear2 !== undefined) updateData.cogsYear2 = body.cogsYear2;
    if (body.cogsYear3 !== undefined) updateData.cogsYear3 = body.cogsYear3;
    if (body.sdeYear1 !== undefined) updateData.sdeYear1 = body.sdeYear1;
    if (body.sdeYear2 !== undefined) updateData.sdeYear2 = body.sdeYear2;
    if (body.sdeYear3 !== undefined) updateData.sdeYear3 = body.sdeYear3;
    if (body.ownerSalary !== undefined) updateData.ownerSalary = body.ownerSalary;
    if (body.operatingExpenses !== undefined) updateData.operatingExpenses = body.operatingExpenses;

    // Operational info
    if (body.yearsInBusiness !== undefined) updateData.yearsInBusiness = body.yearsInBusiness;
    if (body.employeesW2 !== undefined) updateData.employeesW2 = body.employeesW2;
    if (body.employees1099 !== undefined) updateData.employees1099 = body.employees1099;
    if (body.ownerHoursPerWeek !== undefined) updateData.ownerHoursPerWeek = body.ownerHoursPerWeek;
    if (body.customerConcentrationTopPct !== undefined) updateData.customerConcentrationTopPct = body.customerConcentrationTopPct;
    if (body.recurringRevenuePct !== undefined) updateData.recurringRevenuePct = body.recurringRevenuePct;
    if (body.reasonForSelling !== undefined) updateData.reasonForSelling = body.reasonForSelling;

    // Real estate
    if (body.realEstateIncluded !== undefined) updateData.realEstateIncluded = body.realEstateIncluded;
    if (body.monthlyRent !== undefined) updateData.monthlyRent = body.monthlyRent;
    if (body.leaseTermRemainingMonths !== undefined) updateData.leaseTermRemainingMonths = body.leaseTermRemainingMonths;
    if (body.leaseRenewalOptions !== undefined) updateData.leaseRenewalOptions = body.leaseRenewalOptions;

    // Balance sheet
    if (body.accountsReceivable !== undefined) updateData.accountsReceivable = body.accountsReceivable;
    if (body.accountsPayable !== undefined) updateData.accountsPayable = body.accountsPayable;
    if (body.inventoryValue !== undefined) updateData.inventoryValue = body.inventoryValue;
    if (body.equipmentFfeValue !== undefined) updateData.equipmentFfeValue = body.equipmentFfeValue;

    // Additional
    if (body.memberNotes !== undefined) updateData.memberNotes = body.memberNotes;

    // Phase transition
    if (body.phase !== undefined) {
      updateData.phase = body.phase;

      // If advancing to phase_2, set cimReceivedAt and calculate deadline
      if (body.phase === "phase_2" && !existingDeal.cimReceivedAt) {
        const now = new Date();
        updateData.cimReceivedAt = now;
        updateData.responseDeadline = addBusinessDays(now, 10);
      }
    }

    // Recalculate standalone business price
    const finalAskingPrice =
      updateData.askingPrice !== undefined
        ? Number(updateData.askingPrice)
        : Number(existingDeal.askingPrice ?? 0);
    const finalRealEstateValue =
      updateData.realEstateValue !== undefined
        ? Number(updateData.realEstateValue)
        : Number(existingDeal.realEstateValue);

    if (updateData.askingPrice !== undefined || updateData.realEstateValue !== undefined) {
      updateData.standaloneBusPrice = finalAskingPrice - finalRealEstateValue;
    }

    // Recalculate buybox flags
    const profile = await prisma.memberProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (profile) {
      // Merge existing deal data with updates for a complete buybox check
      const mergedDeal = {
        ...existingDeal,
        ...updateData,
      };
      updateData.buyboxFlags = checkBuyBox(mergedDeal as Record<string, unknown>, profile);
    }

    // CIM received at update
    if (body.cimReceivedAt !== undefined) {
      updateData.cimReceivedAt = body.cimReceivedAt ? new Date(body.cimReceivedAt) : null;
      if (body.cimReceivedAt) {
        updateData.responseDeadline = addBusinessDays(new Date(body.cimReceivedAt), 10);
      }
    }

    const updatedDeal = await prisma.deal.update({
      where: { id },
      data: updateData,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        dealId: id,
        actionType: "deal_updated",
        details: { updatedFields: Object.keys(updateData) },
      },
    });

    return successResponse(updatedDeal);
  } catch (error) {
    console.error("[PUT /api/deals/[id]] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to update deal", 500);
  }
}

// ---- DELETE: Delete deal ----

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();

    const { id } = await params;

    const deal = await prisma.deal.findUnique({
      where: { id },
    });

    if (!deal) return notFoundError("Deal not found");

    // Must belong to current user
    if (deal.userId !== session.user.id) {
      return forbiddenError();
    }

    // Log before deleting (so we have the deal reference)
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        dealId: id,
        actionType: "deal_updated",
        details: {
          action: "deleted",
          businessName: deal.businessName ?? deal.listingTitle ?? "Unnamed deal",
        },
      },
    });

    await prisma.deal.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/deals/[id]] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to delete deal", 500);
  }
}
