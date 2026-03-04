"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DealSummary {
  id: string;
  listingTitle: string | null;
  businessName: string | null;
  industry: string | null;
  phase: string;
  verdict: string | null;
  analysisStatus: string;
  responseDeadline: string | null;
  createdAt: string;
}

interface ProfileSummary {
  fullName: string | null;
  targetIndustries: string[];
  minAnnualRevenue: number;
  minSde: number;
  dscrFloor: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      router.push("/admin");
      return;
    }

    async function load() {
      try {
        const [dealsRes, profileRes] = await Promise.all([
          fetch("/api/deals?limit=10"),
          fetch("/api/profile"),
        ]);
        const dealsData = await dealsRes.json();
        const profileData = await profileRes.json();

        if (dealsData.success) setDeals(dealsData.data?.deals || []);
        if (profileData.success) setProfile(profileData.data);
      } catch {
        // Handle silently
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [session, router]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);

  const getDeadlineStatus = (deadline: string | null) => {
    if (!deadline) return null;
    const now = new Date();
    const dl = new Date(deadline);
    if (now >= dl) return { label: "OVERDUE", color: "text-red-600 bg-red-50" };
    const total = dl.getTime() - new Date(dl.getTime() - 2 * 24 * 60 * 60 * 1000).getTime();
    const elapsed = now.getTime() - (dl.getTime() - total);
    if (elapsed / total >= 0.75)
      return { label: "WARNING", color: "text-amber-600 bg-amber-50" };
    return { label: "ON TIME", color: "text-green-600 bg-green-50" };
  };

  const verdictBadge = (verdict: string | null) => {
    if (!verdict) return null;
    const styles: Record<string, string> = {
      go: "bg-green-100 text-green-800",
      no_go: "bg-red-100 text-red-800",
      conditional: "bg-amber-100 text-amber-800",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[verdict] || ""}`}>
        {verdict.replace("_", "-").toUpperCase()}
      </span>
    );
  };

  const phaseBadge = (phase: string) => {
    const styles: Record<string, string> = {
      phase_1: "bg-blue-100 text-blue-800",
      phase_2: "bg-purple-100 text-purple-800",
      complete: "bg-green-100 text-green-800",
    };
    const labels: Record<string, string> = {
      phase_1: "Listing",
      phase_2: "CIM",
      complete: "Complete",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[phase] || ""}`}>
        {labels[phase] || phase}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.fullName ? `Welcome, ${profile.fullName.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Your deal analysis overview</p>
        </div>
        <Link
          href="/deals/new"
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Deal
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Total Deals</div>
          <div className="text-2xl font-bold mt-1">{deals.length}</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">GO Deals</div>
          <div className="text-2xl font-bold mt-1 text-green-600">
            {deals.filter((d) => d.verdict === "go").length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Pending Analysis</div>
          <div className="text-2xl font-bold mt-1 text-blue-600">
            {deals.filter((d) => d.analysisStatus !== "complete" && d.analysisStatus !== "pending").length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Response Deadlines</div>
          <div className="text-2xl font-bold mt-1 text-amber-600">
            {deals.filter((d) => d.responseDeadline && new Date(d.responseDeadline) > new Date()).length}
          </div>
        </div>
      </div>

      {/* Buy Box Summary */}
      {profile && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Buy Box</h2>
            <Link href="/profile" className="text-sm text-blue-600 hover:underline">
              Edit
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Min Revenue</span>
              <div className="font-medium">{formatCurrency(profile.minAnnualRevenue)}</div>
            </div>
            <div>
              <span className="text-gray-500">Min SDE</span>
              <div className="font-medium">{formatCurrency(profile.minSde)}</div>
            </div>
            <div>
              <span className="text-gray-500">DSCR Floor</span>
              <div className="font-medium">{profile.dscrFloor}x</div>
            </div>
            <div>
              <span className="text-gray-500">Industries</span>
              <div className="font-medium">
                {profile.targetIndustries.length > 0
                  ? profile.targetIndustries.slice(0, 3).join(", ")
                  : "Not set"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Response Deadline Alerts */}
      {deals.some((d) => d.responseDeadline) && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Response Deadlines</h2>
          <div className="space-y-3">
            {deals
              .filter((d) => d.responseDeadline)
              .map((deal) => {
                const status = getDeadlineStatus(deal.responseDeadline);
                return (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <span className="font-medium text-sm">
                        {deal.businessName || deal.listingTitle || "Untitled Deal"}
                      </span>
                    </div>
                    {status && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Deal Pipeline */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Deals</h2>
          <Link href="/deals" className="text-sm text-blue-600 hover:underline">
            View All
          </Link>
        </div>

        {deals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No deals yet. Start by analyzing your first deal.</p>
            <Link
              href="/deals/new"
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + New Deal
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-3 px-2 font-medium text-gray-600">Deal</th>
                  <th className="py-3 px-2 font-medium text-gray-600">Industry</th>
                  <th className="py-3 px-2 font-medium text-gray-600">Phase</th>
                  <th className="py-3 px-2 font-medium text-gray-600">Verdict</th>
                  <th className="py-3 px-2 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr
                    key={deal.id}
                    className="border-b border-gray-50 cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/deals/${deal.id}`)}
                  >
                    <td className="py-3 px-2 font-medium">
                      {deal.businessName || deal.listingTitle || "Untitled Deal"}
                    </td>
                    <td className="py-3 px-2 text-gray-600">{deal.industry || "—"}</td>
                    <td className="py-3 px-2">{phaseBadge(deal.phase)}</td>
                    <td className="py-3 px-2">{verdictBadge(deal.verdict) || "—"}</td>
                    <td className="py-3 px-2 text-gray-500">
                      {new Date(deal.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
