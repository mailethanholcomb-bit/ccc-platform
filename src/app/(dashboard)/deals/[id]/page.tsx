"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { formatCurrency } from "@/lib/utils";
import type { Deal, AnalysisStatus, BuyBoxFlag } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INDUSTRY_OPTIONS = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Kitchen and Bath Remodeling",
  "Landscaping",
  "Roofing",
  "Pest Control",
  "Painting",
  "General Contracting",
  "Staffing",
  "Childcare / Daycare",
  "Auto Repair",
  "Cleaning Services",
  "Other",
] as const;

const TABS = [
  { key: "overview", label: "Overview", href: "" },
  { key: "analyzer", label: "Analyzer", href: "/analyzer" },
  { key: "protocol", label: "Protocol", href: "/protocol" },
  { key: "benchmark", label: "Benchmark", href: "/benchmark" },
  { key: "summary", label: "Summary", href: "/summary" },
  { key: "emails", label: "Emails", href: "/emails" },
  { key: "documents", label: "Documents", href: "/documents" },
] as const;

const ANALYSIS_STEP_LABELS: Record<string, string> = {
  pending: "Waiting to start...",
  queued: "Queued for analysis...",
  running_analyzer: "Running Deal Analyzer...",
  running_protocol: "Running Due Diligence Protocol...",
  running_benchmark: "Running Benchmark Analysis...",
  generating_summary: "Generating Master Summary...",
  complete: "Analysis complete",
  error: "Analysis encountered an error",
};

// ---------------------------------------------------------------------------
// Phase 2 Form State
// ---------------------------------------------------------------------------

interface Phase2Form {
  // Section A - Business Identity
  businessName: string;
  businessAddress: string;
  websiteUrl: string;
  // Section B - Financial Data (3 Years)
  revenueYear1: string;
  revenueYear2: string;
  revenueYear3: string;
  cogsYear1: string;
  cogsYear2: string;
  cogsYear3: string;
  sdeYear1: string;
  sdeYear2: string;
  sdeYear3: string;
  ownerSalary: string;
  operatingExpenses: string;
  // Section C - Operational
  yearsInBusiness: string;
  employeesW2: string;
  employees1099: string;
  ownerHoursPerWeek: string;
  customerConcentrationTopPct: string;
  recurringRevenuePct: string;
  reasonForSelling: string;
  // Section D - Real Estate
  realEstateValue: string;
  monthlyRent: string;
  leaseTermRemainingMonths: string;
  leaseRenewalOptions: string;
  // Section E - Assets
  accountsReceivable: string;
  accountsPayable: string;
  inventoryValue: string;
  equipmentFfeValue: string;
  // Section F - Additional
  brokerEmail: string;
  brokerPhone: string;
  memberNotes: string;
}

function buildPhase2Initial(deal: Deal | null): Phase2Form {
  const s = (v: string | null | undefined) => v ?? "";
  const n = (v: number | null | undefined) => (v != null ? String(v) : "");

  return {
    businessName: s(deal?.businessName) || s(deal?.listingTitle),
    businessAddress: s(deal?.businessAddress),
    websiteUrl: s(deal?.websiteUrl),
    revenueYear1: n(deal?.revenueYear1),
    revenueYear2: n(deal?.revenueYear2),
    revenueYear3: n(deal?.revenueYear3),
    cogsYear1: n(deal?.cogsYear1),
    cogsYear2: n(deal?.cogsYear2),
    cogsYear3: n(deal?.cogsYear3),
    sdeYear1: n(deal?.sdeYear1),
    sdeYear2: n(deal?.sdeYear2),
    sdeYear3: n(deal?.sdeYear3),
    ownerSalary: n(deal?.ownerSalary),
    operatingExpenses: n(deal?.operatingExpenses),
    yearsInBusiness: n(deal?.yearsInBusiness),
    employeesW2: n(deal?.employeesW2),
    employees1099: n(deal?.employees1099),
    ownerHoursPerWeek: n(deal?.ownerHoursPerWeek),
    customerConcentrationTopPct: n(deal?.customerConcentrationTopPct),
    recurringRevenuePct: n(deal?.recurringRevenuePct),
    reasonForSelling: s(deal?.reasonForSelling),
    realEstateValue: n(deal?.realEstateValue),
    monthlyRent: n(deal?.monthlyRent),
    leaseTermRemainingMonths: n(deal?.leaseTermRemainingMonths),
    leaseRenewalOptions: s(deal?.leaseRenewalOptions),
    accountsReceivable: n(deal?.accountsReceivable),
    accountsPayable: n(deal?.accountsPayable),
    inventoryValue: n(deal?.inventoryValue),
    equipmentFfeValue: n(deal?.equipmentFfeValue),
    brokerEmail: s(deal?.brokerEmail),
    brokerPhone: s(deal?.brokerPhone),
    memberNotes: s(deal?.memberNotes),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCurrency(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

function toCurrencyDisplay(raw: string): string {
  const num = parseCurrency(raw);
  if (num == null) return raw;
  return formatCurrency(num);
}

function parseIntSafe(val: string): number | null {
  const num = parseInt(val, 10);
  return Number.isFinite(num) ? num : null;
}

function parseFloatSafe(val: string): number | null {
  const num = parseFloat(val);
  return Number.isFinite(num) ? num : null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PhaseBadge({ phase }: { phase: string }) {
  const styles: Record<string, string> = {
    phase_1: "bg-blue-100 text-blue-800",
    phase_2: "bg-purple-100 text-purple-800",
    complete: "bg-green-100 text-green-800",
  };
  const labels: Record<string, string> = {
    phase_1: "Phase 1 - Listing",
    phase_2: "Phase 2 - CIM",
    complete: "Complete",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${styles[phase] || "bg-gray-100 text-gray-700"}`}
    >
      {labels[phase] || phase}
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return null;
  const styles: Record<string, string> = {
    go: "bg-green-100 text-green-800",
    no_go: "bg-red-100 text-red-800",
    conditional: "bg-amber-100 text-amber-800",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${styles[verdict] || ""}`}
    >
      {verdict.replace("_", "-").toUpperCase()}
    </span>
  );
}

function BuyBoxAlerts({ flags }: { flags: BuyBoxFlag[] }) {
  if (!flags || flags.length === 0) return null;
  return (
    <AlertBanner
      type="warning"
      title="Buy Box Alerts"
      messages={flags.map((f) => f.message)}
    />
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DealDetailPage() {
  const params = useParams();
  const dealId = params.id as string;

  // --- State ---------------------------------------------------------------
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<Phase2Form>(buildPhase2Initial(null));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Load deal -----------------------------------------------------------
  const loadDeal = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}`);
      const json = await res.json();
      if (!json.success) {
        setLoadError(json.error?.message || "Failed to load deal.");
        return;
      }
      const dealData = json.data as Deal;
      setDeal(dealData);
      setForm(buildPhase2Initial(dealData));

      // If analysis is currently running, resume polling
      if (
        dealData.analysisStatus !== "pending" &&
        dealData.analysisStatus !== "complete" &&
        dealData.analysisStatus !== "error"
      ) {
        setAnalyzing(true);
        setAnalysisStep(dealData.analysisStatus);
      }
    } catch {
      setLoadError("Network error loading deal.");
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  // --- Analysis polling ----------------------------------------------------
  useEffect(() => {
    if (!analyzing) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/deals/${dealId}/status`);
        const json = await res.json();
        if (!json.success) return;

        const status = json.data?.analysisStatus as AnalysisStatus;
        setAnalysisStep(status);

        if (status === "complete") {
          setAnalyzing(false);
          loadDeal(); // Reload full deal data
        } else if (status === "error") {
          setAnalyzing(false);
          setAnalysisError(
            json.data?.errorMessage || "Analysis failed. Please try again."
          );
        }
      } catch {
        // Ignore polling errors; will retry next interval
      }
    }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [analyzing, dealId, loadDeal]);

  // --- Phase 2 form submit -------------------------------------------------
  const setField = <K extends keyof Phase2Form>(
    key: K,
    value: Phase2Form[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handlePhase2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    const payload = {
      phase: "phase_2",
      businessName: form.businessName || null,
      businessAddress: form.businessAddress || null,
      websiteUrl: form.websiteUrl || null,
      revenueYear1: parseCurrency(form.revenueYear1),
      revenueYear2: parseCurrency(form.revenueYear2),
      revenueYear3: parseCurrency(form.revenueYear3),
      cogsYear1: parseCurrency(form.cogsYear1),
      cogsYear2: parseCurrency(form.cogsYear2),
      cogsYear3: parseCurrency(form.cogsYear3),
      sdeYear1: parseCurrency(form.sdeYear1),
      sdeYear2: parseCurrency(form.sdeYear2),
      sdeYear3: parseCurrency(form.sdeYear3),
      ownerSalary: parseCurrency(form.ownerSalary),
      operatingExpenses: parseCurrency(form.operatingExpenses),
      yearsInBusiness: parseIntSafe(form.yearsInBusiness),
      employeesW2: parseIntSafe(form.employeesW2),
      employees1099: parseIntSafe(form.employees1099),
      ownerHoursPerWeek: parseIntSafe(form.ownerHoursPerWeek),
      customerConcentrationTopPct: parseFloatSafe(
        form.customerConcentrationTopPct
      ),
      recurringRevenuePct: parseFloatSafe(form.recurringRevenuePct),
      reasonForSelling: form.reasonForSelling || null,
      realEstateValue: parseCurrency(form.realEstateValue),
      monthlyRent: parseCurrency(form.monthlyRent),
      leaseTermRemainingMonths: parseIntSafe(form.leaseTermRemainingMonths),
      leaseRenewalOptions: form.leaseRenewalOptions || null,
      accountsReceivable: parseCurrency(form.accountsReceivable),
      accountsPayable: parseCurrency(form.accountsPayable),
      inventoryValue: parseCurrency(form.inventoryValue),
      equipmentFfeValue: parseCurrency(form.equipmentFfeValue),
      brokerEmail: form.brokerEmail || null,
      brokerPhone: form.brokerPhone || null,
      memberNotes: form.memberNotes || null,
    };

    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setSubmitError(json.error?.message || "Failed to update deal.");
        return;
      }
      setSubmitSuccess(true);
      setDeal(json.data as Deal);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Run Analysis --------------------------------------------------------
  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStep("queued");

    try {
      const res = await fetch(`/api/deals/${dealId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!json.success) {
        setAnalyzing(false);
        setAnalysisError(
          json.error?.message || "Failed to start analysis."
        );
      }
    } catch {
      setAnalyzing(false);
      setAnalysisError("Network error starting analysis.");
    }
  };

  // --- Shared input classes ------------------------------------------------
  const inputBase =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 transition-colors";
  const labelBase = "block text-sm font-medium text-gray-700 mb-1";

  // --- Currency field helpers ----------------------------------------------
  const currencyField = (
    id: string,
    label: string,
    key: keyof Phase2Form
  ) => (
    <div>
      <label htmlFor={id} className={labelBase}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
        onBlur={() => setField(key, toCurrencyDisplay(form[key]))}
        onFocus={() => {
          const num = parseCurrency(form[key]);
          if (num != null) setField(key, String(num));
        }}
        placeholder="$0.00"
        className={inputBase}
      />
    </div>
  );

  const textField = (
    id: string,
    label: string,
    key: keyof Phase2Form,
    placeholder?: string,
    type?: string
  ) => (
    <div>
      <label htmlFor={id} className={labelBase}>
        {label}
      </label>
      <input
        id={id}
        type={type || "text"}
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
        placeholder={placeholder}
        className={inputBase}
      />
    </div>
  );

  const numberField = (
    id: string,
    label: string,
    key: keyof Phase2Form,
    placeholder?: string
  ) => (
    <div>
      <label htmlFor={id} className={labelBase}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
        placeholder={placeholder}
        min={0}
        className={inputBase}
      />
    </div>
  );

  // =========================================================================
  // Render
  // =========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" message="Loading deal..." />
      </div>
    );
  }

  if (loadError || !deal) {
    return (
      <div className="max-w-3xl mx-auto mt-12">
        <AlertBanner
          type="error"
          title="Error Loading Deal"
          messages={[loadError || "Deal not found."]}
        />
        <div className="mt-4">
          <Link
            href="/deals"
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Deals
          </Link>
        </div>
      </div>
    );
  }

  const isPhase1 = deal.phase === "phase_1";
  const isAnalysisReady =
    deal.phase === "phase_2" || deal.phase === "complete";
  const displayName = deal.businessName || deal.listingTitle || "Untitled Deal";
  const location = [deal.city, deal.state].filter(Boolean).join(", ");

  return (
    <div className="max-w-5xl mx-auto">
      {/* ------------------------------------------------------------------ */}
      {/* Deal Header                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <PhaseBadge phase={deal.phase} />
              <VerdictBadge verdict={deal.verdict} />
              {deal.industry && (
                <span className="text-sm text-gray-500">{deal.industry}</span>
              )}
              {location && (
                <span className="text-sm text-gray-500">{location}</span>
              )}
            </div>
          </div>
          {deal.askingPrice != null && (
            <div className="text-right flex-shrink-0">
              <div className="text-sm text-gray-500">Asking Price</div>
              <div className="text-xl font-bold text-gray-900">
                {formatCurrency(deal.askingPrice)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Buy Box Alerts                                                     */}
      {/* ------------------------------------------------------------------ */}
      {deal.buyboxFlags && deal.buyboxFlags.length > 0 && (
        <div className="mb-6">
          <BuyBoxAlerts flags={deal.buyboxFlags} />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Tab Navigation                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Deal tabs">
          {TABS.map((tab) => {
            const isActive = tab.key === "overview";
            const href =
              tab.href === ""
                ? `/deals/${dealId}`
                : `/deals/${dealId}${tab.href}`;
            return (
              <Link
                key={tab.key}
                href={href}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Analysis Progress                                                  */}
      {/* ------------------------------------------------------------------ */}
      {analyzing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900">
                Analysis In Progress
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                {ANALYSIS_STEP_LABELS[analysisStep] || analysisStep}
              </p>
            </div>
          </div>
          {/* Step indicators */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {["running_analyzer", "running_protocol", "running_benchmark", "generating_summary"].map(
              (step) => {
                const stepOrder = [
                  "queued",
                  "running_analyzer",
                  "running_protocol",
                  "running_benchmark",
                  "generating_summary",
                  "complete",
                ];
                const currentIdx = stepOrder.indexOf(analysisStep);
                const stepIdx = stepOrder.indexOf(step);
                const isDone = currentIdx > stepIdx;
                const isCurrent = currentIdx === stepIdx;

                return (
                  <div
                    key={step}
                    className={`rounded-lg px-3 py-2 text-xs font-medium ${
                      isDone
                        ? "bg-green-100 text-green-800"
                        : isCurrent
                          ? "bg-blue-200 text-blue-900"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isDone && <span className="mr-1">&#10003;</span>}
                    {ANALYSIS_STEP_LABELS[step]}
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {analysisError && (
        <div className="mb-6">
          <AlertBanner
            type="error"
            title="Analysis Error"
            messages={[analysisError]}
            onDismiss={() => setAnalysisError(null)}
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Phase 1 -> Show Phase 2 CIM Entry Form                             */}
      {/* ------------------------------------------------------------------ */}
      {isPhase1 && (
        <form onSubmit={handlePhase2Submit} className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-2">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Next step:</span> Enter CIM
              (Confidential Information Memorandum) data to move this deal to
              Phase 2 and enable full analysis.
            </p>
          </div>

          {submitError && (
            <AlertBanner
              type="error"
              title="Update Error"
              messages={[submitError]}
              onDismiss={() => setSubmitError(null)}
            />
          )}

          {submitSuccess && (
            <AlertBanner
              type="success"
              title="Deal Updated"
              messages={["CIM data saved. Deal moved to Phase 2."]}
            />
          )}

          {/* Section A - Business Identity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              A. Business Identity
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Core identifying information about the business.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {textField(
                "businessName",
                "Business Name",
                "businessName",
                "e.g., ABC HVAC Services"
              )}
              {textField(
                "businessAddress",
                "Business Address",
                "businessAddress",
                "123 Main St, Suite 100"
              )}
              <div className="md:col-span-2">
                {textField(
                  "websiteUrl",
                  "Website URL",
                  "websiteUrl",
                  "https://..."
                )}
              </div>
            </div>
          </div>

          {/* Section B - Financial Data */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              B. Financial Data (3 Years)
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Year 1 is the most recent full year.
            </p>

            {/* Revenue */}
            <h3 className="text-sm font-medium text-gray-600 mb-2 mt-2">
              Revenue
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {currencyField("revenueYear1", "Year 1 (Most Recent)", "revenueYear1")}
              {currencyField("revenueYear2", "Year 2", "revenueYear2")}
              {currencyField("revenueYear3", "Year 3", "revenueYear3")}
            </div>

            {/* COGS */}
            <h3 className="text-sm font-medium text-gray-600 mb-2 mt-4">
              Cost of Goods Sold (COGS)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {currencyField("cogsYear1", "Year 1", "cogsYear1")}
              {currencyField("cogsYear2", "Year 2", "cogsYear2")}
              {currencyField("cogsYear3", "Year 3", "cogsYear3")}
            </div>

            {/* SDE */}
            <h3 className="text-sm font-medium text-gray-600 mb-2 mt-4">
              Seller&apos;s Discretionary Earnings (SDE)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {currencyField("sdeYear1", "Year 1", "sdeYear1")}
              {currencyField("sdeYear2", "Year 2", "sdeYear2")}
              {currencyField("sdeYear3", "Year 3", "sdeYear3")}
            </div>

            {/* Owner Salary & OpEx */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {currencyField("ownerSalary", "Owner Salary", "ownerSalary")}
              {currencyField(
                "operatingExpenses",
                "Operating Expenses",
                "operatingExpenses"
              )}
            </div>
          </div>

          {/* Section C - Operational */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              C. Operational
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Operational metrics and staffing details.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {numberField(
                "yearsInBusiness",
                "Years in Business",
                "yearsInBusiness",
                "e.g., 15"
              )}
              {numberField(
                "employeesW2",
                "W-2 Employees",
                "employeesW2",
                "e.g., 10"
              )}
              {numberField(
                "employees1099",
                "1099 Contractors",
                "employees1099",
                "e.g., 3"
              )}
              {numberField(
                "ownerHoursPerWeek",
                "Owner Hours/Week",
                "ownerHoursPerWeek",
                "e.g., 40"
              )}
              <div>
                <label
                  htmlFor="customerConcentrationTopPct"
                  className={labelBase}
                >
                  Top Customer Concentration (%)
                </label>
                <input
                  id="customerConcentrationTopPct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={form.customerConcentrationTopPct}
                  onChange={(e) =>
                    setField("customerConcentrationTopPct", e.target.value)
                  }
                  placeholder="e.g., 15"
                  className={inputBase}
                />
              </div>
              <div>
                <label htmlFor="recurringRevenuePct" className={labelBase}>
                  Recurring Revenue (%)
                </label>
                <input
                  id="recurringRevenuePct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={form.recurringRevenuePct}
                  onChange={(e) =>
                    setField("recurringRevenuePct", e.target.value)
                  }
                  placeholder="e.g., 60"
                  className={inputBase}
                />
              </div>
              <div className="md:col-span-3">
                <label htmlFor="reasonForSelling" className={labelBase}>
                  Reason for Selling
                </label>
                <textarea
                  id="reasonForSelling"
                  value={form.reasonForSelling}
                  onChange={(e) =>
                    setField("reasonForSelling", e.target.value)
                  }
                  rows={2}
                  placeholder="e.g., Retirement after 20 years"
                  className={`${inputBase} resize-y`}
                />
              </div>
            </div>
          </div>

          {/* Section D - Real Estate */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              D. Real Estate
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Property and lease details.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currencyField(
                "realEstateValue",
                "Real Estate Value",
                "realEstateValue"
              )}
              {currencyField("monthlyRent", "Monthly Rent", "monthlyRent")}
              {numberField(
                "leaseTermRemainingMonths",
                "Lease Remaining (months)",
                "leaseTermRemainingMonths",
                "e.g., 36"
              )}
              {textField(
                "leaseRenewalOptions",
                "Lease Renewal Options",
                "leaseRenewalOptions",
                "e.g., Two 5-year renewal options"
              )}
            </div>
          </div>

          {/* Section E - Assets */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              E. Assets
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Balance sheet items included in the deal.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currencyField(
                "accountsReceivable",
                "Accounts Receivable",
                "accountsReceivable"
              )}
              {currencyField(
                "accountsPayable",
                "Accounts Payable",
                "accountsPayable"
              )}
              {currencyField(
                "inventoryValue",
                "Inventory Value",
                "inventoryValue"
              )}
              {currencyField(
                "equipmentFfeValue",
                "Equipment / FF&E Value",
                "equipmentFfeValue"
              )}
            </div>
          </div>

          {/* Section F - Additional */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              F. Additional
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Broker contact and your notes.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {textField(
                "brokerEmail",
                "Broker Email",
                "brokerEmail",
                "broker@example.com",
                "email"
              )}
              {textField(
                "brokerPhone",
                "Broker Phone",
                "brokerPhone",
                "(555) 123-4567",
                "tel"
              )}
              <div className="md:col-span-2">
                <label htmlFor="memberNotes" className={labelBase}>
                  Your Notes
                </label>
                <textarea
                  id="memberNotes"
                  value={form.memberNotes}
                  onChange={(e) => setField("memberNotes", e.target.value)}
                  rows={3}
                  placeholder="Additional thoughts, CIM observations, or questions..."
                  className={`${inputBase} resize-y`}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <Link
              href="/deals"
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {submitting ? "Saving..." : "Save CIM Data & Advance to Phase 2"}
            </button>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Phase 2 / Complete -> Deal Data Summary + Run Analysis              */}
      {/* ------------------------------------------------------------------ */}
      {isAnalysisReady && (
        <div className="space-y-6">
          {/* Deal Data Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Deal Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
              <SummaryItem label="Business Name" value={deal.businessName} />
              <SummaryItem label="Industry" value={deal.industry} />
              <SummaryItem
                label="Location"
                value={location || null}
              />
              <SummaryItem
                label="Asking Price"
                value={formatCurrency(deal.askingPrice)}
              />
              <SummaryItem
                label="Revenue (Yr 1)"
                value={formatCurrency(deal.revenueYear1)}
              />
              <SummaryItem
                label="SDE (Yr 1)"
                value={formatCurrency(deal.sdeYear1)}
              />
              <SummaryItem
                label="Revenue (Yr 2)"
                value={formatCurrency(deal.revenueYear2)}
              />
              <SummaryItem
                label="Revenue (Yr 3)"
                value={formatCurrency(deal.revenueYear3)}
              />
              <SummaryItem
                label="Years in Business"
                value={
                  deal.yearsInBusiness != null
                    ? String(deal.yearsInBusiness)
                    : null
                }
              />
              <SummaryItem
                label="W-2 Employees"
                value={
                  deal.employeesW2 != null ? String(deal.employeesW2) : null
                }
              />
              <SummaryItem
                label="1099 Contractors"
                value={
                  deal.employees1099 != null
                    ? String(deal.employees1099)
                    : null
                }
              />
              <SummaryItem
                label="Owner Hours/Week"
                value={
                  deal.ownerHoursPerWeek != null
                    ? String(deal.ownerHoursPerWeek)
                    : null
                }
              />
              <SummaryItem
                label="Real Estate Included"
                value={deal.realEstateIncluded ? "Yes" : "No"}
              />
              <SummaryItem label="Broker" value={deal.brokerName} />
              <SummaryItem label="Broker Email" value={deal.brokerEmail} />
            </div>
          </div>

          {/* Run Analysis */}
          {!analyzing && deal.analysisStatus !== "complete" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ready to Analyze
              </h3>
              <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
                Run the full analysis pipeline: Deal Analyzer, Due Diligence
                Protocol, Benchmark Comparison, and Master Summary.
              </p>
              <button
                type="button"
                onClick={handleRunAnalysis}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Run Analysis
              </button>
            </div>
          )}

          {/* Analysis Complete - Result Links */}
          {deal.analysisStatus === "complete" && !analyzing && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-semibold text-green-900 mb-3">
                Analysis Complete
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link
                  href={`/deals/${dealId}/analyzer`}
                  className="bg-white border border-green-200 rounded-lg p-3 text-center text-sm font-medium text-green-800 hover:bg-green-50 transition-colors"
                >
                  Deal Analyzer
                </Link>
                <Link
                  href={`/deals/${dealId}/protocol`}
                  className="bg-white border border-green-200 rounded-lg p-3 text-center text-sm font-medium text-green-800 hover:bg-green-50 transition-colors"
                >
                  Protocol
                </Link>
                <Link
                  href={`/deals/${dealId}/benchmark`}
                  className="bg-white border border-green-200 rounded-lg p-3 text-center text-sm font-medium text-green-800 hover:bg-green-50 transition-colors"
                >
                  Benchmark
                </Link>
                <Link
                  href={`/deals/${dealId}/summary`}
                  className="bg-white border border-green-200 rounded-lg p-3 text-center text-sm font-medium text-green-800 hover:bg-green-50 transition-colors"
                >
                  Master Summary
                </Link>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  className="text-sm text-green-700 hover:underline"
                >
                  Re-run Analysis
                </button>
              </div>
            </div>
          )}

          {/* Member Notes */}
          {deal.memberNotes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Your Notes
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {deal.memberNotes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small summary display component
// ---------------------------------------------------------------------------

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5">{value || "--"}</dd>
    </div>
  );
}
