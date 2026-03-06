/**
 * Ollama local adapter.
 *
 * Calls Ollama's /api/chat endpoint with the agent's model and prompt.
 * Streams response. Parses token usage from Ollama response metadata.
 * Tracks local GPU time as cost.
 */
import type {
  ServerAdapterModule,
  AdapterExecuteContext,
  AdapterExecuteResult,
  AdapterEnvironmentTestResult,
  AdapterModel,
} from "../types.js";
import { getConfig } from "../../config.js";
import { getLogger } from "../../middleware/logger.js";

// Approximate cost per GPU-second on local hardware (set to 0 for free local)
const GPU_COST_PER_SECOND_USD = 0;

interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaChatResponse {
  model: string;
  message: OllamaChatMessage;
  done: boolean;
  done_reason?: string;
  eval_count?: number;
  prompt_eval_count?: number;
  eval_duration?: number;
  total_duration?: number;
}

async function callOllamaChat(
  baseUrl: string,
  model: string,
  messages: OllamaChatMessage[],
  timeoutMs: number,
): Promise<{ output: string; inputTokens: number; outputTokens: number; durationMs: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama /api/chat returned HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json() as OllamaChatResponse;

    return {
      output: data.message?.content ?? "",
      inputTokens: data.prompt_eval_count ?? 0,
      outputTokens: data.eval_count ?? 0,
      durationMs: data.total_duration ? Math.floor(data.total_duration / 1e6) : 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

export const ollamaLocalAdapter: ServerAdapterModule = {
  type: "ollama_local",
  label: "Ollama Local",
  description: "Runs inference using a locally hosted Ollama model.",

  models: [
    { id: "qwen2.5:32b", label: "Qwen 2.5 32B" },
    { id: "llama3.3:70b", label: "Llama 3.3 70B" },
    { id: "deepseek-r1:32b", label: "DeepSeek R1 32B" },
    { id: "mistral:7b", label: "Mistral 7B" },
    { id: "phi4:14b", label: "Phi-4 14B" },
  ] satisfies AdapterModel[],

  async execute(ctx: AdapterExecuteContext): Promise<AdapterExecuteResult> {
    const config = getConfig();
    const baseUrl =
      (ctx.adapterConfig.ollamaBaseUrl as string | undefined) ??
      config.ollamaBaseUrl;
    const model = ctx.model ?? (ctx.adapterConfig.model as string | undefined) ?? "qwen2.5:32b";
    const logger = getLogger();

    const messages: OllamaChatMessage[] = [];

    if (ctx.systemPrompt) {
      messages.push({ role: "system", content: ctx.systemPrompt });
    }

    // Build user message from context
    const userContent = ctx.context.prompt
      ? String(ctx.context.prompt)
      : `Perform your scheduled task. Context: ${JSON.stringify(ctx.context)}`;

    messages.push({ role: "user", content: userContent });

    logger.debug(
      { model, baseUrl, agentId: ctx.agentId, messageCount: messages.length },
      "Calling Ollama",
    );

    const startMs = Date.now();
    const result = await callOllamaChat(baseUrl, model, messages, ctx.timeoutMs);
    const wallDurationMs = Date.now() - startMs;

    const durationSeconds = wallDurationMs / 1000;
    const costUsd = durationSeconds * GPU_COST_PER_SECOND_USD;

    return {
      output: result.output,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd,
      metadata: {
        model,
        baseUrl,
        ollamaDurationMs: result.durationMs,
        wallDurationMs,
      },
    };
  },

  async testEnvironment(
    config: Record<string, unknown>,
  ): Promise<AdapterEnvironmentTestResult> {
    const globalConfig = getConfig();
    const baseUrl =
      (config.ollamaBaseUrl as string | undefined) ?? globalConfig.ollamaBaseUrl;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      let response: Response;
      try {
        response = await fetch(`${baseUrl}/api/version`, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        return {
          ok: false,
          message: `Ollama returned HTTP ${response.status}`,
          details: { baseUrl },
        };
      }

      const data = await response.json() as { version?: string };
      return {
        ok: true,
        message: `Ollama is running (version: ${data.version ?? "unknown"})`,
        details: { baseUrl, version: data.version },
      };
    } catch (err) {
      return {
        ok: false,
        message: `Cannot reach Ollama at ${baseUrl}: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
    }
  },

  async listModels(config: Record<string, unknown>): Promise<AdapterModel[]> {
    const globalConfig = getConfig();
    const baseUrl =
      (config.ollamaBaseUrl as string | undefined) ?? globalConfig.ollamaBaseUrl;

    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama /api/tags returned HTTP ${response.status}`);
    }

    const data = await response.json() as {
      models?: Array<{ name: string; size?: number }>;
    };

    return (data.models ?? []).map((m) => ({
      id: m.name,
      label: m.name,
    }));
  },

  agentConfigurationDoc: `
## Ollama Local Adapter Configuration

| Field         | Type   | Required | Description                                       |
|---------------|--------|----------|---------------------------------------------------|
| ollamaBaseUrl | string | No       | Ollama base URL (default: from \`OLLAMA_BASE_URL\` env) |
| model         | string | No       | Model override (default: agent.model field)       |

### Default Models

- \`qwen2.5:32b\` — Qwen 2.5 32B (recommended for complex tasks)
- \`llama3.3:70b\` — Llama 3.3 70B
- \`deepseek-r1:32b\` — DeepSeek R1 32B (strong reasoning)
- \`mistral:7b\` — Mistral 7B (fast)
- \`phi4:14b\` — Phi-4 14B (efficient)

### Execution Context

The agent's \`systemPrompt\` becomes the \`system\` message. The user message is built from \`context.prompt\` or the full context object.
`.trim(),
};
