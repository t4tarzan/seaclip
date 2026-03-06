/**
 * heartbeat service — core heartbeat engine.
 * Invokes an agent by looking up its adapter, building execution context,
 * calling adapter.execute(), and recording the run result.
 */
import { getServerAdapter } from "../adapters/registry.js";
import * as agentsService from "./agents.js";
import { insertActivity } from "./activity-log.js";
import { getLogger } from "../middleware/logger.js";
import type { Agent } from "./agents.js";

export interface HeartbeatContext {
  triggeredBy: string;
  manual: boolean;
  context?: Record<string, unknown>;
}

export interface RunResult {
  agentId: string;
  companyId: string;
  runId: string;
  success: boolean;
  output?: string;
  error?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  triggeredBy: string;
  startedAt: string;
  finishedAt: string;
  adapterType: string;
  metadata: Record<string, unknown>;
}

export async function invokeAgent(
  agent: Agent,
  heartbeatCtx: HeartbeatContext,
): Promise<RunResult> {
  const logger = getLogger();
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const runId = crypto.randomUUID();

  logger.info(
    {
      agentId: agent.id,
      agentName: agent.name,
      adapterType: agent.adapterType,
      triggeredBy: heartbeatCtx.triggeredBy,
      manual: heartbeatCtx.manual,
    },
    "Invoking agent heartbeat",
  );

  // Mark agent as active
  await agentsService.setAgentStatus(agent.companyId, agent.id, "active");

  let result: RunResult;

  try {
    const adapter = getServerAdapter(agent.adapterType);

    const execContext = {
      agentId: agent.id,
      companyId: agent.companyId,
      runId,
      adapterConfig: agent.adapterConfig,
      systemPrompt: agent.systemPrompt,
      model: agent.model,
      timeoutMs: agent.timeoutMs,
      triggeredBy: heartbeatCtx.triggeredBy,
      manual: heartbeatCtx.manual,
      context: heartbeatCtx.context ?? {},
    };

    const adapterResult = await adapter.execute(execContext);

    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;

    result = {
      agentId: agent.id,
      companyId: agent.companyId,
      runId,
      success: true,
      output: adapterResult.output,
      inputTokens: adapterResult.inputTokens ?? 0,
      outputTokens: adapterResult.outputTokens ?? 0,
      costUsd: adapterResult.costUsd ?? 0,
      durationMs,
      triggeredBy: heartbeatCtx.triggeredBy,
      startedAt,
      finishedAt,
      adapterType: agent.adapterType,
      metadata: adapterResult.metadata ?? {},
    };

    await agentsService.recordHeartbeat(agent.id, result.costUsd);

    logger.info(
      {
        agentId: agent.id,
        runId,
        durationMs,
        costUsd: result.costUsd,
      },
      "Agent heartbeat succeeded",
    );
  } catch (err) {
    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;
    const errorMessage = err instanceof Error ? err.message : String(err);

    logger.error(
      { agentId: agent.id, runId, err, durationMs },
      "Agent heartbeat failed",
    );

    await agentsService.setAgentStatus(agent.companyId, agent.id, "error");

    result = {
      agentId: agent.id,
      companyId: agent.companyId,
      runId,
      success: false,
      error: errorMessage,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      durationMs,
      triggeredBy: heartbeatCtx.triggeredBy,
      startedAt,
      finishedAt,
      adapterType: agent.adapterType,
      metadata: {},
    };
  }

  // Log activity
  await insertActivity({
    companyId: agent.companyId,
    eventType: result.success ? "agent.heartbeat.success" : "agent.heartbeat.failure",
    agentId: agent.id,
    actorId: agent.id,
    actorType: "agent",
    summary: result.success
      ? `Agent "${agent.name}" heartbeat completed in ${result.durationMs}ms`
      : `Agent "${agent.name}" heartbeat failed: ${result.error}`,
    payload: {
      runId,
      durationMs: result.durationMs,
      costUsd: result.costUsd,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      triggeredBy: heartbeatCtx.triggeredBy,
      manual: heartbeatCtx.manual,
    },
  });

  return result;
}
