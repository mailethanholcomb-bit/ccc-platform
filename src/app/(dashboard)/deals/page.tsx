"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DealListItem {
  id: string;
  listingTitle: string | null;
  businessName: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  askingPrice: number | null;
  sdeYear1: number | null;
  phase: string;
  verdict: string | null;
  analysisStatus: string;
  createdAt: string;
}

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<DealListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ phase: "", verdict: "" });

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams();
      if (filter.phase) params.set("phase", filter.phase);
      if (filter.verdict) params.set("verdict", filter.verdict);

      try {
        const res = await fetch(`/api/deals?${params}`);
        const json = await res.json();
        if (json.success) setDeals(json.data?.deals || []);
      } catch {
        // Handle silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filter]);

  const fmtCurrency = (v: number | null) =>
    v != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
      : "—";

  const verdictBadge = (v: string | null) => {
    if (!v) return <span className="text-gray-400">—</span>;
    const s: Record<string, string> = {
      go: "bg-green-100 text-green-800",
      no_go: "bg-red-100 text-red-800",
      conditional: "bg-amber-100 text-amber-800",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s[v] || ""}`}>
        {v.replace("_", "-").toUpperCase()}
      </span>
    );
  };

  const phaseBadge = (p: string) => {
    const s: Record<string, string> = {
      phase_1: "bg-blue-100 text-blue-800",
      phase_2: "bg-purple-100 text-purple-800",
      complete: "bg-green-100 text-green-800",
    };
    const l: Record<string, string> = { phase_1: "Listing", phase_2: "CIM", complete: "Complete" };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s[p] || ""}`}>{l[p] || p}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Deals</h1>
          <p className="text-sm text-gray-500 mt-1">{deals.length} deal{deals.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/deals/new"
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Deal
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filter.phase}
          onChange={(e) => setFilter({ ...filter, phase: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Phases</option>
          <option value="phase_1">Listing</option>
          <option value="phase_2">CIM</option>
          <option value="complete">Complete</option>
        </select>
        <select
          value={filter.verdict}
          onChange={(e) => setFilter({ ...filter, verdict: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">All Verdicts</option>
          <option value="go">GO</option>
          <option value="no_go">NO-GO</option>
          <option value="conditional">CONDITIONAL</option>
        </select>
      </div>

      {/* Deal list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">No deals found.</p>
            <Link
              href="/deals/new"
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Analyze Your First Deal
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Deal</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Industry</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Location</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Asking Price</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">SDE</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Phase</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Verdict</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr
                  key={deal.id}
                  className="border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => router.push(`/deals/${deal.id}`)}
                >
                  <td className="py-3 px-4 font-medium">
                    {deal.businessName || deal.listingTitle || "Untitled Deal"}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{deal.industry || "—"}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {[deal.city, deal.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">{fmtCurrency(deal.askingPrice)}</td>
                  <td className="py-3 px-4 text-right font-mono">{fmtCurrency(deal.sdeYear1)}</td>
                  <td className="py-3 px-4">{phaseBadge(deal.phase)}</td>
                  <td className="py-3 px-4">{verdictBadge(deal.verdict)}</td>
                  <td className="py-3 px-4 text-gray-500">
                    {new Date(deal.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
