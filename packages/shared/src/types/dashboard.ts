import type { AgentStatus, EdgeDeviceStatus } from "../constants.js";

export interface AgentStatusSummary {
  agentId: string;
  agentName: string;
  role: string;
  status: AgentStatus;
  currentIssueId: string | null;
  currentIssueTitle: string | null;
  spentMonthlyCents: number;
  budgetMonthlyCents: number;
  lastHeartbeatAt: string | null;
}

export interface EdgeMeshStatus {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  degradedDevices: number;
  devices: Array<{
    id: string;
    name: string;
    deviceType: string;
    status: EdgeDeviceStatus;
    cpuUsage: number | null;
    memoryUsageMb: number | null;
    lastHeartbeatAt: string | null;
  }>;
}

export interface DashboardSummary {
  companyId: string;
  openIssues: number;
  inProgressIssues: number;
  completedIssuesToday: number;
  activeAgents: number;
  totalAgents: number;
  pendingApprovals: number;
  spentMonthlyCents: number;
  budgetMonthlyCents: number;
  agents: AgentStatusSummary[];
  edgeMesh: EdgeMeshStatus;
  hubs: Array<{ hubId: string; name: string; status: string; lastSyncAt: string | null }>;
}
