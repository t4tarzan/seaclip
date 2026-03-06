# SeaClip — Architecture

This document describes the internal structure of SeaClip: how a request flows from the dashboard to an edge device, how adapters work, how the database is organized, and how the system handles federation.

---

## Stack Overview

| Layer | Technology | Package |
|---|---|---|
| Dashboard | React 18, Vite, TailwindCSS, shadcn/ui | `@seaclip/ui` |
| API server | Node.js, Express, tsx | `@seaclip/server` |
| Real-time | WebSocket (ws) | `@seaclip/server` |
| ORM | Drizzle ORM | `@seaclip/server` |
| Database | PostgreSQL 17 (production), SQLite (embedded) | — |
| AI runtime | Ollama, Agent Zero | adapter layer |
| Messaging | Telegram Bot API | adapter layer |
| Monorepo | pnpm workspaces, Turborepo | root |
| CLI | Commander.js, Inquirer, Ora | `@seaclip/cli` |
| Types | TypeScript 5, shared via `@seaclip/shared` | `@seaclip/shared` |

---

## Repository Structure

```
seaclip/
├── cli/                       CLI tool
│   └── src/
│       ├── commands/          One file per top-level command
│       ├── config/            Config store (read/write) + env builder
│       └── checks/            Individual health-check functions
├── server/
│   └── src/
│       ├── db/
│       │   ├── schema.ts      Drizzle schema (single source of truth)
│       │   └── migrate.ts     Migration runner
│       ├── routes/            Express routers
│       ├── services/          Business logic (agents, devices, etc.)
│       ├── adapters/          Adapter implementations
│       ├── ws/                WebSocket hub
│       └── index.ts           Server entry point
├── ui/
│   └── src/
│       ├── pages/             React pages (route-based)
│       ├── components/        Shared UI components
│       ├── hooks/             Custom React hooks
│       └── lib/               API client, utilities
├── shared/
│   └── src/
│       ├── types/             Shared TypeScript types
│       └── constants/         Shared constants
├── doc/                       Extended documentation
├── scripts/                   Dev and ops scripts
└── skills/                    Agent skill files
```

---

## Request Flow — Heartbeat Lifecycle

A **heartbeat run** is the fundamental unit of agent activity in SeaClip. Here is what happens from the moment an agent wakes up to the moment a task is marked done.

```
Agent (spoke)                     Hub (server)                       Database
     │                                 │                                 │
     │  1. GET /api/companies/:c/      │                                 │
     │     agents/:a                   │                                 │
     │ ──────────────────────────────► │                                 │
     │                                 │  SELECT agent WHERE id=:a       │
     │                                 │ ───────────────────────────────►│
     │ ◄────────────────────────────── │ ◄───────────────────────────────│
     │  agent config + instructions    │                                 │
     │                                 │                                 │
     │  2. GET /api/companies/:c/      │                                 │
     │     issues?assigneeAgentId=:a   │                                 │
     │     &status=todo                │                                 │
     │ ──────────────────────────────► │                                 │
     │ ◄────────────────────────────── │                                 │
     │  [list of todo issues]          │                                 │
     │                                 │                                 │
     │  3. POST /issues/:id/checkout   │                                 │
     │ ──────────────────────────────► │  UPDATE status=in_progress      │
     │ ◄────────────────────────────── │ ───────────────────────────────►│
     │  run_id + issue detail          │                                 │
     │                                 │                                 │
     │  [does the work]                │                                 │
     │                                 │                                 │
     │  4. PATCH /issues/:id           │                                 │
     │     { status: "done",           │                                 │
     │       result: "..." }           │                                 │
     │ ──────────────────────────────► │  UPDATE issue                   │
     │ ◄────────────────────────────── │  INSERT heartbeat_run           │
     │  updated issue                  │ ───────────────────────────────►│
     │                                 │                                 │
     │  5. POST /costs                 │                                 │
     │     { tokens, model, ... }      │                                 │
     │ ──────────────────────────────► │  INSERT cost_entry              │
     │ ◄────────────────────────────── │ ───────────────────────────────►│
     │  ok                             │                                 │
```

The server broadcasts WebSocket events (`issue:updated`, `agent:heartbeat`) to connected dashboard clients after each state change.

---

## Adapter Model

Each agent has an `adapterType` field that determines which adapter the server uses to communicate with it. Adapters implement the `AgentAdapter` interface:

```typescript
interface AgentAdapter {
  /**
   * Invoke the agent — send a task or trigger a heartbeat run.
   * Returns a run ID and initial status.
   */
  invoke(params: InvokeParams): Promise<InvokeResult>;

  /**
   * Check whether the agent process/device is reachable.
   */
  ping(): Promise<PingResult>;

  /**
   * Optional: stream output from the agent in real time.
   */
  stream?(params: InvokeParams): AsyncIterable<string>;
}
```

Adapters are registered in `server/src/adapters/registry.ts`:

```typescript
const REGISTRY: Record<string, () => AgentAdapter> = {
  seaclaw:    () => new SeaClawAdapter(config),
  ollama:     () => new OllamaAdapter(config),
  agent_zero: () => new AgentZeroAdapter(config),
  telegram:   () => new TelegramAdapter(config),
  process:    () => new ProcessAdapter(config),
  http:       () => new HttpAdapter(config),
};
```

See [`doc/ADAPTERS.md`](ADAPTERS.md) for full per-adapter documentation.

---

## Edge Mesh Protocol

Edge devices send periodic telemetry heartbeats to the hub. The hub uses these to track device health and can reassign tasks when a device goes offline.

See [`doc/EDGE-MESH.md`](EDGE-MESH.md) for the full protocol.

---

## Hub Federation Protocol

Multiple SeaClip hubs can be linked. Federated hubs sync their company/agent registries and can route tasks across site boundaries.

See [`doc/HUB-FEDERATION.md`](HUB-FEDERATION.md) for the full protocol.

---

## Database Schema Overview

All tables are defined in `server/src/db/schema.ts` using Drizzle ORM.

### Core tables

| Table | Description |
|---|---|
| `companies` | Top-level tenant / workspace |
| `agents` | AI agents, one per logical worker process |
| `agent_configs` | Per-agent adapter configuration (JSON) |
| `issues` | Tasks / work items (the primary unit of work) |
| `issue_comments` | Comments and sub-task links on issues |
| `heartbeat_runs` | Audit log of every agent heartbeat invocation |
| `cost_entries` | Token + compute cost records per run |
| `devices` | Registered edge devices (spokes) |
| `device_telemetry` | Time-series telemetry snapshots from devices |
| `federation_hubs` | Registered remote hubs |
| `federation_sync_log` | Record of cross-hub sync events |

### Key relationships

```
companies (1) ──── (N) agents
companies (1) ──── (N) issues
companies (1) ──── (N) devices
agents    (1) ──── (N) issues   [assignee]
agents    (1) ──── (N) heartbeat_runs
heartbeat_runs (1) ── (N) cost_entries
devices   (1) ──── (N) device_telemetry
```

### Issue status state machine

```
backlog → todo → in_progress → in_review → done
                     ↓
                  blocked
```

Transitions are validated server-side. An agent may only move issues it is assigned to, except managers who can move any issue.

---

## WebSocket Events

The server broadcasts the following events over WebSocket to connected clients:

| Event | Payload | Trigger |
|---|---|---|
| `issue:created` | Issue object | New issue inserted |
| `issue:updated` | Issue object | Status or field change |
| `agent:heartbeat` | `{ agentId, status, runId }` | Heartbeat run completes |
| `device:telemetry` | Telemetry snapshot | Device posts telemetry |
| `device:status` | `{ deviceId, status }` | Device comes online/offline |
| `hub:sync` | `{ hubId, event }` | Federation sync event |

Clients subscribe to a company room on connect:

```
ws://host/ws?companyId=<id>
```
