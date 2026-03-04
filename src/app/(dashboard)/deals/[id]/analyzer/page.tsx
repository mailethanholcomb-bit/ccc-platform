"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { GradeIndicator } from "@/components/shared/grade-indicator";
import { formatCurrency, formatPercent, formatMultiple } from "@/lib/utils";
import type { DealAnalyzerResult } from "@/types";

export default function AnalyzerResultsPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<DealAnalyzerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/deals/${id}/analyzer`);
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error?.message || "Analysis required");
        }
      } catch {
        setError("Failed to load analyzer results");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading analyzer results..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto">
        <Link
          href={`/deals/${id}`}
          className="text-sm text-blue-600 hover:underline mb-6 inline-block"
        >
          &larr; Back to Deal
        </Link>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-gray-400 text-4xl mb-4">&#9888;</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Analysis Required
          </h2>
          <p className="text-sm text-gray-500">
            {error || "Deal analyzer results are not yet available. Run the analysis to generate results."}
          </p>
        </div>
      </div>
    );
  }

  const cashFlowAfterDebt =
    data.dscrScenario1 != null && data.annualDebtServiceS1 != null
      ? (data.dscrScenario1 * data.annualDebtServiceS1 - data.annualDebtServiceS1)
      : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link
        href={`/deals/${id}`}
        className="text-sm text-blue-600 hover:underline inline-block"
      >
        &larr; Back to Deal
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Deal Analyzer Results
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Financial analysis, underwriting, and negotiation strategy
        </p>
      </div>

      {/* ---- Key Metrics Grid ---- */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Key Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            label="Asking Multiple"
            value={formatMultiple(data.askingMultiple)}
          />
          <MetricCard
            label="Standalone Multiple"
            value={formatMultiple(data.standaloneMultiple)}
          />
          <MetricCard
            label="DSCR (Scenario 1)"
            value={formatMultiple(data.dscrScenario1)}
          />
          <MetricCard
            label="DSCR (Scenario 2)"
            value={formatMultiple(data.dscrScenario2)}
          />
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="text-sm text-gray-500 mb-2">Deal Grade</div>
            <GradeIndicator grade={data.dealGrade} size="md" />
          </div>
          <MetricCard
            label="Cash Flow After Debt"
            value={formatCurrency(cashFlowAfterDebt)}
          />
        </div>
      </section>

      {/* ---- Margin Analysis ---- */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Margin Analysis
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Metric
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Year 3
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Year 2
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Year 1 (Most Recent)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 font-medium text-gray-700">
                  Gross Margin
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatPercent(data.grossMarginYear3)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatPercent(data.grossMarginYear2)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatPercent(data.grossMarginYear1)}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 font-medium text-gray-700">
                  SDE Margin
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatPercent(data.sdeMarginYear3)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatPercent(data.sdeMarginYear2)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatPercent(data.sdeMarginYear1)}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 font-medium text-gray-700">
                  Revenue Growth YoY
                </td>
                <td className="py-3 px-4 text-right font-mono text-gray-400">
                  --
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatPercent(data.revenueGrowthYoy2)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatPercent(data.revenueGrowthYoy1)}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 font-medium text-gray-700">
                  SDE Growth YoY
                </td>
                <td className="py-3 px-4 text-right font-mono text-gray-400">
                  --
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatPercent(data.sdeGrowthYoy2)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatPercent(data.sdeGrowthYoy1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- DSCR Underwriting ---- */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          DSCR Underwriting
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DscrScenarioPanel
            title="Scenario 1 (10% Down)"
            dscr={data.dscrScenario1}
            annualDebtService={data.annualDebtServiceS1}
            workingCapital={data.workingCapitalFromSpread}
          />
          <DscrScenarioPanel
            title="Scenario 2 (5% Down)"
            dscr={data.dscrScenario2}
            annualDebtService={data.annualDebtServiceS2}
            workingCapital={null}
          />
        </div>
      </section>

      {/* ---- Grade Explanation ---- */}
      {data.gradeExplanation && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Grade Explanation
          </h2>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {data.gradeExplanation}
          </pre>
        </section>
      )}

      {/* ---- 5-Year Projections ---- */}
      {data.projections && data.projections.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            5-Year Projections
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Metric
                  </th>
                  {data.projections.map((p) => (
                    <th
                      key={p.year}
                      className="text-right py-3 px-4 font-medium text-gray-600"
                    >
                      Year {p.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-700">
                    Revenue
                  </td>
                  {data.projections.map((p) => (
                    <td
                      key={p.year}
                      className="py-3 px-4 text-right font-mono"
                    >
                      {formatCurrency(p.revenue)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-700">SDE</td>
                  {data.projections.map((p) => (
                    <td
                      key={p.year}
                      className="py-3 px-4 text-right font-mono"
                    >
                      {formatCurrency(p.sde)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-700">
                    Debt Service
                  </td>
                  {data.projections.map((p) => (
                    <td
                      key={p.year}
                      className="py-3 px-4 text-right font-mono"
                    >
                      {formatCurrency(p.annualDebtService)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-700">
                    Free Cash Flow
                  </td>
                  {data.projections.map((p) => (
                    <td
                      key={p.year}
                      className={`py-3 px-4 text-right font-mono ${
                        p.freeCashFlow < 0
                          ? "text-red-600"
                          : "text-green-700"
                      }`}
                    >
                      {formatCurrency(p.freeCashFlow)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-700">
                    Cumulative CF
                  </td>
                  {data.projections.map((p) => (
                    <td
                      key={p.year}
                      className={`py-3 px-4 text-right font-mono ${
                        p.cumulativeCashFlow < 0
                          ? "text-red-600"
                          : "text-green-700"
                      }`}
                    >
                      {formatCurrency(p.cumulativeCashFlow)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Exit Value & IRR */}
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">Exit Value (Year 5)</span>
              <div className="text-lg font-bold text-gray-900 font-mono">
                {formatCurrency(data.exitValue)}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-500">IRR</span>
              <div className="text-lg font-bold text-gray-900 font-mono">
                {formatPercent(data.irr)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---- Strategy Ladder ---- */}
      {data.strategyLadder && data.strategyLadder.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Strategy Ladder
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Tier
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">
                    Price
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">
                    Down Payment
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">
                    Seller Financing
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">
                    Earn-Out
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">
                    DSCR
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.strategyLadder.map((tier) => (
                  <tr
                    key={tier.tier}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">
                        {tier.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 max-w-xs">
                        {tier.notes}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCurrency(tier.price)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCurrency(tier.downPayment)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCurrency(tier.sellerFinancing)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCurrency(tier.earnOut)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          tier.dscr >= 1.5
                            ? "bg-green-100 text-green-800"
                            : tier.dscr >= 1.25
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {tier.dscr.toFixed(2)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

/* ---- Sub-Components ---- */

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1 font-mono">
        {value}
      </div>
    </div>
  );
}

function DscrScenarioPanel({
  title,
  dscr,
  annualDebtService,
  workingCapital,
}: {
  title: string;
  dscr: number | null;
  annualDebtService: number | null;
  workingCapital: number | null;
}) {
  const monthlyPayment =
    annualDebtService != null ? annualDebtService / 12 : null;

  return (
    <div className="border border-gray-200 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Monthly Payment</span>
          <span className="font-mono font-medium">
            {formatCurrency(monthlyPayment)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Annual Debt Service</span>
          <span className="font-mono font-medium">
            {formatCurrency(annualDebtService)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">DSCR</span>
          <span
            className={`font-mono font-bold ${
              dscr != null && dscr >= 1.5
                ? "text-green-700"
                : dscr != null && dscr >= 1.25
                ? "text-amber-700"
                : "text-red-700"
            }`}
          >
            {formatMultiple(dscr)}
          </span>
        </div>
        {workingCapital != null && (
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <span className="text-gray-500">Working Capital from Spread</span>
            <span className="font-mono font-medium">
              {formatCurrency(workingCapital)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
