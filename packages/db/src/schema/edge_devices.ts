import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";

export const edgeDevices = pgTable(
  "edge_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    deviceType: text("device_type").notNull(),
    hostname: text("hostname"),
    ipAddress: text("ip_address"),
    tailscaleIp: text("tailscale_ip"),
    status: text("status").notNull().default("offline"),
    cpuUsage: real("cpu_usage"),
    memoryUsageMb: integer("memory_usage_mb"),
    gpuUsagePct: real("gpu_usage_pct"),
    diskUsagePct: real("disk_usage_pct"),
    temperature: real("temperature"),
    lastPingAt: timestamp("last_ping_at", { withTimezone: true }),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    capabilities: jsonb("capabilities"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("edge_devices_company_status_idx").on(table.companyId, table.status)]
);
