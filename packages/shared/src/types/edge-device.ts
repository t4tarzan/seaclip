import type { EdgeDeviceStatus, DeviceType } from "../constants.js";

export interface EdgeDevice {
  id: string;
  companyId: string;
  agentId: string | null;
  name: string;
  deviceType: DeviceType;
  hostname: string | null;
  ipAddress: string | null;
  tailscaleIp: string | null;
  status: EdgeDeviceStatus;
  cpuUsage: number | null;
  memoryUsageMb: number | null;
  gpuUsagePct: number | null;
  diskUsagePct: number | null;
  temperature: number | null;
  lastPingAt: string | null;
  lastHeartbeatAt: string | null;
  capabilities: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface EdgeDeviceTelemetry {
  deviceId: string;
  cpuUsage: number;
  memoryUsageMb: number;
  gpuUsagePct?: number;
  diskUsagePct: number;
  temperature?: number;
  timestamp: string;
}

export interface DeviceHealthReport {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  status: EdgeDeviceStatus;
  telemetry: EdgeDeviceTelemetry;
  alerts: Array<{ level: "info" | "warn" | "critical"; message: string }>;
  uptime: number;
}
