import { z } from "zod";
import { ISSUE_STATUSES, PRIORITIES } from "../constants.js";

export const createIssueSchema = z.object({
  companyId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  title: z.string().min(1).max(1000),
  description: z.string().optional(),
  status: z.enum(ISSUE_STATUSES).optional().default("backlog"),
  priority: z.enum(PRIORITIES).optional().default("medium"),
  assigneeAgentId: z.string().uuid().optional(),
  assigneeUserId: z.string().optional(),
  createdByAgentId: z.string().uuid().optional(),
  createdByUserId: z.string().optional(),
  billingCode: z.string().optional(),
});

export const updateIssueSchema = z.object({
  title: z.string().min(1).max(1000).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeAgentId: z.string().uuid().nullable().optional(),
  assigneeUserId: z.string().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  billingCode: z.string().nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  cancelledAt: z.string().datetime().nullable().optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
