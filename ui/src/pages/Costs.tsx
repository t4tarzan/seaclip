import React from "react";
import { useCompanyContext } from "../context/CompanyContext";
import { useCosts } from "../api/costs";
import { MetricCard } from "../components/MetricCard";
import { SkeletonCard, SkeletonTable } from "../components/ui/skeleton";
import { formatCents } from "../lib/utils";
import { DollarSign, TrendingUp, Zap, BarChart2 } from "lucide-react";
import { cn } from "../lib/utils";

function DailySpendChart({ data }: { data: { date: string; totalCents: number }[] }) {
  const max = Math.max(...data.map((d) => d.totalCents), 1);
  const recent = data.slice(-30);

  return (
    <div className="flex items-end gap-1 h-24">
      {recent.map((day) => {
        const height = Math.max(2, (day.totalCents / max) * 100);
        const date = new Date(day.date);
        const isToday =
          date.toDateString() === new Date().toDateString();
        return (
          <div
            key={day.date}
            className="group relative flex-1 flex flex-col items-center"
            title={`${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${formatCents(day.totalCents)}`}
          >
            <div
              className={cn(
                "w-full rounded-sm transition-all duration-200 group-hover:opacity-100",
                isToday ? "bg-[#06b6d4]" : "bg-[#20808D]/60"
              )}
              style={{ height: `${height}%` }}
            />
            {/* Tooltip */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1f2937] border border-[#374151] rounded px-1.5 py-0.5 text-[9px] text-[#f9fafb] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
              {formatCents(day.totalCents)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Costs() {
  const { companyId } = useCompanyContext();
  const { data, isLoading } = useCosts(companyId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonCard />
        <SkeletonTable />
      </div>
    );
  }

  const totalCents = data?.totalCents ?? 0;
  const agents = data?.byAgent ?? [];
  const dailyData = data?.byDay ?? [];
  const avgDaily =
    dailyData.length > 0
      ? dailyData.reduce((s, d) => s + d.totalCents, 0) / dailyData.length
      : 0;

  return (
    <div className="p-6 flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-[18px] font-bold text-[#f9fafb]">Cost Tracking</h2>
        <p className="text-[12px] text-[#6b7280] mt-0.5">
          {data?.periodStartDate && data?.periodEndDate
            ? `${new Date(data.periodStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${new Date(data.periodEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
            : "Current billing period"}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Spend"
          value={formatCents(totalCents)}
          description="This billing period"
          icon={<DollarSign />}
          accent="success"
        />
        <MetricCard
          label="Avg Daily Spend"
          value={formatCents(avgDaily)}
          description="Over last 30 days"
          icon={<TrendingUp />}
          accent="primary"
        />
        <MetricCard
          label="Total Runs"
          value={agents.reduce((s, a) => s + a.runCount, 0).toLocaleString()}
          description="Across all agents"
          icon={<Zap />}
          accent="info"
        />
      </div>

      {/* Daily spend chart */}
      {dailyData.length > 0 && (
        <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={14} className="text-[#20808D]" />
              <h3 className="text-[13px] font-semibold text-[#f9fafb]">Daily Spend</h3>
            </div>
            <span className="text-[11px] text-[#6b7280]">Last 30 days</span>
          </div>
          <DailySpendChart data={dailyData} />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-[#6b7280]">
              {dailyData.length > 0
                ? new Date(dailyData[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : ""}
            </span>
            <span className="text-[10px] text-[#6b7280]">Today</span>
          </div>
        </div>
      )}

      {/* Per-agent breakdown */}
      <div className="bg-[#1f2937] border border-[#374151] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#374151]">
          <h3 className="text-[13px] font-semibold text-[#f9fafb]">Per-Agent Breakdown</h3>
        </div>
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign size={24} className="text-[#374151] mb-2" />
            <p className="text-[12px] text-[#6b7280]">No cost data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Runs</th>
                  <th>Input Tokens</th>
                  <th>Output Tokens</th>
                  <th>Total Cost</th>
                  <th>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {agents
                  .sort((a, b) => b.totalCents - a.totalCents)
                  .map((agent) => {
                    const pct =
                      totalCents > 0
                        ? ((agent.totalCents / totalCents) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <tr key={agent.agentId}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-[#20808D]/15 border border-[#20808D]/20 flex items-center justify-center text-[#20808D] text-[9px] font-bold">
                              {agent.agentName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[12px] font-medium text-[#f9fafb]">
                              {agent.agentName}
                            </span>
                          </div>
                        </td>
                        <td className="font-mono text-[11px]">
                          {agent.runCount.toLocaleString()}
                        </td>
                        <td className="font-mono text-[11px]">
                          {agent.inputTokens.toLocaleString()}
                        </td>
                        <td className="font-mono text-[11px]">
                          {agent.outputTokens.toLocaleString()}
                        </td>
                        <td>
                          <span className="text-[12px] font-semibold text-[#f9fafb]">
                            {formatCents(agent.totalCents)}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[#374151] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#20808D] rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-[#9ca3af] font-mono w-10 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr className="bg-[#111827]">
                  <td className="px-3 py-3">
                    <span className="text-[11px] font-semibold text-[#f9fafb]">Total</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-[#9ca3af]">
                    {agents.reduce((s, a) => s + a.runCount, 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-[#9ca3af]">
                    {agents.reduce((s, a) => s + a.inputTokens, 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-[#9ca3af]">
                    {agents.reduce((s, a) => s + a.outputTokens, 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[12px] font-bold text-[#06b6d4]">
                      {formatCents(totalCents)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[11px] text-[#9ca3af] font-mono">100%</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
