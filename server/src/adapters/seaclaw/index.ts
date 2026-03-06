/**
 * SeaClaw edge adapter.
 *
 * Sends heartbeat payload to the SeaClaw C11 binary's HTTP endpoint on the
 * edge device. Reads adapterConfig.deviceEndpoint for the URL. Includes
 * task context in POST body. Captures response. Reports device telemetry
 * from response headers.
 */
import type {
  ServerAdapterModule,
  AdapterExecuteContext,
  AdapterExecuteResult,
  AdapterEnvironmentTestResult,
  AdapterModel,
} from "../types.js";
import { executeHttp } from "../http/execute.js";
import { ingestTelemetry } from "../../services/edge-devices.js";
import { getLogger } from "../../middleware/logger.js";

function parseTelemetryFromHeaders(
  headers: Record<string, string>,
): Record<string, number> {
  const metrics: Record<string, number> = {};

  const mappings: Record<string, string> = {
    "x-seaclaw-cpu": "cpuPercent",
    "x-seaclaw-mem": "memoryPercent",
    "x-seaclaw-disk": "diskPercent",
    "x-seaclaw-gpu": "gpuPercent",
    "x-seaclaw-temp": "temperatureCelsius",
    "x-seaclaw-uptime": "uptimeSeconds",
  };

  for (const [header, metric] of Object.entries(mappings)) {
    const val = headers[header];
    if (val !== undefined) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        metrics[metric] = parsed;
      }
    }
  }

  return metrics;
}

export const seaclawAdapter: ServerAdapterModule = {
  type: "seaclaw",
  label: "SeaClaw C11 Edge",
  description: "Executes tasks on a SeaClaw C11 edge device via its local HTTP API.",

  models: [
    { id: "seaclaw-c11", label: "SeaClaw C11 Edge" },
  ] satisfies AdapterModel[],

  async execute(ctx: AdapterExecuteContext): Promise<AdapterExecuteResult> {
    const deviceEndpoint = ctx.adapterConfig.deviceEndpoint as string | undefined;
    const apiKey = ctx.adapterConfig.apiKey as string | undefined;
    const logger = getLogger();

    if (!deviceEndpoint) {
      throw new Error("seaclawAdapter: adapterConfig.deviceEndpoint is required");
    }

    const heartbeatUrl = `${deviceEndpoint.replace(/\/$/, "")}/heartbeat`;

    const payload = {
      runId: ctx.runId,
      agentId: ctx.agentId,
      companyId: ctx.companyId,
      triggeredBy: ctx.triggeredBy,
      systemPrompt: ctx.systemPrompt,
      model: ctx.model ?? "seaclaw-c11",
      context: ctx.context,
      timestamp: new Date().toISOString(),
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-SeaClaw-Run-Id": ctx.runId,
    };

    if (apiKey) {
      headers["X-SeaClaw-Api-Key"] = apiKey;
    }

    const result = await executeHttp({
      url: heartbeatUrl,
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      timeoutMs: ctx.timeoutMs,
      retries: 1,
    });

    if (result.statusCode >= 400) {
      throw new Error(
        `SeaClaw C11 returned HTTP ${result.statusCode}: ${result.body}`,
      );
    }

    // Extract telemetry from response headers and report to edge-devices service
    const telemetryMetrics = parseTelemetryFromHeaders(result.headers);

    if (Object.keys(telemetryMetrics).length > 0 && ctx.adapterConfig.deviceId) {
      try {
        await ingestTelemetry(ctx.companyId, ctx.adapterConfig.deviceId as string, {
          ...telemetryMetrics,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        logger.warn(
          { err, deviceId: ctx.adapterConfig.deviceId },
          "Failed to ingest SeaClaw telemetry",
        );
      }
    }

    // Parse response
    let output: string | undefined;
    let responseData: Record<string, unknown> = {};

    try {
      responseData = JSON.parse(result.body) as Record<string, unknown>;
      output = typeof responseData.output === "string"
        ? responseData.output
        : result.body;
    } catch {
      output = result.body;
    }

    return {
      output,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0, // Edge execution has no per-token cost
      metadata: {
        deviceEndpoint,
        statusCode: result.statusCode,
        durationMs: result.durationMs,
        telemetry: telemetryMetrics,
        ...responseData,
      },
    };
  },

  async testEnvironment(
    config: Record<string, unknown>,
  ): Promise<AdapterEnvironmentTestResult> {
    const deviceEndpoint = config.deviceEndpoint as string | undefined;
    if (!deviceEndpoint) {
      return { ok: false, message: "adapterConfig.deviceEndpoint is required" };
    }

    const pingUrl = `${deviceEndpoint.replace(/\/$/, "")}/ping`;

    try {
      const result = await executeHttp({
        url: pingUrl,
        method: "GET",
        headers: config.apiKey
          ? { "X-SeaClaw-Api-Key": config.apiKey as string }
          : {},
        timeoutMs: 5000,
        retries: 0,
      });

      if (result.statusCode === 200) {
        let version = "unknown";
        try {
          const parsed = JSON.parse(result.body) as Record<string, unknown>;
          version = (parsed.version as string) ?? "unknown";
        } catch { /* ignore */ }

        return {
          ok: true,
          message: `SeaClaw C11 is responsive (version: ${version})`,
          details: { statusCode: result.statusCode, version, durationMs: result.durationMs },
        };
      }

      return {
        ok: false,
        message: `Device returned HTTP ${result.statusCode}`,
        details: { statusCode: result.statusCode },
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Cannot reach edge device",
      };
    }
  },

  agentConfigurationDoc: `
## SeaClaw Adapter Configuration

| Field          | Type   | Required | Description                                           |
|----------------|--------|----------|-------------------------------------------------------|
| deviceEndpoint | string | Yes      | Base URL of the SeaClaw C11 device (e.g., \`http://192.168.1.50:8765\`) |
| deviceId       | string | No       | UUID of the registered edge device (for telemetry)    |
| apiKey         | string | No       | Optional API key for device authentication            |

### Heartbeat Protocol

The adapter sends a POST to \`{deviceEndpoint}/heartbeat\` with the execution context.

### Telemetry

The C11 binary may return telemetry in response headers:

| Header            | Metric             |
|-------------------|--------------------|
| \`x-seaclaw-cpu\`   | CPU usage (%)      |
| \`x-seaclaw-mem\`   | Memory usage (%)   |
| \`x-seaclaw-disk\`  | Disk usage (%)     |
| \`x-seaclaw-gpu\`   | GPU usage (%)      |
| \`x-seaclaw-temp\`  | Temperature (°C)   |
| \`x-seaclaw-uptime\`| Uptime (seconds)   |
`.trim(),
};
