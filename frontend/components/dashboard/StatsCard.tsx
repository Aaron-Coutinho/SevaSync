// components/dashboard/StatsCard.tsx
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  sublabel?: string;
  /** Tailwind color class for the icon background, e.g. "bg-teal-100 text-teal-600" */
  iconColor?: string;
}

export default function StatsCard({
  icon: Icon,
  value,
  label,
  sublabel,
  iconColor = "bg-teal-100 text-teal-600",
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm">
      <div
        className={cn(
          "h-11 w-11 rounded-lg flex items-center justify-center shrink-0",
          iconColor
        )}
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-tight">
          {value}
        </p>
        <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
        {sublabel && (
          <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>
        )}
      </div>
    </div>
  );
}
