/**
 * issues service — CRUD + atomic checkout + comment management.
 */
import { randomUUID } from "node:crypto";
import { notFound, conflict } from "../errors.js";

export type IssueStatus = "open" | "in_progress" | "blocked" | "done" | "cancelled";
export type IssuePriority = "critical" | "high" | "medium" | "low";

export interface Issue {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  assignedAgentId?: string;
  checkedOutByAgentId?: string;
  checkedOutAt?: string;
  projectId?: string;
  goalId?: string;
  labels: string[];
  metadata: Record<string, unknown>;
  dueAt?: string;
  resolvedAt?: string;
  sequenceNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface IssueComment {
  id: string;
  issueId: string;
  companyId: string;
  body: string;
  authorId?: string;
  authorType: "human" | "agent" | "system";
  createdAt: string;
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  assignedAgentId?: string;
  projectId?: string;
  goalId?: string;
  labels?: string[];
  metadata?: Record<string, unknown>;
  dueAt?: string;
}

export interface UpdateIssueInput extends Partial<CreateIssueInput> {}

export interface ListIssuesOptions {
  status?: string;
  priority?: string;
  agentId?: string;
  projectId?: string;
  page: number;
  limit: number;
}

const issueStore = new Map<string, Issue>();
const commentStore = new Map<string, IssueComment>();
const sequenceCounters = new Map<string, number>();

function nextSequenceNumber(companyId: string): number {
  const n = (sequenceCounters.get(companyId) ?? 0) + 1;
  sequenceCounters.set(companyId, n);
  return n;
}

function issuesForCompany(companyId: string): Issue[] {
  return Array.from(issueStore.values()).filter((i) => i.companyId === companyId);
}

export async function listIssues(
  companyId: string,
  options: ListIssuesOptions,
): Promise<{ data: Issue[]; total: number; page: number; limit: number }> {
  let issues = issuesForCompany(companyId);

  if (options.status) issues = issues.filter((i) => i.status === options.status);
  if (options.priority) issues = issues.filter((i) => i.priority === options.priority);
  if (options.agentId) issues = issues.filter((i) => i.assignedAgentId === options.agentId);
  if (options.projectId) issues = issues.filter((i) => i.projectId === options.projectId);

  issues.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = issues.length;
  const offset = (options.page - 1) * options.limit;
  const data = issues.slice(offset, offset + options.limit);

  return { data, total, page: options.page, limit: options.limit };
}

export async function createIssue(
  companyId: string,
  input: CreateIssueInput,
): Promise<Issue> {
  const now = new Date().toISOString();
  const issue: Issue = {
    id: randomUUID(),
    companyId,
    title: input.title,
    description: input.description,
    status: input.status ?? "open",
    priority: input.priority ?? "medium",
    assignedAgentId: input.assignedAgentId,
    projectId: input.projectId,
    goalId: input.goalId,
    labels: input.labels ?? [],
    metadata: input.metadata ?? {},
    dueAt: input.dueAt,
    sequenceNumber: nextSequenceNumber(companyId),
    createdAt: now,
    updatedAt: now,
  };
  issueStore.set(issue.id, issue);
  return issue;
}

export async function getIssue(companyId: string, id: string): Promise<Issue> {
  const issue = issueStore.get(id);
  if (!issue || issue.companyId !== companyId) {
    throw notFound(`Issue "${id}" not found`);
  }
  return issue;
}

export async function updateIssue(
  companyId: string,
  id: string,
  input: UpdateIssueInput,
): Promise<Issue> {
  const issue = await getIssue(companyId, id);
  const now = new Date().toISOString();

  const updated: Issue = {
    ...issue,
    ...input,
    labels: input.labels ?? issue.labels,
    metadata: input.metadata !== undefined
      ? { ...issue.metadata, ...input.metadata }
      : issue.metadata,
    resolvedAt:
      input.status === "done" && issue.status !== "done"
        ? now
        : issue.resolvedAt,
    updatedAt: now,
  };

  issueStore.set(id, updated);
  return updated;
}

export async function deleteIssue(companyId: string, id: string): Promise<void> {
  await getIssue(companyId, id);
  issueStore.delete(id);
  // Remove associated comments
  for (const [cId, c] of commentStore.entries()) {
    if (c.issueId === id) commentStore.delete(cId);
  }
}

/**
 * Atomic checkout — only one agent can hold a given issue at a time.
 * Simulates SELECT FOR UPDATE semantics.
 */
export async function checkoutIssue(
  companyId: string,
  id: string,
  agentId: string,
): Promise<Issue> {
  const issue = await getIssue(companyId, id);

  if (issue.checkedOutByAgentId && issue.checkedOutByAgentId !== agentId) {
    throw conflict(
      `Issue is already checked out by agent "${issue.checkedOutByAgentId}"`,
    );
  }

  if (issue.status === "done" || issue.status === "cancelled") {
    throw conflict(`Cannot check out an issue with status "${issue.status}"`);
  }

  const now = new Date().toISOString();
  const updated: Issue = {
    ...issue,
    checkedOutByAgentId: agentId,
    checkedOutAt: now,
    status: "in_progress",
    updatedAt: now,
  };

  issueStore.set(id, updated);
  return updated;
}

export async function addComment(
  companyId: string,
  issueId: string,
  input: { body: string; authorId?: string; authorType: "human" | "agent" | "system" },
): Promise<IssueComment> {
  await getIssue(companyId, issueId); // verify issue exists

  const comment: IssueComment = {
    id: randomUUID(),
    issueId,
    companyId,
    body: input.body,
    authorId: input.authorId,
    authorType: input.authorType,
    createdAt: new Date().toISOString(),
  };

  commentStore.set(comment.id, comment);
  return comment;
}

export async function listComments(
  companyId: string,
  issueId: string,
): Promise<IssueComment[]> {
  await getIssue(companyId, issueId); // verify issue exists
  return Array.from(commentStore.values())
    .filter((c) => c.issueId === issueId && c.companyId === companyId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
