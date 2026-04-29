import express from "express";

export function createDashboardRoutes(queueService, controlPlaneService) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const status = queueService.getStatus();
    const [topology, providers, models] = await Promise.all([
      controlPlaneService.getTopologyStatus(),
      controlPlaneService.getProvidersStatus(),
      controlPlaneService.getApprovedModels()
    ]);
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
    const providerRows = Object.values(providers.data.providers).map((provider) => `
      <tr>
        <td>${escapeHtml(provider.label)}</td>
        <td>${escapeHtml(provider.role)}</td>
        <td>${renderBadge(provider.ok ? "healthy" : provider.configured ? "degraded" : "inactive")}</td>
        <td>${provider.latencyMs == null ? "-" : `${provider.latencyMs} ms`}</td>
        <td>${escapeHtml(provider.checkedUrl || provider.baseUrl || "-")}</td>
        <td>${escapeHtml(provider.summary)}</td>
      </tr>
    `).join("");
    const modelRows = models.data.models.map((model) => `
      <tr>
        <td><code>${escapeHtml(model.id)}</code></td>
        <td>${renderBadge(model.available ? "available" : "missing")}</td>
      </tr>
    `).join("");
    const topologyRows = Object.entries(topology.data.nodes).map(([key, node]) => `
      <tr>
        <td>${escapeHtml(key)}</td>
        <td>${escapeHtml(node.role)}</td>
        <td>${renderBadge(node.ok === undefined ? "planned" : node.ok ? "healthy" : node.configured ? "degraded" : "inactive")}</td>
        <td>${escapeHtml(node.hostname || node.baseUrl || node.owner || "-")}</td>
      </tr>
    `).join("");

    res.type("html").send(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Origyuan Local Control Panel</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; background: #f4f7fb; color: #1f2328; }
    main { max-width: 1200px; margin: 0 auto; }
    section { background: white; border: 1px solid #d8dee4; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    label { display: block; margin: 10px 0 4px; font-weight: 600; }
    input, select, textarea { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #d0d7de; border-radius: 6px; }
    button { margin-top: 12px; padding: 9px 14px; border: 0; border-radius: 6px; background: #1f883d; color: white; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #d8dee4; padding: 8px; text-align: left; font-size: 13px; }
    code { background: #eef1f4; padding: 2px 4px; border-radius: 4px; }
    .badge { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 12px; font-weight: 700; }
    .badge.healthy, .badge.available { background: #dafbe1; color: #116329; }
    .badge.degraded, .badge.missing { background: #fff8c5; color: #9a6700; }
    .badge.inactive, .badge.planned { background: #eaeef2; color: #57606a; }
  </style>
</head>
<body>
  <main>
    <h1>Origyuan Local Control Panel</h1>
    <section>
      <h2>Control Plane Summary</h2>
      <p>Mode: <code>${escapeHtml(topology.data.mode)}</code></p>
      <p>Chain: <code>${escapeHtml(topology.data.chain.join(" -> "))}</code></p>
      <p>Cloudflare API Hostname: <code>${escapeHtml(topology.data.cloudflare.apiHostname || "not configured")}</code></p>
      <p>Queue Running/Pending/History: <code>${status.running}</code> / <code>${status.pendingCount}</code> / <code>${status.historyCount}</code></p>
    </section>
    ${renderNavigationObservabilityShortcuts()}
    ${renderOrchestratorObservabilityMap()}
    ${renderReleaseHygiene()}
    <div class="grid">
      <section>
        <h2>Topology</h2>
        <table>
          <thead><tr><th>Node</th><th>Role</th><th>Status</th><th>Endpoint</th></tr></thead>
          <tbody>${topologyRows}</tbody>
        </table>
      </section>
      <section>
        <h2>Approved Northbound Models</h2>
        <p>Primary: <code>north/team/gpt-5-codex</code></p>
        <p>Fallbacks: <code>north/team/claude-sonnet</code>, <code>north/backup/payg</code></p>
        <table>
          <thead><tr><th>Alias</th><th>Status</th></tr></thead>
          <tbody>${modelRows}</tbody>
        </table>
      </section>
    </div>
    <section>
      <h2>Provider Health & Latency</h2>
      <table>
        <thead><tr><th>Provider</th><th>Role</th><th>Status</th><th>Latency</th><th>Checked URL</th><th>Summary</th></tr></thead>
        <tbody>${providerRows}</tbody>
      </table>
    </section>
    <div class="grid">
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
    </div>
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

function renderNavigationObservabilityShortcuts() {
  return `
    <section>
      <h2>Navigation Observability Shortcuts</h2>
      <ul>
        <li><a href="/health">Health endpoint</a></li>
        <li><a href="/panel">Dashboard home</a></li>
        <li><a href="/api/task/queue">Task queue status</a></li>
        <li><a href="/api/topology/status">Topology status</a></li>
        <li><a href="/api/providers/status">Provider health status</a></li>
        <li><a href="/api/providers/models">Approved model aliases</a></li>
      </ul>
      <p>Task detail links are available from Recent Task History when local task records exist.</p>
      <p>No workflow action, timeline, or control routes are linked from this dashboard-only release.</p>
    </section>`;
}

function renderOrchestratorObservabilityMap() {
  return `
    <section>
      <h2>Orchestrator Observability Map</h2>
      <ul>
        <li>Codex / local execution boundary: local panel and mock task controls stay inside this service.</li>
        <li>9Router / model ingress boundary: model ingress remains represented by existing provider and topology status.</li>
        <li>Task service / routing observability boundary: task queue, provider health, and approved aliases are read-only entry points here.</li>
        <li>Execution safety boundary: this section adds no API, no external dependency, no credential display, and no automatic execution path.</li>
      </ul>
    </section>`;
}

function renderReleaseHygiene() {
  return `
    <section>
      <h2>Release Hygiene</h2>
      <ul>
        <li>Current branch should be a release/* branch</li>
        <li>Keep feature-branch protected from direct push</li>
        <li>Prefer small scoped PRs</li>
        <li>Avoid provider / gateway / execution-chain changes in observability-only releases</li>
        <li>Verify tests and diff check before PR</li>
      </ul>
    </section>`;
}

function renderBadge(status) {
  return `<span class="badge ${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}
