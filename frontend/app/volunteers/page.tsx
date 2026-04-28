"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  CheckSquare,
  Trophy,
  Users,
  Search,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import SkillBadge from "@/components/volunteers/SkillBadge";
import { get } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface VolunteerLocation {
  area: string;
  city: string;
}

interface Volunteer {
  uid: string;
  name: string;
  email: string;
  phone: string;
  location?: VolunteerLocation;
  skills: string[];
  languages: string[];
  status: "available" | "busy" | "offline";
  activeTaskCount: number;
  totalCompleted: number;
}

const SKILL_OPTIONS = [
  "medical",
  "counselling",
  "logistics",
  "translation",
  "data_entry",
  "field_support",
  "community_outreach",
  "documentation",
];

const STATUS_OPTIONS = ["available", "busy", "offline"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Components ────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-[160px] flex flex-col justify-between animate-pulse">
      <div className="flex gap-3">
        <div className="h-12 w-12 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-5 bg-gray-200 rounded w-16" />
        <div className="h-5 bg-gray-200 rounded w-16" />
      </div>
    </div>
  );
}

function VolunteerCard({ v }: { v: Volunteer }) {
  const statusColor =
    v.status === "available"
      ? "bg-green-500"
      : v.status === "busy"
        ? "bg-yellow-500"
        : "bg-gray-400";

  return (
    <Link href={`/volunteers/${v.uid}`} className="block h-full">
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 flex flex-col h-full gap-4 relative group">
        {/* Header: Avatar + Name */}
        <div className="flex items-start gap-3 pr-16">
          <div className="h-12 w-12 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
            {getInitials(v.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate min-w-0 group-hover:text-teal-700 transition-colors">
              {v.name}
            </h3>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
              <MapPin size={12} className="shrink-0" />
              {v.location?.area || "Unknown"}, {v.location?.city || "Unknown"}
            </p>
          </div>
        </div>

        {/* Status Dot */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
          <div className={`h-2 w-2 rounded-full ${statusColor}`} />
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
            {v.status}
          </span>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
          {v.skills?.slice(0, 3).map((s) => (
            <SkillBadge key={s} skill={s} />
          ))}
          {v.skills?.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 uppercase tracking-wide border border-gray-200">
              +{v.skills.length - 3} more
            </span>
          )}
        </div>

        {/* Stats Footer */}
        <div className="pt-3 mt-1 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1.5" title="Active Tasks">
            <CheckSquare size={14} className="text-teal-600" />
            <span>
              <strong className="text-gray-900">{v.activeTaskCount || 0}</strong>{" "}
              active
            </span>
          </div>
          <div className="flex items-center gap-1.5" title="Completed Tasks">
            <Trophy size={14} className="text-amber-500" />
            <span>
              <strong className="text-gray-900">{v.totalCompleted || 0}</strong>{" "}
              done
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (skillFilter) params.append("skill", skillFilter);
      if (statusFilter) params.append("status", statusFilter);

      const data = await get<Volunteer[]>(`/volunteers?${params.toString()}`);
      setVolunteers(data);
    } catch (err) {
      setError("Failed to load volunteers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [skillFilter, statusFilter]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  // Client-side text filter
  const filteredVolunteers = volunteers.filter((v) => {
    if (!searchQuery) return true;
    return v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setSkillFilter("");
    setStatusFilter("");
  };

  const hasFilters = searchQuery || skillFilter || statusFilter;

  return (
    <ProtectedRoute role="admin">
      <AppShell>
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Volunteer Directory
              </h1>
              {!loading && !error && (
                <p className="text-sm text-gray-500 mt-1">
                  {filteredVolunteers.length} volunteer
                  {filteredVolunteers.length === 1 ? "" : "s"} found
                </p>
              )}
            </div>
            <button
              onClick={fetchVolunteers}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
              />
            </div>

            {/* Dropdowns */}
            <div className="flex flex-wrap sm:flex-nowrap gap-3">
              <div className="relative w-full sm:w-40">
                <Filter
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                >
                  <option value="">All Skills</option>
                  {SKILL_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative w-full sm:w-36">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear button */}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 w-full sm:w-auto"
                >
                  <X size={14} />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-red-700">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>⚠️</span> {error}
              </div>
              <button
                onClick={fetchVolunteers}
                className="text-xs font-bold uppercase tracking-wide hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Grid Area */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : !error && filteredVolunteers.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Users size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                No volunteers found
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm">
                Try adjusting your search query or filters to find what you're
                looking for.
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            /* Volunteer Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredVolunteers.map((v) => (
                <VolunteerCard key={v.uid} v={v} />
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
