import React from "react";
import { cn } from "../../lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  noPadding?: boolean;
}

export function Card({ children, className, hover = false, noPadding = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[#1f2937] border border-[#374151] rounded-xl",
        !noPadding && "p-4",
        hover && "transition-all duration-150 hover:border-[#4b5563] hover:bg-[#263244] cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, description, action, children, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 mb-4", className)}
      {...props}
    >
      <div className="min-w-0 flex-1">
        {title && (
          <h3 className="text-[13px] font-semibold text-[#f9fafb] leading-tight">{title}</h3>
        )}
        {description && (
          <p className="text-[11px] text-[#6b7280] mt-0.5 leading-relaxed">{description}</p>
        )}
        {children}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 mt-4 pt-4 border-t border-[#374151]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
