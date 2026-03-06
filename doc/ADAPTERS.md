# SeaClip — Adapters

An **adapter** is the bridge between the SeaClip hub and an agent backend. When the server needs to invoke an agent, it selects the adapter registered for that agent's `adapterType`, constructs the appropriate request, and handles the response.

All adapters implement the `AgentAdapter` interface defined in `server/src/adapters/types.ts`.

---

## 1. SeaClaw Edge (`seaclaw`)

Communicates with a SeaClaw node running on an edge device (Raspberry Pi, Jetson, etc.) via SSH tunnel + REST API.

### Configuration fields

```json
{
  "adapterType": "seaclaw",
  "config": {
    "host": "192.168.1.42",
    "port": 22,
    "username": "pi",
    "sshKeyPath": "~/.ssh/id_ed25519",
    "apiPort": 8080,
    "apiBasePath": "/seaclaw",
    "tlsEnabled": false
  }
}
```

| Field | Required | Description |
|---|---|---|
| `host` | Yes | Device IP or hostname |
| `port` | No | SSH port (default: 22) |
| `username` | Yes | SSH username |
| `sshKeyPath` | Yes | Path to private key |
| `apiPort` | No | SeaClaw REST port (default: 8080) |
| `apiBasePath` | No | API base path prefix |
| `tlsEnabled` | No | Use HTTPS for API calls (default: false) |

### Protocol

1. An SSH tunnel is established from hub → device on `invoke()` if not already open.
2. The hub calls `POST /seaclaw/tasks` on the device's local REST API through the tunnel.
3. The device processes the task and responds with `{ taskId, status }`.
4. The hub polls `GET /seaclaw/tasks/:taskId` until the task completes, or until the timeout is reached.

### Device requirements

- SeaClaw agent daemon running and listening on `apiPort`
- SSH authorized key for the configured username
- Outbound connectivity from device to hub (for telemetry)

---

## 2. Ollama Local (`ollama`)

Calls a locally running Ollama instance to generate a completion. Tracks model name, GPU usage, and token counts.

### Configuration fields

```json
{
  "adapterType": "ollama",
  "config": {
    "baseUrl": "http://localhost:11434",
    "model": "llama3.2",
    "systemPrompt": "You are a helpful assistant.",
    "temperature": 0.7,
    "numCtx": 8192,
    "gpuLabel": "RTX 3090"
  }
}
```

| Field | Required | Description |
|---|---|---|
| `baseUrl` | Yes | Ollama server URL |
| `model` | Yes | Model tag (e.g. `llama3.2`, `mistral`, `gemma2:27b`) |
| `systemPrompt` | No | System message prepended to every request |
| `temperature` | No | Sampling temperature (default: 0.7) |
| `numCtx` | No | Context window size (default: 4096) |
| `gpuLabel` | No | Human-readable GPU label for cost tracking |

### Model selection

The adapter calls `GET /api/tags` on first use to verify the model is available. If the model is not found, it raises a `ModelNotAvailable` error with the list of available models.

### GPU tracking

If `gpuLabel` is set, the adapter records it in cost entries alongside `promptTokens`, `completionTokens`, and `durationMs`. This feeds the budget dashboard.

### Prompt format

Tasks are delivered as a chat message array:

```json
[
  { "role": "system", "content": "<systemPrompt>" },
  { "role": "user",   "content": "<issue.description + context>" }
]
```

The adapter calls `POST /api/chat` (Ollama chat endpoint) and returns the assistant message as the result.

---

## 3. Agent Zero (`agent_zero`)

Manages Agent Zero sessions. Sends tasks as user messages, handles memory sync and tool call logging.

### Configuration fields

```json
{
  "adapterType": "agent_zero",
  "config": {
    "baseUrl": "http://localhost:8000",
    "sessionId": "auto",
    "memorySync": true,
    "toolCallLogging": true,
    "timeout": 120000
  }
}
```

| Field | Required | Description |
|---|---|---|
| `baseUrl` | Yes | Agent Zero API URL |
| `sessionId` | No | Session ID to reuse. `"auto"` creates a new session per agent (default) |
| `memorySync` | No | Sync Agent Zero's memory files to SeaClip after each run (default: true) |
| `toolCallLogging` | No | Log tool calls in heartbeat_runs audit table (default: true) |
| `timeout` | No | Max ms to wait for a response (default: 120000) |

### Session management

When `sessionId` is `"auto"`, the adapter stores the session ID in the agent's config after first creation. Subsequent invocations reuse the same session, so the agent retains context across tasks.

A session can be reset by setting `sessionId: "new"` in the config.

### Memory sync

After each invocation, if `memorySync` is enabled, the adapter fetches the session's memory files from Agent Zero and stores snapshots in the SeaClip database. This lets the dashboard inspect what an agent "remembers."

### Tool call logging

Every tool call made during a run is recorded in the `heartbeat_runs.toolCalls` JSONB column, enabling post-hoc auditing of what actions the agent took.

---

## 4. Telegram Bridge (`telegram`)

Sends tasks as messages to a Telegram chat and reads replies as completions. Useful for human-in-the-loop workflows or for triggering mobile-based automation.

### Configuration fields

```json
{
  "adapterType": "telegram",
  "config": {
    "botToken": "123456:ABC-DEF...",
    "chatId": "-100123456789",
    "pollIntervalMs": 2000,
    "completionKeyword": "DONE:",
    "timeout": 300000
  }
}
```

| Field | Required | Description |
|---|---|---|
| `botToken` | Yes | Telegram bot token from @BotFather |
| `chatId` | Yes | Target chat ID (user, group, or channel) |
| `pollIntervalMs` | No | How often to poll for replies (default: 2000ms) |
| `completionKeyword` | No | Prefix in reply that signals task completion (default: `DONE:`) |
| `timeout` | No | Max ms to wait for a reply (default: 300000 = 5 minutes) |

### Bot setup

1. Create a bot with @BotFather and note the token.
2. Add the bot to the target chat.
3. Run `seaclip doctor` to verify the token.

### Command format

When invoked, the adapter sends the task as a Telegram message:

```
[SeaClip Task #abc123]
Company: Acme Corp
Task: <issue.title>

<issue.description>

Reply with `DONE: <your result>` when complete.
```

### Polling behavior

The adapter uses long-polling (`getUpdates`) to check for replies. It looks for a reply to the specific task message containing the configured `completionKeyword`. When found, it extracts the result and marks the run complete.

---

## 5. Process (`process`)

Runs a local CLI command on the hub server itself. Captures stdout as the result.

### Configuration fields

```json
{
  "adapterType": "process",
  "config": {
    "command": "python3",
    "args": ["/agents/my_agent.py"],
    "env": {
      "AGENT_MODE": "task"
    },
    "cwd": "/agents",
    "timeout": 60000,
    "shell": false
  }
}
```

| Field | Required | Description |
|---|---|---|
| `command` | Yes | Executable to run |
| `args` | No | Command arguments array |
| `env` | No | Additional environment variables |
| `cwd` | No | Working directory (default: server root) |
| `timeout` | No | Max ms before the process is killed (default: 60000) |
| `shell` | No | Run via shell (enables shell features, less safe; default: false) |

### Environment variables injected

The adapter always injects the following vars into the child process:

```
SEACLIP_API_URL       — hub API base URL
SEACLIP_AGENT_ID      — agent ID
SEACLIP_COMPANY_ID    — company ID
SEACLIP_RUN_ID        — current heartbeat run ID
SEACLIP_TASK_JSON     — full task JSON (base64-encoded)
```

### Timeout behavior

If the process exceeds `timeout`, it is sent `SIGTERM`. After 5 seconds, `SIGKILL` is sent. The run is marked `failed` with the timeout reason.

---

## 6. HTTP (`http`)

Fires an HTTP webhook to a remote endpoint. Expects a JSON response body.

### Configuration fields

```json
{
  "adapterType": "http",
  "config": {
    "url": "https://my-service.example.com/seaclip/webhook",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer ${WEBHOOK_SECRET}",
      "X-SeaClip-Version": "0.1.0"
    },
    "timeoutMs": 30000,
    "retries": 3,
    "retryDelayMs": 1000
  }
}
```

| Field | Required | Description |
|---|---|---|
| `url` | Yes | Webhook URL |
| `method` | No | HTTP method (default: `POST`) |
| `headers` | No | Additional request headers. Values may reference `${ENV_VAR}` |
| `timeoutMs` | No | Request timeout in ms (default: 30000) |
| `retries` | No | Number of retry attempts on 5xx or network error (default: 3) |
| `retryDelayMs` | No | Base delay between retries in ms, doubles on each attempt (default: 1000) |

### Webhook payload schema

```json
{
  "event": "agent.invoke",
  "runId": "run_abc123",
  "agentId": "agent_def456",
  "companyId": "company_ghi789",
  "task": {
    "id": "issue_xyz",
    "title": "Process Q4 report",
    "description": "...",
    "priority": "high",
    "assigneeAgentId": "agent_def456"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Expected response schema

```json
{
  "status": "done",
  "result": "Task completed successfully. Processed 42 records.",
  "metadata": {}
}
```

`status` must be one of: `done`, `failed`, `in_progress` (async; hub will poll).

### Retry policy

Retries happen on:
- Network errors (ECONNREFUSED, ENOTFOUND, ETIMEDOUT)
- HTTP 429 Too Many Requests (respects `Retry-After` header)
- HTTP 5xx Server Errors

Retries do **not** happen on HTTP 4xx (except 429).
