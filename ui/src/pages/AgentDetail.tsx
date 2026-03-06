import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Edit2,
  Cpu,
  Clock,
  DollarSign,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useAgent, useAgentRuns, useInvokeAgent, useUpdateAgent } from "../api/agents";
import { useCompanyContext } from "../context/CompanyContext";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { AgentConfigForm } from "../components/AgentConfigForm";
import { SkeletonCard } from "../components/ui/skeleton";
import { formatCents, timeAgo } from "../lib/utils";
import { cn } from "../lib/utils";
import type { Agent, HeartbeatRun } from "../lib/types";

function RunRow({ run }: { run: HeartbeatRun }) {
  const statusIcon = {
    running: <Loader2 size={12} className="text-[#20808D] animate-spin" />,
    completed: <CheckCircle size={12} className="text-[#22c55e]" />,
    failed: <XCircle size={12} className="text-[#ef4444]" />,
  }[run.status];

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#374151]/50 last:border-0">
      <span className="flex-shrink-0">{statusIcon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[11px] font-medium",
              run.status === "completed"
                ? "text-[#22c55e]"
                : run.status === "failed"
                ? "text-[#ef4444]"
                : "text-[#20808D]"
            )}
          >
            {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
          </span>
          <span className="text-[10px] text-[#6b7280]">{timeAgo(run.startedAt)}</span>
        </div>
        {run.result && (
          <p className="text-[10px] text-[#9ca3af] truncate mt-0.5">{run.result}</p>
        )}
        {run.error && (
          <p className="text-[10px] text-[#ef4444] truncate mt-0.5">{run.error}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span className="text-[10px] text-[#9ca3af] font-mono">
          {formatCents(run.costCents)}
        </span>
        <span className="text-[9px] text-[#6b7280]">
          {(run.inputTokens + run.outputTokens).toLocaleString()} tok
        </span>
      </div>
    </div>
  );
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const { companyId } = useCompanyContext();
  const navigate = useNavigate();

  const { data: agent, isLoading } = useAgent(companyId, id);
  const { data: runs = [] } = useAgentRuns(companyId, id);
  const invokeAgent = useInvokeAgent();
  const updateAgent = useUpdateAgent();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [invokePrompt, setInvokePrompt] = useState("");
  const [showInvokeDialog, setShowInvokeDialog] = useState(false);

  const handleInvoke = async () => {
    if (!companyId || !id) return;
    await invokeAgent.mutateAsync({
      companyId,
      id,
      payload: invokePrompt ? { prompt: invokePrompt } : undefined,
    });
    setShowInvokeDialog(false);
    setInvokePrompt("");
  };

  const handleUpdate = async (data: Partial<Agent>) => {
    if (!companyId || !id) return;
    await updateAgent.mutateAsync({ companyId, id, data });
    setShowEditDialog(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonCard className="lg:col-span-2" />
        <SkeletonCard />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-[#6b7280]">Agent not found</p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigate("/agents")}>
          Back to Agents
        </Button>
      </div>
    );
  }

  const activeRun = runs.find((r) => r.status === "running");

  return (
    <div className="p-6 flex flex-col gap-5 animate-fade-in">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={12} />}
          onClick={() => navigate("/agents")}
        >
          Agents
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#20808D]/15 border border-[#20808D]/25 flex items-center justify-center text-[#20808D] text-[14px] font-bold">
            {agent.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-bold text-[#f9fafb]">{agent.name}</h2>
              <StatusBadge type="agent" value={agent.status} />
            </div>
            {agent.title && (
              <p className="text-[12px] text-[#6b7280]">{agent.title}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Edit2 size={12} />}
            onClick={() => setShowEditDialog(true)}
          >
            Edit
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Play size={12} />}
            onClick={() => setShowInvokeDialog(true)}
            loading={invokeAgent.isPending}
          >
            Invoke
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Properties */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Properties Panel */}
          <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
            <h3 className="text-[13px] font-semibold text-[#f9fafb] mb-4">Properties</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Role", value: agent.role },
                { label: "Adapter", value: agent.adapterType.toUpperCase() },
                {
                  label: "Last Heartbeat",
                  value: agent.lastHeartbeatAt ? timeAgo(agent.lastHeartbeatAt) : "Never",
                },
                { label: "Device", value: agent.deviceId ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wide">
                    {label}
                  </span>
                  <span className="text-[12px] text-[#f9fafb]">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-[#f9fafb]">Budget</h3>
              <span className="text-[11px] text-[#9ca3af]">
                {formatCents(agent.spentCents)} / {formatCents(agent.budgetCents)}
              </span>
            </div>
            <div className="h-2 bg-[#111827] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${agent.budgetCents > 0 ? Math.min(100, (agent.spentCents / agent.budgetCents) * 100) : 0}%`,
                  backgroundColor:
                    agent.spentCents / agent.budgetCents > 0.9
                      ? "#ef4444"
                      : agent.spentCents / agent.budgetCents > 0.7
                      ? "#eab308"
                      : "#20808D",
                }}
              />
            </div>
            <p className="text-[10px] text-[#6b7280] mt-1.5">
              {agent.budgetCents > 0
                ? `${((agent.spentCents / agent.budgetCents) * 100).toFixed(1)}% used this period`
                : "No budget limit set"}
            </p>
          </div>

          {/* Config */}
          {Object.keys(agent.config).length > 0 && (
            <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
              <h3 className="text-[13px] font-semibold text-[#f9fafb] mb-3">Configuration</h3>
              <pre className="text-[11px] text-[#9ca3af] overflow-x-auto leading-relaxed">
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(agent.config).map(([k, v]) => [
                      k,
                      k.toLowerCase().includes("key") ? "••••••••" : v,
                    ])
                  ),
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>

        {/* Right: Runs */}
        <div className="flex flex-col gap-4">
          {/* Live run */}
          {activeRun && (
            <div className="bg-[#20808D]/10 border border-[#20808D]/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 size={14} className="text-[#20808D] animate-spin" />
                <h3 className="text-[13px] font-semibold text-[#06b6d4]">Running Now</h3>
              </div>
              <p className="text-[11px] text-[#9ca3af]">
                Started {timeAgo(activeRun.startedAt)}
              </p>
            </div>
          )}

          {/* Recent Runs */}
          <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={13} className="text-[#6b7280]" />
              <h3 className="text-[13px] font-semibold text-[#f9fafb]">
                Recent Runs
                {runs.length > 0 && (
                  <span className="ml-1.5 text-[11px] text-[#6b7280] font-normal">
                    {runs.length}
                  </span>
                )}
              </h3>
            </div>
            {runs.length === 0 ? (
              <div className="text-center py-8 text-[12px] text-[#6b7280]">
                No runs yet
              </div>
            ) : (
              <div className="flex flex-col max-h-80 overflow-y-auto">
                {runs.slice(0, 20).map((run) => (
                  <RunRow key={run.id} run={run} />
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Total Cost",
                value: formatCents(runs.reduce((s, r) => s + r.costCents, 0)),
                icon: <DollarSign size={13} />,
              },
              {
                label: "Total Runs",
                value: runs.length,
                icon: <Zap size={13} />,
              },
            ].map(({ label, value, icon }) => (
              <div
                key={label}
                className="bg-[#111827] border border-[#374151] rounded-xl p-3 flex flex-col gap-1"
              >
                <span className="text-[#6b7280] w-4 h-4">{icon}</span>
                <span className="text-[16px] font-bold text-[#f9fafb]">{value}</span>
                <span className="text-[10px] text-[#6b7280]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Edit Agent: {agent.name}</DialogTitle>
          </DialogHeader>
          <AgentConfigForm
            initial={agent}
            onSubmit={handleUpdate}
            onCancel={() => setShowEditDialog(false)}
            loading={updateAgent.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Invoke Dialog */}
      <Dialog open={showInvokeDialog} onOpenChange={setShowInvokeDialog}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Invoke Agent: {agent.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-[#9ca3af]">
              Manually trigger this agent. Optionally provide a prompt or payload.
            </p>
            <textarea
              value={invokePrompt}
              onChange={(e) => setInvokePrompt(e.target.value)}
              placeholder="Optional: provide a prompt or instructions..."
              className="w-full bg-[#111827] border border-[#374151] rounded-lg p-3 text-[12px] text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:border-[#20808D] min-h-[100px] resize-y"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowInvokeDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleInvoke}
                loading={invokeAgent.isPending}
                icon={<Play size={12} />}
              >
                Invoke
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
