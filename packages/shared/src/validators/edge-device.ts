import { z } from "zod";
import { DEVICE_TYPES } from "../constants.js";

export const registerEdgeDeviceSchema = z.object({
  companyId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  deviceType: z.enum(DEVICE_TYPES),
  hostname: z.string().optional(),
  ipAddress: z.string().ip().optional(),
  tailscaleIp: z.string().ip().optional(),
  capabilities: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateEdgeDeviceTelemetrySchema = z.object({
  cpuUsage: z.number().min(0).max(100),
  memoryUsageMb: z.number().int().min(0),
  gpuUsagePct: z.number().min(0).max(100).optional(),
  diskUsagePct: z.number().min(0).max(100),
  temperature: z.number().optional(),
  ipAddress: z.string().ip().optional(),
  tailscaleIp: z.string().ip().optional(),
});

export type RegisterEdgeDeviceInput = z.infer<typeof registerEdgeDeviceSchema>;
export type UpdateEdgeDeviceTelemetryInput = z.infer<typeof updateEdgeDeviceTelemetrySchema>;
