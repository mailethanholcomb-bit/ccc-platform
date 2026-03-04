"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Analytics {
  totalDeals: number;
  totalMembers: number;
  verdictBreakdown: { go: number; no_go: number; conditional: number; pending: number };
  avgDscr: number | null;
  passRate: number;
  industryBreakdown: Record<string, number>;
  commonRedFlags: Array<{ flag: string; count: number }>;
  memberEngagement: Array<{ name: string; deals: number; lastActive: string }>;
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    async function load() {
      try {
        const res = await fetch("/api/admin/analytics");
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="text-center py-20 text-gray-500">No analytics data</div>;

  const total =
    data.verdictBreakdown.go +
    data.verdictBreakdown.no_go +
    data.verdictBreakdown.conditional +
    data.verdictBreakdown.pending;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="text-sm text-gray-500">Total Deals Analyzed</div>
          <div className="text-3xl font-bold mt-1">{data.totalDeals}</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="text-sm text-gray-500">Pass Rate</div>
          <div className="text-3xl font-bold mt-1 text-red-600">
            {(data.passRate * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-400">NO-GO / Total</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="text-sm text-gray-500">Average DSCR</div>
          <div className="text-3xl font-bold mt-1">
            {data.avgDscr ? `${data.avgDscr.toFixed(2)}x` : "N/A"}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="text-sm text-gray-500">Active Members</div>
          <div className="text-3xl font-bold mt-1">{data.totalMembers}</div>
        </div>
      </div>

      {/* Verdict Breakdown */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Verdict Breakdown</h2>
        <div className="flex gap-2 h-8 rounded-lg overflow-hidden">
          {data.verdictBreakdown.go > 0 && (
            <div
              className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(data.verdictBreakdown.go / total) * 100}%` }}
            >
              GO ({data.verdictBreakdown.go})
            </div>
          )}
          {data.verdictBreakdown.conditional > 0 && (
            <div
              className="bg-amber-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(data.verdictBreakdown.conditional / total) * 100}%` }}
            >
              COND ({data.verdictBreakdown.conditional})
            </div>
          )}
          {data.verdictBreakdown.no_go > 0 && (
            <div
              className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(data.verdictBreakdown.no_go / total) * 100}%` }}
            >
              NO-GO ({data.verdictBreakdown.no_go})
            </div>
          )}
          {data.verdictBreakdown.pending > 0 && (
            <div
              className="bg-gray-300 flex items-center justify-center text-gray-700 text-xs font-medium"
              style={{ width: `${(data.verdictBreakdown.pending / total) * 100}%` }}
            >
              Pending ({data.verdictBreakdown.pending})
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Industry Breakdown</h2>
          <div className="space-y-2">
            {Object.entries(data.industryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([industry, count]) => (
                <div key={industry} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{industry}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(count / data.totalDeals) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Common Red Flags */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Most Common Red Flags</h2>
          {data.commonRedFlags.length === 0 ? (
            <p className="text-sm text-gray-500">No red flags data yet</p>
          ) : (
            <div className="space-y-3">
              {data.commonRedFlags.map((rf, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-sm flex-1">{rf.flag}</span>
                  <span className="text-sm font-medium text-gray-500">{rf.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
