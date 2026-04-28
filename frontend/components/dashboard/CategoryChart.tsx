// components/dashboard/CategoryChart.tsx
// Pure CSS/Tailwind horizontal bar chart — no chart library.

interface CategoryItem {
  category: string;
  count: number;
  completedCount: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  food_essentials: "Food & Essentials",
  medical: "Medical",
  elderly_support: "Elderly Support",
  child_support: "Child Support",
  transport_logistics: "Transport & Logistics",
  documentation: "Documentation",
  shelter_community: "Shelter & Community",
  unknown: "Uncategorized",
};

interface CategoryChartProps {
  data: CategoryItem[];
}

export default function CategoryChart({ data }: CategoryChartProps) {
  if (!data.length) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">
        No category data yet.
      </p>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex flex-col gap-3">
      {data.map((item) => {
        const barPct = Math.round((item.count / maxCount) * 100);
        return (
          <div key={item.category} className="flex items-center gap-3">
            {/* Label */}
            <span className="w-36 shrink-0 text-xs font-medium text-gray-600 text-right leading-tight">
              {CATEGORY_LABELS[item.category] ?? item.category}
            </span>
            {/* Track */}
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              {/* Fill — CSS transition animates on mount */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-700 ease-out"
                style={{ width: `${barPct}%` }}
              />
            </div>
            {/* Count */}
            <span className="w-8 text-xs font-semibold text-gray-700 text-right">
              {item.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
