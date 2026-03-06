import type { IssueStatus, Priority } from "../constants.js";

export interface Issue {
  id: string;
  companyId: string;
  projectId: string | null;
  goalId: string | null;
  parentId: string | null;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: Priority;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
  checkoutRunId: string | null;
  executionRunId: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  issueNumber: number;
  identifier: string;
  requestDepth: number;
  billingCode: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueCreate {
  companyId: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
  title: string;
  description?: string;
  status?: IssueStatus;
  priority?: Priority;
  assigneeAgentId?: string;
  assigneeUserId?: string;
  createdByAgentId?: string;
  createdByUserId?: string;
  billingCode?: string;
}

export interface IssueUpdate {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: Priority;
  assigneeAgentId?: string | null;
  assigneeUserId?: string | null;
  projectId?: string | null;
  goalId?: string | null;
  parentId?: string | null;
  billingCode?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
}
