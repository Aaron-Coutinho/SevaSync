"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, AlertCircle, ChevronLeft } from "lucide-react";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import { post } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// ── Options ───────────────────────────────────────────────────────────────────
const CATEGORY_OPTIONS = [
  { value: "", label: "Select category…" },
  { value: "food_essentials", label: "Food & Essentials" },
  { value: "medical", label: "Medical" },
  { value: "elderly_support", label: "Elderly Support" },
  { value: "child_support", label: "Child Support" },
  { value: "transport_logistics", label: "Transport & Logistics" },
  { value: "documentation", label: "Documentation" },
  { value: "shelter_community", label: "Shelter & Community" },
];

const URGENCY_OPTIONS = [
  { value: "", label: "Select urgency…" },
  { value: "critical", label: "🔴 Critical" },
  { value: "high", label: "🟠 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🟢 Low" },
];

const LANGUAGE_OPTIONS = [
  "Hindi",
  "English",
  "Marathi",
  "Tamil",
  "Telugu",
  "Bengali",
  "Gujarati",
  "Urdu",
];

type Tab = "quick" | "freetext";

// ── Shared field wrapper ──────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
      <AlertCircle size={12} />
      {msg}
    </p>
  );
}

const inputClass =
  "w-full h-11 rounded-lg border border-gray-300 px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition";
const selectClass =
  "w-full h-11 rounded-lg border border-gray-300 px-3 text-base text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500";

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NewNeedPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("quick");
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── Quick form state ──────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [beneficiaryCount, setBeneficiaryCount] = useState(1);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [vulnerable, setVulnerable] = useState(false);
  const [description, setDescription] = useState("");

  // ── Free text state ───────────────────────────────────────────────────
  const [freeText, setFreeText] = useState("");
  const [freeTextArea, setFreeTextArea] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  // ── Field-level errors ────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleLang = (lang: string) =>
    setSelectedLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );

  // ── Quick form submission ─────────────────────────────────────────────
  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required.";
    if (!area.trim()) newErrors.area = "Area is required.";
    if (beneficiaryCount < 1) newErrors.beneficiaryCount = "Must be at least 1.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    setSubmitting(true);
    setApiError(null);
    try {
      const res = await post<{ id: string }>("/needs", {
        title: title.trim(),
        rawDescription: description.trim() || title.trim(),
        category: category || undefined,
        urgency: urgency || undefined,
        location: { area: area.trim(), city: city.trim() },
        beneficiaryCount,
        requiredLanguages: selectedLangs,
        vulnerableGroup: vulnerable,
        submittedBy: user?.uid ?? "",
      });
      router.push(`/needs/${res.id}`);
    } catch (err: unknown) {
      setApiError(
        err instanceof Error ? err.message : "Failed to create need. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Free text AI submission ───────────────────────────────────────────
  const handleFreeTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeText.trim()) {
      setErrors({ freeText: "Please describe the situation first." });
      return;
    }
    if (!freeTextArea.trim()) {
      setErrors({ freeTextArea: "Area is required." });
      return;
    }
    setErrors({});
    setAnalyzing(true);
    setApiError(null);
    try {
      const res = await post<{ id: string }>("/needs", {
        rawDescription: freeText.trim(),
        location: { area: freeTextArea.trim(), city: "Mumbai" },
        beneficiaryCount: 1,
        submittedBy: user?.uid ?? "",
      });
      router.push(`/needs/${res.id}`);
    } catch (err: unknown) {
      setApiError(
        err instanceof Error ? err.message : "Analysis failed. Try again."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <ProtectedRoute role="admin">
      <AppShell>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-400 transition-colors bg-transparent border-none"
          >
            <ChevronLeft size={16} />
            Cancel
          </button>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">New Community Need</h1>
            <p className="text-sm text-gray-500 mt-1">
              Submit a need — the AI will classify and prioritize it automatically.
            </p>
          </div>

          {/* API Error */}
          {apiError && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {apiError}
            </div>
          )}

          {/* Tab toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(["quick", "freetext"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setErrors({}); setApiError(null); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${tab === t
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {t === "quick" ? "📋 Quick Form" : "✍️ Free Text + AI"}
              </button>
            ))}
          </div>

          {/* ── Tab 1: Quick Form ── */}
          {tab === "quick" && (
            <form onSubmit={handleQuickSubmit} className="flex flex-col gap-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short, clear description of the need"
                  className={inputClass}
                />
                <FieldError msg={errors.title} />
              </div>

              {/* Category + Urgency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={selectClass}
                  >
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Urgency
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className={selectClass}
                  >
                    {URGENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Area + City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Area <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Kurla"
                    className={inputClass}
                  />
                  <FieldError msg={errors.area} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Beneficiary count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Number of Beneficiaries
                </label>
                <input
                  type="number"
                  min={1}
                  value={beneficiaryCount}
                  onChange={(e) => setBeneficiaryCount(Number(e.target.value))}
                  className={inputClass}
                />
                <FieldError msg={errors.beneficiaryCount} />
              </div>

              {/* Languages */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Required Languages
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLang(lang)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${selectedLangs.includes(lang)
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vulnerable group */}
              <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={vulnerable}
                  onChange={(e) => setVulnerable(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Involves a vulnerable group (elderly, children, medical)
                </span>
              </label>

              {/* Optional description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Additional Description{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Any extra context for the coordinator or volunteer…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto px-8 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold rounded-lg text-base transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Submit Need"
                )}
              </button>
            </form>
          )}

          {/* ── Tab 2: Free Text ── */}
          {tab === "freetext" && (
            <form onSubmit={handleFreeTextSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Describe the situation
                </label>
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  rows={6}
                  placeholder="Describe the situation in your own words… e.g. 'An elderly diabetic woman in Kurla has not received medicine for two days and cannot travel.'"
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
                <FieldError msg={errors.freeText} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Area <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={freeTextArea}
                  onChange={(e) => setFreeTextArea(e.target.value)}
                  placeholder="e.g. Kurla"
                  className={inputClass}
                />
                <FieldError msg={errors.freeTextArea} />
              </div>

              <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-3 text-sm text-teal-800">
                <p className="font-medium flex items-center gap-2">
                  <Sparkles size={15} className="text-teal-600" />
                  How AI analysis works
                </p>
                <p className="mt-1 text-teal-700">
                  Gemini will extract: category, urgency level, required skills,
                  languages, and a coordinator summary — all editable before final
                  assignment.
                </p>
              </div>

              <button
                type="submit"
                disabled={analyzing}
                className="w-full md:w-auto px-8 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold rounded-lg text-base transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                {analyzing ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing with Gemini…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Analyze with AI ✨
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
