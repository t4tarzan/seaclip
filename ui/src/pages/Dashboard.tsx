import React from "react";
import { useNavigate } from "react-router-dom";
import { Bot, CircleDot, DollarSign, Network, Activity } from "lucide-react";
import { useCompanyContext } from "../context/CompanyContext";
import { useDashboard } from "../api/dashboard";
import { MetricCard } from "../components/MetricCard";
import { ActivityRow } from "../components/ActivityRow";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonCard, SkeletonTable } from "../components/ui/skeleton";
import { formatCents } from "../lib/utils";
import type { DeviceStatus } from "../lib/types";
import { cn } from "../lib/utils";

const STATUS_DOT: Record<DeviceStatus, string> = {
  online: "bg-[#22c55e]",
  offline: "bg-[#6b7280]",
  degraded: "bg-[#eab308]",
};

function AgentStatusChart({
  counts,
}: {
  counts: { total: number; idle: number; running: number; error: number; offline: number };
}) {
  const { total, idle, running, error, offline } = counts;
  const bars = [
    { label: "Running", value: running, color: "#20808D", max: total },
    { label: "Idle", value: idle, color: "#06b6d4", max: total },
    { label: "Error", value: error, color: "#ef4444", max: total },
    { label: "Offline", value: offline, color: "#374151", max: total },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      {bars.map((bar) => (
        <div key={bar.label} className="flex items-center gap-3">
          <span className="text-[11px] text-[#9ca3af] w-12 flex-shrink-0">{bar.label}</span>
          <div className="flex-1 h-2 bg-[#111827] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: bar.max > 0 ? `${(bar.value / bar.max) * 100}%` : "0%",
                backgroundColor: bar.color,
              }}
            />
          </div>
          <span className="text-[11px] font-mono text-[#f9fafb] w-4 text-right flex-shrink-0">
            {bar.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { companyId } = useCompanyContext();
  const { data, isLoading } = useDashboard(companyId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SkeletonCard className="lg:col-span-2" />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const agentCounts = data?.agentCounts ?? {
    total: 0, idle: 0, running: 0, error: 0, offline: 0,
  };

  return (
    <div className="p-6 flex flex-col gap-6 animate-fade-in">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Agents"
          value={agentCounts.total}
          description={`${agentCounts.running} running · ${agentCounts.idle} idle · ${agentCounts.error} errors`}
          icon={<Bot />}
          accent="primary"
          onClick={() => navigate("/agents")}
        />
        <MetricCard
          label="Active Issues"
          value={data?.activeIssues ?? 0}
          description="Issues in progress or review"
          icon={<CircleDot />}
          accent="warning"
          onClick={() => navigate("/issues")}
        />
        <MetricCard
          label="Monthly Spend"
          value={formatCents(data?.monthlySpendCents ?? 0)}
          description="Current billing period"
          icon={<DollarSign />}
          accent="success"
          onClick={() => navigate("/costs")}
        />
        <MetricCard
          label="Edge Devices Online"
          value={data?.edgeDevicesOnline ?? 0}
          description="Devices in edge mesh"
          icon={<Network />}
          accent="info"
          onClick={() => navigate("/edge-mesh")}
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agent Status */}
        <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold text-[#f9fafb]">Agent Status</h3>
            <button
              onClick={() => navigate("/agents")}
              className="text-[11px] text-[#20808D] hover:text-[#06b6d4] transition-colors"
            >
              View all →
            </button>
          </div>
          <AgentStatusChart counts={agentCounts} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { status: "running", count: agentCounts.running, label: "Running" },
              { status: "idle", count: agentCounts.idle, label: "Idle" },
              { status: "error", count: agentCounts.error, label: "Error" },
              { status: "offline", count: agentCounts.offline, label: "Offline" },
            ].map((s) => (
              <div
                key={s.status}
                className="bg-[#111827] rounded-lg p-2.5 flex flex-col gap-0.5"
              >
                <span className="text-[18px] font-bold text-[#f9fafb]">{s.count}</span>
                <StatusBadge type="agent" value={s.status as any} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-[#1f2937] border border-[#374151] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold text-[#f9fafb]">Recent Activity</h3>
            <button
              onClick={() => navigate("/activity")}
              className="text-[11px] text-[#20808D] hover:text-[#06b6d4] transition-colors"
            >
              View all →
            </button>
          </div>
          {!data?.recentActivity || data.recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Activity size={24} className="text-[#374151] mb-3" />
              <p className="text-[12px] text-[#6b7280]">No activity yet</p>
              <p className="text-[11px] text-[#4b5563] mt-0.5">
                Events will appear here as agents work
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[#1f2937]/50">
              {data.recentActivity.slice(0, 8).map((event) => (
                <ActivityRow key={event.id} event={event} compact />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edge Mesh Mini-Map */}
      <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[13px] font-semibold text-[#f9fafb]">Edge Mesh</h3>
            <p className="text-[11px] text-[#6b7280] mt-0.5">
              {data?.edgeMiniMap.filter((d) => d.status === "online").length ?? 0} online ·{" "}
              {data?.edgeMiniMap.filter((d) => d.status === "offline").length ?? 0} offline
            </p>
          </div>
          <button
            onClick={() => navigate("/edge-mesh")}
            className="text-[11px] text-[#20808D] hover:text-[#06b6d4] transition-colors"
          >
            Open mesh →
          </button>
        </div>

        {!data?.edgeMiniMap || data.edgeMiniMap.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Network size={28} className="text-[#374151] mb-3" />
            <p className="text-[12px] text-[#6b7280]">No edge devices registered</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {data.edgeMiniMap.map((device) => (
              <div
                key={device.id}
                className="flex items-center gap-2 bg-[#111827] rounded-lg px-3 py-2 cursor-pointer hover:bg-[#263244] transition-colors"
                onClick={() => navigate("/edge-mesh")}
                title={`${device.name} — ${device.status}`}
              >
                <div className="relative">
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full flex-shrink-0",
                      STATUS_DOT[device.status as DeviceStatus]
                    )}
                  />
                  {device.status === "online" && (
                    <span
                      className={cn(
                        "absolute inset-0 rounded-full animate-ping opacity-60",
                        STATUS_DOT[device.status]
                      )}
                    />
                  )}
                </div>
                <span className="text-[11px] text-[#d1d5db] font-medium">{device.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
