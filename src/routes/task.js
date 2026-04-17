import express from "express";

export function createTaskRoutes(taskService, queueService) {
  const router = express.Router();

  router.post("/run", async (req, res) => {
    const payload = queueService.enqueueTask(req.body);
    res.status(202).json(payload);
  });

  router.get("/demo", async (req, res) => {
    res.json(await taskService.demo());
  });

  router.get("/queue", (req, res) => {
    res.json({
      ok: true,
      source: "task-service",
      message: "Local in-memory queue status.",
      data: queueService.getStatus(),
      ts: new Date().toISOString()
    });
  });

  router.get("/history", (req, res) => {
    res.json({
      ok: true,
      source: "task-service",
      message: "Local task history.",
      data: { history: queueService.getHistory() },
      ts: new Date().toISOString()
    });
  });

  router.get("/:taskId", (req, res) => {
    const task = queueService.getTask(req.params.taskId);
    res.status(task ? 200 : 404).json({
      ok: Boolean(task),
      source: "task-service",
      message: task ? "Task detail." : "Task not found.",
      data: { task },
      ts: new Date().toISOString()
    });
  });

  router.post("/:taskId/cancel", (req, res) => {
    const payload = queueService.cancelTask(req.params.taskId);
    res.status(payload.ok ? 200 : 409).json(payload);
  });

  return router;
}
