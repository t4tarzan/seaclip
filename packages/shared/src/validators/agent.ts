import { z } from "zod";
import { ADAPTER_TYPES, AGENT_STATUSES, DEVICE_TYPES } from "../constants.js";

export const createAgentSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  role: z.string().optional().default("general"),
  title: z.string().optional(),
  icon: z.string().optional(),
  reportsTo: z.string().uuid().optional(),
  capabilities: z.string().optional(),
  adapterType: z.enum(ADAPTER_TYPES).optional().default("process"),
  adapterConfig: z.record(z.unknown()).optional().default({}),
  runtimeConfig: z.record(z.unknown()).optional().default({}),
  budgetMonthlyCents: z.number().int().min(0).optional().default(0),
  permissions: z.record(z.unknown()).optional().default({}),
  deviceType: z.enum(DEVICE_TYPES).optional(),
  deviceMeta: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.string().optional(),
  title: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  status: z.enum(AGENT_STATUSES).optional(),
  reportsTo: z.string().uuid().nullable().optional(),
  capabilities: z.string().optional(),
  adapterType: z.enum(ADAPTER_TYPES).optional(),
  adapterConfig: z.record(z.unknown()).optional(),
  runtimeConfig: z.record(z.unknown()).optional(),
  budgetMonthlyCents: z.number().int().min(0).optional(),
  permissions: z.record(z.unknown()).optional(),
  deviceType: z.enum(DEVICE_TYPES).nullable().optional(),
  deviceMeta: z.record(z.unknown()).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
