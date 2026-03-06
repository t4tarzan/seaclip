/**
 * costs service — aggregate cost queries and per-agent breakdown.
 */

export interface CostRecord {
  id: string;
  companyId: string;
  agentId: string;
  agentName?: string;
  runId?: string;
  adapterType: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  model?: string;
  occurredAt: string;
}

export interface CostSummaryOptions {
  from?: string;
  to?: string;
  agentId?: string;
}

export interface CostSummary {
  totalCostUsd: number;
  totalRuns: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  periodFrom: string;
  periodTo: string;
  currency: "USD";
}

export interface AgentCostBreakdown {
  agentId: string;
  agentName?: string;
  adapterType: string;
  totalCostUsd: number;
  totalRuns: number;
  avgCostPerRunUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

// In-memory cost records (replace with Drizzle ORM cost_records table query)
const costRecords: CostRecord[] = [];

export function recordCost(record: Omit<CostRecord, "id">): CostRecord {
  const r: CostRecord = { id: crypto.randomUUID(), ...record };
  costRecords.push(r);
  return r;
}

export async function getCostSummary(
  companyId: string,
  options: CostSummaryOptions,
): Promise<CostSummary> {
  const from = options.from
    ? new Date(options.from)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default: last 30 days
  const to = options.to ? new Date(options.to) : new Date();

  let records = costRecords.filter((r) => {
    if (r.companyId !== companyId) return false;
    const d = new Date(r.occurredAt);
    if (d < from || d > to) return false;
    if (options.agentId && r.agentId !== options.agentId) return false;
    return true;
  });

  const summary: CostSummary = {
    totalCostUsd: records.reduce((s, r) => s + r.costUsd, 0),
    totalRuns: records.length,
    totalInputTokens: records.reduce((s, r) => s + r.inputTokens, 0),
    totalOutputTokens: records.reduce((s, r) => s + r.outputTokens, 0),
    periodFrom: from.toISOString(),
    periodTo: to.toISOString(),
    currency: "USD",
  };

  return summary;
}

export async function getCostsByAgent(
  companyId: string,
  options: { from?: string; to?: string },
): Promise<AgentCostBreakdown[]> {
  const from = options.from
    ? new Date(options.from)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = options.to ? new Date(options.to) : new Date();

  const records = costRecords.filter((r) => {
    if (r.companyId !== companyId) return false;
    const d = new Date(r.occurredAt);
    return d >= from && d <= to;
  });

  const byAgent = new Map<string, AgentCostBreakdown>();

  for (const r of records) {
    const existing = byAgent.get(r.agentId) ?? {
      agentId: r.agentId,
      agentName: r.agentName,
      adapterType: r.adapterType,
      totalCostUsd: 0,
      totalRuns: 0,
      avgCostPerRunUsd: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };

    existing.totalCostUsd += r.costUsd;
    existing.totalRuns += 1;
    existing.totalInputTokens += r.inputTokens;
    existing.totalOutputTokens += r.outputTokens;

    byAgent.set(r.agentId, existing);
  }

  // Calculate averages
  for (const breakdown of byAgent.values()) {
    breakdown.avgCostPerRunUsd =
      breakdown.totalRuns > 0 ? breakdown.totalCostUsd / breakdown.totalRuns : 0;
  }

  return Array.from(byAgent.values()).sort(
    (a, b) => b.totalCostUsd - a.totalCostUsd,
  );
}
