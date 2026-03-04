import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  validationError,
  unauthorizedError,
} from "@/lib/api-response";

// ---- Platform Detection ----

interface PlatformInfo {
  platform: string;
  displayName: string;
}

function detectPlatform(url: string): PlatformInfo {
  const lower = url.toLowerCase();

  if (lower.includes("bizbuysell.com")) {
    return { platform: "bizbuysell", displayName: "BizBuySell" };
  }
  if (lower.includes("bizquest.com")) {
    return { platform: "bizquest", displayName: "BizQuest" };
  }
  if (lower.includes("businessbroker.net")) {
    return { platform: "businessbroker", displayName: "BusinessBroker.net" };
  }
  if (lower.includes("loopnet.com")) {
    return { platform: "loopnet", displayName: "LoopNet" };
  }
  if (lower.includes("sunbeltnetwork.com")) {
    return { platform: "sunbelt", displayName: "Sunbelt Network" };
  }
  if (lower.includes("transworld.com")) {
    return { platform: "transworld", displayName: "Transworld Business Advisors" };
  }
  if (lower.includes("acquire.com")) {
    return { platform: "acquire", displayName: "Acquire.com" };
  }
  if (lower.includes("dealstream.com")) {
    return { platform: "dealstream", displayName: "DealStream" };
  }
  if (lower.includes("businessesforsale.com")) {
    return { platform: "businessesforsale", displayName: "BusinessesForSale.com" };
  }

  return { platform: "unknown", displayName: "Unknown Platform" };
}

// ---- URL Validation ----

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return validationError("URL is required");
    }

    if (!isValidUrl(url)) {
      return validationError("Invalid URL format. Must be an HTTP or HTTPS URL.");
    }

    const platformInfo = detectPlatform(url);

    // In a production environment, we would use Puppeteer or a headless browser
    // service to scrape the listing page. Since we cannot run Puppeteer in
    // serverless environments, we return the platform detection result and a
    // stub response. The member will use the manual entry fallback.
    //
    // Future implementation:
    // 1. Send URL to a background job / microservice with Puppeteer
    // 2. Parse the listing page DOM based on platform-specific selectors
    // 3. Extract: title, asking price, revenue, SDE, description, broker info, etc.
    // 4. Return extracted data for the member to review and confirm

    return successResponse({
      url,
      platform: platformInfo.platform,
      platformDisplayName: platformInfo.displayName,
      scraped: false,
      message:
        platformInfo.platform !== "unknown"
          ? `Detected listing from ${platformInfo.displayName}. Automated scraping is not yet available for this platform. Please enter the deal details manually.`
          : "Could not detect the listing platform. Please enter the deal details manually.",
      extractedData: null,
      // Placeholder shape for when scraping is implemented:
      // extractedData: {
      //   listingTitle: null,
      //   listingDescription: null,
      //   askingPrice: null,
      //   revenue: null,
      //   sde: null,
      //   businessName: null,
      //   industry: null,
      //   city: null,
      //   state: null,
      //   brokerName: null,
      //   brokerCompany: null,
      //   brokerEmail: null,
      //   brokerPhone: null,
      //   yearsInBusiness: null,
      //   employeeCount: null,
      //   realEstateIncluded: null,
      // },
    });
  } catch (error) {
    console.error("[POST /api/scrape] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to process URL", 500);
  }
}
