# SeaClip — Edge Mesh Protocol

The **edge mesh** is the network of spoke devices connected to a SeaClip hub. Each spoke runs one or more agents and periodically reports telemetry. The hub uses this information to monitor health, balance load, and automatically reassign tasks when a device goes offline.

---

## Device Registration Flow

Before a spoke can receive tasks, its device must be registered with the hub.

### Step 1 — Register the device

```http
POST /api/companies/:companyId/devices
Content-Type: application/json

{
  "hostname": "pi-kitchen",
  "ipAddress": "192.168.1.42",
  "deviceType": "raspberry-pi",
  "metadata": {
    "cpuCores": 4,
    "ramGb": 8,
    "architecture": "aarch64",
    "osVersion": "Raspbian Bookworm"
  }
}
```

Response:

```json
{
  "id": "dev_abc123",
  "hostname": "pi-kitchen",
  "ipAddress": "192.168.1.42",
  "deviceType": "raspberry-pi",
  "status": "pending",
  "registeredAt": "2025-01-01T00:00:00.000Z",
  "registrationToken": "tok_xyz..."
}
```

The `registrationToken` is a one-time token the spoke uses to authenticate its first telemetry ping. Store it securely.

### Step 2 — Authenticate the spoke

The spoke sends its first telemetry ping using the registration token:

```http
POST /api/devices/telemetry
X-SeaClip-Device-Id: dev_abc123
X-SeaClip-Token: tok_xyz...
Content-Type: application/json

{ "cpuPercent": 12.3, "ramUsedGb": 1.2, ... }
```

After successful authentication, the hub issues a long-lived device API key and the device status transitions to `online`.

### Step 3 — Register agents on the spoke

Agents running on the spoke are registered as normal agents with the spoke's `deviceId`:

```http
POST /api/companies/:companyId/agents
{
  "name": "Pi Agent",
  "adapterType": "seaclaw",
  "deviceId": "dev_abc123",
  "config": { ... }
}
```

---

## Telemetry Reporting

Spoke devices post telemetry at a configurable interval (default: every 30 seconds).

### Endpoint

```http
POST /api/devices/telemetry
X-SeaClip-Device-Id: <deviceId>
X-SeaClip-Key: <deviceApiKey>
```

### Telemetry payload fields

| Field | Type | Description |
|---|---|---|
| `timestamp` | ISO 8601 | When the snapshot was taken |
| `cpuPercent` | number | CPU utilization (0–100) |
| `ramUsedGb` | number | RAM in use (GB) |
| `ramTotalGb` | number | Total RAM (GB) |
| `diskUsedGb` | number | Disk used (GB) |
| `diskTotalGb` | number | Total disk (GB) |
| `gpuPercent` | number? | GPU utilization (if available) |
| `gpuVramUsedGb` | number? | GPU VRAM used (GB) |
| `gpuTempC` | number? | GPU temperature (°C) |
| `cpuTempC` | number? | CPU temperature (°C) |
| `networkRxKbps` | number? | Network receive rate |
| `networkTxKbps` | number? | Network transmit rate |
| `uptimeSeconds` | number | Device uptime |
| `agentStatuses` | object | Map of `agentId → status` for agents on this device |

### Reporting frequency

| Device health state | Interval |
|---|---|
| Healthy | 30 seconds |
| Degraded (high load, high temp) | 10 seconds |
| Recovering | 15 seconds |

The hub considers a device **offline** if no telemetry is received within 3× the expected interval (90 seconds by default).

---

## Health Monitoring

The hub maintains a health score for each device based on recent telemetry.

### Health score calculation

```
score = 100
  - max(0, cpuPercent - 80)     × 0.5
  - max(0, ramPercent - 85)     × 0.5
  - max(0, cpuTempC - 70)       × 1.0
  - max(0, gpuTempC - 80)       × 0.8
  - (missedHeartbeats × 20)
```

### Health status thresholds

| Score | Status |
|---|---|
| ≥ 80 | `online` |
| 50–79 | `degraded` |
| < 50 | `unhealthy` |
| No telemetry for 90s | `offline` |

The health score is exposed via the dashboard and the API:

```http
GET /api/companies/:companyId/devices/:deviceId/health
```

---

## Auto-Reassignment on Device Failure

When a device transitions to `offline` or `unhealthy`, the hub:

1. Identifies all `in_progress` issues assigned to agents on that device.
2. For each issue, checks whether another agent of the same adapter type exists on a healthy device.
3. If a replacement is found, reassigns the issue to that agent and sets status back to `todo`.
4. Emits an `issue:reassigned` WebSocket event with the old and new agent IDs.
5. Logs the reassignment in the audit table with reason `device_failure`.

If no replacement agent is available, the issue status is set to `blocked` with a `blockReason` of `"no_healthy_device"`.

Configuration:

```json
{
  "mesh": {
    "autoReassign": true,
    "reassignOnStatus": ["offline", "unhealthy"],
    "requireSameAdapterType": true
  }
}
```

---

## Mesh Topology Visualization

The dashboard renders the mesh as a force-directed graph. The data is served by:

```http
GET /api/companies/:companyId/mesh/topology
```

Response:

```json
{
  "nodes": [
    {
      "id": "dev_abc123",
      "type": "device",
      "label": "pi-kitchen",
      "status": "online",
      "healthScore": 95,
      "position": { "x": 120, "y": 80 }
    },
    {
      "id": "agent_def456",
      "type": "agent",
      "label": "Pi Agent",
      "status": "active",
      "deviceId": "dev_abc123"
    }
  ],
  "edges": [
    {
      "source": "hub",
      "target": "dev_abc123",
      "type": "mesh_link",
      "latencyMs": 4
    },
    {
      "source": "dev_abc123",
      "target": "agent_def456",
      "type": "agent_host"
    }
  ],
  "hub": {
    "id": "hub",
    "label": "SeaClip Hub",
    "version": "0.1.0"
  }
}
```

The `position` field is optional — the dashboard runs a layout algorithm if not provided, but persists user-dragged positions back to the server.
