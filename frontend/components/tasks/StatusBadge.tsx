// components/tasks/StatusBadge.tsx
import { cn } from "@/lib/utils";

type NeedStatus =
  | "new"
  | "analyzed"
  | "pending_assignment"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "escalated"
  | "started"
  | "declined";

const STATUS_STYLES: Record<NeedStatus, string> = {
  new: "bg-gray-100 text-gray-600",
  analyzed: "bg-gray-100 text-gray-600",
  pending_assignment: "bg-blue-100 text-blue-700",
  assigned: "bg-indigo-100 text-indigo-700",
  accepted: "bg-indigo-100 text-indigo-700",
  started: "bg-purple-100 text-purple-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  escalated: "bg-red-100 text-red-700",
  declined: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<NeedStatus, string> = {
  new: "New",
  analyzed: "Analyzed",
  pending_assignment: "Pending Assignment",
  assigned: "Assigned",
  accepted: "Accepted",
  started: "In Progress",
  in_progress: "In Progress",
  completed: "Completed",
  escalated: "Escalated",
  declined: "Declined",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status as NeedStatus;
  const styles = STATUS_STYLES[key] ?? "bg-gray-100 text-gray-600";
  const label = STATUS_LABELS[key] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        styles,
        className
      )}
    >
      {label}
    </span>
  );
}
