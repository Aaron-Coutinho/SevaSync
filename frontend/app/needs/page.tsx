"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import NeedCard, { type NeedCardData } from "@/components/needs/NeedCard";
import { get } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const URGENCY_OPTIONS = [
  { value: "", label: "All Urgencies" },
  { value: "critical", label: "🔴 Critical" },
  { value: "high", label: "🟠 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🟢 Low" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "food_essentials", label: "Food & Essentials" },
  { value: "medical", label: "Medical" },
  { value: "elderly_support", label: "Elderly Support" },
  { value: "child_support", label: "Child Support" },
  { value: "transport_logistics", label: "Transport & Logistics" },
  { value: "documentation", label: "Documentation" },
  { value: "shelter_community", label: "Shelter & Community" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "analyzed", label: "Analyzed" },
  { value: "pending_assignment", label: "Pending Assignment" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "escalated", label: "Escalated" },
];

// ── Skeleton ──────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
      <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-2">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-5 bg-gray-200 rounded-full w-16" />
      </div>
      <div className="px-4 pb-3 space-y-2">
        <div className="h-5 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-5/6" />
      </div>
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
        <div className="h-5 bg-gray-200 rounded-full w-20" />
        <div className="h-4 bg-gray-200 rounded w-12" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NeedsPage() {
  const [allNeeds, setAllNeeds] = useState<NeedCardData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState("");
  const [urgency, setUrgency] = useState("");
  const [category, setCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchNeeds = async () => {
    setLoading(true);
    try {
      const res = await get<NeedCardData[]>("/needs");
      setAllNeeds(Array.isArray(res) ? res : []);
    } catch {
      setAllNeeds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNeeds();
  }, []);

  // Client-side filtering
  const filtered = useMemo(() => {
    return allNeeds.filter((n) => {
      if (urgency && n.urgency !== urgency) return false;
      if (category && n.category !== category) return false;
      if (statusFilter && n.status !== statusFilter) return false;
      if (
        search &&
        !n.title?.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [allNeeds, urgency, category, statusFilter, search]);

  const hasActiveFilters = !!(urgency || category || statusFilter || search);

  const clearFilters = () => {
    setUrgency("");
    setCategory("");
    setStatusFilter("");
    setSearch("");
  };

  const selectClass =
    "h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full";

  return (
    <ProtectedRoute role="admin">
      <AppShell>
        {/* ── Page header ───────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Needs Board</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading
                ? "Loading…"
                : `Showing ${filtered.length} of ${allNeeds.length} needs`}
            </p>
          </div>
          <Link
            href="/needs/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors shrink-0 min-h-[44px]"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Need</span>
          </Link>
        </div>

        {/* ── Filter bar ────────────────────────────────────────────── */}
        <div className="sticky top-14 z-30 bg-gray-50 pb-3 -mx-4 px-4 lg:-mx-6 lg:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title…"
                className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className={selectClass}
            >
              {URGENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={selectClass}
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={selectClass}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="shrink-0 h-11 w-11 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors"
                  aria-label="Clear filters"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Grid ──────────────────────────────────────────────────── */}
        {loading ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-base font-semibold text-gray-700">
              {hasActiveFilters ? "No needs match your filters" : "No needs yet"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {hasActiveFilters
                ? "Try adjusting your filters."
                : "Create the first community need to get started."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((need) => (
              <NeedCard key={need.id} need={need} />
            ))}
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
