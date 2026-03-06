/**
 * agents service — CRUD + agent lifecycle management.
 */
import { randomUUID } from "node:crypto";
import { notFound, conflict } from "../errors.js";

export type AgentStatus = "active" | "paused" | "error" | "terminated" | "idle";

export interface Agent {
  id: string;
  companyId: string;
  name: string;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  model?: string;
  systemPrompt?: string;
  heartbeatCron?: string;
  heartbeatEnabled: boolean;
  maxConcurrentRuns: number;
  timeoutMs: number;
  status: AgentStatus;
  tags: string[];
  metadata: Record<string, unknown>;
  lastHeartbeatAt?: string;
  lastRunAt?: string;
  totalRuns: number;
  totalCostUsd: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentInput {
  name: string;
  adapterType: string;
  adapterConfig?: Record<string, unknown>;
  model?: string;
  systemPrompt?: string;
  heartbeatCron?: string;
  heartbeatEnabled?: boolean;
  maxConcurrentRuns?: number;
  timeoutMs?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateAgentInput extends Partial<CreateAgentInput> {
  status?: AgentStatus;
}

// In-memory store (replace with Drizzle ORM)
const store = new Map<string, Agent>();

function agentsForCompany(companyId: string): Agent[] {
  return Array.from(store.values()).filter((a) => a.companyId === companyId);
}

export async function listAgents(companyId: string): Promise<Agent[]> {
  return agentsForCompany(companyId).sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt),
  );
}

export async function createAgent(
  companyId: string,
  input: CreateAgentInput,
): Promise<Agent> {
  // Ensure name is unique within company
  const existing = agentsForCompany(companyId).find((a) => a.name === input.name);
  if (existing) {
    throw conflict(`Agent with name "${input.name}" already exists in this company`);
  }

  const now = new Date().toISOString();
  const agent: Agent = {
    id: randomUUID(),
    companyId,
    name: input.name,
    adapterType: input.adapterType,
    adapterConfig: input.adapterConfig ?? {},
    model: input.model,
    systemPrompt: input.systemPrompt,
    heartbeatCron: input.heartbeatCron,
    heartbeatEnabled: input.heartbeatEnabled ?? true,
    maxConcurrentRuns: input.maxConcurrentRuns ?? 1,
    timeoutMs: input.timeoutMs ?? 60_000,
    status: "idle",
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
    totalRuns: 0,
    totalCostUsd: 0,
    createdAt: now,
    updatedAt: now,
  };

  store.set(agent.id, agent);
  return agent;
}

export async function getAgent(companyId: string, id: string): Promise<Agent> {
  const agent = store.get(id);
  if (!agent || agent.companyId !== companyId) {
    throw notFound(`Agent "${id}" not found in company "${companyId}"`);
  }
  return agent;
}

export async function updateAgent(
  companyId: string,
  id: string,
  input: UpdateAgentInput,
): Promise<Agent> {
  const agent = await getAgent(companyId, id);

  if (input.name && input.name !== agent.name) {
    const existing = agentsForCompany(companyId).find(
      (a) => a.id !== id && a.name === input.name,
    );
    if (existing) {
      throw conflict(`Agent with name "${input.name}" already exists in this company`);
    }
  }

  const updated: Agent = {
    ...agent,
    ...input,
    adapterConfig: input.adapterConfig !== undefined
      ? { ...agent.adapterConfig, ...input.adapterConfig }
      : agent.adapterConfig,
    metadata: input.metadata !== undefined
      ? { ...agent.metadata, ...input.metadata }
      : agent.metadata,
    updatedAt: new Date().toISOString(),
  };

  store.set(id, updated);
  return updated;
}

export async function deleteAgent(companyId: string, id: string): Promise<void> {
  await getAgent(companyId, id);
  store.delete(id);
}

export async function setAgentStatus(
  companyId: string,
  id: string,
  status: AgentStatus,
): Promise<Agent> {
  return updateAgent(companyId, id, { status });
}

export async function pauseAgent(companyId: string, id: string): Promise<Agent> {
  return setAgentStatus(companyId, id, "paused");
}

export async function resumeAgent(companyId: string, id: string): Promise<Agent> {
  return setAgentStatus(companyId, id, "idle");
}

export async function terminateAgent(companyId: string, id: string): Promise<Agent> {
  return setAgentStatus(companyId, id, "terminated");
}

export async function recordHeartbeat(
  id: string,
  costUsd: number,
): Promise<void> {
  const agent = store.get(id);
  if (!agent) return;
  const now = new Date().toISOString();
  store.set(id, {
    ...agent,
    lastHeartbeatAt: now,
    lastRunAt: now,
    totalRuns: agent.totalRuns + 1,
    totalCostUsd: agent.totalCostUsd + costUsd,
    status: "idle",
    updatedAt: now,
  });
}
