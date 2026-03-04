"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

interface DocType {
  id: string;
  label: string;
  description: string;
  format: string;
  endpoint: string;
}

const documents: DocType[] = [
  {
    id: "summary-pdf",
    label: "Master Deal Summary",
    description: "Full report combining all three engines",
    format: "PDF",
    endpoint: "/api/deals/{id}/documents?type=summary",
  },
  {
    id: "case-study",
    label: "Case Study",
    description: "From 30-Minute Protocol output",
    format: "DOCX",
    endpoint: "/api/deals/{id}/documents?type=case-study",
  },
  {
    id: "loi",
    label: "Letter of Intent",
    description: "Pre-populated with deal data and member profile",
    format: "DOCX",
    endpoint: "/api/deals/{id}/documents?type=loi",
  },
  {
    id: "benchmark-report",
    label: "Benchmark Report",
    description: "5-tab benchmark analysis spreadsheet",
    format: "XLSX",
    endpoint: "/api/deals/{id}/documents?type=benchmark",
  },
  {
    id: "analyzer-export",
    label: "Deal Analyzer Export",
    description: "All Deal Analyzer calculations",
    format: "XLSX",
    endpoint: "/api/deals/{id}/documents?type=analyzer",
  },
];

export default function DocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const [generating, setGenerating] = useState<string | null>(null);

  const handleDownload = async (doc: DocType) => {
    setGenerating(doc.id);
    try {
      const url = doc.endpoint.replace("{id}", id);
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${doc.label.replace(/\s+/g, "_")}.${doc.format.toLowerCase()}`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      // Handle error
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href={`/deals/${id}`} className="text-sm text-blue-600 hover:underline">
          Back to Deal
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Documents</h1>
        <p className="text-sm text-gray-500 mt-1">
          Download generated reports and documents for this deal
        </p>
      </div>

      <div className="space-y-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{doc.label}</h3>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  {doc.format}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
            </div>
            <button
              onClick={() => handleDownload(doc)}
              disabled={generating === doc.id}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              {generating === doc.id ? "Generating..." : "Download"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
