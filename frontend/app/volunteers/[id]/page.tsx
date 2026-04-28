"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  CheckCircle2,
  Star,
  Plus,
  Clock,
  Briefcase,
  AlertCircle,
  X,
  Check,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { get, post } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import SkillBadge from "@/components/volunteers/SkillBadge";
import StatusBadge from "@/components/tasks/StatusBadge";
import UrgencyBadge from "@/components/needs/UrgencyBadge";

// ── Types ─────────────────────────────────────────────────────────────────────
interface VolunteerLocation {
  area: string;
  city: string;
}

interface Availability {
  weekdays: boolean;
  weekends: boolean;
  hoursPerWeek: number;
  preferredTime: string;
}

interface Volunteer {
  uid: string;
  name: string;
  email: string;
  phone: string;
  location?: VolunteerLocation;
  skills: string[];
  languages: string[];
  availability?: Availability;
  status: "available" | "busy" | "offline";
  activeTaskCount: number;
  maxActiveTasks: number;
  totalCompleted: number;
  rating: number;
  verified: boolean;
  joinedAt?: string;
}

interface Task {
  id: string;
  needId: string;
  status: string;
  assignedAt: string | null;
  needTitle?: string;
  urgency?: string;
  area?: string;
}

interface OpenNeed {
  id: string;
  title: string;
  urgency: string;
  category: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(dateStr: string | undefined | any) {
  if (!dateStr) return "Unknown date";
  // Firestore Timestamp object with _seconds field
  if (dateStr?._seconds) {
    return new Date(dateStr._seconds * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  // Firestore Timestamp with seconds field
  if (dateStr?.seconds) {
    return new Date(dateStr.seconds * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  // ISO string or any parseable date string
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return "Unknown date";
}

function formatAssignedDate(dateStr: string | null | any) {
  if (!dateStr) return "N/A";
  // Firestore Timestamp object with _seconds field
  if (dateStr?._seconds) {
    return new Date(dateStr._seconds * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  // Firestore Timestamp with seconds field
  if (dateStr?.seconds) {
    return new Date(dateStr.seconds * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  // ISO string or any parseable date string
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return "N/A";
}

// ── Skeleton Components ────────────────────────────────────────────────────────
function SkeletonProfile() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-gray-200 rounded-full" />
        <div className="space-y-3 flex-1">
          <div className="h-6 w-1/3 bg-gray-200 rounded" />
          <div className="h-4 w-1/4 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-200 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-28 bg-gray-200 rounded-xl" />
        <div className="h-28 bg-gray-200 rounded-xl" />
        <div className="h-28 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

// ── Task Card ──────────────────────────────────────────────────────────────────
function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2 gap-4">
        <h4 className="font-semibold text-gray-900 leading-snug">
          {task.needTitle || "Unknown Need"}
        </h4>
        <StatusBadge status={task.status} />
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-gray-500">
        {task.urgency && <UrgencyBadge urgency={task.urgency} />}
        {task.area && (
          <span className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">
            <MapPin size={12} className="text-gray-400" />
            {task.area}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs">
          <Clock size={12} className="text-gray-400" />
          {formatAssignedDate(task.assignedAt)}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function VolunteerDetailPage() {
  const params = useParams();
  const uid = params.id as string;
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  // Modal & Toast state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openNeeds, setOpenNeeds] = useState<OpenNeed[]>([]);
  const [selectedNeedId, setSelectedNeedId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const volData = await get<Volunteer>(`/volunteers/${uid}`);
      setVolunteer(volData);

      // Fetch tasks in parallel
      const tasksData = await get<Task[]>(`/volunteers/${uid}/tasks`);
      setTasks(tasksData);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Load open needs for assignment
  useEffect(() => {
    if (isAdmin && isModalOpen && openNeeds.length === 0) {
      get<{ items?: OpenNeed[] } | OpenNeed[]>("/needs?status=pending_assignment")
        .then((res) => {
          const list = Array.isArray(res) ? res : res.items || [];
          setOpenNeeds(list);
          if (list.length > 0) setSelectedNeedId(list[0].id);
        })
        .catch(console.error);
    }
  }, [isAdmin, isModalOpen, openNeeds.length]);

  const handleAssign = async () => {
    if (!selectedNeedId) return;
    setIsAssigning(true);
    try {
      await post(`/needs/${selectedNeedId}/assign`, { volunteerId: uid });
      setToastMessage("Assignment successful!");
      setTimeout(() => setToastMessage(null), 3000);
      setIsModalOpen(false);
      fetchProfile(); // Refresh profile and tasks
    } catch (err) {
      alert("Failed to assign volunteer. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Filter tasks
  const activeTasks = useMemo(
    () =>
      tasks.filter((t) => ["assigned", "accepted", "in_progress"].includes(t.status)),
    [tasks]
  );
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === "completed"),
    [tasks]
  );

  const displayedTasks = activeTab === "active" ? activeTasks : completedTasks;

  if (error) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh] text-center">
            <AlertCircle size={48} className="text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Volunteer not found</h2>
            <p className="text-gray-500 mb-6">
              The profile you are looking for does not exist or you don't have permission to view it.
            </p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition"
            >
              Go Back
            </button>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="max-w-4xl mx-auto pb-24 md:pb-12">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-400 transition-colors bg-transparent border-none"
          >
            <ChevronLeft size={16} />
            Back
          </button>

          {loading || !volunteer ? (
            <SkeletonProfile />
          ) : (
            <div className="space-y-6">
              {/* 1. Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
                {/* Status Dot */}
                <div
                  className="absolute top-6 right-6 flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100"
                  title={`Status: ${volunteer.status}`}
                >
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${volunteer.status === "available"
                      ? "bg-green-500"
                      : volunteer.status === "busy"
                        ? "bg-yellow-500"
                        : "bg-gray-400"
                      }`}
                  />
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                    {volunteer.status}
                  </span>
                </div>

                {/* Avatar */}
                <div className="h-20 w-20 rounded-full bg-teal-600 flex items-center justify-center text-white text-3xl font-bold shrink-0 shadow-md">
                  {getInitials(volunteer.name)}
                </div>

                {/* Name & Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                      {volunteer.name}
                    </h1>
                    {volunteer.verified && (
                      <span
                        className="inline-flex items-center justify-center bg-green-100 text-green-700 rounded-full p-1"
                        title="Verified Volunteer"
                      >
                        <CheckCircle2 size={16} className="fill-current text-white" />
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 font-medium">
                    Member since {formatDate(volunteer.joinedAt)}
                  </p>
                </div>
              </div>

              {/* 2. Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 flex flex-col gap-4 shadow-sm">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {volunteer.skills && volunteer.skills.length > 0 ? (
                        volunteer.skills.map((s) => <SkillBadge key={s} skill={s} />)
                      ) : (
                        <span className="text-sm text-gray-500 italic">No skills listed</span>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Languages
                    </h3>
                    <p className="text-sm text-gray-800 font-medium">
                      {volunteer.languages?.join(", ") || "English"}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 flex flex-col gap-4 shadow-sm">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Preferred Location
                    </h3>
                    <p className="text-sm text-gray-800 font-medium flex items-center gap-1.5">
                      <MapPin size={16} className="text-teal-600" />
                      {volunteer.location?.area || "Unknown Area"},{" "}
                      {volunteer.location?.city || "Unknown City"}
                    </p>
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Availability
                    </h3>
                    {volunteer.availability ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {volunteer.availability.weekdays && (
                            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
                              Weekdays
                            </span>
                          )}
                          {volunteer.availability.weekends && (
                            <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100">
                              Weekends
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong className="text-gray-900">{volunteer.availability.hoursPerWeek}</strong> hours/week
                          <span className="mx-2 text-gray-300">|</span>
                          <span className="capitalize">{volunteer.availability.preferredTime}s</span>
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">Not specified</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 leading-none mb-1">
                      {volunteer.totalCompleted || 0}
                    </p>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Tasks Completed
                    </p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Active Workload
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {volunteer.activeTaskCount || 0} / {volunteer.maxActiveTasks || 3}
                    </p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full ${(volunteer.activeTaskCount || 0) >= (volunteer.maxActiveTasks || 3)
                        ? "bg-red-500"
                        : "bg-teal-500"
                        }`}
                      style={{
                        width: `${Math.min(
                          ((volunteer.activeTaskCount || 0) / (volunteer.maxActiveTasks || 3)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-500 shrink-0">
                    <Star size={24} className="fill-current" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1 text-yellow-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          className={s <= Math.round(volunteer.rating || 0) ? "fill-current" : "text-gray-200"}
                        />
                      ))}
                    </div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {volunteer.rating?.toFixed(1) || "New"} Rating
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Tasks Section */}
              <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Task History</h2>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab("active")}
                    className={`flex-1 md:flex-none px-6 py-3 min-h-[44px] text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === "active"
                      ? "border-teal-600 text-teal-700 bg-teal-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    Active Tasks ({activeTasks.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("completed")}
                    className={`flex-1 md:flex-none px-6 py-3 min-h-[44px] text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === "completed"
                      ? "border-teal-600 text-teal-700 bg-teal-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    Completed ({completedTasks.length})
                  </button>
                </div>

                {/* Tasks List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayedTasks.length > 0 ? (
                    displayedTasks.map((task) => <TaskCard key={task.id} task={task} />)
                  ) : (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                        <Briefcase className="text-gray-400" size={24} />
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        No {activeTab} tasks found
                      </p>
                      <p className="text-xs text-gray-500 mt-1 max-w-xs">
                        {activeTab === "active"
                          ? "This volunteer doesn't have any ongoing assignments at the moment."
                          : "This volunteer hasn't completed any tasks yet."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. Admin-only Assign Button (Mobile: sticky bottom, Desktop: fixed bottom right) */}
          {isAdmin && volunteer && (
            <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-gray-200 md:bg-transparent md:border-none md:bottom-8 md:right-8 md:left-auto md:w-auto md:p-0 z-40">
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={volunteer.activeTaskCount >= volunteer.maxActiveTasks || volunteer.status !== "available"}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all"
              >
                <Plus size={20} />
                Assign to Need
              </button>
              {(volunteer.activeTaskCount >= volunteer.maxActiveTasks || volunteer.status !== "available") && (
                <p className="text-[10px] text-center text-gray-500 mt-1.5 md:hidden">
                  Volunteer is currently unavailable or at capacity
                </p>
              )}
            </div>
          )}
        </div>
      </AppShell>

      {/* Admin Assign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Assign Need</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Open Need
              </label>
              {openNeeds.length > 0 ? (
                <select
                  value={selectedNeedId}
                  onChange={(e) => setSelectedNeedId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
                >
                  <option value="" disabled>-- Select a need --</option>
                  {openNeeds.map((need) => (
                    <option key={need.id} value={need.id}>
                      {need.title} ({need.urgency})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm flex gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>There are currently no open needs pending assignment.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={isAssigning || !selectedNeedId}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition"
              >
                {isAssigning ? (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {isAssigning ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-full shadow-xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={18} className="text-green-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </ProtectedRoute>
  );
}
