import { randomUUID } from "node:crypto";
import { notFound } from "../errors.js";

export interface Goal {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  status: "draft" | "active" | "achieved" | "abandoned";
  targetDate?: string;
  projectId?: string;
  parentGoalId?: string;
  metricType: "boolean" | "numeric" | "percentage";
  metricTarget?: number;
  metricCurrent: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  status?: Goal["status"];
  targetDate?: string;
  projectId?: string;
  parentGoalId?: string;
  metricType?: Goal["metricType"];
  metricTarget?: number;
  metricCurrent?: number;
  metadata?: Record<string, unknown>;
}

const store = new Map<string, Goal>();

export async function listGoals(companyId: string): Promise<Goal[]> {
  return Array.from(store.values())
    .filter((g) => g.companyId === companyId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createGoal(
  companyId: string,
  input: CreateGoalInput,
): Promise<Goal> {
  const now = new Date().toISOString();
  const goal: Goal = {
    id: randomUUID(),
    companyId,
    title: input.title,
    description: input.description,
    status: input.status ?? "draft",
    targetDate: input.targetDate,
    projectId: input.projectId,
    parentGoalId: input.parentGoalId,
    metricType: input.metricType ?? "boolean",
    metricTarget: input.metricTarget,
    metricCurrent: input.metricCurrent ?? 0,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };
  store.set(goal.id, goal);
  return goal;
}

export async function getGoal(companyId: string, id: string): Promise<Goal> {
  const goal = store.get(id);
  if (!goal || goal.companyId !== companyId) {
    throw notFound(`Goal "${id}" not found`);
  }
  return goal;
}

export async function updateGoal(
  companyId: string,
  id: string,
  input: Partial<CreateGoalInput>,
): Promise<Goal> {
  const goal = await getGoal(companyId, id);
  const updated: Goal = {
    ...goal,
    ...input,
    metadata: input.metadata !== undefined
      ? { ...goal.metadata, ...input.metadata }
      : goal.metadata,
    updatedAt: new Date().toISOString(),
  };
  store.set(id, updated);
  return updated;
}

export async function deleteGoal(companyId: string, id: string): Promise<void> {
  await getGoal(companyId, id);
  store.delete(id);
}
