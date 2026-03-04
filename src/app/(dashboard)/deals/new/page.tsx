"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { formatCurrency } from "@/lib/utils";

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

// ---------------------------------------------------------------------------
// Form State
// ---------------------------------------------------------------------------

interface Phase1Form {
  listingUrl: string;
  listingTitle: string;
  brokerName: string;
  brokerCompany: string;
  brokerEmail: string;
  brokerPhone: string;
  industry: string;
  city: string;
  state: string;
  askingPrice: string;
  revenueYear1: string;
  sdeYear1: string;
  yearsInBusiness: string;
  employees: string;
  realEstateIncluded: boolean;
  memberNotes: string;
}

const INITIAL_FORM: Phase1Form = {
  listingUrl: "",
  listingTitle: "",
  brokerName: "",
  brokerCompany: "",
  brokerEmail: "",
  brokerPhone: "",
  industry: "",
  city: "",
  state: "",
  askingPrice: "",
  revenueYear1: "",
  sdeYear1: "",
  yearsInBusiness: "",
  employees: "",
  realEstateIncluded: false,
  memberNotes: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a currency-formatted string to a raw number (or null). */
function parseCurrency(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

/** Format a raw string value for display in a currency input. */
function toCurrencyDisplay(raw: string): string {
  const num = parseCurrency(raw);
  if (num == null) return raw;
  return formatCurrency(num);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewDealPage() {
  const router = useRouter();

  // --- State ---------------------------------------------------------------
  const [urlInput, setUrlInput] = useState("");
  const [form, setForm] = useState<Phase1Form>(INITIAL_FORM);
  const [showForm, setShowForm] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --- Scrape handler ------------------------------------------------------
  const handleScrape = useCallback(async () => {
    if (!urlInput.trim()) return;
    setScraping(true);
    setScrapeError(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      const json = await res.json();

      if (!json.success) {
        setScrapeError(json.error?.message || "Failed to scrape listing.");
        setForm((prev) => ({ ...prev, listingUrl: urlInput.trim() }));
        setShowForm(true);
        return;
      }

      const d = json.data || {};
      setForm({
        listingUrl: urlInput.trim(),
        listingTitle: d.listingTitle || "",
        brokerName: d.brokerName || "",
        brokerCompany: d.brokerCompany || "",
        brokerEmail: d.brokerEmail || "",
        brokerPhone: d.brokerPhone || "",
        industry: d.industry || "",
        city: d.city || "",
        state: d.state || "",
        askingPrice: d.askingPrice != null ? String(d.askingPrice) : "",
        revenueYear1: d.revenueYear1 != null ? String(d.revenueYear1) : "",
        sdeYear1: d.sdeYear1 != null ? String(d.sdeYear1) : "",
        yearsInBusiness:
          d.yearsInBusiness != null ? String(d.yearsInBusiness) : "",
        employees: d.employees != null ? String(d.employees) : "",
        realEstateIncluded: d.realEstateIncluded ?? false,
        memberNotes: "",
      });
      setShowForm(true);
    } catch {
      setScrapeError("Network error. Please try again or enter manually.");
      setForm((prev) => ({ ...prev, listingUrl: urlInput.trim() }));
      setShowForm(true);
    } finally {
      setScraping(false);
    }
  }, [urlInput]);

  // --- Manual entry shortcut -----------------------------------------------
  const handleSkipToManual = () => {
    setForm({ ...INITIAL_FORM, listingUrl: urlInput.trim() });
    setScrapeError(null);
    setShowForm(true);
  };

  // --- Form field updater --------------------------------------------------
  const setField = <K extends keyof Phase1Form>(key: K, value: Phase1Form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // --- Submit handler ------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      listingUrl: form.listingUrl || null,
      listingTitle: form.listingTitle || null,
      brokerName: form.brokerName || null,
      brokerCompany: form.brokerCompany || null,
      brokerEmail: form.brokerEmail || null,
      brokerPhone: form.brokerPhone || null,
      industry: form.industry || null,
      city: form.city || null,
      state: form.state || null,
      askingPrice: parseCurrency(form.askingPrice),
      revenueYear1: parseCurrency(form.revenueYear1),
      sdeYear1: parseCurrency(form.sdeYear1),
      yearsInBusiness: form.yearsInBusiness
        ? parseInt(form.yearsInBusiness, 10)
        : null,
      employeesW2: form.employees ? parseInt(form.employees, 10) : null,
      realEstateIncluded: form.realEstateIncluded,
      memberNotes: form.memberNotes || null,
    };

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!json.success) {
        setSubmitError(json.error?.message || "Failed to create deal.");
        return;
      }

      const dealId = json.data?.id;
      if (dealId) {
        router.push(`/deals/${dealId}`);
      } else {
        router.push("/deals");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Shared input classes ------------------------------------------------
  const inputBase =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 transition-colors";
  const labelBase = "block text-sm font-medium text-gray-700 mb-1";

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Deal</h1>
        <p className="text-sm text-gray-500 mt-1">
          Paste a listing URL to auto-fill details, or enter them manually.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Step 1 - URL Input                                                 */}
      {/* ------------------------------------------------------------------ */}
      {!showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <label htmlFor="listing-url" className={labelBase}>
            Listing URL
          </label>
          <div className="flex gap-3 mt-1">
            <input
              id="listing-url"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text");
                if (pasted) {
                  setUrlInput(pasted);
                }
              }}
              placeholder="https://bizbuysell.com/listing/..."
              className={`${inputBase} flex-1`}
              disabled={scraping}
            />
            <button
              type="button"
              onClick={handleScrape}
              disabled={scraping || !urlInput.trim()}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {scraping ? "Scraping..." : "Scrape Listing"}
            </button>
          </div>

          {scraping && (
            <div className="mt-6">
              <LoadingSpinner size="md" message="Scraping listing data..." />
            </div>
          )}

          {scrapeError && (
            <div className="mt-4">
              <AlertBanner
                type="warning"
                title="Scrape Warning"
                messages={[scrapeError]}
                onDismiss={() => setScrapeError(null)}
              />
            </div>
          )}

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleSkipToManual}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Skip to Manual Entry
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 2 - Phase 1 Data Entry Form                                   */}
      {/* ------------------------------------------------------------------ */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Listing URL (read-only) */}
          {form.listingUrl && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <label className={labelBase}>Listing URL</label>
              <input
                type="url"
                value={form.listingUrl}
                readOnly
                className={`${inputBase} bg-gray-50 cursor-not-allowed`}
              />
            </div>
          )}

          {submitError && (
            <AlertBanner
              type="error"
              title="Submission Error"
              messages={[submitError]}
              onDismiss={() => setSubmitError(null)}
            />
          )}

          {/* Business Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Business Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="listingTitle" className={labelBase}>
                  Listing Title
                </label>
                <input
                  id="listingTitle"
                  type="text"
                  value={form.listingTitle}
                  onChange={(e) => setField("listingTitle", e.target.value)}
                  placeholder="e.g., Established HVAC Business in Austin"
                  className={inputBase}
                />
              </div>

              <div>
                <label htmlFor="industry" className={labelBase}>
                  Industry
                </label>
                <select
                  id="industry"
                  value={form.industry}
                  onChange={(e) => setField("industry", e.target.value)}
                  className={inputBase}
                >
                  <option value="">Select industry...</option>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="yearsInBusiness" className={labelBase}>
                  Years in Business
                </label>
                <input
                  id="yearsInBusiness"
                  type="number"
                  min={0}
                  value={form.yearsInBusiness}
                  onChange={(e) => setField("yearsInBusiness", e.target.value)}
                  placeholder="e.g., 15"
                  className={inputBase}
                />
              </div>

              <div>
                <label htmlFor="city" className={labelBase}>
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="e.g., Austin"
                  className={inputBase}
                />
              </div>

              <div>
                <label htmlFor="state" className={labelBase}>
                  State
                </label>
                <input
                  id="state"
                  type="text"
                  value={form.state}
                  onChange={(e) => setField("state", e.target.value)}
                  placeholder="e.g., TX"
                  className={inputBase}
                />
              </div>

              <div>
                <label htmlFor="employees" className={labelBase}>
                  Employees
                </label>
                <input
                  id="employees"
                  type="number"
                  min={0}
                  value={form.employees}
                  onChange={(e) => setField("employees", e.target.value)}
                  placeholder="e.g., 12"
                  className={inputBase}
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.realEstateIncluded}
                  onClick={() =>
                    setField("realEstateIncluded", !form.realEstateIncluded)
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.realEstateIncluded ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.realEstateIncluded
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
                <label className="text-sm font-medium text-gray-700">
                  Real Estate Included
                </label>
              </div>
            </div>
          </div>

          {/* Broker Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Broker Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="brokerName" className={labelBase}>
                  Broker Name
                </label>
                <input
                  id="brokerName"
                  type="text"
                  value={form.brokerName}
                  onChange={(e) => setField("brokerName", e.target.value)}
                  placeholder="e.g., John Smith"
                  className={inputBase}
                />
              </div>

              <div>
                <label htmlFor="brokerCompany" className={labelBase}>
                  Broker Company
                </label>
                <input
                  id="brokerCompany"
                  type="text"
                  value={form.brokerCompany}
                  onChange={(e) => setField("brokerCompany", e.target.value)}
                  placeholder="e.g., Transworld Business Advisors"
                  className={inputBase}
                />
              </div>

              <div>
                <label htmlFor="brokerEmail" className={labelBase}>
                  Email
                </label>
                <input
                  id="brokerEmail"
                  type="email"
                  value={form.brokerEmail}
                  onChange={(e) => setField("brokerEmail", e.target.value)}
                  placeholder="broker@example.com"
                  className={inputBase}
                />
              </div>

              <div>
                <label htmlFor="brokerPhone" className={labelBase}>
                  Phone
                </label>
                <input
                  id="brokerPhone"
                  type="tel"
                  value={form.brokerPhone}
                  onChange={(e) => setField("brokerPhone", e.target.value)}
                  placeholder="(555) 123-4567"
                  className={inputBase}
                />
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Financial Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="askingPrice" className={labelBase}>
                  Asking Price
                </label>
                <input
                  id="askingPrice"
                  type="text"
                  inputMode="numeric"
                  value={form.askingPrice}
                  onChange={(e) => setField("askingPrice", e.target.value)}
                  onBlur={() =>
                    setField("askingPrice", toCurrencyDisplay(form.askingPrice))
                  }
                  onFocus={() => {
                    const num = parseCurrency(form.askingPrice);
                    if (num != null) setField("askingPrice", String(num));
                  }}
                  placeholder="$0.00"
                  className={inputBase}
                />
              </div>

              <div>
                <label htmlFor="revenueYear1" className={labelBase}>
                  Annual Revenue
                </label>
                <input
                  id="revenueYear1"
                  type="text"
                  inputMode="numeric"
                  value={form.revenueYear1}
                  onChange={(e) => setField("revenueYear1", e.target.value)}
                  onBlur={() =>
                    setField(
                      "revenueYear1",
                      toCurrencyDisplay(form.revenueYear1)
                    )
                  }
                  onFocus={() => {
                    const num = parseCurrency(form.revenueYear1);
                    if (num != null) setField("revenueYear1", String(num));
                  }}
                  placeholder="$0.00"
                  className={inputBase}
                />
              </div>

              <div>
                <label htmlFor="sdeYear1" className={labelBase}>
                  SDE (Year 1)
                </label>
                <input
                  id="sdeYear1"
                  type="text"
                  inputMode="numeric"
                  value={form.sdeYear1}
                  onChange={(e) => setField("sdeYear1", e.target.value)}
                  onBlur={() =>
                    setField("sdeYear1", toCurrencyDisplay(form.sdeYear1))
                  }
                  onFocus={() => {
                    const num = parseCurrency(form.sdeYear1);
                    if (num != null) setField("sdeYear1", String(num));
                  }}
                  placeholder="$0.00"
                  className={inputBase}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <div>
              <label htmlFor="memberNotes" className={labelBase}>
                Your Notes
              </label>
              <textarea
                id="memberNotes"
                value={form.memberNotes}
                onChange={(e) => setField("memberNotes", e.target.value)}
                rows={4}
                placeholder="Any initial thoughts, context, or questions about this deal..."
                className={`${inputBase} resize-y`}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <button
              type="button"
              onClick={() => router.push("/deals")}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {submitting ? "Creating Deal..." : "Create Deal"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
