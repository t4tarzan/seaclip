# AGENTS.md — SeaClip Codebase Guide

This file is for **AI coding agents** (Claude Code, Codex, Cursor, etc.) working on the SeaClip codebase. Read it in full before making any changes.

---

## What is SeaClip?

SeaClip is a **hub-spoke AI agent orchestration platform** for on-premises, privacy-first deployments. It manages a fleet of AI agents running on edge devices (Raspberry Pi, Jetson boards, phones, laptops) and coordinates their work through a central hub.

It is a fork of Paperclip AI, re-architected for the SpaceClaw / SeaClaw edge-mesh use case.

---

## Repository Layout

```
seaclip/
├── cli/            CLI tool — @seaclip/cli
│   └── src/
│       ├── index.ts             Main entry point (Commander.js)
│       ├── commands/            One file per command
│       ├── config/              Config read/write (store.ts, env.ts)
│       └── checks/              Health check functions
├── server/         Express API — @seaclip/server
│   └── src/
│       ├── db/schema.ts         Drizzle ORM schema (source of truth for all types)
│       ├── routes/              Express routers
│       ├── services/            Business logic
│       ├── adapters/            Adapter implementations + registry
│       ├── ws/                  WebSocket hub
│       └── index.ts             Server entry
├── ui/             React dashboard — @seaclip/ui
│   └── src/
│       ├── pages/               Route-based pages
│       ├── components/          Reusable UI components
│       ├── hooks/               Custom React hooks
│       └── lib/                 API client (typed fetch), utils
├── shared/         Shared types — @seaclip/shared
│   └── src/types/               Exported TypeScript interfaces
├── doc/            Extended docs — read before changing protocols
│   ├── ARCHITECTURE.md
│   ├── ADAPTERS.md
│   ├── EDGE-MESH.md
│   └── HUB-FEDERATION.md
├── scripts/        Dev runner, DB backup
└── skills/         Agent skill files (not for the web app)
```

---

## Development Setup

```bash
pnpm install          # install all workspace deps
pnpm dev              # start server + UI in parallel
pnpm build            # full production build
pnpm test             # run all tests (Vitest)
pnpm lint             # ESLint + Prettier check
pnpm typecheck        # tsc --noEmit across all packages
```

Minimum Node version: **20.x**. Uses **pnpm workspaces** — do not use npm or yarn.

---

## Coding Standards

### TypeScript

- Strict mode is enabled. All `any` must be justified with a comment.
- Prefer `unknown` over `any` for external data. Narrow with Zod or type guards.
- No `!` non-null assertions without a preceding null check.
- Use `satisfies` instead of type assertions where possible.

### Imports

- Use ESM (`import`/`export`) everywhere. No CommonJS.
- Internal workspace packages are imported as `@seaclip/<package>`.
- Use explicit file extensions in relative imports: `./foo.js` (not `./foo`).

### Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `agent-service.ts` |
| Classes | PascalCase | `OllamaAdapter` |
| Functions | camelCase | `buildEnvFromConfig` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES` |
| DB table names | snake_case | `heartbeat_runs` |
| API routes | kebab-case | `/api/companies/:id/agents` |

### Error handling

- All async functions must handle errors explicitly. Do not let unhandled rejections propagate.
- Service functions throw typed errors (`class AgentNotFoundError extends Error`).
- Route handlers catch service errors and return appropriate HTTP status codes.
- CLI commands print user-friendly messages with chalk and exit with non-zero codes on failure.

### API design

- All API responses are wrapped: `{ data: T }` for success, `{ error: string; code: string }` for failure.
- IDs are always `string` (UUIDs). Never expose numeric auto-increment IDs.
- Timestamps are always ISO 8601 strings.
- Pagination uses `limit` + `cursor` (not `offset`).

---

## Database

- Schema is defined in `server/src/db/schema.ts` using **Drizzle ORM**.
- To add a column or table: edit schema.ts, then run `pnpm --filter @seaclip/server db:generate` to generate the migration, then `db:migrate` to apply.
- Never write raw SQL for data access — use Drizzle's query builder.
- Use transactions for any multi-table write.

---

## Adapters

When adding or modifying adapters:
1. Read `doc/ADAPTERS.md` and `skills/create-agent-adapter/SKILL.md` first.
2. Adapters must implement `AgentAdapter` from `server/src/adapters/types.ts`.
3. Add a Zod config schema in `server/src/adapters/schemas.ts`.
4. Register in `server/src/adapters/registry.ts`.
5. Write tests in `server/src/adapters/__tests__/`.

---

## Edge Mesh and Federation

- Edge mesh protocol is described in `doc/EDGE-MESH.md`. Do not change the telemetry payload shape without updating that doc.
- Federation sync messages are described in `doc/HUB-FEDERATION.md`. The sync protocol is versioned — increment `syncProtocolVersion` in `shared/src/constants/federation.ts` when making breaking changes.

---

## CLI

- All CLI commands use `ora` spinners for async operations and `chalk` for colored output.
- Destructive operations (reset, delete) require a `--confirm` flag or an interactive prompt.
- CLI commands never import directly from `server/` — they communicate via HTTP to the running server.

---

## Testing

- Unit tests: Vitest. Files named `*.test.ts`.
- Integration tests: Vitest with a real SQLite database. Files named `*.integration.test.ts`.
- E2E tests: Playwright. Located in `ui/tests/`.
- **Do not mock the database** in integration tests. Use a real in-memory SQLite instance.
- Mock external HTTP calls (Ollama, Telegram) with `msw` (Mock Service Worker).

---

## Pull Request Checklist

Before opening a PR, confirm:

- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm lint` passes (or issues are documented)
- [ ] `pnpm test` passes
- [ ] New public functions have JSDoc comments
- [ ] Database changes include a migration file
- [ ] Any protocol changes are reflected in the relevant doc file
- [ ] `CHANGELOG.md` has an entry

---

## Key Files to Read First

If you are unfamiliar with this codebase, start here:

1. `doc/ARCHITECTURE.md` — stack and request flow
2. `server/src/db/schema.ts` — all entities and their fields
3. `server/src/adapters/types.ts` — the AgentAdapter interface
4. `skills/seaclip/SKILL.md` — how agents use the API
5. `cli/src/index.ts` — all CLI commands

---

## Do Not

- Do not run `npm install` or `yarn` — use `pnpm`.
- Do not commit `.env` files or secrets.
- Do not add new dependencies without checking that a lighter alternative doesn't already exist in the workspace.
- Do not modify `pnpm-lock.yaml` manually.
- Do not create files outside the established directory structure without a good reason.
- Do not silently swallow errors. Log or rethrow.
