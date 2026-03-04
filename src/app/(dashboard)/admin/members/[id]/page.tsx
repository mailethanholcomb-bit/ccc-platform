"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface MemberDetail {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  memberProfile: {
    fullName: string;
    companyName: string | null;
    title: string | null;
    phone: string | null;
    targetIndustries: string[];
    minAnnualRevenue: number;
    minSde: number;
    dscrFloor: number;
  } | null;
  deals: Array<{
    id: string;
    listingTitle: string | null;
    businessName: string | null;
    industry: string | null;
    askingPrice: number | null;
    phase: string;
    verdict: string | null;
    createdAt: string;
  }>;
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    async function load() {
      try {
        const res = await fetch(`/api/admin/members/${id}`);
        const json = await res.json();
        if (json.success) setMember(json.data);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, session, router]);

  const handleLockToggle = async () => {
    if (!member) return;
    const action = member.status === "locked" ? "unlock" : "lock";
    try {
      await fetch(`/api/admin/members/${id}/${action}`, { method: "PUT" });
      setMember((prev) => (prev ? { ...prev, status: action === "lock" ? "locked" : "active" } : prev));
    } catch {
      // Handle error
    }
  };

  const fmtCurrency = (v: number | null) =>
    v != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
      : "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return <div className="text-center py-20 text-gray-500">Member not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/admin" className="hover:text-blue-600">Admin</Link>
        <span>/</span>
        <Link href="/admin/members" className="hover:text-blue-600">Members</Link>
        <span>/</span>
        <span className="text-gray-900">{member.memberProfile?.fullName || member.email}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {member.memberProfile?.fullName || "No Profile"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{member.email}</p>
          {member.memberProfile?.companyName && (
            <p className="text-sm text-gray-600">{member.memberProfile.companyName}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              member.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {member.status}
          </span>
          <button
            onClick={handleLockToggle}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              member.status === "locked"
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            {member.status === "locked" ? "Unlock Account" : "Lock Account"}
          </button>
        </div>
      </div>

      {/* Buy Box */}
      {member.memberProfile && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Buy Box Criteria</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Min Revenue</span>
              <div className="font-medium">{fmtCurrency(member.memberProfile.minAnnualRevenue)}</div>
            </div>
            <div>
              <span className="text-gray-500">Min SDE</span>
              <div className="font-medium">{fmtCurrency(member.memberProfile.minSde)}</div>
            </div>
            <div>
              <span className="text-gray-500">DSCR Floor</span>
              <div className="font-medium">{member.memberProfile.dscrFloor}x</div>
            </div>
            <div>
              <span className="text-gray-500">Industries</span>
              <div className="font-medium">
                {member.memberProfile.targetIndustries.join(", ") || "Not set"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deals */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Deals ({member.deals.length})</h2>
        </div>
        {member.deals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No deals</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-2 px-4 font-medium text-gray-600">Deal</th>
                <th className="text-left py-2 px-4 font-medium text-gray-600">Industry</th>
                <th className="text-right py-2 px-4 font-medium text-gray-600">Asking Price</th>
                <th className="text-center py-2 px-4 font-medium text-gray-600">Phase</th>
                <th className="text-center py-2 px-4 font-medium text-gray-600">Verdict</th>
                <th className="text-left py-2 px-4 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {member.deals.map((deal) => (
                <tr key={deal.id} className="border-b border-gray-50">
                  <td className="py-2 px-4 font-medium">
                    {deal.businessName || deal.listingTitle || "Untitled"}
                  </td>
                  <td className="py-2 px-4 text-gray-600">{deal.industry || "—"}</td>
                  <td className="py-2 px-4 text-right font-mono">{fmtCurrency(deal.askingPrice)}</td>
                  <td className="py-2 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {deal.phase.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-center">
                    {deal.verdict ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          deal.verdict === "go"
                            ? "bg-green-100 text-green-800"
                            : deal.verdict === "no_go"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {deal.verdict.replace("_", "-").toUpperCase()}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 px-4 text-gray-500">
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
