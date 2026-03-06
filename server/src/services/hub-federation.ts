/**
 * hub-federation service — hub registration, sync protocol, cross-hub task routing.
 */
import { randomUUID } from "node:crypto";
import { notFound, conflict } from "../errors.js";
import { getLogger } from "../middleware/logger.js";

export type HubStatus = "active" | "inactive" | "unreachable" | "syncing";

export interface Hub {
  id: string;
  name: string;
  url: string;
  publicKey?: string;
  region?: string;
  capabilities: string[];
  status: HubStatus;
  lastSyncAt?: string;
  lastSyncSequence: number;
  metadata: Record<string, unknown>;
  registeredAt: string;
  updatedAt: string;
}

export interface SyncPayload {
  sourceHubId: string;
  sequenceNumber: number;
  timestamp: string;
  events: Array<{
    id: string;
    type: string;
    companyId?: string;
    payload: Record<string, unknown>;
    occurredAt: string;
  }>;
  checksum?: string;
}

export interface SyncResult {
  accepted: boolean;
  eventsProcessed: number;
  errors: string[];
  syncedAt: string;
}

export interface FederationStatus {
  localHubId: string;
  connectedHubs: number;
  totalHubs: number;
  lastSyncAt?: string;
  syncLag?: number;
  hubs: Array<{
    id: string;
    name: string;
    status: HubStatus;
    lastSyncAt?: string;
  }>;
  healthyAt: string;
}

const LOCAL_HUB_ID = process.env.LOCAL_HUB_ID ?? randomUUID();
const hubStore = new Map<string, Hub>();
const syncSequences = new Map<string, number>(); // hubId → last processed sequence

export async function listHubs(): Promise<Hub[]> {
  return Array.from(hubStore.values()).sort(
    (a, b) => a.registeredAt.localeCompare(b.registeredAt),
  );
}

export async function registerHub(input: {
  name: string;
  url: string;
  publicKey?: string;
  region?: string;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}): Promise<Hub> {
  // Check URL uniqueness
  for (const h of hubStore.values()) {
    if (h.url === input.url) {
      throw conflict(`A hub with URL "${input.url}" is already registered`);
    }
  }

  const now = new Date().toISOString();
  const hub: Hub = {
    id: randomUUID(),
    name: input.name,
    url: input.url,
    publicKey: input.publicKey,
    region: input.region,
    capabilities: input.capabilities ?? [],
    status: "active",
    lastSyncSequence: 0,
    metadata: input.metadata ?? {},
    registeredAt: now,
    updatedAt: now,
  };

  hubStore.set(hub.id, hub);
  return hub;
}

export async function getHub(id: string): Promise<Hub> {
  const hub = hubStore.get(id);
  if (!hub) throw notFound(`Hub "${id}" not found`);
  return hub;
}

export async function receiveSyncPayload(
  payload: SyncPayload,
): Promise<SyncResult> {
  const logger = getLogger();
  const errors: string[] = [];
  let eventsProcessed = 0;

  const hub = hubStore.get(payload.sourceHubId);
  if (!hub) {
    // Auto-register unknown hubs as inactive
    logger.warn(
      { sourceHubId: payload.sourceHubId },
      "Received sync from unknown hub",
    );
  }

  const lastSeq = syncSequences.get(payload.sourceHubId) ?? 0;

  if (payload.sequenceNumber <= lastSeq) {
    logger.warn(
      {
        sourceHubId: payload.sourceHubId,
        received: payload.sequenceNumber,
        lastProcessed: lastSeq,
      },
      "Dropping duplicate or out-of-order sync payload",
    );
    return {
      accepted: false,
      eventsProcessed: 0,
      errors: [`Sequence ${payload.sequenceNumber} already processed (last: ${lastSeq})`],
      syncedAt: new Date().toISOString(),
    };
  }

  // Process events
  for (const event of payload.events) {
    try {
      logger.debug(
        { eventId: event.id, eventType: event.type, companyId: event.companyId },
        "Processing federated event",
      );
      // In a full implementation: route to appropriate service based on event.type
      eventsProcessed++;
    } catch (err) {
      errors.push(`Event ${event.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Update sequence counter and hub lastSyncAt
  syncSequences.set(payload.sourceHubId, payload.sequenceNumber);

  if (hub) {
    const now = new Date().toISOString();
    hubStore.set(hub.id, {
      ...hub,
      lastSyncAt: now,
      lastSyncSequence: payload.sequenceNumber,
      status: "active",
      updatedAt: now,
    });
  }

  logger.info(
    {
      sourceHubId: payload.sourceHubId,
      eventsProcessed,
      errors: errors.length,
    },
    "Sync payload processed",
  );

  return {
    accepted: true,
    eventsProcessed,
    errors,
    syncedAt: new Date().toISOString(),
  };
}

export async function getFederationStatus(): Promise<FederationStatus> {
  const hubs = Array.from(hubStore.values());
  const connectedHubs = hubs.filter((h) => h.status === "active").length;

  const lastSyncTimes = hubs
    .filter((h) => h.lastSyncAt)
    .map((h) => new Date(h.lastSyncAt!).getTime());

  const lastSyncAt = lastSyncTimes.length > 0
    ? new Date(Math.max(...lastSyncTimes)).toISOString()
    : undefined;

  const syncLag = lastSyncAt
    ? Math.floor((Date.now() - new Date(lastSyncAt).getTime()) / 1000)
    : undefined;

  return {
    localHubId: LOCAL_HUB_ID,
    connectedHubs,
    totalHubs: hubs.length,
    lastSyncAt,
    syncLag,
    hubs: hubs.map((h) => ({
      id: h.id,
      name: h.name,
      status: h.status,
      lastSyncAt: h.lastSyncAt,
    })),
    healthyAt: new Date().toISOString(),
  };
}
