export interface Hub {
  id: string;
  hubId: string;
  name: string;
  url: string;
  status: "active" | "inactive" | "unreachable";
  lastSyncAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface HubSyncPayload {
  hubId: string;
  name: string;
  url: string;
  agents: Array<{
    id: string;
    name: string;
    role: string;
    status: string;
  }>;
  activeIssueCount: number;
  timestamp: string;
}
