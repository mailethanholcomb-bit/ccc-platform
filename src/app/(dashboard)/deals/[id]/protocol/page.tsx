"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type { ProtocolResult } from "@/types";

export default function ProtocolResultsPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<ProtocolResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/deals/${id}/protocol`);
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error?.message || "Analysis required");
        }
      } catch {
        setError("Failed to load protocol results");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading protocol results..." />
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
            {error || "Protocol results are not yet available. Run the analysis to generate results."}
          </p>
        </div>
      </div>
    );
  }

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
          30-Minute Protocol Results
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Industry research, digital footprint, distress signals, and scorecard
        </p>
      </div>

      {/* ---- Phase 1: Industry & Market ---- */}
      <PhaseSection
        phaseNumber={1}
        title="Industry & Market"
        complete={data.phase1Complete}
        pendingMessage="Pending - requires industry and location data"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ContentCard
            title="Industry Overview"
            content={data.industryOverview}
          />
          <ContentCard title="Market Size" content={data.marketSize} />
          <ContentCard title="Growth Trends" content={data.growthTrends} />
          <ContentCard
            title="Competitive Landscape"
            content={data.competitiveLandscape}
          />
          <ContentCard
            title="Seasonal Patterns"
            content={data.seasonalPatterns}
          />
          <ContentCard title="Industry Risks" content={data.industryRisks} />
        </div>
      </PhaseSection>

      {/* ---- Phase 2: Digital Footprint ---- */}
      <PhaseSection
        phaseNumber={2}
        title="Digital Footprint"
        complete={data.phase2Complete}
        pendingMessage="Pending - requires business name"
      >
        <div className="space-y-4">
          {/* Website Audit */}
          {data.websiteAudit && (
            <div className="border border-gray-200 rounded-lg p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Website Audit
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">URL</span>
                  <div className="font-medium truncate">
                    {data.websiteAudit.url}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">SSL</span>
                  <div className="font-medium">
                    {data.websiteAudit.ssl ? (
                      <span className="text-green-700">Enabled</span>
                    ) : (
                      <span className="text-red-700">Not Enabled</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Mobile Responsive</span>
                  <div className="font-medium">
                    {data.websiteAudit.mobileResponsive ? (
                      <span className="text-green-700">Yes</span>
                    ) : (
                      <span className="text-red-700">No</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Quality Score</span>
                  <div className="font-medium">
                    {data.websiteAudit.qualityScore}/5
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Google Reviews */}
          {data.googleReviews && (
            <div className="border border-gray-200 rounded-lg p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Google Reviews
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Review Count</span>
                  <div className="font-medium text-lg">
                    {data.googleReviews.count}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Average Rating</span>
                  <div className="font-medium text-lg">
                    {data.googleReviews.avgRating.toFixed(1)}/5.0
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Sentiment</span>
                  <div className="font-medium">{data.googleReviews.sentiment}</div>
                </div>
              </div>
              {data.googleReviews.recentTrend && (
                <div className="mt-3 text-sm">
                  <span className="text-gray-500">Recent Trend: </span>
                  <span className="font-medium">{data.googleReviews.recentTrend}</span>
                </div>
              )}
              {data.googleReviews.flaggedReviews &&
                data.googleReviews.flaggedReviews.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm text-gray-500">
                      Flagged Themes:
                    </span>
                    <ul className="mt-1 space-y-1">
                      {data.googleReviews.flaggedReviews.map(
                        (review, index) => (
                          <li
                            key={index}
                            className="text-sm text-amber-700 flex items-start gap-2"
                          >
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500 flex-shrink-0" />
                            {review}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
            </div>
          )}

          {/* Social Media */}
          {data.socialMedia && (
            <div className="border border-gray-200 rounded-lg p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Social Media
              </h4>
              <div className="text-sm text-gray-700 space-y-2">
                {Object.entries(data.socialMedia).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-gray-500 capitalize min-w-[120px]">
                      {key.replace(/([A-Z])/g, " $1").trim()}:
                    </span>
                    <span className="font-medium">
                      {typeof value === "string"
                        ? value
                        : Array.isArray(value)
                        ? value.join(", ")
                        : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Digital Footprint Score */}
          {data.digitalFootprintScore != null && (
            <div className="border border-gray-200 rounded-lg p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Digital Footprint Score
              </h4>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      n <= (data.digitalFootprintScore ?? 0)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {n}
                  </div>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {data.digitalFootprintScore}/5
                </span>
              </div>
            </div>
          )}
        </div>
      </PhaseSection>

      {/* ---- Phase 3: Distress Signals ---- */}
      <PhaseSection
        phaseNumber={3}
        title="Distress Signals"
        complete={data.phase3Complete}
        pendingMessage="Pending - requires business data"
      >
        {data.distressSignals && data.distressSignals.length > 0 ? (
          <div className="space-y-3">
            {data.distressSignals.map((signal, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 flex items-start gap-4"
              >
                <SeverityBadge severity={signal.severity} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900">
                    {signal.signal}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {signal.evidence}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No distress signals identified.
          </p>
        )}

        {data.ownerMotivationAnalysis && (
          <div className="mt-4 border border-gray-200 rounded-lg p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Owner Motivation Analysis
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {data.ownerMotivationAnalysis}
            </p>
          </div>
        )}
      </PhaseSection>

      {/* ---- Phase 4: Scorecard ---- */}
      <PhaseSection
        phaseNumber={4}
        title="Scorecard"
        complete={data.phase4Complete}
        pendingMessage="Pending - requires phases 1-3 to complete"
      >
        {data.scorecard && (
          <div className="space-y-4">
            {/* Score Summary */}
            <div className="flex items-center gap-6">
              <div>
                <span className="text-sm text-gray-500">Overall Score</span>
                <div className="text-3xl font-bold text-gray-900">
                  {data.scorecard.totalScore}
                  <span className="text-lg text-gray-400 font-normal">
                    /{data.scorecard.maxScore}
                  </span>
                </div>
              </div>
              {data.protocolVerdict && (
                <VerdictBadge verdict={data.protocolVerdict} />
              )}
            </div>

            {/* Criteria Table */}
            {data.scorecard.criteria && data.scorecard.criteria.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Criterion
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">
                        Weight
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">
                        Score
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.scorecard.criteria.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {item.name}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {(item.weight * 100).toFixed(0)}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium">
                          {item.score}
                        </td>
                        <td className="py-3 px-4 text-gray-600 max-w-md">
                          {item.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Assessment */}
            {data.protocolAssessment && (
              <div className="border border-gray-200 rounded-lg p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Qualitative Assessment
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {data.protocolAssessment}
                </p>
              </div>
            )}
          </div>
        )}
      </PhaseSection>

      {/* ---- Case Study Narrative ---- */}
      {data.caseStudyNarrative && (
        <section className="bg-white rounded-xl shadow-sm border-2 border-blue-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Case Study Narrative
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {data.caseStudyNarrative}
          </p>
        </section>
      )}
    </div>
  );
}

/* ---- Sub-Components ---- */

function PhaseSection({
  phaseNumber,
  title,
  complete,
  pendingMessage,
  children,
}: {
  phaseNumber: number;
  title: string;
  complete: boolean;
  pendingMessage: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            complete
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {complete ? "\u2713" : phaseNumber}
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          Phase {phaseNumber}: {title}
        </h2>
        {complete && (
          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
            Complete
          </span>
        )}
      </div>
      {complete ? (
        children
      ) : (
        <div className="text-sm text-gray-500 italic py-4">
          {pendingMessage}
        </div>
      )}
    </section>
  );
}

function ContentCard({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) {
  if (!content) return null;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: "high" | "moderate" | "low" }) {
  const styles = {
    high: "bg-red-100 text-red-800 border-red-300",
    moderate: "bg-amber-100 text-amber-800 border-amber-300",
    low: "bg-blue-100 text-blue-800 border-blue-300",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${styles[severity]}`}
    >
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const normalized = verdict.toUpperCase().replace(/[_-]/g, "-");
  const styles: Record<string, string> = {
    GO: "bg-green-500 text-white",
    "NO-GO": "bg-red-500 text-white",
    CONDITIONAL: "bg-amber-500 text-white",
  };
  const style = styles[normalized] || "bg-gray-500 text-white";

  return (
    <span
      className={`px-4 py-1.5 rounded-lg text-sm font-bold tracking-wide ${style}`}
    >
      {normalized}
    </span>
  );
}
