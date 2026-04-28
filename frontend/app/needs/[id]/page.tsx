"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  MapPin,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity,
} from "lucide-react";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import StatusBadge from "@/components/tasks/StatusBadge";
import UrgencyBadge from "@/components/needs/UrgencyBadge";
import AIAnalysisPanel, {
  type AIAnalysis,
} from "@/components/needs/AIAnalysisPanel";
import MatchRecommendations from "@/components/needs/MatchRecommendations";
import { get } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Need {
  id: string;
  title: string;
  rawDescription?: string;
  status: string;
  urgency?: string;
  category?: string;
  location: { area: string; city: string };
  beneficiaryCount: number;
  submittedAt?: string;
  submittedBy?: string;
  priorityScore?: number;
  // AI fields
  category2?: string;
  aiSummary?: string;
  aiTags?: string[];
  requiredSkills?: string[];
  requiredLanguages?: string[];
  estimatedHours?: number;
  vulnerableGroup?: boolean;
}

interface ActivityEntry {
  id: string;
  action: string;
  actor: string;
  actorRole?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTION_LABELS: Record<string, string> = {
  need_created: "Need submitted",
  need_reanalyzed: "Re-analyzed with Gemini",
  status_changed: "Status updated",
  volunteer_assigned: "Volunteer assigned",
};

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse rounded-lg ${className}`}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-7 flex-1 max-w-sm" />
        <Skeleton className="h-6 w-24" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NeedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [need, setNeed] = useState<Need | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  const fetchNeed = useCallback(async () => {
    if (!id) return;
    try {
      const res = await get<Need>(`/needs/${id}`);
      setNeed(res);
    } catch {
      // will show error state
    }
  }, [id]);

  const fetchActivity = useCallback(async () => {
    if (!id) return;
    try {
      const res = await get<ActivityEntry[]>(`/needs/${id}/activity`);
      setActivityLog(Array.isArray(res) ? res : []);
    } catch {
      setActivityLog([]);
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.allSettled([fetchNeed(), fetchActivity()]);
      setLoading(false);
    };
    init();
  }, [fetchNeed, fetchActivity]);

  const handleAnalysisComplete = (updated: AIAnalysis) => {
    setNeed((prev) => (prev ? { ...prev, ...updated } : prev));
    fetchActivity();
  };

  const handleAssigned = () => {
    fetchNeed();
    fetchActivity();
  };

  // Extract AI fields from need for panel
  const analysis: AIAnalysis | null =
    need && (need.aiSummary || need.category || need.urgency)
      ? {
        title: need.title,
        category: need.category,
        urgency: need.urgency,
        requiredSkills: need.requiredSkills,
        requiredLanguages: need.requiredLanguages,
        estimatedHours: need.estimatedHours,
        vulnerableGroup: need.vulnerableGroup,
        aiSummary: need.aiSummary,
        aiTags: need.aiTags,
        priorityScore: need.priorityScore,
      }
      : null;

  return (
    <ProtectedRoute role="admin">
      <AppShell>
        {loading ? (
          <PageSkeleton />
        ) : !need ? (
          <div className="max-w-3xl mx-auto text-center py-20">
            <p className="text-2xl mb-2">😕</p>
            <p className="font-semibold text-gray-700">Need not found.</p>
            <Link
              href="/needs"
              className="mt-4 inline-block text-sm text-teal-600 hover:underline"
            >
              ← Back to Needs Board
            </Link>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-10">
            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="mb-[-12px]">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-400 transition-colors bg-transparent border-none"
              >
                <ChevronLeft size={16} />
                All Needs
              </button>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 leading-snug">
                  {need.title || "Untitled Need"}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <StatusBadge status={need.status} />
                  {need.urgency && <UrgencyBadge urgency={need.urgency} />}
                  {need.priorityScore !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                      Priority: {need.priorityScore}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Section A: Request Overview ──────────────────────────── */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Request Overview
              </h2>

              <div className="flex flex-col gap-3 text-sm text-gray-700">
                {/* Meta row */}
                <div className="flex flex-wrap gap-4">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <MapPin size={14} className="text-gray-400" />
                    {need.location?.area ?? "—"}, {need.location?.city ?? "—"}
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <Users size={14} className="text-gray-400" />
                    {need.beneficiaryCount} beneficiar
                    {need.beneficiaryCount === 1 ? "y" : "ies"}
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <Clock size={14} className="text-gray-400" />
                    Submitted {timeAgo(need.submittedAt)}
                    {need.submittedAt && (
                      <span className="text-gray-400 ml-1">
                        ({formatDate(need.submittedAt)})
                      </span>
                    )}
                  </span>
                </div>

                {/* Raw description (collapsible) */}
                {need.rawDescription && (
                  <div>
                    <button
                      onClick={() => setShowRaw((v) => !v)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-700 font-medium transition-colors py-1"
                    >
                      {showRaw ? (
                        <>
                          <ChevronUp size={13} /> Hide original description
                        </>
                      ) : (
                        <>
                          <ChevronDown size={13} /> Show original description
                        </>
                      )}
                    </button>
                    {showRaw && (
                      <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {need.rawDescription}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* ── Section B: AI Analysis ──────────────────────────────── */}
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                AI Analysis
              </h2>
              <AIAnalysisPanel
                needId={id}
                analysis={analysis}
                onAnalysisComplete={handleAnalysisComplete}
              />
            </section>

            {/* ── Section C: Match Recommendations ───────────────────── */}
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Volunteer Recommendations
              </h2>
              <MatchRecommendations
                needId={id}
                suggestions={null}
                onAssigned={handleAssigned}
              />
            </section>

            {/* ── Activity Log ────────────────────────────────────────── */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Activity size={14} />
                Activity Log
              </h2>

              {activityLog.length === 0 ? (
                <p className="text-sm text-gray-400">No activity recorded yet.</p>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-3 top-1 bottom-1 w-px bg-gray-200" />

                  <div className="flex flex-col gap-4">
                    {activityLog.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 pl-8 relative"
                      >
                        {/* Dot */}
                        <div className="absolute left-[9px] top-1.5 h-2.5 w-2.5 rounded-full bg-teal-500 border-2 border-white" />

                        <div className="flex-1">
                          <p className="text-sm text-gray-800 font-medium">
                            {ACTION_LABELS[entry.action] ?? entry.action}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            by {entry.actor?.slice(0, 8) ?? "system"}{" "}
                            {entry.actorRole ? `(${entry.actorRole})` : ""}
                            {" · "}
                            {timeAgo(entry.timestamp)}
                          </p>
                          {/* Metadata summary for status changes */}
                          {entry.action === "status_changed" &&
                            !!entry.metadata?.from &&
                            !!entry.metadata?.to && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {String(entry.metadata.from)} →{" "}
                                {String(entry.metadata.to)}
                              </p>
                            )}
                        </div>

                        <span className="text-xs text-gray-400 shrink-0">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
