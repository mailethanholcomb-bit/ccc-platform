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
  memberProfile: { fullName: string; companyName: string | null } | null;
  _count: { deals: number };
}

export default function MembersListPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    async function load() {
      try {
        const res = await fetch("/api/admin/members");
        const json = await res.json();
        if (json.success) setMembers(json.data || []);
      } catch {
        // Handle error
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <span className="text-sm text-gray-500">{members.length} total</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Company</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">Deals</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Last Active</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">
                  {m.memberProfile?.fullName || "No profile"}
                </td>
                <td className="py-3 px-4 text-gray-600">
                  {m.memberProfile?.companyName || "—"}
                </td>
                <td className="py-3 px-4 text-gray-600">{m.email}</td>
                <td className="py-3 px-4 text-center">{m._count.deals}</td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-500 text-sm">
                  {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleDateString() : "Never"}
                </td>
                <td className="py-3 px-4 text-center">
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
  );
}
