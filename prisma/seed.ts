import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@ccc-platform.com" },
    update: {},
    create: {
      email: "admin@ccc-platform.com",
      passwordHash: adminPassword,
      role: "admin",
      status: "active",
    },
  });
  console.log("Admin user created:", admin.email);

  // Create demo member
  const memberPassword = await bcrypt.hash("member123", 12);
  const member = await prisma.user.upsert({
    where: { email: "john@smithacquisitions.com" },
    update: {},
    create: {
      email: "john@smithacquisitions.com",
      passwordHash: memberPassword,
      role: "member",
      status: "active",
      invitedById: admin.id,
    },
  });
  console.log("Member user created:", member.email);

  // Create member profile with buy box
  await prisma.memberProfile.upsert({
    where: { userId: member.id },
    update: {},
    create: {
      userId: member.id,
      fullName: "John Smith",
      companyName: "Smith Acquisitions LLC",
      title: "Managing Partner",
      phone: "(404) 555-1234",
      mailingAddress: "123 Peachtree St, Atlanta, GA 30309",
      signatureBlock:
        "John Smith\nManaging Partner\nSmith Acquisitions LLC\n(404) 555-1234",
      targetIndustries: [
        "HVAC",
        "Plumbing",
        "Electrical",
        "Kitchen and Bath Remodeling",
      ],
      minAnnualRevenue: 1000000,
      minSde: 200000,
      dscrFloor: 1.75,
      targetGeographies: ["Georgia", "Florida"],
      dealSizeMin: 500000,
      dealSizeMax: 3000000,
      preferredDealStructures: ["SBA", "Seller Financing"],
      maxMultiple: 4.0,
      minYearsInBusiness: 5,
      minEmployeeCount: 3,
    },
  });
  console.log("Member profile created");

  // Seed industry benchmarks
  const benchmarks = [
    {
      industry: "HVAC",
      naicsCode: "238220",
      avgGrossMargin: 0.45,
      avgNetMargin: 0.1,
      avgSdeMargin: 0.18,
      avgRevenuePerEmployee: 150000,
      avgMultiple: 3.0,
      multipleRangeLow: 2.0,
      multipleRangeHigh: 4.5,
      avgGrowthRate: 0.05,
      avgCustomerConcentration: 0.08,
      avgRecurringRevenuePct: 0.35,
      source: "Industry averages 2024-2025",
    },
    {
      industry: "Plumbing",
      naicsCode: "238220",
      avgGrossMargin: 0.42,
      avgNetMargin: 0.08,
      avgSdeMargin: 0.15,
      avgRevenuePerEmployee: 130000,
      avgMultiple: 2.8,
      multipleRangeLow: 2.0,
      multipleRangeHigh: 4.0,
      avgGrowthRate: 0.04,
      avgCustomerConcentration: 0.1,
      avgRecurringRevenuePct: 0.3,
      source: "Industry averages 2024-2025",
    },
    {
      industry: "Electrical",
      naicsCode: "238210",
      avgGrossMargin: 0.4,
      avgNetMargin: 0.09,
      avgSdeMargin: 0.16,
      avgRevenuePerEmployee: 140000,
      avgMultiple: 3.0,
      multipleRangeLow: 2.0,
      multipleRangeHigh: 4.5,
      avgGrowthRate: 0.05,
      avgCustomerConcentration: 0.12,
      avgRecurringRevenuePct: 0.25,
      source: "Industry averages 2024-2025",
    },
    {
      industry: "Kitchen and Bath Remodeling",
      naicsCode: "236118",
      avgGrossMargin: 0.38,
      avgNetMargin: 0.07,
      avgSdeMargin: 0.14,
      avgRevenuePerEmployee: 160000,
      avgMultiple: 2.5,
      multipleRangeLow: 1.8,
      multipleRangeHigh: 3.5,
      avgGrowthRate: 0.04,
      avgCustomerConcentration: 0.15,
      avgRecurringRevenuePct: 0.15,
      source: "Industry averages 2024-2025",
    },
    {
      industry: "Landscaping",
      naicsCode: "561730",
      avgGrossMargin: 0.5,
      avgNetMargin: 0.1,
      avgSdeMargin: 0.18,
      avgRevenuePerEmployee: 80000,
      avgMultiple: 2.5,
      multipleRangeLow: 1.5,
      multipleRangeHigh: 3.5,
      avgGrowthRate: 0.06,
      avgCustomerConcentration: 0.12,
      avgRecurringRevenuePct: 0.4,
      source: "Industry averages 2024-2025",
    },
    {
      industry: "Roofing",
      naicsCode: "238160",
      avgGrossMargin: 0.35,
      avgNetMargin: 0.08,
      avgSdeMargin: 0.14,
      avgRevenuePerEmployee: 120000,
      avgMultiple: 2.5,
      multipleRangeLow: 1.5,
      multipleRangeHigh: 3.5,
      avgGrowthRate: 0.04,
      avgCustomerConcentration: 0.1,
      avgRecurringRevenuePct: 0.1,
      source: "Industry averages 2024-2025",
    },
    {
      industry: "Pest Control",
      naicsCode: "561710",
      avgGrossMargin: 0.55,
      avgNetMargin: 0.15,
      avgSdeMargin: 0.22,
      avgRevenuePerEmployee: 100000,
      avgMultiple: 4.0,
      multipleRangeLow: 3.0,
      multipleRangeHigh: 6.0,
      avgGrowthRate: 0.07,
      avgCustomerConcentration: 0.05,
      avgRecurringRevenuePct: 0.7,
      source: "Industry averages 2024-2025",
    },
    {
      industry: "Painting",
      naicsCode: "238320",
      avgGrossMargin: 0.45,
      avgNetMargin: 0.1,
      avgSdeMargin: 0.16,
      avgRevenuePerEmployee: 90000,
      avgMultiple: 2.0,
      multipleRangeLow: 1.5,
      multipleRangeHigh: 3.0,
      avgGrowthRate: 0.03,
      avgCustomerConcentration: 0.15,
      avgRecurringRevenuePct: 0.1,
      source: "Industry averages 2024-2025",
    },
    {
      industry: "General Contracting",
      naicsCode: "236220",
      avgGrossMargin: 0.3,
      avgNetMargin: 0.06,
      avgSdeMargin: 0.12,
      avgRevenuePerEmployee: 180000,
      avgMultiple: 2.5,
      multipleRangeLow: 1.5,
      multipleRangeHigh: 3.5,
      avgGrowthRate: 0.04,
      avgCustomerConcentration: 0.2,
      avgRecurringRevenuePct: 0.1,
      source: "Industry averages 2024-2025",
    },
    {
      industry: "Staffing",
      naicsCode: "561320",
      avgGrossMargin: 0.25,
      avgNetMargin: 0.04,
      avgSdeMargin: 0.08,
      avgRevenuePerEmployee: 200000,
      avgMultiple: 2.0,
      multipleRangeLow: 1.0,
      multipleRangeHigh: 3.0,
      avgGrowthRate: 0.03,
      avgCustomerConcentration: 0.25,
      avgRecurringRevenuePct: 0.2,
      source: "Industry averages 2024-2025",
    },
    {
      industry: "Childcare / Daycare",
      naicsCode: "624410",
      avgGrossMargin: 0.4,
      avgNetMargin: 0.12,
      avgSdeMargin: 0.2,
      avgRevenuePerEmployee: 50000,
      avgMultiple: 3.5,
      multipleRangeLow: 2.5,
      multipleRangeHigh: 5.0,
      avgGrowthRate: 0.05,
      avgCustomerConcentration: 0.03,
      avgRecurringRevenuePct: 0.8,
      source: "Industry averages 2024-2025",
    },
    {
      industry: "Auto Repair",
      naicsCode: "811111",
      avgGrossMargin: 0.5,
      avgNetMargin: 0.12,
      avgSdeMargin: 0.2,
      avgRevenuePerEmployee: 120000,
      avgMultiple: 2.5,
      multipleRangeLow: 1.5,
      multipleRangeHigh: 3.5,
      avgGrowthRate: 0.03,
      avgCustomerConcentration: 0.08,
      avgRecurringRevenuePct: 0.25,
      source: "Industry averages 2024-2025",
    },
    {
      industry: "Cleaning Services",
      naicsCode: "561720",
      avgGrossMargin: 0.55,
      avgNetMargin: 0.15,
      avgSdeMargin: 0.22,
      avgRevenuePerEmployee: 60000,
      avgMultiple: 3.0,
      multipleRangeLow: 2.0,
      multipleRangeHigh: 4.0,
      avgGrowthRate: 0.06,
      avgCustomerConcentration: 0.1,
      avgRecurringRevenuePct: 0.6,
      source: "Industry averages 2024-2025",
    },
  ];

  const existingCount = await prisma.industryBenchmark.count();
  if (existingCount === 0) {
    await prisma.industryBenchmark.createMany({ data: benchmarks });
    console.log(`Seeded ${benchmarks.length} industry benchmarks`);
  } else {
    console.log(`Industry benchmarks already exist (${existingCount})`);
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
