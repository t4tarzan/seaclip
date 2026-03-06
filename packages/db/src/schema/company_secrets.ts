import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const companySecrets = pgTable(
  "company_secrets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("company_secrets_company_key_unique").on(table.companyId, table.key)]
);
