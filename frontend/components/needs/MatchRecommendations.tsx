"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, CheckCircle, MapPin } from "lucide-react";
import SkillBadge from "@/components/volunteers/SkillBadge";
import { get, post, patch } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface VolunteerSuggestion {
  volunteerId: string;
  score: number;
  reasons: string[];
  // Optionally enriched with profile data fetched by parent
  volunteerName?: string;
  area?: string;
  skills?: string[];
  initials?: string;
}

interface MatchSuggestionResponse {
  id: string;
  needId: string;
  suggestions: VolunteerSuggestion[];
}

interface MatchRecommendationsProps {
  needId: string;
  suggestions: VolunteerSuggestion[] | null;
  onAssigned: () => void;
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const clamped = Math.min(Math.max(score, 0), 100);
  const color =
    clamped >= 75
      ? "bg-green-500"
      : clamped >= 50
      ? "bg-yellow-400"
      : "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-700 w-8 text-right">
        {score}
      </span>
    </div>
  );
}

// ── Volunteer card ────────────────────────────────────────────────────────────
function VolunteerCard({
  suggestion,
  onAssign,
  assigning,
}: {
  suggestion: VolunteerSuggestion;
  onAssign: (volunteerId: string) => void;
  assigning: boolean;
}) {
  const initials = suggestion.initials ?? suggestion.volunteerId.slice(0, 2).toUpperCase();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col p-4 gap-3">
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {suggestion.volunteerName ?? suggestion.volunteerId}
          </p>
          {suggestion.area && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin size={11} />
              {suggestion.area}
            </p>
          )}
        </div>
      </div>

      {/* Skills */}
      {suggestion.skills && suggestion.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestion.skills.slice(0, 4).map((s) => (
            <SkillBadge key={s} skill={s} />
          ))}
        </div>
      )}

      {/* Match score bar */}
      <div>
        <p className="text-xs text-gray-400 font-medium mb-1">Match Score</p>
        <ScoreBar score={suggestion.score} />
      </div>

      {/* Reasons */}
      {suggestion.reasons.length > 0 && (
        <ul className="flex flex-col gap-1">
          {suggestion.reasons.slice(0, 4).map((r, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
              <CheckCircle
                size={12}
                className="text-teal-500 shrink-0 mt-0.5"
              />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Assign button */}
      <button
        onClick={() => onAssign(suggestion.volunteerId)}
        disabled={assigning}
        className="mt-auto w-full h-11 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {assigning ? (
          <>
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Assigning…
          </>
        ) : (
          <>
            <Users size={14} />
            Assign Volunteer
          </>
        )}
      </button>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg">
        <CheckCircle size={16} className="text-teal-400" />
        {message}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MatchRecommendations({
  needId,
  suggestions,
  onAssigned,
}: MatchRecommendationsProps) {
  const router = useRouter();
  const [localSuggestions, setLocalSuggestions] = useState<VolunteerSuggestion[] | null>(
    suggestions
  );
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [error, setError] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: "" }), 2500);
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get<MatchSuggestionResponse>(`/needs/${needId}/suggestions`);
      setLocalSuggestions(res.suggestions ?? []);
    } catch {
      setError("Failed to fetch match suggestions. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (volunteerId: string) => {
    setAssigningId(volunteerId);
    setError(null);
    try {
      // Use the /needs/{id}/assign endpoint (batch write on backend)
      await post(`/needs/${needId}/assign`, { volunteerId });

      showToast("Volunteer assigned successfully ✓");
      onAssigned();

      // Redirect to needs board after short delay
      setTimeout(() => router.push("/needs"), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Assignment failed. Try again.";
      setError(msg.includes("capacity") ? "This volunteer is at max capacity." : msg);
    } finally {
      setAssigningId(null);
    }
  };

  // ── Empty state: no suggestions fetched yet ───────────────────────────
  if (!localSuggestions) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center text-center gap-4">
        <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
          <Users size={22} className="text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">
            No match suggestions yet
          </p>
          <p className="text-xs text-gray-500 mt-1">
            The engine will rank available volunteers by skills, location,
            workload, rating, and Gemini explanation.
          </p>
        </div>
        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg w-full">
            {error}
          </p>
        )}
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors min-h-[44px]"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Finding best matches…
            </>
          ) : (
            <>
              <Users size={15} />
              Find Best Volunteers
            </>
          )}
        </button>
      </div>
    );
  }

  // ── No results ─────────────────────────────────────────────────────────
  if (localSuggestions.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-2xl mb-2">😔</p>
        <p className="text-sm font-medium text-gray-700">
          No available volunteers match this need right now.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Try again later, or assign manually from the volunteer directory.
        </p>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="mt-4 text-sm text-teal-600 hover:text-teal-800 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Suggestions grid ──────────────────────────────────────────────────
  return (
    <>
      <Toast visible={toast.visible} message={toast.message} />

      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {localSuggestions.map((s) => (
          <VolunteerCard
            key={s.volunteerId}
            suggestion={s}
            onAssign={handleAssign}
            assigning={assigningId === s.volunteerId}
          />
        ))}
      </div>

      <div className="flex justify-end mt-3">
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-teal-700 font-medium transition-colors"
        >
          {loading ? "Refreshing…" : "↻ Refresh suggestions"}
        </button>
      </div>
    </>
  );
}
