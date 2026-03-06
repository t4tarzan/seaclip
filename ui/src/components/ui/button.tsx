import React from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "primary" | "ghost" | "destructive" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-[#1f2937] text-[#f9fafb] border border-[#374151] hover:bg-[#263244] hover:border-[#4b5563]",
  primary:
    "bg-[#20808D] text-white border border-[#20808D] hover:bg-[#25919f] hover:border-[#25919f] shadow-sm",
  ghost:
    "bg-transparent text-[#9ca3af] hover:bg-[#1f2937] hover:text-[#f9fafb] border border-transparent",
  destructive:
    "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/20 hover:border-[#ef4444]/50",
  outline:
    "bg-transparent text-[#f9fafb] border border-[#374151] hover:bg-[#1f2937] hover:border-[#4b5563]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-[11px] gap-1.5 rounded-[5px]",
  md: "h-8 px-3 text-[12px] gap-2 rounded-[6px]",
  lg: "h-10 px-4 text-[13px] gap-2 rounded-[7px]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "default",
      size = "md",
      loading = false,
      icon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20808D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f1a]",
          "select-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          icon && <span className="flex-shrink-0">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
