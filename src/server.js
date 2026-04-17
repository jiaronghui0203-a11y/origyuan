import http from "node:http";
import { fileURLToPath } from "node:url";
import express from "express";
import { createFingerprintBrowserAdapter } from "./adapters/fingerprintBrowserAdapter.js";
import { createOpenClawAdapter } from "./adapters/openclawAdapter.js";
import { createVpsAdapter } from "./adapters/vpsAdapter.js";
import { getConfig } from "./config.js";
import { createBrowserRoutes } from "./routes/browser.js";
import { createDashboardRoutes } from "./routes/dashboard.js";
import { createOpenClawRoutes } from "./routes/openclaw.js";
import { createTaskRoutes } from "./routes/task.js";
import { createVpsRoutes } from "./routes/vps.js";
import { createQueueService } from "./services/queueService.js";
import { createTaskService } from "./services/taskService.js";
import { createLogger } from "./utils/logger.js";
import { buildResponse } from "./utils/response.js";

const config = getConfig();

export function createApp(appConfig = config) {
  const app = express();
  const logger = createLogger(appConfig);
  const browserAdapter = createFingerprintBrowserAdapter(appConfig);
  const vpsAdapter = createVpsAdapter(appConfig);
  const openclawAdapter = createOpenClawAdapter(appConfig);
  const taskService = createTaskService({ browserAdapter, vpsAdapter, openclawAdapter });
  const queueService = createQueueService({
    taskService,
    logger,
    maxRetries: appConfig.queue.maxRetries
  });

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    const startedAt = performance.now();
    res.on("finish", () => {
      logger.request(req, res.statusCode, performance.now() - startedAt);
    });
    next();
  });

  app.get("/health", (req, res) => {
    res.json(buildResponse({
      source: "task-service",
      message: "Service is healthy.",
      data: {
        service: appConfig.appName,
        env: appConfig.appEnv,
        mode: appConfig.taskMode
      }
    }));
  });

  app.use("/api/browser", createBrowserRoutes(browserAdapter));
  app.use("/api/vps", createVpsRoutes(vpsAdapter));
  app.use("/api/openclaw", createOpenClawRoutes(openclawAdapter));
  app.use("/api/task", createTaskRoutes(taskService, queueService));
  app.use("/panel", createDashboardRoutes(queueService));

  app.use((req, res) => {
    res.status(404).json(buildResponse({
      ok: false,
      source: "task-service",
      message: "Route not found.",
      data: { path: req.originalUrl }
    }));
  });

  app.use((error, req, res, next) => {
    logger.error("http_error", {
      method: req.method,
      path: req.originalUrl,
      error: error.message
    });
    res.status(500).json(buildResponse({
      ok: false,
      source: "task-service",
      message: error.message,
      data: {}
    }));
  });

  return app;
}

export function createServer(appConfig = config) {
  return http.createServer(createApp(appConfig));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const server = createServer(config);
  server.listen(config.port, "0.0.0.0", () => {
    console.log(`${config.appName} listening on port ${config.port}`);
  });
}
