import {
  pgTable,
  uuid,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { agents } from "./agents.js";

export const agentRuntimeState = pgTable("agent_runtime_state", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .unique()
    .references(() => agents.id, { onDelete: "cascade" }),
  state: jsonb("state").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
