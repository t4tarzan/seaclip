/**
 * dashboard service — aggregated dashboard queries.
 */
import * as agentsService from "./agents.js";
import * as issuesService from "./issues.js";
import * as costsService from "./costs.js";
import * as activityLogService from "./activity-log.js";
import * as edgeDevicesService from "./edge-devices.js";

export interface DashboardData {
  agentCounts: {
    total: number;
    active: number;
    idle: number;
    paused: number;
    error: number;
    terminated: number;
  };
  issueCounts: {
    total: number;
    open: number;
    in_progress: number;
    blocked: number;
    done: number;
    cancelled: number;
  };
  costs: {
    last30DaysTotalUsd: number;
    todayTotalUsd: number;
  };
  edgeDeviceCount: number;
  onlineDeviceCount: number;
  recentActivity: Awaited<ReturnType<typeof activityLogService.getActivityLog>>["data"];
  generatedAt: string;
}

export async function getDashboard(companyId: string): Promise<DashboardData> {
  const [agents, issueResult, costSummary, todayCostSummary, devices, activity] =
    await Promise.all([
      agentsService.listAgents(companyId),
      issuesService.listIssues(companyId, { page: 1, limit: 1000 }),
      costsService.getCostSummary(companyId, {}),
      costsService.getCostSummary(companyId, {
        from: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      }),
      edgeDevicesService.listEdgeDevices(companyId),
      activityLogService.getActivityLog(companyId, { page: 1, limit: 10 }),
    ]);

  const issues = issueResult.data;

  const agentCounts = {
    total: agents.length,
    active: agents.filter((a) => a.status === "active").length,
    idle: agents.filter((a) => a.status === "idle").length,
    paused: agents.filter((a) => a.status === "paused").length,
    error: agents.filter((a) => a.status === "error").length,
    terminated: agents.filter((a) => a.status === "terminated").length,
  };

  const issueCounts = {
    total: issues.length,
    open: issues.filter((i) => i.status === "open").length,
    in_progress: issues.filter((i) => i.status === "in_progress").length,
    blocked: issues.filter((i) => i.status === "blocked").length,
    done: issues.filter((i) => i.status === "done").length,
    cancelled: issues.filter((i) => i.status === "cancelled").length,
  };

  const onlineDeviceCount = devices.filter(
    (d) => (d as unknown as { status: string }).status === "online",
  ).length;

  return {
    agentCounts,
    issueCounts,
    costs: {
      last30DaysTotalUsd: costSummary.totalCostUsd,
      todayTotalUsd: todayCostSummary.totalCostUsd,
    },
    edgeDeviceCount: devices.length,
    onlineDeviceCount,
    recentActivity: activity.data,
    generatedAt: new Date().toISOString(),
  };
}
