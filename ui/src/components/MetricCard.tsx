import React from "react";
import { cn } from "../lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  accent?: "primary" | "success" | "warning" | "error" | "info";
  loading?: boolean;
  onClick?: () => void;
}

const accentColors = {
  primary: {
    icon: "text-[#20808D]",
    iconBg: "bg-[#20808D]/15 border-[#20808D]/25",
    value: "text-[#f9fafb]",
  },
  success: {
    icon: "text-[#22c55e]",
    iconBg: "bg-[#22c55e]/15 border-[#22c55e]/25",
    value: "text-[#f9fafb]",
  },
  warning: {
    icon: "text-[#eab308]",
    iconBg: "bg-[#eab308]/15 border-[#eab308]/25",
    value: "text-[#f9fafb]",
  },
  error: {
    icon: "text-[#ef4444]",
    iconBg: "bg-[#ef4444]/15 border-[#ef4444]/25",
    value: "text-[#f9fafb]",
  },
  info: {
    icon: "text-[#06b6d4]",
    iconBg: "bg-[#06b6d4]/15 border-[#06b6d4]/25",
    value: "text-[#f9fafb]",
  },
};

export function MetricCard({
  label,
  value,
  description,
  icon,
  trend,
  accent = "primary",
  loading = false,
  onClick,
}: MetricCardProps) {
  const colors = accentColors[accent];

  return (
    <div
      className={cn(
        "bg-[#1f2937] border border-[#374151] rounded-xl p-4",
        "transition-all duration-150",
        onClick && "cursor-pointer hover:border-[#4b5563] hover:bg-[#263244]"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        {icon && (
          <div
            className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0",
              colors.iconBg
            )}
          >
            <span className={cn("w-4 h-4", colors.icon)}>{icon}</span>
          </div>
        )}
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] font-medium ml-auto",
              trend.value > 0
                ? "text-[#22c55e]"
                : trend.value < 0
                ? "text-[#ef4444]"
                : "text-[#6b7280]"
            )}
          >
            {trend.value > 0 ? (
              <TrendingUp size={10} />
            ) : trend.value < 0 ? (
              <TrendingDown size={10} />
            ) : (
              <Minus size={10} />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-6 w-16 bg-[#374151] rounded skeleton-shimmer" />
          <div className="h-3 w-24 bg-[#374151] rounded skeleton-shimmer" />
        </div>
      ) : (
        <>
          <div
            className={cn(
              "text-[24px] font-bold leading-none mb-1",
              colors.value
            )}
          >
            {value}
          </div>
          <div className="text-[11px] font-medium text-[#9ca3af]">{label}</div>
          {description && (
            <div className="text-[10px] text-[#6b7280] mt-0.5 leading-relaxed">{description}</div>
          )}
        </>
      )}
    </div>
  );
}
