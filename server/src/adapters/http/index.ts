/**
 * HTTP adapter — sends POST webhook to adapterConfig.url with execution
 * context as JSON body.
 */
import { executeHttp } from "./execute.js";
import type { ServerAdapterModule, AdapterExecuteContext, AdapterExecuteResult, AdapterEnvironmentTestResult } from "../types.js";

export const httpAdapter: ServerAdapterModule = {
  type: "http",
  label: "HTTP Webhook",
  description: "POSTs execution context to a remote webhook URL and captures the response.",

  async execute(ctx: AdapterExecuteContext): Promise<AdapterExecuteResult> {
    const url = ctx.adapterConfig.url as string | undefined;
    const headers = (ctx.adapterConfig.headers as Record<string, string> | undefined) ?? {};
    const retries = (ctx.adapterConfig.retries as number | undefined) ?? 2;

    if (!url) {
      throw new Error("httpAdapter: adapterConfig.url is required");
    }

    const body = {
      agentId: ctx.agentId,
      companyId: ctx.companyId,
      runId: ctx.runId,
      triggeredBy: ctx.triggeredBy,
      manual: ctx.manual,
      systemPrompt: ctx.systemPrompt,
      model: ctx.model,
      context: ctx.context,
      timestamp: new Date().toISOString(),
    };

    const result = await executeHttp({
      url,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SeaClip-Agent-Id": ctx.agentId,
        "X-SeaClip-Run-Id": ctx.runId,
        ...headers,
      },
      body: JSON.stringify(body),
      timeoutMs: ctx.timeoutMs,
      retries,
    });

    // Parse response body for structured output
    let output: string | undefined;
    let responseMetadata: Record<string, unknown> = {};

    try {
      const parsed = JSON.parse(result.body) as Record<string, unknown>;
      output = typeof parsed.output === "string"
        ? parsed.output
        : JSON.stringify(parsed);
      responseMetadata = parsed;
    } catch {
      output = result.body;
    }

    return {
      output,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      metadata: {
        statusCode: result.statusCode,
        durationMs: result.durationMs,
        retryCount: result.retryCount,
        ...responseMetadata,
      },
    };
  },

  async testEnvironment(
    config: Record<string, unknown>,
  ): Promise<AdapterEnvironmentTestResult> {
    const url = config.url as string | undefined;
    if (!url) {
      return { ok: false, message: "adapterConfig.url is required" };
    }

    try {
      // Send a lightweight HEAD or GET to check connectivity
      const result = await executeHttp({
        url,
        method: "GET",
        headers: { "X-SeaClip-Test": "true" },
        timeoutMs: 5000,
        retries: 0,
      });

      return {
        ok: result.statusCode < 500,
        message: `HTTP ${result.statusCode}`,
        details: { statusCode: result.statusCode, durationMs: result.durationMs },
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Connection failed",
      };
    }
  },

  agentConfigurationDoc: `
## HTTP Adapter Configuration

| Field   | Type   | Required | Description                              |
|---------|--------|----------|------------------------------------------|
| url     | string | Yes      | Webhook URL to POST execution context to |
| headers | object | No       | Extra HTTP headers                       |
| retries | number | No       | Number of retry attempts (default: 2)    |

### Request Body

The adapter POSTs a JSON body:

\`\`\`json
{
  "agentId": "...",
  "companyId": "...",
  "runId": "...",
  "triggeredBy": "...",
  "manual": false,
  "systemPrompt": "...",
  "model": "...",
  "context": {},
  "timestamp": "..."
}
\`\`\`

### Response

The webhook should return a JSON object with an \`output\` string field.
`.trim(),
};
