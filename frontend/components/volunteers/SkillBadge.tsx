// components/volunteers/SkillBadge.tsx
import { cn } from "@/lib/utils";

const SKILL_LABELS: Record<string, string> = {
  medical: "Medical",
  counselling: "Counselling",
  logistics: "Logistics",
  translation: "Translation",
  data_entry: "Data Entry",
  field_support: "Field Support",
  community_outreach: "Community Outreach",
  documentation: "Documentation",
};

interface SkillBadgeProps {
  skill: string;
  className?: string;
}

export default function SkillBadge({ skill, className }: SkillBadgeProps) {
  const label = SKILL_LABELS[skill] ?? skill;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200",
        className
      )}
    >
      {label}
    </span>
  );
}
