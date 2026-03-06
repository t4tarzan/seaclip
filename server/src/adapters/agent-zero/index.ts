/**
 * Agent Zero adapter.
 *
 * Starts an Agent Zero session via its HTTP API or spawns the process.
 * Injects SeaClip skill for task management. Captures conversation
 * output and tool calls.
 */
import type {
  ServerAdapterModule,
  AdapterExecuteContext,
  AdapterExecuteResult,
  AdapterEnvironmentTestResult,
} from "../types.js";
import { executeHttp } from "../http/execute.js";
import { spawnProcess } from "../process/execute.js";
import { getLogger } from "../../middleware/logger.js";

// Agent Zero skill injection for SeaClip task management
const SEACLIP_SKILL_INJECTION = `
You are operating as part of SeaClip — a hub-spoke AI agent orchestration platform.
Your run ID is: {runId}
Your agent ID is: {agentId}
Company ID: {companyId}

When completing tasks:
1. Check out issues before working on them (POST /api/companies/{companyId}/issues/{id}/checkout)
2. Post progress updates as comments
3. Mark issues as done when complete
4. Create approval requests for actions that require human sign-off

SeaClip API: {seaclipApiUrl}
`.trim();

interface AgentZeroSessionResponse {
  sessionId?: string;
  output?: string;
  messages?: Array<{ role: string; content: string }>;
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; result?: unknown }>;
  done?: boolean;
  error?: string;
}

async function callAgentZeroApi(
  baseUrl: string,
  sessionId: string | null,
  task: string,
  timeoutMs: number,
): Promise<AgentZeroSessionResponse> {
  const url = sessionId
    ? `${baseUrl}/api/session/${sessionId}/message`
    : `${baseUrl}/api/session/new`;

  const body: Record<string, unknown> = {
    message: task,
    sessionId,
    streaming: false,
  };

  const result = await executeHttp({
    url,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeoutMs,
    retries: 0,
  });

  if (result.statusCode >= 400) {
    throw new Error(`Agent Zero API returned HTTP ${result.statusCode}: ${result.body}`);
  }

  return JSON.parse(result.body) as AgentZeroSessionResponse;
}

// Session codec for persisting Agent Zero state across heartbeats
export function encodeSessionState(sessionId: string, context: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify({ sessionId, context, encodedAt: new Date().toISOString() })).toString("base64");
}

export function decodeSessionState(encoded: string): { sessionId: string; context: Record<string, unknown>; encodedAt: string } | null {
  try {
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as {
      sessionId: string;
      context: Record<string, unknown>;
      encodedAt: string;
    };
  } catch {
    return null;
  }
}

export const agentZeroAdapter: ServerAdapterModule = {
  type: "agent_zero",
  label: "Agent Zero",
  description: "Executes tasks using an Agent Zero instance with SeaClip skill injection.",

  async execute(ctx: AdapterExecuteContext): Promise<AdapterExecuteResult> {
    const logger = getLogger();
    const baseUrl = ctx.adapterConfig.agentZeroUrl as string | undefined;
    const useProcess = ctx.adapterConfig.useProcess as boolean | undefined;
    const agentZeroPath = ctx.adapterConfig.agentZeroPath as string | undefined;
    const seaclipApiUrl = (ctx.adapterConfig.seaclipApiUrl as string | undefined) ?? "http://localhost:3001";

    // Build the task prompt with SeaClip skill injection
    const skillPrompt = SEACLIP_SKILL_INJECTION
      .replace("{runId}", ctx.runId)
      .replace("{agentId}", ctx.agentId)
      .replace("{companyId}", ctx.companyId)
      .replace("{companyId}", ctx.companyId)
      .replace("{seaclipApiUrl}", seaclipApiUrl);

    const fullTask = ctx.systemPrompt
      ? `${skillPrompt}\n\n${ctx.systemPrompt}\n\nTask: ${JSON.stringify(ctx.context)}`
      : `${skillPrompt}\n\nTask: ${JSON.stringify(ctx.context)}`;

    // Restore previous session if state is encoded in context
    let sessionId: string | null = null;
    if (ctx.context.sessionState && typeof ctx.context.sessionState === "string") {
      const decoded = decodeSessionState(ctx.context.sessionState);
      if (decoded) {
        sessionId = decoded.sessionId;
        logger.debug({ sessionId, agentId: ctx.agentId }, "Restored Agent Zero session");
      }
    }

    if (baseUrl && !useProcess) {
      // Use Agent Zero HTTP API
      const response = await callAgentZeroApi(baseUrl, sessionId, fullTask, ctx.timeoutMs);

      const newSessionId = response.sessionId ?? sessionId ?? crypto.randomUUID();
      const sessionState = encodeSessionState(newSessionId, ctx.context);

      const output = response.output ??
        response.messages?.filter((m) => m.role === "assistant").map((m) => m.content).join("\n") ??
        "Agent Zero completed task with no output";

      return {
        output,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        metadata: {
          sessionId: newSessionId,
          sessionState,
          toolCallCount: response.toolCalls?.length ?? 0,
          toolCalls: response.toolCalls,
        },
      };
    } else if (useProcess && agentZeroPath) {
      // Spawn Agent Zero as a subprocess
      const result = await spawnProcess({
        command: `python ${agentZeroPath}/run_ui.py --task "${fullTask.replace(/"/g, '\\"')}" --no-ui`,
        shell: "/bin/sh",
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(([, v]) => v !== undefined) as [string, string][],
          ),
          SEACLIP_AGENT_ID: ctx.agentId,
          SEACLIP_RUN_ID: ctx.runId,
        },
        timeoutMs: ctx.timeoutMs,
      });

      return {
        output: result.stdout,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        metadata: {
          exitCode: result.exitCode,
          stderr: result.stderr,
          durationMs: result.durationMs,
        },
      };
    } else {
      throw new Error(
        "agentZeroAdapter: either adapterConfig.agentZeroUrl or (useProcess=true + agentZeroPath) is required",
      );
    }
  },

  async testEnvironment(
    config: Record<string, unknown>,
  ): Promise<AdapterEnvironmentTestResult> {
    const baseUrl = config.agentZeroUrl as string | undefined;
    const useProcess = config.useProcess as boolean | undefined;
    const agentZeroPath = config.agentZeroPath as string | undefined;

    if (baseUrl) {
      try {
        const result = await executeHttp({
          url: `${baseUrl}/api/ping`,
          method: "GET",
          timeoutMs: 5000,
          retries: 0,
        });
        return {
          ok: result.statusCode < 400,
          message: result.statusCode < 400 ? "Agent Zero API is reachable" : `HTTP ${result.statusCode}`,
          details: { baseUrl, statusCode: result.statusCode },
        };
      } catch (err) {
        return {
          ok: false,
          message: `Cannot reach Agent Zero at ${baseUrl}: ${err instanceof Error ? err.message : "Unknown error"}`,
        };
      }
    }

    if (useProcess && agentZeroPath) {
      try {
        const result = await spawnProcess({
          command: `test -f ${agentZeroPath}/run_ui.py && echo "found"`,
          timeoutMs: 5000,
        });
        return {
          ok: result.stdout.includes("found"),
          message: result.stdout.includes("found")
            ? "Agent Zero installation found"
            : `run_ui.py not found at ${agentZeroPath}`,
        };
      } catch (err) {
        return { ok: false, message: String(err) };
      }
    }

    return {
      ok: false,
      message: "Either agentZeroUrl or (useProcess=true + agentZeroPath) must be configured",
    };
  },

  agentConfigurationDoc: `
## Agent Zero Adapter Configuration

| Field          | Type    | Required | Description                                         |
|----------------|---------|----------|-----------------------------------------------------|
| agentZeroUrl   | string  | *        | HTTP API URL of a running Agent Zero instance       |
| useProcess     | boolean | *        | Set to true to spawn Agent Zero as a subprocess     |
| agentZeroPath  | string  | **       | Path to Agent Zero installation (required with useProcess) |
| seaclipApiUrl  | string  | No       | SeaClip server URL injected into agent context      |

\* Either \`agentZeroUrl\` or (\`useProcess=true\` + \`agentZeroPath\`) is required.

### SeaClip Skill

The adapter automatically injects a SeaClip skill context that tells the agent how to:
- Check out issues before working on them
- Post progress as comments
- Create approval requests for sensitive actions
`.trim(),
};
