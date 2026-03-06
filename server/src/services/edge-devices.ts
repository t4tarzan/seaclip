/**
 * edge-devices service — device registration, telemetry ingestion,
 * mesh topology builder, health check aggregation.
 */
import { randomUUID } from "node:crypto";
import { notFound } from "../errors.js";

export type DeviceStatus = "online" | "offline" | "degraded" | "unknown";

export interface EdgeDevice {
  id: string;
  companyId: string;
  name: string;
  deviceType: string;
  hardwareId?: string;
  ipAddress?: string;
  endpoint?: string;
  location?: string;
  capabilities: string[];
  status: DeviceStatus;
  metadata: Record<string, unknown>;
  registeredAt: string;
  lastSeenAt?: string;
  updatedAt: string;
}

export interface DeviceTelemetry {
  id: string;
  deviceId: string;
  companyId: string;
  cpuPercent?: number;
  memoryPercent?: number;
  diskPercent?: number;
  gpuPercent?: number;
  gpuMemoryPercent?: number;
  temperatureCelsius?: number;
  networkBytesIn?: number;
  networkBytesOut?: number;
  uptimeSeconds?: number;
  customMetrics?: Record<string, number>;
  timestamp: string;
  receivedAt: string;
}

export interface TelemetryInput {
  cpuPercent?: number;
  memoryPercent?: number;
  diskPercent?: number;
  gpuPercent?: number;
  gpuMemoryPercent?: number;
  temperatureCelsius?: number;
  networkBytesIn?: number;
  networkBytesOut?: number;
  uptimeSeconds?: number;
  customMetrics?: Record<string, number>;
  timestamp?: string;
}

export interface MeshTopology {
  nodes: MeshNode[];
  edges: MeshEdge[];
  generatedAt: string;
}

export interface MeshNode {
  id: string;
  name: string;
  deviceType: string;
  status: DeviceStatus;
  location?: string;
  capabilities: string[];
}

export interface MeshEdge {
  sourceId: string;
  targetId: string;
  edgeType: "agent" | "sync" | "tunnel";
  latencyMs?: number;
}

const deviceStore = new Map<string, EdgeDevice>();
const telemetryStore = new Map<string, DeviceTelemetry[]>();

function devicesForCompany(companyId: string): EdgeDevice[] {
  return Array.from(deviceStore.values()).filter(
    (d) => d.companyId === companyId,
  );
}

function determineStatus(
  device: EdgeDevice,
  telemetry?: TelemetryInput,
): DeviceStatus {
  if (!device.lastSeenAt) return "unknown";

  const lastSeen = new Date(device.lastSeenAt).getTime();
  const staleThresholdMs = 5 * 60 * 1000; // 5 minutes

  if (Date.now() - lastSeen > staleThresholdMs) return "offline";

  if (telemetry) {
    const cpu = telemetry.cpuPercent ?? 0;
    const mem = telemetry.memoryPercent ?? 0;
    const temp = telemetry.temperatureCelsius ?? 0;

    if (cpu > 95 || mem > 95 || temp > 80) return "degraded";
  }

  return "online";
}

export async function listEdgeDevices(companyId: string): Promise<EdgeDevice[]> {
  return devicesForCompany(companyId).sort(
    (a, b) => a.registeredAt.localeCompare(b.registeredAt),
  );
}

export async function registerEdgeDevice(
  companyId: string,
  input: {
    name: string;
    deviceType: string;
    hardwareId?: string;
    ipAddress?: string;
    endpoint?: string;
    location?: string;
    capabilities?: string[];
    metadata?: Record<string, unknown>;
  },
): Promise<EdgeDevice> {
  const now = new Date().toISOString();
  const device: EdgeDevice = {
    id: randomUUID(),
    companyId,
    name: input.name,
    deviceType: input.deviceType,
    hardwareId: input.hardwareId,
    ipAddress: input.ipAddress,
    endpoint: input.endpoint,
    location: input.location,
    capabilities: input.capabilities ?? [],
    status: "unknown",
    metadata: input.metadata ?? {},
    registeredAt: now,
    updatedAt: now,
  };
  deviceStore.set(device.id, device);
  return device;
}

export async function getEdgeDevice(
  companyId: string,
  id: string,
): Promise<EdgeDevice & { telemetryHistory: DeviceTelemetry[] }> {
  const device = deviceStore.get(id);
  if (!device || device.companyId !== companyId) {
    throw notFound(`Edge device "${id}" not found`);
  }
  const telemetryHistory = (telemetryStore.get(id) ?? [])
    .slice(-100) // last 100 readings
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return { ...device, telemetryHistory };
}

export async function updateEdgeDevice(
  companyId: string,
  id: string,
  input: Partial<{
    name: string;
    deviceType: string;
    ipAddress: string;
    endpoint: string;
    location: string;
    capabilities: string[];
    metadata: Record<string, unknown>;
  }>,
): Promise<EdgeDevice> {
  const device = deviceStore.get(id);
  if (!device || device.companyId !== companyId) {
    throw notFound(`Edge device "${id}" not found`);
  }
  const updated: EdgeDevice = {
    ...device,
    ...input,
    metadata: input.metadata !== undefined
      ? { ...device.metadata, ...input.metadata }
      : device.metadata,
    capabilities: input.capabilities ?? device.capabilities,
    updatedAt: new Date().toISOString(),
  };
  deviceStore.set(id, updated);
  return updated;
}

export async function deregisterEdgeDevice(
  companyId: string,
  id: string,
): Promise<void> {
  const device = deviceStore.get(id);
  if (!device || device.companyId !== companyId) {
    throw notFound(`Edge device "${id}" not found`);
  }
  deviceStore.delete(id);
  telemetryStore.delete(id);
}

export async function ingestTelemetry(
  companyId: string,
  deviceId: string,
  input: TelemetryInput,
): Promise<DeviceTelemetry> {
  const device = deviceStore.get(deviceId);
  if (!device || device.companyId !== companyId) {
    throw notFound(`Edge device "${deviceId}" not found`);
  }

  const now = new Date().toISOString();
  const telemetry: DeviceTelemetry = {
    id: randomUUID(),
    deviceId,
    companyId,
    cpuPercent: input.cpuPercent,
    memoryPercent: input.memoryPercent,
    diskPercent: input.diskPercent,
    gpuPercent: input.gpuPercent,
    gpuMemoryPercent: input.gpuMemoryPercent,
    temperatureCelsius: input.temperatureCelsius,
    networkBytesIn: input.networkBytesIn,
    networkBytesOut: input.networkBytesOut,
    uptimeSeconds: input.uptimeSeconds,
    customMetrics: input.customMetrics,
    timestamp: input.timestamp ?? now,
    receivedAt: now,
  };

  // Store telemetry (cap at 1000 readings per device)
  if (!telemetryStore.has(deviceId)) {
    telemetryStore.set(deviceId, []);
  }
  const history = telemetryStore.get(deviceId)!;
  history.push(telemetry);
  if (history.length > 1000) history.splice(0, history.length - 1000);

  // Update device status and last seen
  const newStatus = determineStatus(device, input);
  deviceStore.set(deviceId, {
    ...device,
    status: newStatus,
    lastSeenAt: now,
    updatedAt: now,
  });

  return telemetry;
}

export async function getMeshTopology(companyId: string): Promise<MeshTopology> {
  const devices = devicesForCompany(companyId);

  const nodes: MeshNode[] = devices.map((d) => ({
    id: d.id,
    name: d.name,
    deviceType: d.deviceType,
    status: d.status,
    location: d.location,
    capabilities: d.capabilities,
  }));

  // Simple mesh: devices that are online are considered connected to each other
  const onlineDevices = devices.filter((d) => d.status === "online");
  const edges: MeshEdge[] = [];

  for (let i = 0; i < onlineDevices.length; i++) {
    for (let j = i + 1; j < onlineDevices.length; j++) {
      const a = onlineDevices[i];
      const b = onlineDevices[j];

      // Only create edges between devices in close geographic proximity or same location
      if (a.location && b.location && a.location === b.location) {
        edges.push({
          sourceId: a.id,
          targetId: b.id,
          edgeType: "sync",
        });
      }
    }
  }

  return {
    nodes,
    edges,
    generatedAt: new Date().toISOString(),
  };
}
