// components/needs/UrgencyBadge.tsx
import { cn } from "@/lib/utils";

type Urgency = "critical" | "high" | "medium" | "low";

const URGENCY_STYLES: Record<Urgency, string> = {
  critical: "bg-red-100 text-red-700 border-red-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
  low: "bg-green-100 text-green-700 border-green-300",
};

const URGENCY_LABELS: Record<Urgency, string> = {
  critical: "🔴 Critical",
  high: "🟠 High",
  medium: "🟡 Medium",
  low: "🟢 Low",
};

interface UrgencyBadgeProps {
  urgency: Urgency | string;
  className?: string;
}

export default function UrgencyBadge({ urgency, className }: UrgencyBadgeProps) {
  const key = (urgency ?? "low") as Urgency;
  const styles = URGENCY_STYLES[key] ?? URGENCY_STYLES.low;
  const label = URGENCY_LABELS[key] ?? urgency;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        styles,
        className
      )}
    >
      {label}
    </span>
  );
}
