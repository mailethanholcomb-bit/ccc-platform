"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const INDUSTRY_OPTIONS = [
  "HVAC", "Plumbing", "Electrical", "Kitchen and Bath Remodeling",
  "Landscaping", "Roofing", "Pest Control", "Painting",
  "General Contracting", "Staffing", "Childcare / Daycare",
  "Auto Repair", "Cleaning Services",
];

const STRUCTURE_OPTIONS = ["SBA", "Seller Financing", "Creative", "All Cash", "Equity Partners"];

const STATE_OPTIONS = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

interface ProfileForm {
  fullName: string;
  companyName: string;
  title: string;
  phone: string;
  mailingAddress: string;
  signatureBlock: string;
  targetIndustries: string[];
  minAnnualRevenue: string;
  minSde: string;
  dscrFloor: string;
  targetGeographies: string[];
  dealSizeMin: string;
  dealSizeMax: string;
  preferredDealStructures: string[];
  maxMultiple: string;
  minYearsInBusiness: string;
  minEmployeeCount: string;
}

const defaults: ProfileForm = {
  fullName: "",
  companyName: "",
  title: "",
  phone: "",
  mailingAddress: "",
  signatureBlock: "",
  targetIndustries: [],
  minAnnualRevenue: "1000000",
  minSde: "200000",
  dscrFloor: "1.75",
  targetGeographies: [],
  dealSizeMin: "500000",
  dealSizeMax: "5000000",
  preferredDealStructures: [],
  maxMultiple: "4.0",
  minYearsInBusiness: "5",
  minEmployeeCount: "3",
};

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(defaults);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/profile");
        const json = await res.json();
        if (json.success && json.data) {
          const p = json.data;
          setForm({
            fullName: p.fullName || "",
            companyName: p.companyName || "",
            title: p.title || "",
            phone: p.phone || "",
            mailingAddress: p.mailingAddress || "",
            signatureBlock: p.signatureBlock || "",
            targetIndustries: p.targetIndustries || [],
            minAnnualRevenue: String(p.minAnnualRevenue || 1000000),
            minSde: String(p.minSde || 200000),
            dscrFloor: String(p.dscrFloor || 1.75),
            targetGeographies: p.targetGeographies || [],
            dealSizeMin: String(p.dealSizeMin || ""),
            dealSizeMax: String(p.dealSizeMax || ""),
            preferredDealStructures: p.preferredDealStructures || [],
            maxMultiple: String(p.maxMultiple || 4.0),
            minYearsInBusiness: String(p.minYearsInBusiness || 5),
            minEmployeeCount: String(p.minEmployeeCount || 3),
          });
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          minAnnualRevenue: parseFloat(form.minAnnualRevenue) || 1000000,
          minSde: parseFloat(form.minSde) || 200000,
          dscrFloor: parseFloat(form.dscrFloor) || 1.75,
          dealSizeMin: form.dealSizeMin ? parseFloat(form.dealSizeMin) : null,
          dealSizeMax: form.dealSizeMax ? parseFloat(form.dealSizeMax) : null,
          maxMultiple: parseFloat(form.maxMultiple) || 4.0,
          minYearsInBusiness: parseInt(form.minYearsInBusiness) || 5,
          minEmployeeCount: parseInt(form.minEmployeeCount) || 3,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (
    field: "targetIndustries" | "targetGeographies" | "preferredDealStructures",
    item: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((i) => i !== item)
        : [...prev[field], item],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile & Buy Box</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your profile data auto-populates all documents and emails
          </p>
        </div>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Saved successfully</span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mailing Address</label>
              <input
                type="text"
                value={form.mailingAddress}
                onChange={(e) => setForm({ ...form, mailingAddress: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Signature Block</label>
              <textarea
                rows={4}
                value={form.signatureBlock}
                onChange={(e) => setForm({ ...form, signatureBlock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="John Smith&#10;Managing Partner&#10;Smith Acquisitions LLC&#10;(404) 555-1234"
              />
            </div>
          </div>
        </div>

        {/* Buy Box */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Buy Box Criteria</h2>
          <p className="text-sm text-gray-500 mb-6">
            These criteria are used to flag deals that fall outside your targets. Alerts are warnings, not blocks.
          </p>

          {/* Target Industries */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Industries</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_OPTIONS.map((ind) => (
                <button
                  key={ind}
                  type="button"
                  onClick={() => toggleArrayItem("targetIndustries", ind)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.targetIndustries.includes(ind)
                      ? "bg-blue-100 text-blue-800 border-blue-300"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Financial Criteria */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Annual Revenue ($)</label>
              <input
                type="number"
                value={form.minAnnualRevenue}
                onChange={(e) => setForm({ ...form, minAnnualRevenue: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min SDE / Cash Flow ($)</label>
              <input
                type="number"
                value={form.minSde}
                onChange={(e) => setForm({ ...form, minSde: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DSCR Floor (x)</label>
              <input
                type="number"
                step="0.05"
                value={form.dscrFloor}
                onChange={(e) => setForm({ ...form, dscrFloor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal Size Min ($)</label>
              <input
                type="number"
                value={form.dealSizeMin}
                onChange={(e) => setForm({ ...form, dealSizeMin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal Size Max ($)</label>
              <input
                type="number"
                value={form.dealSizeMax}
                onChange={(e) => setForm({ ...form, dealSizeMax: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Multiple (x SDE)</label>
              <input
                type="number"
                step="0.25"
                value={form.maxMultiple}
                onChange={(e) => setForm({ ...form, maxMultiple: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Years in Business</label>
              <input
                type="number"
                value={form.minYearsInBusiness}
                onChange={(e) => setForm({ ...form, minYearsInBusiness: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Employee Count</label>
              <input
                type="number"
                value={form.minEmployeeCount}
                onChange={(e) => setForm({ ...form, minEmployeeCount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Target Geographies */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Geographies</label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {STATE_OPTIONS.map((state) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => toggleArrayItem("targetGeographies", state)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.targetGeographies.includes(state)
                      ? "bg-blue-100 text-blue-800 border-blue-300"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>

          {/* Deal Structures */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Deal Structures</label>
            <div className="flex flex-wrap gap-2">
              {STRUCTURE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleArrayItem("preferredDealStructures", s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.preferredDealStructures.includes(s)
                      ? "bg-blue-100 text-blue-800 border-blue-300"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
