import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export const Select = RadixSelect.Root;
export const SelectGroup = RadixSelect.Group;
export const SelectValue = RadixSelect.Value;

interface SelectTriggerProps extends RadixSelect.SelectTriggerProps {
  className?: string;
  placeholder?: string;
}

export function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  return (
    <RadixSelect.Trigger
      className={cn(
        "flex h-8 w-full items-center justify-between gap-2",
        "bg-[#111827] border border-[#374151] rounded-[6px]",
        "px-3 text-[12px] text-[#f9fafb]",
        "focus:outline-none focus:border-[#20808D] focus:ring-1 focus:ring-[#20808D]/30",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "data-[placeholder]:text-[#6b7280]",
        "transition-all duration-150",
        className
      )}
      {...props}
    >
      {children}
      <RadixSelect.Icon asChild>
        <ChevronDown size={12} className="text-[#6b7280] flex-shrink-0" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: RadixSelect.SelectContentProps & { className?: string }) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden",
          "bg-[#1f2937] border border-[#374151] rounded-lg shadow-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}
      >
        <RadixSelect.Viewport className="p-1">{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: RadixSelect.SelectItemProps & { className?: string }) {
  return (
    <RadixSelect.Item
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2",
        "rounded-[5px] py-1.5 pl-7 pr-3",
        "text-[12px] text-[#f9fafb]",
        "focus:bg-[#374151] focus:text-[#f9fafb] focus:outline-none",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "transition-colors",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <RadixSelect.ItemIndicator>
          <Check size={11} className="text-[#20808D]" />
        </RadixSelect.ItemIndicator>
      </span>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  );
}

export function SelectLabel({ className, ...props }: RadixSelect.SelectLabelProps & { className?: string }) {
  return (
    <RadixSelect.Label
      className={cn(
        "px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]",
        className
      )}
      {...props}
    />
  );
}

export function SelectSeparator({ className, ...props }: RadixSelect.SelectSeparatorProps & { className?: string }) {
  return (
    <RadixSelect.Separator
      className={cn("my-1 h-px bg-[#374151]", className)}
      {...props}
    />
  );
}
