import React from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-2.5 flex items-center justify-center text-[#6b7280] pointer-events-none w-4 h-4">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-8 bg-[#111827] border border-[#374151] rounded-[6px]",
              "text-[12px] text-[#f9fafb] placeholder:text-[#6b7280]",
              "px-3 transition-all duration-150",
              "focus:outline-none focus:border-[#20808D] focus:ring-1 focus:ring-[#20808D]/30",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              icon && "pl-8",
              iconRight && "pr-8",
              error && "border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]/30",
              className
            )}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-2.5 flex items-center justify-center text-[#6b7280] pointer-events-none w-4 h-4">
              {iconRight}
            </span>
          )}
        </div>
        {error && <p className="text-[11px] text-[#ef4444]">{error}</p>}
        {hint && !error && <p className="text-[11px] text-[#6b7280]">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full bg-[#111827] border border-[#374151] rounded-[6px]",
            "text-[12px] text-[#f9fafb] placeholder:text-[#6b7280]",
            "p-3 resize-y min-h-[80px] transition-all duration-150",
            "focus:outline-none focus:border-[#20808D] focus:ring-1 focus:ring-[#20808D]/30",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]/30",
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-[#ef4444]">{error}</p>}
        {hint && !error && <p className="text-[11px] text-[#6b7280]">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
