// components/dashboard/ActivityFeed.tsx
import StatusBadge from "@/components/tasks/StatusBadge";

interface AssignmentItem {
  id: string;
  volunteerId: string;
  needId: string;
  status: string;
  assignedAt: string | null;
  // Optionally enriched by dashboard page
  volunteerName?: string;
  needTitle?: string;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function truncateTitle(title: string, maxLength: number = 40): string {
  if (!title) return "Unknown Need";
  return title.length > maxLength ? title.slice(0, maxLength) + "…" : title;
}

interface ActivityFeedProps {
  assignments: AssignmentItem[];
}

export default function ActivityFeed({ assignments }: ActivityFeedProps) {
  if (!assignments.length) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">
        No recent assignments.
      </p>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {assignments.slice(0, 5).map((a) => (
        <div key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          {/* Avatar placeholder */}
          <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0 select-none">
            {(a.volunteerName ?? a.volunteerId)?.[0]?.toUpperCase() ?? "V"}
          </div>

          {/* Description */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 leading-snug">
              <span className="font-medium">
                {a.volunteerName ?? a.volunteerId.slice(0, 8) + "…"}
              </span>{" "}
              <span className="text-gray-500">assigned to</span>{" "}
              <span className="font-medium truncate">
                {a.needTitle ? truncateTitle(a.needTitle) : a.needId.slice(0, 12) + "…"}
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{timeAgo(a.assignedAt)}</p>
          </div>

          {/* Status */}
          <StatusBadge status={a.status} className="shrink-0" />
        </div>
      ))}
    </div>
  );
}
