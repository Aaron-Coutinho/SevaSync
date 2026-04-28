// components/dashboard/UrgentQueue.tsx
import Link from "next/link";
import { MapPin, Users, Clock } from "lucide-react";
import UrgencyBadge from "@/components/needs/UrgencyBadge";

interface NeedItem {
  id: string;
  title: string;
  category: string;
  urgency: string;
  location: { area: string; city: string };
  beneficiaryCount: number;
  submittedAt: string | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const CATEGORY_LABELS: Record<string, string> = {
  food_essentials: "Food & Essentials",
  medical: "Medical",
  elderly_support: "Elderly Support",
  child_support: "Child Support",
  transport_logistics: "Transport",
  documentation: "Documentation",
  shelter_community: "Shelter",
};

interface UrgentQueueProps {
  needs: NeedItem[];
}

export default function UrgentQueue({ needs }: UrgentQueueProps) {
  if (needs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-sm font-medium text-gray-700">
          No urgent needs right now
        </p>
        <p className="text-xs text-gray-500 mt-1">
          All critical and high-priority requests are assigned.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {needs.slice(0, 5).map((need) => (
        <div key={need.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          {/* Left: badges + text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <UrgencyBadge urgency={need.urgency} />
              <span className="text-xs text-gray-500">
                {CATEGORY_LABELS[need.category] ?? need.category}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {need.title || "Untitled need"}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {need.location?.area ?? "—"}
              </span>
              <span className="flex items-center gap-1">
                <Users size={11} />
                {need.beneficiaryCount}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {timeAgo(need.submittedAt)}
              </span>
            </div>
          </div>
          {/* Right: View button */}
          <Link
            href={`/needs/${need.id}`}
            className="shrink-0 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors min-h-[36px] flex items-center"
          >
            View →
          </Link>
        </div>
      ))}
    </div>
  );
}
