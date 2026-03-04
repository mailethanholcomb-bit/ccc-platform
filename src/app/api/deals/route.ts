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
} from "@/lib/api-response";
import type { Prisma } from "@prisma/client";

// ---- Buy Box Flag Checker ----

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
    minAnnualRevenue: Prisma.Decimal;
    minSde: Prisma.Decimal;
    dscrFloor: Prisma.Decimal;
    targetGeographies: string[];
    dealSizeMin: Prisma.Decimal | null;
    dealSizeMax: Prisma.Decimal | null;
    maxMultiple: Prisma.Decimal;
    minYearsInBusiness: number;
    minEmployeeCount: number;
  },
): BuyBoxFlag[] {
  const flags: BuyBoxFlag[] = [];

  // Revenue check
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

  // SDE check
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

  // Years in business check
  const yib = Number(deal.yearsInBusiness);
  if (deal.yearsInBusiness != null && yib < profile.minYearsInBusiness) {
    flags.push({
      field: "yearsInBusiness",
      dealValue: yib,
      memberThreshold: profile.minYearsInBusiness,
      message: `Years in business (${yib}) below minimum (${profile.minYearsInBusiness})`,
    });
  }

  // Employee count check
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

  // Asking multiple check
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

  // Deal size check
  if (deal.askingPrice != null) {
    if (profile.dealSizeMin != null && asking < Number(profile.dealSizeMin)) {
      flags.push({
        field: "askingPrice",
        dealValue: asking,
        memberThreshold: Number(profile.dealSizeMin),
        message: `Asking price ($${asking.toLocaleString()}) below deal size minimum ($${Number(profile.dealSizeMin).toLocaleString()})`,
      });
    }
    if (profile.dealSizeMax != null && asking > Number(profile.dealSizeMax)) {
      flags.push({
        field: "askingPrice",
        dealValue: asking,
        memberThreshold: Number(profile.dealSizeMax),
        message: `Asking price ($${asking.toLocaleString()}) exceeds deal size maximum ($${Number(profile.dealSizeMax).toLocaleString()})`,
      });
    }
  }

  // Industry check
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

  // Geography check
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

// ---- GET: List current member's deals (paginated) ----

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const phase = searchParams.get("phase");
    const verdict = searchParams.get("verdict");

    const where: Prisma.DealWhereInput = {
      userId: session.user.id,
    };

    if (phase) {
      where.phase = phase as Prisma.EnumDealPhaseFilter;
    }
    if (verdict) {
      where.verdict = verdict as Prisma.EnumVerdictNullableFilter;
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deal.count({ where }),
    ]);

    return successResponse({
      deals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/deals] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch deals", 500);
  }
}

// ---- POST: Create a new deal ----

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();

    const body = await request.json();

    // Validate minimum required fields
    if (!body.listingTitle && !body.businessName) {
      return validationError("Either listing title or business name is required");
    }

    // Calculate standalone business price
    const askingPrice = body.askingPrice != null ? Number(body.askingPrice) : null;
    const realEstateValue = body.realEstateValue != null ? Number(body.realEstateValue) : 0;
    const standaloneBusPrice =
      askingPrice != null ? askingPrice - realEstateValue : null;

    // Calculate response deadline if cimReceivedAt is provided
    let responseDeadline: Date | null = null;
    if (body.cimReceivedAt) {
      responseDeadline = addBusinessDays(new Date(body.cimReceivedAt), 10);
    }

    // Fetch member's buy box for flag checks
    const profile = await prisma.memberProfile.findUnique({
      where: { userId: session.user.id },
    });

    // Check buy box flags
    const buyboxFlags = profile ? checkBuyBox(body, profile) : [];

    // Create the deal
    const deal = await prisma.deal.create({
      data: {
        userId: session.user.id,
        phase: "phase_1",
        analysisStatus: "pending",

        // Listing info
        listingUrl: body.listingUrl ?? null,
        listingPlatform: body.listingPlatform ?? null,
        listingTitle: body.listingTitle ?? null,
        listingDescription: body.listingDescription ?? null,

        // Business info
        businessName: body.businessName ?? null,
        businessAddress: body.businessAddress ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        industry: body.industry ?? null,
        naicsCode: body.naicsCode ?? null,
        websiteUrl: body.websiteUrl ?? null,

        // Broker info
        brokerName: body.brokerName ?? null,
        brokerCompany: body.brokerCompany ?? null,
        brokerEmail: body.brokerEmail ?? null,
        brokerPhone: body.brokerPhone ?? null,

        // Financial info
        askingPrice: body.askingPrice ?? null,
        realEstateValue: realEstateValue,
        standaloneBusPrice: standaloneBusPrice,
        revenueYear1: body.revenueYear1 ?? null,
        revenueYear2: body.revenueYear2 ?? null,
        revenueYear3: body.revenueYear3 ?? null,
        cogsYear1: body.cogsYear1 ?? null,
        cogsYear2: body.cogsYear2 ?? null,
        cogsYear3: body.cogsYear3 ?? null,
        sdeYear1: body.sdeYear1 ?? null,
        sdeYear2: body.sdeYear2 ?? null,
        sdeYear3: body.sdeYear3 ?? null,
        ownerSalary: body.ownerSalary ?? null,
        operatingExpenses: body.operatingExpenses ?? null,

        // Operational info
        yearsInBusiness: body.yearsInBusiness ?? null,
        employeesW2: body.employeesW2 ?? null,
        employees1099: body.employees1099 ?? null,
        ownerHoursPerWeek: body.ownerHoursPerWeek ?? null,
        customerConcentrationTopPct: body.customerConcentrationTopPct ?? null,
        recurringRevenuePct: body.recurringRevenuePct ?? null,
        reasonForSelling: body.reasonForSelling ?? null,

        // Real estate
        realEstateIncluded: body.realEstateIncluded ?? false,
        monthlyRent: body.monthlyRent ?? null,
        leaseTermRemainingMonths: body.leaseTermRemainingMonths ?? null,
        leaseRenewalOptions: body.leaseRenewalOptions ?? null,

        // Balance sheet
        accountsReceivable: body.accountsReceivable ?? null,
        accountsPayable: body.accountsPayable ?? null,
        inventoryValue: body.inventoryValue ?? null,
        equipmentFfeValue: body.equipmentFfeValue ?? null,

        // Additional
        memberNotes: body.memberNotes ?? null,
        buyboxFlags: buyboxFlags as unknown as Prisma.InputJsonValue,
        cimReceivedAt: body.cimReceivedAt ? new Date(body.cimReceivedAt) : null,
        responseDeadline: responseDeadline,
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        dealId: deal.id,
        actionType: "deal_created",
        details: {
          businessName: body.businessName ?? body.listingTitle ?? "Unnamed deal",
          buyboxFlagCount: buyboxFlags.length,
        },
      },
    });

    return successResponse(deal, 201);
  } catch (error) {
    console.error("[POST /api/deals] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to create deal", 500);
  }
}
