import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";

export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  requestedByAgentId: uuid("requested_by_agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  requestPayload: jsonb("request_payload"),
  resolution: text("resolution"),
  resolvedByUserId: text("resolved_by_user_id"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
