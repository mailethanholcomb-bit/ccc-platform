"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ConfirmationModal } from "@/components/shared/confirmation-modal";
import type { EmailGenerated } from "@/types";

export default function EmailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [emails, setEmails] = useState<EmailGenerated[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editing state: track edited body per email id
  const [editedBodies, setEditedBodies] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  // Send flow state
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [brokerEmail, setBrokerEmail] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<{
    emailId: string;
    timestamp: string;
  } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/deals/${id}/emails`);
        const json = await res.json();
        if (json.success && json.data) {
          const emailList = Array.isArray(json.data)
            ? json.data
            : json.data.emails
            ? json.data.emails
            : [];
          setEmails(emailList);
        } else {
          setError(json.error?.message || "No email data available");
        }
      } catch {
        setError("Failed to load emails");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const getEmailBody = useCallback(
    (email: EmailGenerated) => {
      return editedBodies[email.id] ?? email.body;
    },
    [editedBodies]
  );

  const handleBodyChange = (emailId: string, newBody: string) => {
    setEditedBodies((prev) => ({ ...prev, [emailId]: newBody }));
  };

  const handleSelectAndSend = (emailId: string) => {
    setSendingEmailId(emailId);
    setSendError(null);
    setSendSuccess(null);

    // Pre-fill broker email if available from the email data
    const email = emails.find((e) => e.id === emailId);
    if (email?.brokerName) {
      // Don't pre-fill email address, just show the modal
    }
    setBrokerEmail("");
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (!sendingEmailId || !brokerEmail.trim()) return;

    setSendLoading(true);
    setSendError(null);
    setShowConfirmModal(false);

    try {
      const res = await fetch(`/api/deals/${id}/emails/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: sendingEmailId,
          recipientEmail: brokerEmail.trim(),
          body: editedBodies[sendingEmailId] || undefined,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setSendSuccess({
          emailId: sendingEmailId,
          timestamp: new Date().toLocaleString(),
        });
        // Update the email status in local state
        setEmails((prev) =>
          prev.map((e) =>
            e.id === sendingEmailId
              ? {
                  ...e,
                  status: "sent" as const,
                  sentAt: new Date().toISOString(),
                  sentToEmail: brokerEmail.trim(),
                }
              : e
          )
        );
      } else {
        setSendError(json.error?.message || "Failed to send email");
      }
    } catch {
      setSendError("Network error while sending email");
    } finally {
      setSendLoading(false);
      setSendingEmailId(null);
    }
  };

  const handleCancelSend = () => {
    setShowConfirmModal(false);
    setSendingEmailId(null);
    setBrokerEmail("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading emails..." />
      </div>
    );
  }

  if (error && emails.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Link
          href={`/deals/${id}`}
          className="text-sm text-blue-600 hover:underline mb-6 inline-block"
        >
          &larr; Back to Deal
        </Link>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-gray-400 text-4xl mb-4">&#9993;</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            No Emails Generated
          </h2>
          <p className="text-sm text-gray-500">
            No emails generated. Emails are generated when a deal receives a
            NO-GO or CONDITIONAL verdict.
          </p>
        </div>
      </div>
    );
  }

  // Separate option A and option B
  const optionA = emails.find((e) => e.emailType === "option_a");
  const optionB = emails.find((e) => e.emailType === "option_b");
  const suggested = emails.find(
    (e) =>
      (e as EmailGenerated & { suggestedOption?: boolean }).suggestedOption ===
      true
  );
  const suggestedId = suggested?.id;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link
        href={`/deals/${id}`}
        className="text-sm text-blue-600 hover:underline inline-block"
      >
        &larr; Back to Deal
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generated Emails</h1>
        <p className="text-sm text-gray-500 mt-1">
          Broker response emails for this deal
        </p>
      </div>

      {/* Send Success Message */}
      {sendSuccess && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 flex items-start gap-3">
          <span className="text-green-600 text-lg flex-shrink-0">&#10003;</span>
          <div>
            <h4 className="text-sm font-semibold text-green-800">
              Email Sent Successfully
            </h4>
            <p className="text-sm text-green-700 mt-1">
              Email was sent at {sendSuccess.timestamp}
            </p>
          </div>
        </div>
      )}

      {/* Send Error Message */}
      {sendError && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3">
          <span className="text-red-600 text-lg flex-shrink-0">&#10005;</span>
          <div>
            <h4 className="text-sm font-semibold text-red-800">
              Failed to Send
            </h4>
            <p className="text-sm text-red-700 mt-1">{sendError}</p>
          </div>
        </div>
      )}

      {/* Email Cards: Side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {optionA && (
          <EmailCard
            email={optionA}
            isRecommended={optionA.id === suggestedId}
            typeLabel="Option A - Clean Pass"
            body={getEmailBody(optionA)}
            isEditing={editingId === optionA.id}
            onEdit={() =>
              setEditingId(editingId === optionA.id ? null : optionA.id)
            }
            onBodyChange={(body) => handleBodyChange(optionA.id, body)}
            onSelectAndSend={() => handleSelectAndSend(optionA.id)}
            isSending={sendLoading && sendingEmailId === optionA.id}
          />
        )}
        {optionB && (
          <EmailCard
            email={optionB}
            isRecommended={optionB.id === suggestedId}
            typeLabel="Option B - Warm Open"
            body={getEmailBody(optionB)}
            isEditing={editingId === optionB.id}
            onEdit={() =>
              setEditingId(editingId === optionB.id ? null : optionB.id)
            }
            onBodyChange={(body) => handleBodyChange(optionB.id, body)}
            onSelectAndSend={() => handleSelectAndSend(optionB.id)}
            isSending={sendLoading && sendingEmailId === optionB.id}
          />
        )}
      </div>

      {/* Additional emails that are not option_a or option_b */}
      {emails
        .filter(
          (e) => e.emailType !== "option_a" && e.emailType !== "option_b"
        )
        .map((email) => (
          <EmailCard
            key={email.id}
            email={email}
            isRecommended={email.id === suggestedId}
            typeLabel={email.emailType.replace(/_/g, " ").toUpperCase()}
            body={getEmailBody(email)}
            isEditing={editingId === email.id}
            onEdit={() =>
              setEditingId(editingId === email.id ? null : email.id)
            }
            onBodyChange={(body) => handleBodyChange(email.id, body)}
            onSelectAndSend={() => handleSelectAndSend(email.id)}
            isSending={sendLoading && sendingEmailId === email.id}
          />
        ))}

      {/* Confirmation Modal for Sending */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCancelSend}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Send Email to Broker
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Enter the broker's email address to send this response.
            </p>
            <div className="mt-4">
              <label
                htmlFor="broker-email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Broker Email
              </label>
              <input
                id="broker-email"
                type="email"
                value={brokerEmail}
                onChange={(e) => setBrokerEmail(e.target.value)}
                placeholder="broker@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleCancelSend}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={!brokerEmail.trim() || sendLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendLoading ? "Sending..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Sub-Components ---- */

function EmailCard({
  email,
  isRecommended,
  typeLabel,
  body,
  isEditing,
  onEdit,
  onBodyChange,
  onSelectAndSend,
  isSending,
}: {
  email: EmailGenerated;
  isRecommended: boolean;
  typeLabel: string;
  body: string;
  isEditing: boolean;
  onEdit: () => void;
  onBodyChange: (body: string) => void;
  onSelectAndSend: () => void;
  isSending: boolean;
}) {
  const isSent = email.status === "sent";

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col ${
        isRecommended ? "border-blue-300 ring-1 ring-blue-200" : "border-gray-100"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {typeLabel}
          </span>
          {isRecommended && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Recommended
            </span>
          )}
        </div>
        {isSent && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Sent
          </span>
        )}
      </div>

      {/* Subject */}
      <div className="mb-3">
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          Subject
        </span>
        <div className="text-sm font-medium text-gray-900 mt-0.5">
          {email.subject}
        </div>
      </div>

      {/* Sent info */}
      {isSent && email.sentAt && (
        <div className="mb-3 text-xs text-gray-500">
          Sent to {email.sentToEmail} on{" "}
          {new Date(email.sentAt).toLocaleString()}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            Body
          </span>
          <button
            onClick={onEdit}
            className="text-xs text-blue-600 hover:underline"
          >
            {isEditing ? "Preview" : "Edit"}
          </button>
        </div>
        {isEditing ? (
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono leading-relaxed min-h-[300px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
          />
        ) : (
          <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto bg-gray-50">
            {body}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!isSent && (
        <button
          onClick={onSelectAndSend}
          disabled={isSending}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? "Sending..." : "Select & Send"}
        </button>
      )}
    </div>
  );
}
