# SeaClip — Hub Federation Protocol

**Federation** allows multiple SeaClip hubs to be linked together. A federated deployment enables:

- Cross-hub task routing (assign a task at Hub A, execute on Hub B's agents)
- Unified dashboard visibility across physical sites
- Shared agent and device registries (optionally)
- Federated cost tracking and budgets

Each hub remains fully independent. Federation is additive — a hub operates normally if its peer hubs are unreachable.

---

## Hub Registration

To federate two hubs, register each as a peer of the other.

### Register a remote hub

```http
POST /api/federation/hubs
Content-Type: application/json

{
  "name": "Site B Hub",
  "apiUrl": "https://seaclip-site-b.internal:3100",
  "apiKey": "sk_siteb_...",
  "syncEnabled": true
}
```

Response:

```json
{
  "id": "hub_abc123",
  "name": "Site B Hub",
  "apiUrl": "https://seaclip-site-b.internal:3100",
  "status": "pending",
  "syncEnabled": true,
  "registeredAt": "2025-01-01T00:00:00.000Z"
}
```

### Hub handshake

After registration, the local hub initiates a handshake:

1. `POST https://seaclip-site-b.internal:3100/api/federation/handshake`
   - Sends local hub identity (name, version, publicKey)
   - Receives remote hub identity in response
2. Both hubs store each other's `publicKey` for message verification
3. Status transitions from `pending` → `connected`

If the handshake fails (network unreachable, auth rejected), status stays `pending` and the hub retries every 60 seconds.

---

## Sync Protocol

When sync is enabled, hubs exchange **sync messages** over HTTPS. Syncs are event-driven (triggered by changes) plus a periodic full reconciliation every 5 minutes.

### Sync endpoint

```http
POST /api/federation/hubs/:hubId/sync
X-SeaClip-Hub-Signature: <HMAC-SHA256 of body>
Content-Type: application/json

{
  "fromHubId": "hub_local",
  "sequence": 4521,
  "events": [ ... ]
}
```

### What data syncs

| Resource | Sync direction | Default |
|---|---|---|
| Companies | bidirectional | enabled |
| Agents (registry) | bidirectional | enabled |
| Devices (registry) | bidirectional | enabled |
| Issues (assignments) | bidirectional | enabled |
| Heartbeat runs | push to origin | enabled |
| Cost entries | push to origin | enabled |
| Telemetry | push to origin | disabled (high volume) |

Sync scope is configurable per-hub pair:

```json
{
  "sync": {
    "companies": true,
    "agents": true,
    "devices": true,
    "issues": true,
    "costs": true,
    "telemetry": false,
    "companyFilter": ["company_abc"]
  }
}
```

### Sync event envelope

```json
{
  "id": "evt_xyz",
  "type": "issue.updated",
  "resource": "issue",
  "resourceId": "issue_abc123",
  "hubId": "hub_local",
  "timestamp": "2025-01-01T00:01:00.000Z",
  "payload": { ... resource fields ... }
}
```

Event types follow the pattern `<resource>.<action>`:
- `company.created`, `company.updated`
- `agent.created`, `agent.updated`, `agent.deleted`
- `device.registered`, `device.status_changed`
- `issue.created`, `issue.updated`, `issue.deleted`
- `heartbeat_run.completed`
- `cost_entry.created`

---

## Cross-Hub Task Routing

To assign a task to an agent on a remote hub:

1. Create the issue normally on the local hub.
2. Set the `assigneeHubId` field to the remote hub's ID.
3. Set the `assigneeAgentId` to the agent's ID on the remote hub.

```http
POST /api/companies/:companyId/issues
{
  "title": "Summarize meeting transcript",
  "assigneeHubId": "hub_siteb",
  "assigneeAgentId": "agent_remote_xyz",
  "assigneeAgentRef": "agent-slug@siteb"
}
```

The local hub forwards the issue to the remote hub via:

```http
POST https://seaclip-site-b.internal:3100/api/federation/issues/inbound
```

The remote hub:
1. Creates a shadow copy of the issue in its database.
2. Assigns it to the local agent.
3. Sends status updates back to the origin hub as sync events.

The origin hub dashboard shows the issue as `remote` with a link to the remote hub.

### Task routing diagram

```
  Hub A (origin)                         Hub B (executor)
       │                                       │
       │  POST /federation/issues/inbound      │
       │ ─────────────────────────────────────►│
       │                                       │  Creates shadow issue
       │                                       │  Assigns to Agent B
       │                                       │
       │                                       │  Agent B heartbeats
       │                                       │  status: in_progress
       │                                       │
       │  Sync event: issue.updated            │
       │ ◄─────────────────────────────────────│
       │  Status mirrors to Hub A              │
       │                                       │
       │                                       │  Agent B completes
       │                                       │  status: done
       │                                       │
       │  Sync event: issue.updated            │
       │  Sync event: heartbeat_run.completed  │
       │ ◄─────────────────────────────────────│
       │  Origin issue marked done             │
```

---

## Conflict Resolution

When two hubs modify the same resource concurrently (e.g., both update an issue's status), conflicts are resolved using **last-writer-wins** based on `updatedAt` timestamps.

Each resource carries:
- `updatedAt` — RFC 3339 timestamp
- `updatedByHubId` — which hub made the last write
- `version` — monotonically increasing integer

Conflict resolution rules:

| Scenario | Resolution |
|---|---|
| Both hubs update status | Highest `updatedAt` wins |
| Same `updatedAt` (clock skew) | Lexicographically greater `hubId` wins |
| One hub deletes, other updates | Delete wins (tombstone is preserved) |
| Issue reassigned on both hubs | Origin hub's assignment wins |

The resolved state is broadcast back to all connected hubs as a `conflict.resolved` event with both versions included for audit purposes.

### Tombstones

Deleted resources are not immediately purged. Instead, a tombstone record is kept for 30 days:

```json
{
  "resourceType": "issue",
  "resourceId": "issue_abc123",
  "deletedAt": "2025-01-05T12:00:00.000Z",
  "deletedByHubId": "hub_local"
}
```

Tombstones prevent a remote hub from re-creating a deleted resource during the next sync cycle.

---

## Hub Status and Monitoring

```http
GET /api/federation/hubs
```

```json
{
  "hubs": [
    {
      "id": "hub_siteb",
      "name": "Site B Hub",
      "apiUrl": "https://seaclip-site-b.internal:3100",
      "status": "connected",
      "syncEnabled": true,
      "lastSyncAt": "2025-01-01T00:05:00.000Z",
      "pendingEvents": 0,
      "version": "0.1.0"
    }
  ]
}
```

Hub statuses:

| Status | Meaning |
|---|---|
| `pending` | Handshake not yet completed |
| `connected` | Healthy, sync active |
| `degraded` | Connected but sync lag > 5 minutes |
| `disconnected` | Network unreachable, retrying |
| `rejected` | Remote hub rejected our credentials |
