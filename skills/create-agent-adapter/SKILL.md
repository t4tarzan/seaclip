# SeaClip — Create a Custom Adapter

This guide explains how to build and register a custom **adapter** — the driver that SeaClip uses to communicate with a specific agent backend.

Use this guide if you need to integrate a backend not covered by the built-in adapters (SeaClaw, Ollama, Agent Zero, Telegram, Process, HTTP).

---

## When to create an adapter

Create an adapter when:
- You have an existing service with its own API (e.g. a custom Python agent, a Slack bot, an IoT device)
- The built-in `http` adapter is not flexible enough (e.g. you need streaming, binary protocols, or stateful connections)
- You want first-class telemetry, cost reporting, or tool call logging for a new backend

---

## Step 1 — Create the adapter file

Create a new file in `server/src/adapters/`:

```
server/src/adapters/my-adapter.ts
```

### Minimal adapter skeleton

```typescript
import type {
  AgentAdapter,
  AdapterConfig,
  InvokeParams,
  InvokeResult,
  PingResult,
} from './types.js';

export interface MyAdapterConfig extends AdapterConfig {
  // Your config fields
  apiUrl: string;
  apiKey?: string;
}

export class MyAdapter implements AgentAdapter {
  constructor(private config: MyAdapterConfig) {}

  async invoke(params: InvokeParams): Promise<InvokeResult> {
    const { agent, issue, runId } = params;

    // 1. Build the request payload
    const payload = {
      taskId: issue.id,
      title: issue.title,
      description: issue.description,
      runId,
    };

    // 2. Call your backend
    const res = await fetch(`${this.config.apiUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`MyAdapter: HTTP ${res.status} from ${this.config.apiUrl}`);
    }

    const result = await res.json() as { taskId: string; status: string; output?: string };

    // 3. Return a normalized InvokeResult
    return {
      runId,
      status: result.status === 'completed' ? 'done' : 'in_progress',
      result: result.output,
    };
  }

  async ping(): Promise<PingResult> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.apiUrl}/health`, { signal: AbortSignal.timeout(5000) });
      return { online: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { online: false, latencyMs: Date.now() - start };
    }
  }
}
```

---

## Step 2 — Define your config schema

Add a Zod schema for your adapter's config to `server/src/adapters/schemas.ts`:

```typescript
export const myAdapterConfigSchema = z.object({
  apiUrl: z.string().url(),
  apiKey: z.string().optional(),
});
```

This schema is used:
- To validate agent configs on create/update
- To generate the config form in the dashboard
- To produce TypeScript types via `z.infer`

---

## Step 3 — Register your adapter

Open `server/src/adapters/registry.ts` and add your adapter:

```typescript
import { MyAdapter } from './my-adapter.js';
import { myAdapterConfigSchema } from './schemas.js';

export const ADAPTER_REGISTRY: AdapterRegistry = {
  // ... existing adapters ...

  my_adapter: {
    create: (config: unknown) => {
      const validated = myAdapterConfigSchema.parse(config);
      return new MyAdapter(validated);
    },
    schema: myAdapterConfigSchema,
    label: 'My Custom Adapter',
    description: 'Connects to MyService via REST.',
    icon: 'plug',   // Lucide icon name shown in dashboard
  },
};
```

After registering, your adapter type (`"my_adapter"`) becomes available in:
- `POST /api/companies/:id/agents` — `adapterType` field
- The dashboard "Create Agent" form

---

## Step 4 — (Optional) Add streaming support

If your backend supports streaming output (e.g. SSE, newline-delimited JSON), implement the optional `stream()` method:

```typescript
async *stream(params: InvokeParams): AsyncIterable<string> {
  const res = await fetch(`${this.config.apiUrl}/tasks/stream`, {
    method: 'POST',
    body: JSON.stringify({ ... }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}
```

The hub pipes stream output to the WebSocket dashboard in real time.

---

## Step 5 — (Optional) Add cost reporting

If your backend returns token usage or latency, map it to the `CostEntry` shape in the `invoke()` return value:

```typescript
return {
  runId,
  status: 'done',
  result: output,
  cost: {
    model: 'my-model-v1',
    promptTokens: usage.input_tokens,
    completionTokens: usage.output_tokens,
    durationMs: Date.now() - startTime,
    currency: 'usd',
    estimatedCostUsd: usage.input_tokens * 0.000002 + usage.output_tokens * 0.000006,
  },
};
```

The hub automatically creates a `cost_entry` record from this data.

---

## Step 6 — (Optional) Add telemetry

If your adapter connects to a device, you can emit telemetry events:

```typescript
// In your invoke() implementation, after getting device stats:
params.emitTelemetry({
  deviceId: this.config.deviceId,
  cpuPercent: stats.cpu,
  ramUsedGb: stats.ramUsed,
  ramTotalGb: stats.ramTotal,
});
```

---

## Type Reference

Full type definitions are in `server/src/adapters/types.ts`:

```typescript
interface AgentAdapter {
  invoke(params: InvokeParams): Promise<InvokeResult>;
  ping(): Promise<PingResult>;
  stream?(params: InvokeParams): AsyncIterable<string>;
}

interface InvokeParams {
  agent: Agent;
  issue: Issue;
  runId: string;
  emitTelemetry: (snapshot: TelemetrySnapshot) => void;
}

interface InvokeResult {
  runId: string;
  status: 'done' | 'in_progress' | 'failed' | 'blocked';
  result?: string;
  artifacts?: Artifact[];
  cost?: CostEntry;
}

interface PingResult {
  online: boolean;
  latencyMs: number;
  message?: string;
}
```

---

## Testing your adapter

Add a test file at `server/src/adapters/__tests__/my-adapter.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { MyAdapter } from '../my-adapter.js';

describe('MyAdapter', () => {
  it('returns done when backend completes the task', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ taskId: 't1', status: 'completed', output: 'result text' }),
    }) as unknown as typeof fetch;

    const adapter = new MyAdapter({ apiUrl: 'http://test.local' });
    const result = await adapter.invoke(mockInvokeParams());
    expect(result.status).toBe('done');
    expect(result.result).toBe('result text');
  });
});
```

Run tests with:

```bash
pnpm --filter @seaclip/server test
```

---

## Submitting your adapter

If your adapter is general-purpose and you'd like it included in SeaClip:

1. Follow the coding conventions in the existing adapter files.
2. Add JSDoc comments to all public methods.
3. Add a section to `doc/ADAPTERS.md` documenting all config fields.
4. Include tests with ≥ 80% coverage of your adapter class.
5. Open a pull request with the title `feat(adapters): add <name> adapter`.
