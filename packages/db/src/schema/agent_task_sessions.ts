import {
  pgTable,
  uuid,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { issues } from "./issues.js";

export const agentTaskSessions = pgTable(
  "agent_task_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    sessionParams: jsonb("session_params").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("agent_task_sessions_agent_issue_unique").on(table.agentId, table.issueId)]
);
