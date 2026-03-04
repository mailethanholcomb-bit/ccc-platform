"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface EmailRecord {
  id: string;
  emailType: string;
  subject: string;
  brokerName: string | null;
  businessName: string | null;
  status: string;
  sentAt: string | null;
  sentToEmail: string | null;
  createdAt: string;
  user: { email: string; memberProfile: { fullName: string } | null };
}

export default function EmailTrackingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    async function load() {
      try {
        const res = await fetch("/api/admin/emails");
        const json = await res.json();
        if (json.success) setEmails(json.data || []);
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

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Email Tracking</h1>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {emails.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No emails sent yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Member</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Business</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Broker</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Type</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Sent To</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <tr key={email.id} className="border-b border-gray-50">
                  <td className="py-3 px-4 font-medium">
                    {email.user?.memberProfile?.fullName || email.user?.email}
                  </td>
                  <td className="py-3 px-4">{email.businessName || "—"}</td>
                  <td className="py-3 px-4">{email.brokerName || "—"}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        email.emailType === "option_a"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {email.emailType === "option_a" ? "Option A" : "Option B"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        email.status === "sent"
                          ? "bg-green-100 text-green-800"
                          : email.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {email.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{email.sentToEmail || "—"}</td>
                  <td className="py-3 px-4 text-gray-500">
                    {email.sentAt
                      ? new Date(email.sentAt).toLocaleDateString()
                      : new Date(email.createdAt).toLocaleDateString()}
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
