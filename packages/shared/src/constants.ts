export const DEPLOYMENT_MODES = ["local_trusted", "authenticated"] as const;
export type DeploymentMode = (typeof DEPLOYMENT_MODES)[number];

export const DEPLOYMENT_EXPOSURES = ["private", "public"] as const;
export type DeploymentExposure = (typeof DEPLOYMENT_EXPOSURES)[number];

export const ADAPTER_TYPES = [
  "seaclaw",
  "ollama_local",
  "agent_zero",
  "telegram_bridge",
  "process",
  "http",
  "claude_local",
  "codex_local",
] as const;
export type AdapterType = (typeof ADAPTER_TYPES)[number];

export const DEVICE_TYPES = [
  "raspberry_pi",
  "jetson_nano",
  "phone",
  "camera",
  "mac_mini",
  "cloud_vm",
] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const ISSUE_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
  "cancelled",
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const AGENT_STATUSES = [
  "idle",
  "active",
  "running",
  "error",
  "paused",
  "terminated",
] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const PRIORITIES = ["urgent", "high", "medium", "low", "none"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const EDGE_DEVICE_STATUSES = ["online", "offline", "degraded"] as const;
export type EdgeDeviceStatus = (typeof EDGE_DEVICE_STATUSES)[number];
