"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MapPin,
  Inbox,
  Trophy,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import UrgencyBadge from "@/components/needs/UrgencyBadge";
import StatusBadge from "@/components/tasks/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { get, patch } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Assignment {
  id: string;
  needId: string;
  volunteerId: string;
  status: "assigned" | "accepted" | "started" | "completed" | "declined";
  assignedAt: string;
  notes?: string;
}

interface Need {
  id: string;
  title: string;
  category: string;
  urgency: string;
  location: {
    area: string;
    city: string;
  };
}

interface EnrichedTask extends Assignment {
  needTitle: string;
  needCategory: string;
  needUrgency: string;
  needLocationArea: string;
  needLocationCity: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

// ── Components ────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg">
        <CheckCircle size={16} />
        {message}
      </div>
    </div>
  );
}

function TaskSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2 w-2/3">
          <div className="h-5 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="h-6 w-16 bg-gray-200 rounded-full" />
      </div>
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="mt-2 flex gap-2">
        <div className="h-10 bg-gray-200 rounded-lg w-full" />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<EnrichedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [toast, setToast] = useState({ visible: false, message: "" });

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: "" }), 3000);
  };

  const fetchTasks = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch assignments
      const assignments = await get<Assignment[]>(`/volunteers/${user.uid}/tasks`);

      // 2. Fetch need details for each assignment in parallel
      const enrichedPromises = assignments.map(async (a) => {
        try {
          const need = await get<Need>(`/needs/${a.needId}`);
          return {
            ...a,
            needTitle: need.title,
            needCategory: need.category,
            needUrgency: need.urgency,
            needLocationArea: need.location?.area || "Unknown",
            needLocationCity: need.location?.city || "Unknown",
          } as EnrichedTask;
        } catch {
          // Fallback if need is deleted or inaccessible
          return {
            ...a,
            needTitle: "Unknown Need",
            needCategory: "Unknown",
            needUrgency: "low",
            needLocationArea: "Unknown",
            needLocationCity: "Unknown",
          } as EnrichedTask;
        }
      });

      const enrichedTasks = await Promise.all(enrichedPromises);
      setTasks(enrichedTasks);
    } catch (err) {
      setError("Failed to load your tasks. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    setUpdatingId(taskId);
    setError(null);
    try {
      await patch(`/assignments/${taskId}`, { status: newStatus });
      showToast(`Task marked as ${newStatus} ✓`);
      await fetchTasks();
    } catch (err: any) {
      setError(err.message || "Failed to update task status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter tasks based on tabs
  // "declined" tasks are generally hidden from the active view, 
  // but if returned by backend, we filter them out.
  const activeTasks = tasks.filter((t) => ["assigned", "accepted", "started"].includes(t.status));
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const displayedTasks = activeTab === "active" ? activeTasks : completedTasks;

  return (
    <ProtectedRoute role="volunteer">
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
          <Toast visible={toast.visible} message={toast.message} />

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your assigned community needs
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-md">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${
                activeTab === "active"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Active
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeTab === "active"
                    ? "bg-teal-100 text-teal-700"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {activeTasks.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${
                activeTab === "completed"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Completed
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeTab === "completed"
                    ? "bg-teal-100 text-teal-700"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {completedTasks.length}
              </span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-red-700">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle size={16} /> {error}
              </div>
            </div>
          )}

          {/* Task List */}
          <div className="space-y-4">
            {loading ? (
              <>
                <TaskSkeleton />
                <TaskSkeleton />
                <TaskSkeleton />
              </>
            ) : displayedTasks.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  {activeTab === "active" ? (
                    <Inbox size={32} className="text-gray-400" />
                  ) : (
                    <Trophy size={32} className="text-gray-400" />
                  )}
                </div>
                <p className="text-base font-semibold text-gray-900 mb-1">
                  {activeTab === "active"
                    ? "No active tasks"
                    : "No completed tasks yet"}
                </p>
                <p className="text-sm text-gray-500">
                  {activeTab === "active"
                    ? "You don't have any pending assignments right now."
                    : "Tasks you complete will appear here. Keep going!"}
                </p>
              </div>
            ) : (
              displayedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-gray-900 leading-snug">
                        {task.needTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <UrgencyBadge urgency={task.needUrgency} />
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {CATEGORY_LABELS[task.needCategory] ?? task.needCategory}
                        </span>
                        <StatusBadge status={task.status} />
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <p className="text-xs text-gray-500 flex items-center sm:justify-end gap-1 font-medium">
                        <Clock size={12} />
                        Assigned on {formatDate(task.assignedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <MapPin size={16} className="text-teal-600 shrink-0" />
                    <span className="truncate">
                      {task.needLocationArea}, {task.needLocationCity}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {task.status === "assigned" && (
                      <>
                        <button
                          onClick={() => updateTaskStatus(task.id, "accepted")}
                          disabled={updatingId === task.id}
                          className="flex-1 sm:flex-none px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex justify-center items-center gap-2"
                        >
                          {updatingId === task.id ? "Updating..." : "Accept Task"}
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, "declined")}
                          disabled={updatingId === task.id}
                          className="flex-1 sm:flex-none px-6 py-2.5 border-2 border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 text-sm font-semibold rounded-lg transition-colors flex justify-center items-center"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {task.status === "accepted" && (
                      <button
                        onClick={() => updateTaskStatus(task.id, "started")}
                        disabled={updatingId === task.id}
                        className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex justify-center items-center"
                      >
                        {updatingId === task.id ? "Updating..." : "Mark as Started"}
                      </button>
                    )}

                    {task.status === "started" && (
                      <button
                        onClick={() => updateTaskStatus(task.id, "completed")}
                        disabled={updatingId === task.id}
                        className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex justify-center items-center"
                      >
                        {updatingId === task.id ? "Updating..." : "Mark as Completed"}
                      </button>
                    )}

                    {task.status === "completed" && (
                      <div className="flex items-center gap-1.5 text-green-600 font-semibold text-sm bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                        <CheckCircle size={16} />
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
