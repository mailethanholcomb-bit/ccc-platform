"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { VerdictBanner } from "@/components/shared/verdict-banner";
import { GradeIndicator } from "@/components/shared/grade-indicator";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { formatCurrency, formatPercent, formatMultiple } from "@/lib/utils";
import type {
  MasterSummary,
  RedFlag,
  GreenFlag,
  BuyBoxAlignmentItem,
} from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely read a nested value from a Record<string, unknown>. */
function snap(
  obj: Record<string, unknown> | null | undefined,
  key: string
): unknown {
  if (!obj) return undefined;
  return obj[key];
}

function snapStr(
  obj: Record<string, unknown> | null | undefined,
  key: string
): string {
  const val = snap(obj, key);
  if (val == null) return "--";
  return String(val);
}

function snapNum(
  obj: Record<string, unknown> | null | undefined,
  key: string
): number | null {
  const val = snap(obj, key);
  if (val == null) return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className || ""}`}
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function StatBox({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-lg font-bold text-gray-900 mt-1">{value}</div>
      {subtext && (
        <div className="text-xs text-gray-500 mt-0.5">{subtext}</div>
      )}
    </div>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const color =
    severity === "critical" ? "bg-red-500" : "bg-amber-500";
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${color} flex-shrink-0 mt-1`}
    />
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DealSummaryPage() {
  const params = useParams();
  const dealId = params.id as string;

  const [summary, setSummary] = useState<MasterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/deals/${dealId}/summary`);
        const json = await res.json();

        if (!json.success) {
          setError(json.error?.message || "Failed to load summary.");
          return;
        }

        setSummary(json.data as MasterSummary);
      } catch {
        setError("Network error loading summary.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dealId]);

  // =========================================================================
  // Loading / Error / Empty states
  // =========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" message="Loading deal summary..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-12">
        <AlertBanner
          type="error"
          title="Error"
          messages={[error]}
        />
        <div className="mt-4">
          <Link
            href={`/deals/${dealId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Deal
          </Link>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-3xl mx-auto mt-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-gray-400 text-4xl mb-3">&#9888;</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Analysis Required
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            No summary data is available yet. Run the full analysis pipeline to
            generate the Master Deal Summary.
          </p>
          <Link
            href={`/deals/${dealId}`}
            className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Deal &amp; Run Analysis
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Derived data
  // =========================================================================

  const ds = summary.dealSnapshot;
  const fh = summary.financialHealth;
  const redFlags = summary.redFlags || [];
  const greenFlags = summary.greenFlags || [];
  const buyboxAlignment = summary.buyboxAlignment || [];
  const nextSteps = summary.recommendedNextSteps;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* ------------------------------------------------------------------ */}
      {/* Tab navigation (same as deal detail) stays on parent layout,       */}
      {/* but we add a breadcrumb back link for clarity.                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/deals/${dealId}`}
          className="text-blue-600 hover:underline"
        >
          Deal Overview
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-600">Master Summary</span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Verdict Banner                                                  */}
      {/* ------------------------------------------------------------------ */}
      <VerdictBanner
        verdict={summary.verdict}
        reasoning={summary.verdictReasoning}
      />

      {/* ------------------------------------------------------------------ */}
      {/* 2. Deal Snapshot                                                   */}
      {/* ------------------------------------------------------------------ */}
      <Card title="Deal Snapshot">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatBox
            label="Business"
            value={snapStr(ds, "businessName")}
          />
          <StatBox label="Industry" value={snapStr(ds, "industry")} />
          <StatBox label="Location" value={snapStr(ds, "location")} />
          <StatBox
            label="Asking Price"
            value={formatCurrency(snapNum(ds, "askingPrice"))}
          />
          <StatBox
            label="Standalone Price"
            value={formatCurrency(snapNum(ds, "standalonePrice"))}
          />
          <StatBox
            label="Revenue"
            value={formatCurrency(snapNum(ds, "revenue"))}
          />
          <StatBox
            label="SDE"
            value={formatCurrency(snapNum(ds, "sde"))}
          />
          <StatBox
            label="Multiple"
            value={formatMultiple(snapNum(ds, "multiple"))}
          />
          <StatBox
            label="DSCR"
            value={
              snapNum(ds, "dscr") != null
                ? (snapNum(ds, "dscr") as number).toFixed(2)
                : "--"
            }
          />
          <div className="bg-gray-50 rounded-lg p-4 flex items-center">
            <GradeIndicator
              grade={snapStr(ds, "grade")}
              size="md"
              showLabel
            />
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Financial Health                                                */}
      {/* ------------------------------------------------------------------ */}
      <Card title="Financial Health">
        <div className="space-y-6">
          {/* Margins */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-3">
              Margins
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox
                label="Gross Margin"
                value={formatPercent(snapNum(fh, "grossMargin"))}
              />
              <StatBox
                label="SDE Margin"
                value={formatPercent(snapNum(fh, "sdeMargin"))}
              />
              <StatBox
                label="Net Margin"
                value={formatPercent(snapNum(fh, "netMargin"))}
              />
              <StatBox
                label="Revenue Growth"
                value={formatPercent(snapNum(fh, "revenueGrowth"))}
              />
            </div>
          </div>

          {/* DSCR Scenarios */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-3">
              DSCR Scenarios
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatBox
                label="Scenario 1 (Full Price)"
                value={
                  snapNum(fh, "dscrScenario1") != null
                    ? (snapNum(fh, "dscrScenario1") as number).toFixed(2)
                    : "--"
                }
                subtext={
                  snapNum(fh, "dscrScenario1") != null
                    ? (snapNum(fh, "dscrScenario1") as number) >= 1.25
                      ? "Meets 1.25 floor"
                      : "Below 1.25 floor"
                    : undefined
                }
              />
              <StatBox
                label="Scenario 2 (Negotiated)"
                value={
                  snapNum(fh, "dscrScenario2") != null
                    ? (snapNum(fh, "dscrScenario2") as number).toFixed(2)
                    : "--"
                }
                subtext={
                  snapNum(fh, "dscrScenario2") != null
                    ? (snapNum(fh, "dscrScenario2") as number) >= 1.25
                      ? "Meets 1.25 floor"
                      : "Below 1.25 floor"
                    : undefined
                }
              />
            </div>
          </div>

          {/* Cash Flow */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-3">
              Cash Flow
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatBox
                label="Annual Debt Service"
                value={formatCurrency(snapNum(fh, "annualDebtService"))}
              />
              <StatBox
                label="Free Cash Flow (Yr 1)"
                value={formatCurrency(snapNum(fh, "freeCashFlow"))}
              />
              <StatBox
                label="Working Capital"
                value={formatCurrency(snapNum(fh, "workingCapital"))}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Red Flags                                                       */}
      {/* ------------------------------------------------------------------ */}
      <Card title="Red Flags">
        {redFlags.length === 0 ? (
          <p className="text-sm text-gray-500">
            No red flags identified.
          </p>
        ) : (
          <ul className="space-y-3">
            {redFlags.map((flag: RedFlag, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <SeverityDot severity={flag.severity} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {flag.flag}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {flag.sourceEngine} &middot; {flag.dataPoint}
                  </div>
                </div>
                <span
                  className={`ml-auto flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                    flag.severity === "critical"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {flag.severity === "critical" ? "Critical" : "Warning"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Green Flags                                                     */}
      {/* ------------------------------------------------------------------ */}
      <Card title="Green Flags">
        {greenFlags.length === 0 ? (
          <p className="text-sm text-gray-500">
            No green flags identified.
          </p>
        ) : (
          <ul className="space-y-3">
            {greenFlags.map((flag: GreenFlag, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <span className="inline-block w-5 h-5 rounded-full bg-green-100 text-green-600 flex-shrink-0 text-center text-xs leading-5 font-bold mt-0.5">
                  &#10003;
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {flag.flag}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {flag.sourceEngine} &middot; {flag.dataPoint}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 6. Buy Box Alignment                                               */}
      {/* ------------------------------------------------------------------ */}
      <Card title="Buy Box Alignment">
        {buyboxAlignment.length === 0 ? (
          <p className="text-sm text-gray-500">
            No buy box alignment data available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    Criteria
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    Deal Value
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    Your Target
                  </th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {buyboxAlignment.map((item: BuyBoxAlignmentItem, i: number) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 last:border-b-0"
                  >
                    <td className="py-2.5 px-3 font-medium text-gray-900">
                      {item.criteria}
                    </td>
                    <td className="py-2.5 px-3 text-gray-700">
                      {item.dealValue}
                    </td>
                    <td className="py-2.5 px-3 text-gray-700">
                      {item.memberTarget}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.status === "match" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <span>&#10003;</span> Match
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <span>&#10005;</span> Mismatch
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 7. Recommended Next Steps                                          */}
      {/* ------------------------------------------------------------------ */}
      <Card title="Recommended Next Steps">
        {nextSteps ? (
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {nextSteps}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No recommended next steps available.
          </p>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Navigation Footer                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href={`/deals/${dealId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Back to Deal Overview
        </Link>
        <div className="flex gap-3">
          <Link
            href={`/deals/${dealId}/emails`}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Emails
          </Link>
          <Link
            href={`/deals/${dealId}/analyzer`}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            View Full Analysis
          </Link>
        </div>
      </div>
    </div>
  );
}
