"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  Users,
  CheckCircle2,
  ClipboardList,
  Clock,
  RefreshCw,
} from "lucide-react";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import StatsCard from "@/components/dashboard/StatsCard";
import UrgentQueue from "@/components/dashboard/UrgentQueue";
import CategoryChart from "@/components/dashboard/CategoryChart";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { get } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Summary {
  totalNeeds: number;
  urgentNeeds: number;
  activeVolunteers: number;
  completedNeeds: number;
  avgAssignmentTimeHours: number;
}

interface NeedItem {
  id: string;
  title: string;
  category: string;
  urgency: string;
  location: { area: string; city: string };
  beneficiaryCount: number;
  submittedAt: string | null;
}

interface CategoryItem {
  category: string;
  count: number;
  completedCount: number;
}

interface AssignmentItem {
  id: string;
  volunteerId: string;
  needId: string;
  status: string;
  assignedAt: string | null;
  volunteerName?: string;
  needTitle?: string;
}

// ── Skeleton shimmer ─────────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse rounded-lg ${className}`}
    />
  );
}

function StatsSkeletons() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
          <Skeleton className="h-11 w-11 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { role, organization } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [urgentNeeds, setUrgentNeeds] = useState<NeedItem[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryItem[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    try {
      const [summaryRes, urgentRes, categoryRes, assignmentsRes] =
        await Promise.allSettled([
          get<Summary>("/analytics/summary"),
          get<{ items?: NeedItem[] } | NeedItem[]>("/needs", {
            urgency: "critical",
          }),
          get<{ breakdown: CategoryItem[] }>("/analytics/category-breakdown"),
          get<AssignmentItem[]>("/assignments", { status: "assigned" }),
        ]);

      if (summaryRes.status === "fulfilled") setSummary(summaryRes.value);

      if (urgentRes.status === "fulfilled") {
        const raw = urgentRes.value;
        const list = Array.isArray(raw) ? raw : (raw as any).items ?? [];
        // Also fetch high urgency and merge
        try {
          const highRes = await get<NeedItem[]>("/needs", { urgency: "high" });
          const merged = [...list, ...(Array.isArray(highRes) ? highRes : [])];
          // Sort by priorityScore desc, deduplicate
          const seen = new Set<string>();
          const deduped = merged.filter((n: NeedItem & { priorityScore?: number }) => {
            if (seen.has(n.id)) return false;
            seen.add(n.id);
            return true;
          });
          setUrgentNeeds(deduped);
        } catch {
          setUrgentNeeds(list);
        }
      }

      if (categoryRes.status === "fulfilled") {
        setCategoryData(categoryRes.value.breakdown ?? []);
      }

      if (assignmentsRes.status === "fulfilled") {
        const list = Array.isArray(assignmentsRes.value)
          ? assignmentsRes.value
          : [];
        setRecentAssignments(list.slice(0, 5));
      }

      setLastRefreshed(new Date());
    } catch {
      // silent — partial data still renders
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const STATS = summary
    ? [
        {
          icon: ClipboardList,
          value: summary.totalNeeds,
          label: "Total Needs",
          iconColor: "bg-blue-100 text-blue-600",
        },
        {
          icon: AlertTriangle,
          value: summary.urgentNeeds,
          label: "Urgent Unassigned",
          iconColor: "bg-red-100 text-red-600",
        },
        {
          icon: Users,
          value: summary.activeVolunteers,
          label: "Active Volunteers",
          iconColor: "bg-teal-100 text-teal-600",
        },
        {
          icon: CheckCircle2,
          value: summary.completedNeeds,
          label: "Completed",
          iconColor: "bg-green-100 text-green-600",
        },
        {
          icon: Clock,
          value: `${summary.avgAssignmentTimeHours.toFixed(1)}h`,
          label: "Avg Assignment Time",
          iconColor: "bg-purple-100 text-purple-600",
        },
      ]
    : [];

  return (
    <ProtectedRoute role="admin">
      <AppShell>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              Dashboard
              {role && (
                <span className="text-xs font-semibold uppercase tracking-wider bg-teal-100 text-teal-700 px-2.5 py-1 rounded-md align-middle mt-1">
                  {role === "admin" ? "Coordinator" : "Volunteer"}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {organization && <span className="font-medium text-gray-700 mr-2">{organization} •</span>}
              Last updated: {lastRefreshed.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            <RefreshCw size={15} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* ── KPI Stats ────────────────────────────────────────────────── */}
        {loading ? (
          <StatsSkeletons />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {STATS.map((s) => (
              <StatsCard
                key={s.label}
                icon={s.icon}
                value={s.value}
                label={s.label}
                iconColor={s.iconColor}
              />
            ))}
          </div>
        )}

        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Urgent Queue — 2 cols */}
          <section className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                Urgent Unassigned Needs
              </h2>
              <span className="text-xs text-gray-400">
                {urgentNeeds.length} request{urgentNeeds.length !== 1 ? "s" : ""}
              </span>
            </div>
            {loading ? <SectionSkeleton rows={5} /> : <UrgentQueue needs={urgentNeeds} />}
          </section>

          {/* Category breakdown — 1 col */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Category Breakdown
            </h2>
            {loading ? <SectionSkeleton rows={6} /> : <CategoryChart data={categoryData} />}
          </section>

          {/* Activity Feed — full width */}
          <section className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Recent Assignments
            </h2>
            {loading ? (
              <SectionSkeleton rows={4} />
            ) : (
              <ActivityFeed assignments={recentAssignments} />
            )}
          </section>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
