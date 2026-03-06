import React from "react";
import { cn } from "../../lib/utils";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "muted"
  | "outline";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  size?: "sm" | "md";
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[#374151] text-[#d1d5db]",
  primary: "bg-[#20808D]/20 text-[#20d1e0] border border-[#20808D]/30",
  success: "bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30",
  warning: "bg-[#eab308]/15 text-[#fbbf24] border border-[#eab308]/30",
  error: "bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30",
  info: "bg-[#06b6d4]/15 text-[#22d3ee] border border-[#06b6d4]/30",
  muted: "bg-[#1f2937] text-[#6b7280] border border-[#374151]",
  outline: "bg-transparent text-[#9ca3af] border border-[#374151]",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-[#9ca3af]",
  primary: "bg-[#20808D]",
  success: "bg-[#22c55e]",
  warning: "bg-[#eab308]",
  error: "bg-[#ef4444]",
  info: "bg-[#06b6d4]",
  muted: "bg-[#6b7280]",
  outline: "bg-[#6b7280]",
};

export function Badge({
  variant = "default",
  dot = false,
  size = "sm",
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap",
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "inline-block rounded-full flex-shrink-0",
            size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
            dotColors[variant]
          )}
        />
      )}
      {children}
    </span>
  );
}
