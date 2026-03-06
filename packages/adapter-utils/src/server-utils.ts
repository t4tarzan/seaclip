import type { AdapterAgent, AdapterExecutionContext } from "./types.js";

/**
 * Build environment variables to inject into agent sub-processes.
 * Merges agent config, context, and secrets into a flat env map.
 */
export function buildSeaClipEnv(
  agent: AdapterAgent,
  ctx: AdapterExecutionContext
): Record<string, string> {
  const env: Record<string, string> = {
    SEACLIP_AGENT_ID: agent.id,
    SEACLIP_AGENT_NAME: agent.name,
    SEACLIP_COMPANY_ID: agent.companyId,
    SEACLIP_RUN_ID: ctx.runId,
    SEACLIP_WAKE_REASON: ctx.wakeReason,
    SEACLIP_API_URL: ctx.apiUrl,
    SEACLIP_API_KEY: ctx.apiKey,
  };

  if (ctx.issueId) {
    env.SEACLIP_ISSUE_ID = ctx.issueId;
  }

  if (ctx.wakeDetail) {
    env.SEACLIP_WAKE_DETAIL = ctx.wakeDetail;
  }

  if (ctx.sessionParams && Object.keys(ctx.sessionParams).length > 0) {
    env.SEACLIP_SESSION_PARAMS = JSON.stringify(ctx.sessionParams);
  }

  // Inject each secret as SEACLIP_SECRET_<KEY>
  for (const [key, value] of Object.entries(ctx.secrets)) {
    const envKey = `SEACLIP_SECRET_${key.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    env[envKey] = value;
  }

  // Inject adapter config values as SEACLIP_CFG_<KEY>
  for (const [key, value] of Object.entries(agent.adapterConfig)) {
    const envKey = `SEACLIP_CFG_${key.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    env[envKey] = String(value);
  }

  return env;
}

/**
 * Render a template string with {{key}} placeholders replaced by data values.
 * Unknown keys are left as-is.
 */
export function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (match, key: string) => {
    const trimmed = key.trim();
    const parts = trimmed.split(".");
    let value: unknown = data;
    for (const part of parts) {
      if (value != null && typeof value === "object" && part in (value as object)) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return match;
      }
    }
    return value != null ? String(value) : match;
  });
}

/**
 * Safely read a value as a string from an unknown config map.
 * Returns the default if the key is missing or null/undefined.
 */
export function asString(val: unknown, def: string): string {
  if (val === null || val === undefined) return def;
  if (typeof val === "string") return val;
  return String(val);
}

/**
 * Safely read a value as a number from an unknown config map.
 * Returns the default if the value cannot be parsed as a finite number.
 */
export function asNumber(val: unknown, def: number): number {
  if (val === null || val === undefined) return def;
  const n = Number(val);
  return Number.isFinite(n) ? n : def;
}

/**
 * Safely read a value as a boolean from an unknown config map.
 * Accepts: true/false, "true"/"false" (case-insensitive), 1/0.
 * Returns the default for any other value.
 */
export function asBoolean(val: unknown, def: boolean): boolean {
  if (val === null || val === undefined) return def;
  if (typeof val === "boolean") return val;
  if (val === 1) return true;
  if (val === 0) return false;
  if (typeof val === "string") {
    const lower = val.toLowerCase().trim();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
  }
  return def;
}
