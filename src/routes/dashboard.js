import express from "express";

export function createDashboardRoutes(queueService) {
  const router = express.Router();

  router.get("/", (req, res) => {
    const status = queueService.getStatus();
    const rows = status.recentHistory.map((task) => `
      <tr>
        <td><a href="/panel/tasks/${escapeHtml(task.id)}">${escapeHtml(task.id)}</a></td>
        <td>${escapeHtml(task.type)}</td>
        <td>${task.priority}</td>
        <td>${task.attempts}/${task.maxRetries}</td>
        <td>${escapeHtml(task.status)}</td>
        <td>${escapeHtml(task.updatedAt)}</td>
      </tr>
    `).join("");

    res.type("html").send(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Origyuan Local Control Panel</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; background: #f7f7f8; color: #1f2328; }
    main { max-width: 1080px; margin: 0 auto; }
    section { background: white; border: 1px solid #d8dee4; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    label { display: block; margin: 10px 0 4px; font-weight: 600; }
    input, select, textarea { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #d0d7de; border-radius: 6px; }
    button { margin-top: 12px; padding: 9px 14px; border: 0; border-radius: 6px; background: #1f883d; color: white; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #d8dee4; padding: 8px; text-align: left; font-size: 13px; }
    code { background: #eef1f4; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
  <main>
    <h1>Origyuan Local Control Panel</h1>
    <section>
      <h2>Queue Status</h2>
      <p>Running: <code>${status.running}</code></p>
      <p>Pending: <code>${status.pendingCount}</code></p>
      <p>History: <code>${status.historyCount}</code></p>
    </section>
    <section>
      <h2>Manual Mock Task</h2>
      <form method="post" action="/panel/tasks">
        <label>Type</label>
        <select name="type">
          <option value="browser">browser</option>
          <option value="vps">vps</option>
          <option value="openclaw">openclaw</option>
          <option value="fail">fail</option>
        </select>
        <label>Priority</label>
        <input name="priority" value="5">
        <label>Command / Task Payload</label>
        <textarea name="value" rows="4">echo local mock task</textarea>
        <button type="submit">Run Mock Task</button>
      </form>
    </section>
    <section>
      <h2>Recent Task History</h2>
      <table>
        <thead><tr><th>ID</th><th>Type</th><th>Priority</th><th>Attempts</th><th>Status</th><th>Updated</th></tr></thead>
        <tbody>${rows || "<tr><td colspan=\"6\">No task history yet.</td></tr>"}</tbody>
      </table>
    </section>
  </main>
</body>
</html>`);
  });

  router.post("/tasks", (req, res) => {
    const type = req.body.type || "browser";
    const value = req.body.value || "";
    const task = {
      type,
      priority: req.body.priority || 5,
      maxRetries: req.body.maxRetries || 3,
      reason: type === "fail" ? value || "panel forced failure" : undefined,
      profileId: type === "browser" ? value || "panel-profile" : undefined,
      command: type === "vps" ? value || "echo local mock task" : undefined,
      taskName: type === "openclaw" ? value || "panel-task" : undefined,
      payload: type === "openclaw" ? { source: "panel" } : undefined
    };

    queueService.enqueueTask(task);
    res.redirect("/panel");
  });

  router.get("/tasks/:taskId", (req, res) => {
    const task = queueService.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).type("html").send("<h1>Task not found</h1>");
    }

    const canCancel = task.status === "pending" || task.status === "running" || task.status === "cancel_requested";

    res.type("html").send(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Task ${escapeHtml(task.id)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; background: #f7f7f8; color: #1f2328; }
    main { max-width: 960px; margin: 0 auto; }
    section { background: white; border: 1px solid #d8dee4; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    pre { overflow: auto; background: #f6f8fa; padding: 12px; border-radius: 6px; }
    button { padding: 9px 14px; border: 0; border-radius: 6px; background: #cf222e; color: white; cursor: pointer; }
    a { color: #0969da; }
  </style>
</head>
<body>
  <main>
    <p><a href="/panel">Back to panel</a></p>
    <section>
      <h1>Task Detail</h1>
      <p>ID: <code>${escapeHtml(task.id)}</code></p>
      <p>Type: <code>${escapeHtml(task.type)}</code></p>
      <p>Status: <code>${escapeHtml(task.status)}</code></p>
      <p>Attempts: <code>${task.attempts}/${task.maxRetries}</code></p>
      <p>Priority: <code>${task.priority}</code></p>
      ${canCancel ? `<form method="post" action="/panel/tasks/${escapeHtml(task.id)}/cancel"><button type="submit">Cancel Task</button></form>` : ""}
    </section>
    <section>
      <h2>Raw Task</h2>
      <pre>${escapeHtml(JSON.stringify(task, null, 2))}</pre>
    </section>
  </main>
</body>
</html>`);
  });

  router.post("/tasks/:taskId/cancel", (req, res) => {
    queueService.cancelTask(req.params.taskId);
    res.redirect(`/panel/tasks/${encodeURIComponent(req.params.taskId)}`);
  });

  return router;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
