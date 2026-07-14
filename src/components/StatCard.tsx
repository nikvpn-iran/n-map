"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: "purple" | "amber" | "emerald";
  loading?: boolean;
}

const colorMap = {
  purple: {
    bg: "bg-brand-500/10",
    border: "border-brand-500/20",
    icon: "text-brand-400",
    value: "text-brand-300",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: "text-amber-400",
    value: "text-amber-300",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: "text-emerald-400",
    value: "text-emerald-300",
  },
};

export function StatCard({ title, value, icon: Icon, color, loading }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-all hover:scale-[1.02]",
        c.bg,
        c.border
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{title}</p>
        <Icon className={cn("h-5 w-5", c.icon)} />
      </div>
      <p className={cn("mt-2 text-3xl font-black tabular-nums", c.value)}>
        {loading ? "..." : value}
      </p>
    </div>
  );
}
