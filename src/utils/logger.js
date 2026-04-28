import { mkdirSync } from "node:fs";
import path from "node:path";
import winston from "winston";

export function createLogger(config) {
  const enabled = config.appEnv === "local" || config.appEnv === "development" || config.appEnv === "test";
  const logDir = path.resolve(config.logs?.dir || "logs");

  mkdirSync(logDir, { recursive: true });

  const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({ filename: path.join(logDir, "app.log") }),
      new winston.transports.File({ filename: path.join(logDir, "tasks.log"), level: "info" })
    ]
  });

  if (enabled) {
    logger.add(new winston.transports.Console({
      format: winston.format.printf((entry) => {
        const rest = { ...entry };
        delete rest.level;
        delete rest.message;
        delete rest.timestamp;
        return `${entry.level}: ${entry.message} ${JSON.stringify(rest)}`;
      })
    }));
  }

  return {
    request(req, statusCode, durationMs) {
      if (!enabled) {
        return;
      }

      logger.info("http_request", {
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode,
        durationMs: Number(durationMs.toFixed(1))
      });
    },
    info(message, data = {}) {
      logger.info(message, data);
    },
    error(message, data = {}) {
      logger.error(message, data);
    }
  };
}
