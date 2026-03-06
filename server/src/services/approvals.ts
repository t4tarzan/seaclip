import { randomUUID } from "node:crypto";
import { notFound, conflict } from "../errors.js";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Approval {
  id: string;
  companyId: string;
  agentId?: string;
  issueId?: string;
  title: string;
  description?: string;
  requestedById?: string;
  resolvedById?: string;
  status: ApprovalStatus;
  decision?: "approved" | "rejected";
  reason?: string;
  requestedAt: string;
  resolvedAt?: string;
  expiresAt?: string;
  metadata: Record<string, unknown>;
}

export interface CreateApprovalInput {
  agentId?: string;
  issueId?: string;
  title: string;
  description?: string;
  requestedById?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ResolveApprovalInput {
  decision: "approved" | "rejected";
  reason?: string;
  resolvedById?: string;
}

export interface ListApprovalsOptions {
  status: string;
  page: number;
  limit: number;
}

const store = new Map<string, Approval>();

export async function createApproval(
  companyId: string,
  input: CreateApprovalInput,
): Promise<Approval> {
  const now = new Date().toISOString();
  const approval: Approval = {
    id: randomUUID(),
    companyId,
    agentId: input.agentId,
    issueId: input.issueId,
    title: input.title,
    description: input.description,
    requestedById: input.requestedById,
    status: "pending",
    requestedAt: now,
    expiresAt: input.expiresAt,
    metadata: input.metadata ?? {},
  };
  store.set(approval.id, approval);
  return approval;
}

export async function listApprovals(
  companyId: string,
  options: ListApprovalsOptions,
): Promise<{ data: Approval[]; total: number; page: number; limit: number }> {
  let approvals = Array.from(store.values()).filter(
    (a) => a.companyId === companyId,
  );

  if (options.status && options.status !== "all") {
    approvals = approvals.filter((a) => a.status === options.status);
  }

  approvals.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  const total = approvals.length;
  const offset = (options.page - 1) * options.limit;
  const data = approvals.slice(offset, offset + options.limit);

  return { data, total, page: options.page, limit: options.limit };
}

export async function resolveApproval(
  companyId: string,
  id: string,
  input: ResolveApprovalInput,
): Promise<Approval> {
  const approval = store.get(id);
  if (!approval || approval.companyId !== companyId) {
    throw notFound(`Approval "${id}" not found`);
  }

  if (approval.status !== "pending") {
    throw conflict(
      `Approval "${id}" is already in status "${approval.status}" and cannot be resolved`,
    );
  }

  // Check expiry
  if (approval.expiresAt && new Date(approval.expiresAt) < new Date()) {
    throw conflict(`Approval "${id}" has expired`);
  }

  const updated: Approval = {
    ...approval,
    status: input.decision,
    decision: input.decision,
    reason: input.reason,
    resolvedById: input.resolvedById,
    resolvedAt: new Date().toISOString(),
  };

  store.set(id, updated);
  return updated;
}

export async function cancelApproval(
  companyId: string,
  id: string,
): Promise<Approval> {
  const approval = store.get(id);
  if (!approval || approval.companyId !== companyId) {
    throw notFound(`Approval "${id}" not found`);
  }
  if (approval.status !== "pending") {
    throw conflict(`Cannot cancel approval in status "${approval.status}"`);
  }
  const updated: Approval = {
    ...approval,
    status: "cancelled",
    resolvedAt: new Date().toISOString(),
  };
  store.set(id, updated);
  return updated;
}
