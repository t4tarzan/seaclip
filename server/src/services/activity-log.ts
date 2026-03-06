/**
 * activity-log service — insert activity entries, query with pagination.
 */
import { randomUUID } from "node:crypto";

export interface ActivityEntry {
  id: string;
  companyId: string;
  eventType: string;
  agentId?: string;
  issueId?: string;
  projectId?: string;
  actorId?: string;
  actorType: "human" | "agent" | "system";
  summary: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface GetActivityLogOptions {
  page: number;
  limit: number;
  agentId?: string;
  issueId?: string;
  eventType?: string;
  from?: string;
  to?: string;
}

export interface ActivityLogPage {
  data: ActivityEntry[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}

// In-memory store (replace with DB activity_log table)
const logStore: ActivityEntry[] = [];

export async function insertActivity(
  entry: Omit<ActivityEntry, "id" | "occurredAt">,
): Promise<ActivityEntry> {
  const record: ActivityEntry = {
    id: randomUUID(),
    ...entry,
    occurredAt: new Date().toISOString(),
  };
  logStore.push(record);
  return record;
}

export async function getActivityLog(
  companyId: string,
  options: GetActivityLogOptions,
): Promise<ActivityLogPage> {
  let entries = logStore.filter((e) => e.companyId === companyId);

  if (options.agentId) {
    entries = entries.filter((e) => e.agentId === options.agentId);
  }
  if (options.issueId) {
    entries = entries.filter((e) => e.issueId === options.issueId);
  }
  if (options.eventType) {
    entries = entries.filter((e) => e.eventType === options.eventType);
  }
  if (options.from) {
    const from = new Date(options.from);
    entries = entries.filter((e) => new Date(e.occurredAt) >= from);
  }
  if (options.to) {
    const to = new Date(options.to);
    entries = entries.filter((e) => new Date(e.occurredAt) <= to);
  }

  // Most recent first
  entries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const total = entries.length;
  const offset = (options.page - 1) * options.limit;
  const data = entries.slice(offset, offset + options.limit);

  return {
    data,
    total,
    page: options.page,
    limit: options.limit,
    hasNextPage: offset + data.length < total,
  };
}
