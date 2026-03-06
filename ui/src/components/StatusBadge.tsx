import React from "react";
import { Badge } from "./ui/badge";
import type {
  AgentStatus,
  IssueStatus,
  IssuePriority,
  DeviceStatus,
  ApprovalStatus,
} from "../lib/types";

interface StatusBadgeProps {
  type: "agent" | "issue" | "priority" | "device" | "approval";
  value: AgentStatus | IssueStatus | IssuePriority | DeviceStatus | ApprovalStatus;
}

const agentStatusConfig: Record<
  AgentStatus,
  { label: string; variant: "success" | "primary" | "error" | "muted" | "warning" }
> = {
  idle: { label: "Idle", variant: "muted" },
  running: { label: "Running", variant: "primary" },
  error: { label: "Error", variant: "error" },
  offline: { label: "Offline", variant: "muted" },
  paused: { label: "Paused", variant: "warning" },
};

const issueStatusConfig: Record<
  IssueStatus,
  { label: string; variant: "muted" | "warning" | "primary" | "info" | "success" }
> = {
  backlog: { label: "Backlog", variant: "muted" },
  todo: { label: "Todo", variant: "warning" },
  in_progress: { label: "In Progress", variant: "primary" },
  in_review: { label: "In Review", variant: "info" },
  done: { label: "Done", variant: "success" },
};

const priorityConfig: Record<
  IssuePriority,
  { label: string; variant: "error" | "warning" | "primary" | "muted" }
> = {
  urgent: { label: "Urgent", variant: "error" },
  high: { label: "High", variant: "warning" },
  medium: { label: "Medium", variant: "primary" },
  low: { label: "Low", variant: "muted" },
};

const deviceStatusConfig: Record<
  DeviceStatus,
  { label: string; variant: "success" | "error" | "warning" }
> = {
  online: { label: "Online", variant: "success" },
  offline: { label: "Offline", variant: "error" },
  degraded: { label: "Degraded", variant: "warning" },
};

const approvalStatusConfig: Record<
  ApprovalStatus,
  { label: string; variant: "warning" | "success" | "error" }
> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "error" },
};

export function StatusBadge({ type, value }: StatusBadgeProps) {
  let config: { label: string; variant: string } | undefined;

  if (type === "agent") config = agentStatusConfig[value as AgentStatus];
  else if (type === "issue") config = issueStatusConfig[value as IssueStatus];
  else if (type === "priority") config = priorityConfig[value as IssuePriority];
  else if (type === "device") config = deviceStatusConfig[value as DeviceStatus];
  else if (type === "approval") config = approvalStatusConfig[value as ApprovalStatus];

  if (!config) return null;

  return (
    <Badge
      variant={config.variant as Parameters<typeof Badge>[0]["variant"]}
      dot
    >
      {config.label}
    </Badge>
  );
}
