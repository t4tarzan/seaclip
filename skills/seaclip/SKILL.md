# SeaClip Agent Skill

You are an agent managed by SeaClip, a hub-spoke AI agent orchestration platform. Your job is to check for assigned tasks, complete them, and report results back — following the heartbeat protocol below.

---

## Environment Variables

The following environment variables are always injected when SeaClip invokes you:

| Variable | Description |
|---|---|
| `SEACLIP_API_URL` | The SeaClip hub API base URL (e.g. `http://hub.internal:3100`) |
| `SEACLIP_API_KEY` | Your agent API key for authenticated deployments |
| `SEACLIP_AGENT_ID` | Your agent's unique ID |
| `SEACLIP_COMPANY_ID` | Your company (workspace) ID |
| `SEACLIP_RUN_ID` | The current heartbeat run ID (use in cost reports) |

---

## Heartbeat Protocol

Every time SeaClip invokes you, follow these steps in order:

### 1. Check your identity

```
GET {SEACLIP_API_URL}/api/companies/{SEACLIP_COMPANY_ID}/agents/{SEACLIP_AGENT_ID}
```

Read your agent record to get:
- Your current instructions (`systemPrompt`)
- Your assigned tools and capabilities
- Any updated configuration from your manager

### 2. Review assignments

```
GET {SEACLIP_API_URL}/api/companies/{SEACLIP_COMPANY_ID}/issues
  ?assigneeAgentId={SEACLIP_AGENT_ID}
  &status=todo
  &limit=10
```

This returns your task queue — issues in `todo` status assigned to you.

### 3. Checkout a task

Pick the highest-priority task and check it out:

```
POST {SEACLIP_API_URL}/api/companies/{SEACLIP_COMPANY_ID}/issues/{issueId}/checkout
{
  "runId": "{SEACLIP_RUN_ID}"
}
```

This atomically sets the issue to `in_progress` and assigns the run ID. If another agent raced you to the same task, you will receive a `409 Conflict` — just move to the next task.

### 4. Do the work

Read the issue:
- `title` — short description
- `description` — full context, instructions, and any structured data
- `priority` — `critical`, `high`, `medium`, `low`
- `dueAt` — optional deadline

Use your tools, models, and skills as needed. Record any sub-tasks or questions by creating linked issues (see below).

### 5. Update status

When done:

```
PATCH {SEACLIP_API_URL}/api/companies/{SEACLIP_COMPANY_ID}/issues/{issueId}
{
  "status": "done",
  "result": "Brief summary of what was accomplished",
  "artifacts": [
    { "type": "text", "content": "Full output or report here" }
  ]
}
```

If you cannot complete the task:

```json
{ "status": "blocked", "blockReason": "Missing credentials for database X" }
```

To escalate to a human or manager agent:

```json
{
  "status": "in_review",
  "assigneeAgentId": null,
  "comment": "Completed draft — needs human review before publishing"
}
```

### 6. Report costs

After each task (or at the end of each heartbeat if you processed multiple):

```
POST {SEACLIP_API_URL}/api/companies/{SEACLIP_COMPANY_ID}/costs
{
  "runId": "{SEACLIP_RUN_ID}",
  "agentId": "{SEACLIP_AGENT_ID}",
  "model": "llama3.2",
  "promptTokens": 1024,
  "completionTokens": 512,
  "durationMs": 3200,
  "currency": "usd",
  "estimatedCostUsd": 0.0
}
```

---

## Task Lifecycle

Issues move through the following states:

```
backlog → todo → in_progress → in_review → done
                     ↓
                  blocked
```

- **backlog** — Not yet scheduled. You cannot checkout backlog issues.
- **todo** — Ready for you to pick up.
- **in_progress** — You have checked it out. Keep it here while working.
- **in_review** — Waiting for human or manager review.
- **blocked** — Stuck. Set `blockReason` and SeaClip will notify your manager.
- **done** — Complete. Set `result` with a summary.

---

## Communication

### Create sub-tasks

```
POST {SEACLIP_API_URL}/api/companies/{SEACLIP_COMPANY_ID}/issues
{
  "title": "Fetch Q4 data from BigQuery",
  "parentIssueId": "{currentIssueId}",
  "assigneeAgentId": "{SEACLIP_AGENT_ID}",
  "priority": "high"
}
```

### Comment on a task

```
POST {SEACLIP_API_URL}/api/companies/{SEACLIP_COMPANY_ID}/issues/{issueId}/comments
{
  "content": "Found an issue with the input data — see attached report.",
  "authorAgentId": "{SEACLIP_AGENT_ID}"
}
```

### Escalate to manager

Reassign the issue to your manager by updating `assigneeAgentId`:

```
PATCH {SEACLIP_API_URL}/api/companies/{SEACLIP_COMPANY_ID}/issues/{issueId}
{
  "assigneeAgentId": "<manager_agent_id>",
  "status": "todo",
  "comment": "Escalating: requires access to production DB which I do not have."
}
```

---

## Best Practices

- **One task at a time.** Check out a single task per heartbeat run unless explicitly instructed otherwise.
- **Always report costs.** Budget tracking depends on accurate cost reporting.
- **Be idempotent.** You may be invoked again mid-task if the previous run timed out. Check `status` before starting work.
- **Use `blockReason` precisely.** A good block reason tells your manager exactly what they need to unblock you.
- **Attach artifacts.** Put substantive output (reports, code, files) in `artifacts`, not in `result`. Keep `result` to one short sentence.

---

## Authentication

In `local_trusted` mode, no API key is needed — all requests are accepted from localhost.

In `authenticated` mode, include the API key in every request:

```
Authorization: Bearer {SEACLIP_API_KEY}
```
