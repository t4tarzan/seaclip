import type { AgentStatus, AdapterType, DeviceType } from "../constants.js";

export interface Agent {
  id: string;
  companyId: string;
  name: string;
  role: string;
  title: string | null;
  icon: string | null;
  status: AgentStatus;
  reportsTo: string | null;
  capabilities: string | null;
  adapterType: AdapterType;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
  permissions: Record<string, unknown>;
  deviceType: DeviceType | null;
  deviceMeta: Record<string, unknown> | null;
  lastHeartbeatAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentCreate {
  companyId: string;
  name: string;
  role?: string;
  title?: string;
  icon?: string;
  reportsTo?: string;
  capabilities?: string;
  adapterType?: AdapterType;
  adapterConfig?: Record<string, unknown>;
  runtimeConfig?: Record<string, unknown>;
  budgetMonthlyCents?: number;
  permissions?: Record<string, unknown>;
  deviceType?: DeviceType;
  deviceMeta?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AgentUpdate {
  name?: string;
  role?: string;
  title?: string;
  icon?: string;
  status?: AgentStatus;
  reportsTo?: string | null;
  capabilities?: string;
  adapterType?: AdapterType;
  adapterConfig?: Record<string, unknown>;
  runtimeConfig?: Record<string, unknown>;
  budgetMonthlyCents?: number;
  permissions?: Record<string, unknown>;
  deviceType?: DeviceType | null;
  deviceMeta?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}
