export interface CostEvent {
  id: string;
  companyId: string;
  agentId: string;
  runId: string | null;
  costCents: number;
  tokenCount: number;
  model: string | null;
  provider: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

export interface CostSummary {
  totalCostCents: number;
  totalTokenCount: number;
  byAgent: Array<{
    agentId: string;
    agentName: string;
    costCents: number;
    tokenCount: number;
  }>;
  byModel: Array<{
    model: string;
    provider: string | null;
    costCents: number;
    tokenCount: number;
  }>;
  periodStart: string;
  periodEnd: string;
}
