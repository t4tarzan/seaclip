export interface Approval {
  id: string;
  companyId: string;
  type: string;
  status: "pending" | "approved" | "rejected";
  requestedByAgentId: string;
  requestPayload: Record<string, unknown> | null;
  resolution: string | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface ApprovalCreate {
  companyId: string;
  type: string;
  requestedByAgentId: string;
  requestPayload?: Record<string, unknown>;
}
