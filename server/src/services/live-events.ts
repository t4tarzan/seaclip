/**
 * live-events service — in-memory pub/sub for real-time events per company.
 *
 * Subscribers receive events synchronously via callbacks. The WebSocket
 * server in realtime/live-events-ws.ts forwards these to connected clients.
 */
import { getLogger } from "../middleware/logger.js";

export interface LiveEvent {
  type: string;
  [key: string]: unknown;
}

type EventCallback = (event: LiveEvent) => void;

// companyId → Set of callback functions
const subscribers = new Map<string, Set<EventCallback>>();

export function subscribeCompanyLiveEvents(
  companyId: string,
  callback: EventCallback,
): () => void {
  if (!subscribers.has(companyId)) {
    subscribers.set(companyId, new Set());
  }
  subscribers.get(companyId)!.add(callback);

  // Return unsubscribe function
  return () => {
    const subs = subscribers.get(companyId);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        subscribers.delete(companyId);
      }
    }
  };
}

export async function publishLiveEvent(
  companyId: string,
  event: LiveEvent,
): Promise<void> {
  const subs = subscribers.get(companyId);
  if (!subs || subs.size === 0) return;

  const enriched: LiveEvent = {
    ...event,
    companyId,
    timestamp: new Date().toISOString(),
  };

  const logger = getLogger();

  for (const callback of subs) {
    try {
      callback(enriched);
    } catch (err) {
      logger.error({ err, event: enriched.type }, "Error in live event subscriber");
    }
  }
}

export function getSubscriberCount(companyId: string): number {
  return subscribers.get(companyId)?.size ?? 0;
}

export function clearAllSubscribers(): void {
  subscribers.clear();
}
