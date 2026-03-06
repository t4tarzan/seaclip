import { Router } from "express";
import { z } from "zod";
import { requireAuth, validate } from "../middleware/index.js";
import * as hubFederationService from "../services/hub-federation.js";

const router = Router();

const RegisterHubSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  publicKey: z.string().optional(),
  region: z.string().max(64).optional(),
  capabilities: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});

const SyncPayloadSchema = z.object({
  sourceHubId: z.string().min(1),
  sequenceNumber: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  events: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      companyId: z.string().optional(),
      payload: z.record(z.unknown()),
      occurredAt: z.string().datetime(),
    }),
  ),
  checksum: z.string().optional(),
});

// GET /api/federation/hubs — list connected hubs
router.get("/hubs", requireAuth, async (req, res, next) => {
  try {
    const hubs = await hubFederationService.listHubs();
    res.json({ data: hubs, count: hubs.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/federation/hubs — register a hub
router.post("/hubs", requireAuth, validate(RegisterHubSchema), async (req, res, next) => {
  try {
    const hub = await hubFederationService.registerHub(req.body);
    res.status(201).json(hub);
  } catch (err) {
    next(err);
  }
});

// POST /api/federation/sync — receive sync payload from another hub
router.post("/sync", validate(SyncPayloadSchema), async (req, res, next) => {
  try {
    const result = await hubFederationService.receiveSyncPayload(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/federation/status — federation health
router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const status = await hubFederationService.getFederationStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

export { router as hubFederationRouter };
