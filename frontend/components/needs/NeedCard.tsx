// components/needs/NeedCard.tsx
"use client";

import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import UrgencyBadge from "./UrgencyBadge";
import StatusBadge from "@/components/tasks/StatusBadge";

const CATEGORY_LABELS: Record<string, string> = {
  food_essentials: "Food & Essentials",
  medical: "Medical",
  elderly_support: "Elderly Support",
  child_support: "Child Support",
  transport_logistics: "Transport",
  documentation: "Documentation",
  shelter_community: "Shelter",
};

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export interface NeedCardData {
  id: string;
  title: string;
  category?: string | null;
  urgency?: string | null;
  status: string;
  location: { area: string; city: string };
  beneficiaryCount: number;
  aiSummary?: string | null;
  submittedAt?: string | null;
  priorityScore?: number | null;
}

interface NeedCardProps {
  need: NeedCardData;
}

export default function NeedCard({ need }: NeedCardProps) {
  return (
    <Link
      href={`/needs/${need.id}`}
      className="block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 overflow-hidden"
    >
      {/* ── Header bar ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {CATEGORY_LABELS[need.category ?? ""] ?? need.category ?? "Uncategorized"}
        </span>
        {need.urgency && <UrgencyBadge urgency={need.urgency} />}
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-2">
          {need.title || "Untitled need"}
        </h3>

        {/* Location + beneficiary count */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
          <span className="flex items-center gap-1">
            <MapPin size={12} className="text-gray-400" />
            {need.location?.area ?? "Unknown"}, {need.location?.city ?? ""}
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} className="text-gray-400" />
            {need.beneficiaryCount} beneficiar{need.beneficiaryCount === 1 ? "y" : "ies"}
          </span>
        </div>

        {/* AI summary */}
        {need.aiSummary && (
          <p className="text-xs italic text-gray-400 line-clamp-2 mb-2">
            {need.aiSummary}
          </p>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
        <StatusBadge status={need.status} />
        <span className="text-xs text-gray-400">{timeAgo(need.submittedAt)}</span>
      </div>
    </Link>
  );
}
