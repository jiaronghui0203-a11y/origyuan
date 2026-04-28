import { randomUUID } from "node:crypto";
import { buildResponse } from "../utils/response.js";

export function createQueueService({ taskService, logger, maxRetries = 3 }) {
  const pending = [];
  const history = [];
  const cancelRequested = new Set();
  let activeTask = null;
  let running = false;

  function enqueueTask(taskInput = {}) {
    const task = {
      id: randomUUID(),
      type: taskInput.type || "browser",
      payload: taskInput,
      priority: Number.parseInt(taskInput.priority ?? "5", 10),
      attempts: 0,
      maxRetries: Number.parseInt(taskInput.maxRetries ?? `${maxRetries}`, 10),
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      result: null,
      error: null
    };

    pending.push(task);
    sortPending();
    logger.info("task_enqueued", publicTask(task));
    processQueue();

    return buildResponse({
      source: "task-service",
      message: "Task queued for local mock execution.",
      data: { task: publicTask(task), queue: getStatus() }
    });
  }

  async function processQueue() {
    if (running) {
      return;
    }

    running = true;

    try {
      while (pending.length > 0) {
        const task = pending.shift();
        await executeWithRetry(task);
      }
    } finally {
      running = false;
    }
  }

  async function executeWithRetry(task) {
    activeTask = task;
    task.status = "running";
    task.updatedAt = new Date().toISOString();

    while (task.attempts < task.maxRetries) {
      if (cancelRequested.has(task.id)) {
        task.status = "canceled";
        task.error = "Task canceled before next attempt.";
        task.updatedAt = new Date().toISOString();
        cancelRequested.delete(task.id);
        logger.info("task_canceled", publicTask(task));
        history.unshift(publicTask(task));
        trimHistory();
        activeTask = null;
        return;
      }

      task.attempts += 1;
      logger.info("task_attempt_started", publicTask(task));

      try {
        task.result = await taskService.executeTask(task.payload);
        task.status = task.result.ok ? "succeeded" : "failed";
        task.updatedAt = new Date().toISOString();

        if (task.status === "succeeded") {
          logger.info("task_succeeded", publicTask(task));
          history.unshift(publicTask(task));
          trimHistory();
          activeTask = null;
          return;
        }

        task.error = task.result.message;
        logger.error("task_attempt_failed", publicTask(task));
      } catch (error) {
        task.error = error.message;
        task.status = "failed";
        task.updatedAt = new Date().toISOString();
        logger.error("task_attempt_error", publicTask(task));
      }
    }

    logger.error("task_failed_after_retries", publicTask(task));
    history.unshift(publicTask(task));
    trimHistory();
    activeTask = null;
  }

  function getStatus() {
    return {
      running,
      activeTask: activeTask ? publicTask(activeTask) : null,
      pendingCount: pending.length,
      historyCount: history.length,
      pending: pending.map(publicTask),
      recentHistory: history.slice(0, 20)
    };
  }

  function getHistory(limit = 50) {
    return history.slice(0, limit);
  }

  function getTask(taskId) {
    if (activeTask?.id === taskId) {
      return publicTask(activeTask);
    }

    const pendingTask = pending.find((task) => task.id === taskId);
    if (pendingTask) {
      return publicTask(pendingTask);
    }

    return history.find((task) => task.id === taskId) || null;
  }

  function cancelTask(taskId) {
    const pendingIndex = pending.findIndex((task) => task.id === taskId);
    if (pendingIndex >= 0) {
      const [task] = pending.splice(pendingIndex, 1);
      task.status = "canceled";
      task.error = "Task canceled while pending.";
      task.updatedAt = new Date().toISOString();
      const publicCanceledTask = publicTask(task);
      history.unshift(publicCanceledTask);
      trimHistory();
      logger.info("task_canceled", publicCanceledTask);

      return buildResponse({
        source: "task-service",
        message: "Pending task canceled.",
        data: { task: publicCanceledTask }
      });
    }

    if (activeTask?.id === taskId) {
      cancelRequested.add(taskId);
      activeTask.status = "cancel_requested";
      activeTask.updatedAt = new Date().toISOString();
      logger.info("task_cancel_requested", publicTask(activeTask));

      return buildResponse({
        source: "task-service",
        message: "Cancel requested for running task.",
        data: { task: publicTask(activeTask) }
      });
    }

    const completedTask = history.find((task) => task.id === taskId);
    if (completedTask) {
      return buildResponse({
        ok: false,
        source: "task-service",
        message: "Task already completed and cannot be canceled.",
        data: { task: completedTask }
      });
    }

    return buildResponse({
      ok: false,
      source: "task-service",
      message: "Task not found.",
      data: { taskId }
    });
  }

  function sortPending() {
    pending.sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));
  }

  function trimHistory() {
    if (history.length > 100) {
      history.length = 100;
    }
  }

  function publicTask(task) {
    return {
      id: task.id,
      type: task.type,
      priority: task.priority,
      attempts: task.attempts,
      maxRetries: task.maxRetries,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      result: task.result,
      error: task.error
    };
  }

  return {
    enqueueTask,
    cancelTask,
    getTask,
    getStatus,
    getHistory,
    processQueue
  };
}
