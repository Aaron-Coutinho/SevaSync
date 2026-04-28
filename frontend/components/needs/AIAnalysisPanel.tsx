"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, CheckCircle } from "lucide-react";
import UrgencyBadge from "./UrgencyBadge";
import SkillBadge from "@/components/volunteers/SkillBadge";
import { post } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AIAnalysis {
  title?: string;
  category?: string;
  urgency?: string;
  requiredSkills?: string[];
  requiredLanguages?: string[];
  estimatedHours?: number;
  vulnerableGroup?: boolean;
  aiSummary?: string;
  aiTags?: string[];
  priorityScore?: number;
}

interface AIAnalysisPanelProps {
  needId: string;
  analysis: AIAnalysis | null;
  onAnalysisComplete: (updated: AIAnalysis) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  food_essentials: "Food & Essentials",
  medical: "Medical",
  elderly_support: "Elderly Support",
  child_support: "Child Support",
  transport_logistics: "Transport & Logistics",
  documentation: "Documentation",
  shelter_community: "Shelter & Community",
};

export default function AIAnalysisPanel({
  needId,
  analysis,
  onAnalysisComplete,
}: AIAnalysisPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const updated = await post<AIAnalysis>(`/needs/${needId}/analyze`);
      onAnalysisComplete(updated);
    } catch (err) {
      setError("Gemini analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Empty state ───────────────────────────────────────────────────────
  if (!analysis || (!analysis.category && !analysis.aiSummary)) {
    return (
      <div className="rounded-xl border-2 border-dashed border-teal-200 bg-teal-50/40 p-6 flex flex-col items-center text-center gap-4">
        <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
          <Sparkles size={22} className="text-teal-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">
            No AI analysis yet
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Gemini will extract category, urgency, required skills, and generate
            a coordinator summary.
          </p>
        </div>
        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors min-h-[44px]"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analyzing with Gemini…
            </>
          ) : (
            <>
              <Sparkles size={15} />
              Analyze with AI ✨
            </>
          )}
        </button>
      </div>
    );
  }

  // ── Analysis result card ──────────────────────────────────────────────
  return (
    <div className="rounded-xl border-2 border-teal-300 bg-white overflow-hidden">
      {/* Header strip */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Sparkles size={14} />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Gemini Analysis
          </span>
        </div>
        {analysis.priorityScore !== undefined && (
          <span className="text-xs text-teal-100 font-medium">
            Priority score: {analysis.priorityScore}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Category + Urgency row */}
        <div className="flex flex-wrap items-center gap-2">
          {analysis.category && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
              {CATEGORY_LABELS[analysis.category] ?? analysis.category}
            </span>
          )}
          {analysis.urgency && <UrgencyBadge urgency={analysis.urgency} />}
          {analysis.vulnerableGroup && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
              <CheckCircle size={10} />
              Vulnerable Group
            </span>
          )}
        </div>

        {/* AI Summary */}
        {analysis.aiSummary && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-teal-700 mb-1 uppercase tracking-wide">
              Summary
            </p>
            <p className="text-sm italic text-gray-700 leading-relaxed">
              {analysis.aiSummary}
            </p>
          </div>
        )}

        {/* Required Skills */}
        {analysis.requiredSkills && analysis.requiredSkills.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Required Skills
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.requiredSkills.map((skill) => (
                <SkillBadge key={skill} skill={skill} />
              ))}
            </div>
          </div>
        )}

        {/* Languages + Hours row */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {analysis.requiredLanguages && analysis.requiredLanguages.length > 0 && (
            <span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">
                Languages:
              </span>
              {analysis.requiredLanguages.join(", ")}
            </span>
          )}
          {analysis.estimatedHours !== undefined && (
            <span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">
                Est. Hours:
              </span>
              {analysis.estimatedHours}h
            </span>
          )}
        </div>

        {/* AI Tags */}
        {analysis.aiTags && analysis.aiTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {analysis.aiTags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Re-analyze footer */}
        <div className="flex items-center justify-end pt-1 border-t border-gray-100">
          {error && (
            <p className="text-xs text-red-600 mr-auto">{error}</p>
          )}
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            {loading ? "Re-analyzing…" : "Re-analyze"}
          </button>
        </div>
      </div>
    </div>
  );
}
