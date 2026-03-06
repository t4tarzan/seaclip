export interface HeartbeatRun {
  id: string;
  companyId: string;
  agentId: string;
  source: string | null;
  triggerDetail: string | null;
  reason: string | null;
  status: string;
  adapterType: string | null;
  issueId: string | null;
  excerpt: string | null;
  costCents: number;
  tokenCount: number;
  sessionParams: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface HeartbeatRunEvent {
  id: string;
  runId: string;
  eventType: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}
