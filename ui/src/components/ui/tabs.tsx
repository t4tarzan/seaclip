import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

export const Tabs = RadixTabs.Root;

export function TabsList({
  className,
  ...props
}: RadixTabs.TabsListProps & { className?: string }) {
  return (
    <RadixTabs.List
      className={cn(
        "inline-flex items-center gap-0.5",
        "bg-[#111827] border border-[#374151] rounded-[7px] p-0.5",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: RadixTabs.TabsTriggerProps & { className?: string }) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "inline-flex items-center justify-center gap-1.5",
        "rounded-[5px] px-3 h-7",
        "text-[12px] font-medium text-[#9ca3af]",
        "transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20808D]",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-[#1f2937] data-[state=active]:text-[#f9fafb] data-[state=active]:shadow-sm",
        "hover:text-[#f9fafb]",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: RadixTabs.TabsContentProps & { className?: string }) {
  return (
    <RadixTabs.Content
      className={cn(
        "mt-3 focus-visible:outline-none",
        "data-[state=inactive]:hidden",
        className
      )}
      {...props}
    />
  );
}
