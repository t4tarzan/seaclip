import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useAgents } from "../api/agents";
import { useCompanyContext } from "../context/CompanyContext";
import { StatusBadge } from "../components/StatusBadge";
import { NewAgentDialog } from "../components/NewAgentDialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { SkeletonTable } from "../components/ui/skeleton";
import { formatCents, timeAgo } from "../lib/utils";
import type { AgentStatus, AdapterType } from "../lib/types";
import { cn } from "../lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const ADAPTER_LABELS: Record<AdapterType, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
  ollama: "Ollama",
  custom: "Custom",
};

export default function Agents() {
  const { companyId } = useCompanyContext();
  const { data: agents = [], isLoading, isFetching } = useAgents(companyId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "all">("all");
  const [adapterFilter, setAdapterFilter] = useState<AdapterType | "all">("all");

  const filtered = agents.filter((a) => {
    const matchesSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesAdapter = adapterFilter === "all" || a.adapterType === adapterFilter;
    return matchesSearch && matchesStatus && matchesAdapter;
  });

  return (
    <div className="p-6 flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold text-[#f9fafb]">Agents</h2>
          <p className="text-[12px] text-[#6b7280] mt-0.5">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />}
            onClick={() => qc.invalidateQueries({ queryKey: ["agents", companyId] })}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={12} />}
            onClick={() => setShowNewDialog(true)}
          >
            New Agent
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-60">
          <Input
            icon={<Search size={12} />}
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(["all", "running", "idle", "error", "offline", "paused"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors",
                statusFilter === s
                  ? "bg-[#20808D]/20 text-[#06b6d4] border border-[#20808D]/30"
                  : "text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[#1f2937] border border-transparent"
              )}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] text-[#6b7280] uppercase tracking-wide">Adapter:</span>
          {(["all", "openai", "anthropic", "gemini", "ollama", "custom"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAdapterFilter(a)}
              className={cn(
                "px-2 py-1 text-[10px] rounded font-medium transition-colors",
                adapterFilter === a
                  ? "bg-[#374151] text-[#f9fafb]"
                  : "text-[#6b7280] hover:text-[#9ca3af]"
              )}
            >
              {a === "all" ? "All" : ADAPTER_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1f2937] border border-[#374151] rounded-xl overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#374151] flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-[#9ca3af]">
              {search || statusFilter !== "all" ? "No agents match your filters" : "No agents yet"}
            </p>
            <p className="text-[11px] text-[#6b7280] mt-1">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first agent to get started"}
            </p>
            {!search && statusFilter === "all" && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setShowNewDialog(true)}
              >
                Create Agent
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Adapter</th>
                  <th>Status</th>
                  <th>Budget</th>
                  <th>Last Heartbeat</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((agent) => (
                  <tr
                    key={agent.id}
                    onClick={() => navigate(`/agents/${agent.id}`)}
                    className="cursor-pointer hover:bg-[#263244] transition-colors"
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#20808D]/15 border border-[#20808D]/25 flex items-center justify-center text-[#20808D] text-[10px] font-bold flex-shrink-0">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold text-[#f9fafb]">{agent.name}</p>
                          {agent.title && (
                            <p className="text-[10px] text-[#6b7280] truncate max-w-[180px]">
                              {agent.title}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-[11px] bg-[#374151] text-[#9ca3af] px-2 py-0.5 rounded font-medium">
                        {agent.role}
                      </span>
                    </td>
                    <td>
                      <span className="text-[11px] text-[#9ca3af]">
                        {ADAPTER_LABELS[agent.adapterType]}
                      </span>
                    </td>
                    <td>
                      <StatusBadge type="agent" value={agent.status} />
                    </td>
                    <td>
                      <div>
                        <p className="text-[12px] text-[#f9fafb]">
                          {formatCents(agent.spentCents)}
                          <span className="text-[#6b7280]"> / {formatCents(agent.budgetCents)}</span>
                        </p>
                        <div className="h-1 w-16 bg-[#374151] rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-[#20808D] rounded-full"
                            style={{
                              width: `${agent.budgetCents > 0 ? Math.min(100, (agent.spentCents / agent.budgetCents) * 100) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-[11px] text-[#9ca3af]">
                        {agent.lastHeartbeatAt ? timeAgo(agent.lastHeartbeatAt) : "Never"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewAgentDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </div>
  );
}
