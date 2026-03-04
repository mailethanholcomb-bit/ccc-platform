"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Member {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  profile: { fullName: string; companyName: string | null } | null;
  _count: { deals: number };
}

interface Analytics {
  totalDeals: number;
  totalMembers: number;
  verdictBreakdown: { go: number; no_go: number; conditional: number; pending: number };
  avgDscr: number | null;
  industryBreakdown: Record<string, number>;
}

interface Activity {
  id: string;
  actionType: string;
  createdAt: string;
  user: { email: string; memberProfile: { fullName: string } | null };
  deal: { businessName: string | null; listingTitle: string | null } | null;
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    async function load() {
      try {
        const [membersRes, analyticsRes, activityRes] = await Promise.all([
          fetch("/api/admin/members"),
          fetch("/api/admin/analytics"),
          fetch("/api/admin/activity?limit=20"),
        ]);
        const [membersData, analyticsData, activityData] = await Promise.all([
          membersRes.json(),
          analyticsRes.json(),
          activityRes.json(),
        ]);
        if (membersData.success) setMembers(membersData.data || []);
        if (analyticsData.success) setAnalytics(analyticsData.data);
        if (activityData.success) setActivity(activityData.data?.activities || []);
      } catch {
        // Handle silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session, router]);

  const handleLockToggle = async (memberId: string, currentStatus: string) => {
    const action = currentStatus === "locked" ? "unlock" : "lock";
    try {
      await fetch(`/api/admin/members/${memberId}/${action}`, { method: "PUT" });
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, status: action === "lock" ? "locked" : "active" } : m
        )
      );
    } catch {
      // Handle error
    }
  };

  const actionLabels: Record<string, string> = {
    deal_created: "Created deal",
    deal_updated: "Updated deal",
    analysis_started: "Started analysis",
    analysis_complete: "Completed analysis",
    email_generated: "Generated email",
    email_sent: "Sent email",
    profile_updated: "Updated profile",
    buybox_updated: "Updated buy box",
    login: "Logged in",
    logout: "Logged out",
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
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="text-sm text-gray-500">Members</div>
            <div className="text-2xl font-bold mt-1">{analytics.totalMembers}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="text-sm text-gray-500">Total Deals</div>
            <div className="text-2xl font-bold mt-1">{analytics.totalDeals}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="text-sm text-gray-500">GO Deals</div>
            <div className="text-2xl font-bold mt-1 text-green-600">{analytics.verdictBreakdown.go}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="text-sm text-gray-500">NO-GO Deals</div>
            <div className="text-2xl font-bold mt-1 text-red-600">{analytics.verdictBreakdown.no_go}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <div className="text-sm text-gray-500">Avg DSCR</div>
            <div className="text-2xl font-bold mt-1">
              {analytics.avgDscr ? `${analytics.avgDscr.toFixed(2)}x` : "N/A"}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Members</h2>
            <Link href="/admin/members" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-4 font-medium text-gray-600">Name</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600">Email</th>
                  <th className="text-center py-2 px-4 font-medium text-gray-600">Deals</th>
                  <th className="text-center py-2 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-center py-2 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.slice(0, 10).map((m) => (
                  <tr key={m.id} className="border-b border-gray-50">
                    <td className="py-2 px-4 font-medium">
                      {m.profile?.fullName || "No profile"}
                    </td>
                    <td className="py-2 px-4 text-gray-600">{m.email}</td>
                    <td className="py-2 px-4 text-center">{m._count.deals}</td>
                    <td className="py-2 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          m.status === "active"
                            ? "bg-green-100 text-green-800"
                            : m.status === "locked"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <Link
                          href={`/admin/members/${m.id}`}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleLockToggle(m.id, m.status)}
                          className={`text-xs ${
                            m.status === "locked"
                              ? "text-green-600 hover:underline"
                              : "text-red-600 hover:underline"
                          }`}
                        >
                          {m.status === "locked" ? "Unlock" : "Lock"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </div>
          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {activity.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No activity yet</p>
            ) : (
              activity.map((a) => (
                <div key={a.id} className="border-b border-gray-50 pb-3 last:border-0">
                  <div className="text-sm font-medium">
                    {a.user?.memberProfile?.fullName || a.user?.email || "Unknown"}
                  </div>
                  <div className="text-xs text-gray-600">
                    {actionLabels[a.actionType] || a.actionType}
                    {a.deal && (
                      <span>
                        : {a.deal.businessName || a.deal.listingTitle || "Untitled"}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Industry Breakdown */}
      {analytics && Object.keys(analytics.industryBreakdown).length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Industry Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(analytics.industryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([industry, count]) => (
                <div key={industry} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium">{industry}</div>
                  <div className="text-lg font-bold text-blue-600">{count}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
