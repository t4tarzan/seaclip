import pino from "pino";
import type { Request, Response, NextFunction } from "express";
import { getConfig } from "../config.js";

let _logger: pino.Logger | null = null;

export function getLogger(): pino.Logger {
  if (_logger) return _logger;

  const config = getConfig();

  _logger = pino({
    level: config.logLevel,
    transport:
      config.nodeEnv !== "production"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname",
            },
          }
        : undefined,
  });

  return _logger;
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();
  const logger = getLogger();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level =
      res.statusCode >= 500
        ? "error"
        : res.statusCode >= 400
          ? "warn"
          : "info";

    logger[level]({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  });

  next();
}
