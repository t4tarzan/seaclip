import {
  pgTable,
  uuid,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { issues } from "./issues.js";
import { agents } from "./agents.js";

export const issueComments = pgTable("issue_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  authorAgentId: uuid("author_agent_id").references(() => agents.id, { onDelete: "set null" }),
  authorUserId: text("author_user_id"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
