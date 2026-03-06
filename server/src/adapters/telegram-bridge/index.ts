/**
 * Telegram bridge adapter.
 *
 * Sends task context as a formatted Telegram message via Bot API.
 * Monitors for reply messages as agent output.
 * Implements a polling loop with timeout for response.
 */
import type {
  ServerAdapterModule,
  AdapterExecuteContext,
  AdapterExecuteResult,
  AdapterEnvironmentTestResult,
} from "../types.js";
import { executeHttp } from "../http/execute.js";
import { getConfig } from "../../config.js";
import { getLogger } from "../../middleware/logger.js";

const TELEGRAM_API_BASE = "https://api.telegram.org";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

interface TelegramMessage {
  message_id: number;
  from?: { id: number; username?: string };
  chat: { id: number };
  text?: string;
  date: number;
  reply_to_message?: { message_id: number };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

async function telegramPost(
  botToken: string,
  method: string,
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const result = await executeHttp({
    url: `${TELEGRAM_API_BASE}/bot${botToken}/${method}`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    timeoutMs: 10_000,
    retries: 1,
  });

  const response = JSON.parse(result.body) as { ok: boolean; result?: unknown; description?: string };
  if (!response.ok) {
    throw new Error(`Telegram API ${method} failed: ${response.description ?? "unknown error"}`);
  }

  return response.result as Record<string, unknown>;
}

async function sendMessage(
  botToken: string,
  chatId: string | number,
  text: string,
): Promise<TelegramMessage> {
  return await telegramPost(botToken, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  }) as unknown as TelegramMessage;
}

async function getUpdates(
  botToken: string,
  offset?: number,
): Promise<TelegramUpdate[]> {
  const result = await telegramPost(botToken, "getUpdates", {
    offset,
    limit: 10,
    timeout: 0,
    allowed_updates: ["message"],
  });

  return (result as unknown as TelegramUpdate[]) ?? [];
}

function formatTaskMessage(ctx: AdapterExecuteContext): string {
  const lines = [
    `*SeaClip Task* (Run: \`${ctx.runId.slice(0, 8)}\`)`,
    `Agent: \`${ctx.agentId.slice(0, 8)}\``,
    `Triggered by: ${ctx.triggeredBy}`,
    "",
  ];

  if (ctx.systemPrompt) {
    lines.push(`*Instructions:*\n${ctx.systemPrompt}`);
    lines.push("");
  }

  if (ctx.context.prompt) {
    lines.push(`*Task:*\n${ctx.context.prompt}`);
  } else if (Object.keys(ctx.context).length > 0) {
    lines.push(`*Context:*\n\`\`\`\n${JSON.stringify(ctx.context, null, 2)}\n\`\`\``);
  }

  lines.push("", `_Reply to this message to submit your response._`);

  return lines.join("\n");
}

export const telegramBridgeAdapter: ServerAdapterModule = {
  type: "telegram_bridge",
  label: "Telegram Bridge",
  description: "Sends tasks to a Telegram chat and waits for a reply as output.",

  async execute(ctx: AdapterExecuteContext): Promise<AdapterExecuteResult> {
    const globalConfig = getConfig();
    const logger = getLogger();

    const botToken =
      (ctx.adapterConfig.botToken as string | undefined) ??
      globalConfig.telegramBotToken;
    const chatId = ctx.adapterConfig.chatId as string | number | undefined;

    if (!botToken) {
      throw new Error(
        "telegramBridgeAdapter: adapterConfig.botToken or TELEGRAM_BOT_TOKEN env is required",
      );
    }
    if (!chatId) {
      throw new Error("telegramBridgeAdapter: adapterConfig.chatId is required");
    }

    const messageText = formatTaskMessage(ctx);

    logger.debug({ agentId: ctx.agentId, chatId }, "Sending Telegram task message");

    const sentMessage = await sendMessage(botToken, chatId, messageText);
    const sentMessageId = sentMessage.message_id;

    // Poll for reply
    let updateOffset: number | undefined;
    let replyText: string | undefined;
    const deadline = Date.now() + ctx.timeoutMs;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      if (Date.now() > deadline) {
        logger.warn({ agentId: ctx.agentId, runId: ctx.runId }, "Telegram reply timeout");
        break;
      }

      await sleep(POLL_INTERVAL_MS);

      try {
        const updates = await getUpdates(botToken, updateOffset);

        for (const update of updates) {
          if (updateOffset === undefined || update.update_id >= updateOffset) {
            updateOffset = update.update_id + 1;
          }

          const msg = update.message;
          if (!msg?.text) continue;

          // Accept messages that:
          // 1. Are in the same chat, AND
          // 2. Either reply to our sent message OR are a simple reply in the chat
          const inCorrectChat =
            String(msg.chat.id) === String(chatId) ||
            msg.chat.id === Number(chatId);

          const isReplyToOurMessage =
            msg.reply_to_message?.message_id === sentMessageId;

          if (inCorrectChat && (isReplyToOurMessage || attempt > 10)) {
            replyText = msg.text;
            break;
          }
        }

        if (replyText) break;
      } catch (err) {
        logger.warn({ err, attempt }, "Telegram polling error, continuing");
      }
    }

    return {
      output: replyText ?? `No Telegram reply received within ${Math.floor(ctx.timeoutMs / 1000)}s`,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      metadata: {
        chatId,
        sentMessageId,
        gotReply: replyText !== undefined,
      },
    };
  },

  async testEnvironment(
    config: Record<string, unknown>,
  ): Promise<AdapterEnvironmentTestResult> {
    const globalConfig = getConfig();
    const botToken =
      (config.botToken as string | undefined) ?? globalConfig.telegramBotToken;

    if (!botToken) {
      return { ok: false, message: "botToken or TELEGRAM_BOT_TOKEN env required" };
    }

    try {
      const result = await executeHttp({
        url: `${TELEGRAM_API_BASE}/bot${botToken}/getMe`,
        method: "GET",
        timeoutMs: 5000,
        retries: 0,
      });

      const parsed = JSON.parse(result.body) as {
        ok: boolean;
        result?: { username?: string; first_name?: string };
        description?: string;
      };

      if (parsed.ok && parsed.result) {
        const chatId = config.chatId as string | undefined;
        if (chatId) {
          try {
            await sendMessage(
              botToken,
              chatId,
              "SeaClip test: bot is connected ✓",
            );
          } catch (sendErr) {
            return {
              ok: true,
              message: `Bot authenticated as @${parsed.result.username}, but test message to chat ${chatId} failed: ${sendErr instanceof Error ? sendErr.message : "unknown"}`,
            };
          }
        }

        return {
          ok: true,
          message: `Bot authenticated as @${parsed.result.username} (${parsed.result.first_name})`,
          details: { username: parsed.result.username },
        };
      }

      return {
        ok: false,
        message: parsed.description ?? "Bot token is invalid",
      };
    } catch (err) {
      return {
        ok: false,
        message: `Telegram API unreachable: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  agentConfigurationDoc: `
## Telegram Bridge Adapter Configuration

| Field    | Type            | Required | Description                                         |
|----------|-----------------|----------|-----------------------------------------------------|
| botToken | string          | *        | Telegram Bot API token (or set \`TELEGRAM_BOT_TOKEN\`) |
| chatId   | string / number | Yes      | Chat ID to send tasks to (user, group, or channel)  |

\* Falls back to \`TELEGRAM_BOT_TOKEN\` environment variable.

### How It Works

1. On each heartbeat, the adapter formats the task context as a Markdown message
2. The message is sent to the configured chat via Bot API
3. The adapter polls for a reply message (max ~60s by default)
4. The reply text is used as the agent's output

### Getting chatId

Use \`@userinfobot\` on Telegram or send a message to your bot and check \`getUpdates\`.
`.trim(),
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
