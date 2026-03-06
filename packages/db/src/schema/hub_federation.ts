import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const hubFederation = pgTable("hub_federation", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: text("hub_id").notNull().unique(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  status: text("status").notNull().default("active"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
