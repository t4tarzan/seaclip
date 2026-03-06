import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";

export const heartbeatRuns = pgTable("heartbeat_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  source: text("source"),
  triggerDetail: text("trigger_detail"),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  adapterType: text("adapter_type"),
  issueId: uuid("issue_id"),
  excerpt: text("excerpt"),
  costCents: integer("cost_cents").notNull().default(0),
  tokenCount: integer("token_count").notNull().default(0),
  sessionParams: jsonb("session_params"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
