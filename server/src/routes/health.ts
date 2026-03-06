import { Router } from "express";

const router = Router();

const startTime = Date.now();

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    version: process.env.npm_package_version ?? "0.1.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
