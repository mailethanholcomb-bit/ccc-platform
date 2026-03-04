"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ScoreCard } from "@/components/shared/score-card";
import { formatCurrency, formatPercent, formatMultiple } from "@/lib/utils";
import type { BenchmarkResult } from "@/types";

type ActiveTab = "screening" | "benchmarks" | "dscr" | "sensitivity";

export default function BenchmarkResultsPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("screening");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/deals/${id}/benchmark`);
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error?.message || "Analysis required");
        }
      } catch {
        setError("Failed to load benchmark results");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading benchmark results..." />
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
            {error || "Benchmark results are not yet available. Run the analysis to generate results."}
          </p>
        </div>
      </div>
    );
  }

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "screening", label: "Deal Screening" },
    { key: "benchmarks", label: "Industry Benchmarks" },
    { key: "dscr", label: "DSCR Scenarios" },
    { key: "sensitivity", label: "Sensitivity Matrix" },
  ];

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
          Benchmark Tool Results
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Deal screening, industry comparison, DSCR modeling, and sensitivity analysis
        </p>
      </div>

      {/* ---- Tab Navigation ---- */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ---- Tab Content ---- */}
      {activeTab === "screening" && <ScreeningTab data={data} />}
      {activeTab === "benchmarks" && <BenchmarksTab data={data} />}
      {activeTab === "dscr" && <DscrTab data={data} />}
      {activeTab === "sensitivity" && <SensitivityTab data={data} />}
    </div>
  );
}

/* ---- Screening Tab ---- */

function ScreeningTab({ data }: { data: BenchmarkResult }) {
  const screening = data.screening;
  if (!screening) {
    return <EmptyState message="Screening data not available." />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-700">
              Pass: <strong>{screening.passCount}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm text-gray-700">
              Discuss: <strong>{screening.discussCount}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-700">
              Fail: <strong>{screening.failCount}</strong>
            </span>
          </div>
          <div className="ml-auto">
            <ScreeningVerdictBadge verdict={screening.overallVerdict} />
          </div>
        </div>
      </div>

      {/* Trait Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {screening.traits.map((trait, index) => (
          <ScoreCard
            key={index}
            label={trait.name}
            score={trait.score as "PASS" | "DISCUSS" | "FAIL"}
            value={trait.value}
            threshold={trait.threshold}
            notes={trait.notes}
          />
        ))}
      </div>
    </div>
  );
}

/* ---- Benchmarks Tab ---- */

function BenchmarksTab({ data }: { data: BenchmarkResult }) {
  // The dealVsBenchmark or industryBenchmarks could be an array of comparison objects
  const benchmarks = data.dealVsBenchmark as BenchmarkComparisonItem[] | null;

  if (!benchmarks || !Array.isArray(benchmarks) || benchmarks.length === 0) {
    return <EmptyState message="Industry benchmark comparison not available." />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-600">
                Metric
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">
                Deal Value
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">
                Industry Avg
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">
                Range
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((item, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="py-3 px-4 font-medium text-gray-900">
                  {item.name}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatBenchmarkValue(item.name, item.dealValue)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatBenchmarkValue(item.name, item.industryAvg)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-gray-500">
                  {item.industryRange
                    ? `${formatBenchmarkValue(item.name, item.industryRange[0])} - ${formatBenchmarkValue(item.name, item.industryRange[1])}`
                    : "--"}
                </td>
                <td className="py-3 px-4 text-center">
                  <BenchmarkStatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---- DSCR Tab ---- */

function DscrTab({ data }: { data: BenchmarkResult }) {
  const scenarios = data.dscrScenarios;
  if (!scenarios || scenarios.length === 0) {
    return <EmptyState message="DSCR scenario data not available." />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-600">
                Scenario
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">
                Price
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">
                Down Payment
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">
                Loan Amount
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">
                Monthly Payment
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">
                Annual DS
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">
                DSCR
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">
                Meets Floor
              </th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s, index) => (
              <tr
                key={index}
                className={`border-b border-gray-100 ${
                  s.meetsFloor ? "bg-green-50/50" : ""
                }`}
              >
                <td className="py-3 px-4 font-medium text-gray-900">
                  {s.scenarioName}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatCurrency(s.price)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatCurrency(s.price * s.downPct)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatCurrency(s.price - s.price * s.downPct)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatCurrency(s.monthlyPayment)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {formatCurrency(s.annualDs)}
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium font-mono ${
                      s.dscr >= 1.5
                        ? "bg-green-100 text-green-800"
                        : s.dscr >= 1.25
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {s.dscr.toFixed(2)}x
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {s.meetsFloor ? (
                    <span className="text-green-600 font-bold text-lg">
                      &#10003;
                    </span>
                  ) : (
                    <span className="text-red-500 font-bold text-lg">
                      &#10005;
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---- Sensitivity Tab ---- */

function SensitivityTab({ data }: { data: BenchmarkResult }) {
  const sensitivity = data.sensitivity;
  if (!sensitivity || !sensitivity.matrix || sensitivity.matrix.length === 0) {
    return <EmptyState message="Sensitivity analysis not available." />;
  }

  // The matrix is a flat array of SensitivityCell objects.
  // Group by marginScenario to form rows, with revenueGrowth as columns.
  const cellMap = new Map<string, Map<number, SensitivityCellData>>();
  const revenueGrowths = new Set<number>();

  for (const cell of sensitivity.matrix) {
    const c = cell as SensitivityCellData;
    if (!cellMap.has(c.marginScenario)) {
      cellMap.set(c.marginScenario, new Map());
    }
    cellMap.get(c.marginScenario)!.set(c.revenueGrowth, c);
    revenueGrowths.add(c.revenueGrowth);
  }

  const sortedGrowths = Array.from(revenueGrowths).sort((a, b) => a - b);
  const marginScenarios = Array.from(cellMap.keys());

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          DSCR Sensitivity Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3 font-medium text-gray-600 min-w-[160px]">
                  Margin Scenario
                </th>
                {sortedGrowths.map((g) => (
                  <th
                    key={g}
                    className="text-center py-3 px-3 font-medium text-gray-600 min-w-[100px]"
                  >
                    {g >= 0 ? "+" : ""}
                    {(g * 100).toFixed(0)}% Rev
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {marginScenarios.map((ms) => (
                <tr key={ms} className="border-b border-gray-100">
                  <td className="py-3 px-3 font-medium text-gray-700 text-xs">
                    {ms}
                  </td>
                  {sortedGrowths.map((g) => {
                    const cell = cellMap.get(ms)?.get(g);
                    if (!cell) {
                      return (
                        <td key={g} className="py-3 px-3 text-center text-gray-400">
                          --
                        </td>
                      );
                    }
                    return (
                      <td key={g} className="py-2 px-2 text-center">
                        <div
                          className={`rounded-lg p-2 ${getDscrCellColor(
                            cell.resultingDscr
                          )}`}
                        >
                          <div className="font-mono text-xs font-bold">
                            {cell.resultingDscr.toFixed(2)}x
                          </div>
                          <div className="font-mono text-xs mt-0.5 opacity-75">
                            {formatCurrency(cell.resultingAcf)}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-100 border border-green-300" />
            DSCR &ge; 1.50
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
            DSCR 1.00 - 1.49
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-100 border border-red-300" />
            DSCR &lt; 1.00
          </div>
        </div>
      </div>

      {/* Key Insights */}
      {sensitivity.keyInsights && sensitivity.keyInsights.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Key Insights
          </h3>
          <ul className="space-y-2">
            {sensitivity.keyInsights.map((insight, index) => (
              <li
                key={index}
                className="text-sm text-gray-700 flex items-start gap-2"
              >
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---- Shared Sub-Components & Helpers ---- */

interface BenchmarkComparisonItem {
  name: string;
  dealValue: number | null;
  industryAvg: number;
  industryRange: [number, number] | null;
  status: string;
}

interface SensitivityCellData {
  revenueGrowth: number;
  marginScenario: string;
  resultingAcf: number;
  resultingDscr: number;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

function ScreeningVerdictBadge({ verdict }: { verdict: string }) {
  const normalized = verdict.toUpperCase().replace(/[_\s]/g, "-");
  const styles: Record<string, string> = {
    GO: "bg-green-100 text-green-800",
    "NO-GO": "bg-red-100 text-red-800",
    CONDITIONAL: "bg-amber-100 text-amber-800",
  };
  const style = styles[normalized] || "bg-gray-100 text-gray-800";

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-bold ${style}`}>
      {normalized}
    </span>
  );
}

function BenchmarkStatusBadge({ status }: { status: string }) {
  const normalized = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  const styles: Record<string, string> = {
    Above: "bg-green-100 text-green-800",
    Within: "bg-blue-100 text-blue-800",
    Below: "bg-red-100 text-red-800",
  };
  const style = styles[normalized] || "bg-gray-100 text-gray-800";

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {normalized}
    </span>
  );
}

function formatBenchmarkValue(metricName: string, value: number | null): string {
  if (value == null) return "--";
  const name = metricName.toLowerCase();

  if (name.includes("multiple")) {
    return formatMultiple(value);
  }
  if (
    name.includes("margin") ||
    name.includes("growth") ||
    name.includes("concentration") ||
    name.includes("recurring")
  ) {
    // Values stored as decimals (e.g., 0.35 = 35%)
    return formatPercent(value);
  }
  if (name.includes("revenue per employee")) {
    return formatCurrency(value);
  }
  return value.toLocaleString("en-US");
}

function getDscrCellColor(dscr: number): string {
  if (dscr >= 1.5) return "bg-green-100 text-green-900";
  if (dscr >= 1.0) return "bg-amber-100 text-amber-900";
  return "bg-red-100 text-red-900";
}
