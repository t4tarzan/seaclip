import React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogPortal = RadixDialog.Portal;
export const DialogClose = RadixDialog.Close;

interface DialogOverlayProps extends RadixDialog.DialogOverlayProps {
  className?: string;
}

export function DialogOverlay({ className, ...props }: DialogOverlayProps) {
  return (
    <RadixDialog.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  );
}

interface DialogContentProps extends RadixDialog.DialogContentProps {
  className?: string;
  showClose?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function DialogContent({
  children,
  className,
  showClose = true,
  size = "md",
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <RadixDialog.Content
        className={cn(
          "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
          "w-full bg-[#1f2937] border border-[#374151] rounded-xl shadow-2xl",
          "p-5 focus:outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2",
          "data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]",
          sizeMap[size],
          className
        )}
        {...props}
      >
        {children}
        {showClose && (
          <RadixDialog.Close
            className="absolute right-3 top-3 rounded-md p-1 text-[#6b7280] hover:text-[#f9fafb] hover:bg-[#374151] transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </DialogPortal>
  );
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 pr-6", className)}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <RadixDialog.Title
      className={cn("text-[15px] font-semibold text-[#f9fafb]", className)}
    >
      {children}
    </RadixDialog.Title>
  );
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <RadixDialog.Description
      className={cn("text-[12px] text-[#9ca3af] mt-1", className)}
    >
      {children}
    </RadixDialog.Description>
  );
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-end gap-2 mt-5 pt-4 border-t border-[#374151]", className)}>
      {children}
    </div>
  );
}
