export type LiveEventType =
  | "agent.status_changed"
  | "agent.heartbeat"
  | "issue.created"
  | "issue.updated"
  | "issue.status_changed"
  | "issue.assigned"
  | "run.started"
  | "run.completed"
  | "run.stdout"
  | "run.event"
  | "approval.requested"
  | "approval.resolved"
  | "cost.event"
  | "edge.device_ping"
  | "edge.device_status_changed"
  | "hub.synced"
  | "system.notification";

export interface LiveEvent<T = unknown> {
  id: string;
  type: LiveEventType;
  companyId: string;
  payload: T;
  timestamp: string;
}
