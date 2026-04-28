import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";
import { createServer } from "./server.js";

function testConfig(overrides = {}) {
  return {
    appName: "origyuan-automation-service",
    appEnv: "test",
    taskMode: "mock",
    fingerprintBrowser: {
      url: "http://127.0.0.1:50325",
      tokenConfigured: true
    },
    vps: {
      sshHost: "127.0.0.1",
      sshPort: 22,
      sshUser: "root",
      sshKeyPath: "~/.ssh/id_rsa"
    },
    openclaw: {
      baseUrl: "http://127.0.0.1:8080",
      apiKeyConfigured: false,
      northProvider: "north",
      modelSlots: {
        primary: "north/team/gpt-5-codex",
        fallbacks: ["north/team/claude-sonnet", "north/backup/payg"]
      }
    },
    northbound: {
      newApi: {
        baseUrl: "",
        apiKey: "",
        apiKeyConfigured: false,
        timeoutMs: 500,
        approvedModels: [
          "team/gpt-5-codex",
          "team/claude-sonnet",
          "team/gemini-pro",
          "backup/payg"
        ]
      }
    },
    southbound: {
      sub2api: {
        baseUrl: "",
        apiKey: "",
        apiKeyConfigured: false,
        timeoutMs: 500,
        pools: [
          "openai-codex-prod",
          "anthropic-native-prod",
          "anthropic-antigravity-prod",
          "gemini-prod",
          "payg-backup",
          "canary",
          "quarantine"
        ]
      }
    },
    legacy: {
      cliProxyApi: {
        baseUrl: "",
        apiKey: "",
        apiKeyConfigured: false
      }
    },
    lab: {
      router9: {
        baseUrl: "http://127.0.0.1:20128",
        timeoutMs: 500
      }
    },
    cloudflare: {
      zoneName: "",
      apiHostname: "",
      legacyHostname: "",
      accessAudience: ""
    },
    tasks: {
      defaultTimeoutMs: 30000
    },
    queue: {
      maxRetries: 3
    },
    logs: {
      dir: "logs/test"
    },
    ...overrides
  };
}

test("GET /health returns service status", async () => {
  const server = createServer(testConfig());
  await usingServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.source, "task-service");
    assert.equal(body.data.service, "origyuan-automation-service");
    assert.equal(body.data.env, "test");
  });
});

test("GET /api/browser/status returns mock browser status", async () => {
  const server = createServer(testConfig());
  await usingServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/browser/status`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.source, "browser");
    assert.equal(body.data.connected, false);
  });
});

test("POST /api/vps/run returns mock command result", async () => {
  const server = createServer(testConfig());
  await usingServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/vps/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ command: "echo hello" })
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.source, "vps");
    assert.equal(body.data.command, "echo hello");
    assert.equal(body.data.exitCode, 0);
  });
});

test("GET /api/openclaw/status returns mock OpenClaw status", async () => {
  const server = createServer(testConfig());
  await usingServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/openclaw/status`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.source, "openclaw");
    assert.equal(body.data.connected, false);
  });
});

test("GET /api/topology/status returns current topology", async () => {
  const server = createServer(testConfig({
    taskMode: "hybrid",
    cloudflare: {
      zoneName: "example.com",
      apiHostname: "api.example.com",
      legacyHostname: "legacy-api.example.com",
      accessAudience: "aud"
    }
  }));
  await usingServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/topology/status`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.deepEqual(body.data.chain, [
      "cc-switch",
      "new-api",
      "sub2api",
      "22 authenticated account pools"
    ]);
    assert.equal(body.data.nodes.ccSwitch.enabled, true);
    assert.equal(body.data.cloudflare.apiHostname, "api.example.com");
  });
});

test("GET /api/providers/status degrades cleanly when providers are not configured", async () => {
  const server = createServer(testConfig({ taskMode: "hybrid" }));
  await usingServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/providers/status`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.data.providers.newApi.configured, false);
    assert.equal(body.data.providers.sub2api.configured, false);
    assert.match(body.data.providers.newApi.summary, /not configured/i);
  });
});

test("GET /api/providers/models only exposes approved aliases", async () => {
  const upstream = await startStubServer({
    "/v1/models": {
      statusCode: 200,
      body: {
        data: [
          { id: "team/gpt-5-codex" },
          { id: "team/claude-sonnet" },
          { id: "unapproved/internal-model" }
        ]
      }
    }
  });

  const server = createServer(testConfig({
    taskMode: "hybrid",
    northbound: {
      newApi: {
        baseUrl: upstream.baseUrl,
        apiKey: "",
        apiKeyConfigured: false,
        timeoutMs: 500,
        approvedModels: [
          "team/gpt-5-codex",
          "team/claude-sonnet",
          "team/gemini-pro",
          "backup/payg"
        ]
      }
    }
  }));

  try {
    await usingServer(server, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/providers/models`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.data.models.length, 4);
      assert.equal(body.data.models.find((model) => model.id === "team/gpt-5-codex").available, true);
      assert.equal(body.data.models.find((model) => model.id === "team/gemini-pro").available, false);
      assert.equal(body.data.upstreamModelCount, 3);
    });
  } finally {
    await upstream.close();
  }
});

test("GET /api/openclaw/status aggregates partial upstream failures without crashing", async () => {
  const openclawUpstream = await startStubServer({
    "/health": {
      statusCode: 200,
      body: { ok: true }
    }
  });
  const northboundUpstream = await startStubServer({
    "/v1/models": {
      statusCode: 200,
      body: {
        data: [
          { id: "team/gpt-5-codex" },
          { id: "team/claude-sonnet" },
          { id: "team/gemini-pro" },
          { id: "backup/payg" }
        ]
      }
    }
  });

  const server = createServer(testConfig({
    taskMode: "hybrid",
    openclaw: {
      baseUrl: openclawUpstream.baseUrl,
      apiKeyConfigured: false,
      northProvider: "north",
      modelSlots: {
        primary: "north/team/gpt-5-codex",
        fallbacks: ["north/team/claude-sonnet", "north/backup/payg"]
      }
    },
    northbound: {
      newApi: {
        baseUrl: northboundUpstream.baseUrl,
        apiKey: "",
        apiKeyConfigured: false,
        timeoutMs: 500,
        approvedModels: [
          "team/gpt-5-codex",
          "team/claude-sonnet",
          "team/gemini-pro",
          "backup/payg"
        ]
      }
    },
    southbound: {
      sub2api: {
        baseUrl: "http://127.0.0.1:9",
        apiKey: "",
        apiKeyConfigured: false,
        timeoutMs: 150,
        pools: [
          "openai-codex-prod",
          "anthropic-native-prod",
          "anthropic-antigravity-prod",
          "gemini-prod",
          "payg-backup",
          "canary",
          "quarantine"
        ]
      }
    }
  }));

  try {
    await usingServer(server, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/openclaw/status`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.data.connected, false);
      assert.equal(body.data.checks.find((check) => check.key === "openclaw").ok, true);
      assert.equal(body.data.checks.find((check) => check.key === "newApi").ok, true);
      assert.equal(body.data.checks.find((check) => check.key === "sub2api").ok, false);
      assert.equal(body.data.models.every((model) => model.available), true);
    });
  } finally {
    await openclawUpstream.close();
    await northboundUpstream.close();
  }
});

test("POST /api/task/run dispatches a browser task", async () => {
  const server = createServer(testConfig());
  await usingServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/task/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "browser", profileId: "demo-profile-1" })
    });
    const body = await response.json();

    assert.equal(response.status, 202);
    assert.equal(body.ok, true);
    assert.equal(body.source, "task-service");
    assert.equal(body.data.task.type, "browser");
    assert.equal(body.data.task.maxRetries, 3);
  });
});

test("GET /api/task/queue returns queue status", async () => {
  const server = createServer(testConfig());
  await usingServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/task/queue`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.source, "task-service");
    assert.equal(typeof body.data.pendingCount, "number");
  });
});

test("dashboard exposes sanitized read-only observability shortcuts", async () => {
  const server = createServer(testConfig());
  await usingServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/panel`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Navigation Observability Shortcuts/);
    assert.match(html, /Orchestrator Observability Map/);
    assert.match(html, /\/health/);
    assert.match(html, /\/panel/);
    assert.match(html, /\/api\/task\/queue/);
    assert.match(html, /\/api\/topology\/status/);
    assert.match(html, /\/api\/providers\/status/);

    const shortcutsHtml = html.match(/<h2>Navigation Observability Shortcuts<\/h2>[\s\S]*?<\/section>/)?.[0] || "";
    const mapHtml = html.match(/<h2>Orchestrator Observability Map<\/h2>[\s\S]*?<\/section>/)?.[0] || "";

    assert.doesNotMatch(shortcutsHtml, /<form/i);
    assert.doesNotMatch(shortcutsHtml, /<button/i);
    assert.doesNotMatch(mapHtml, /<form/i);
    assert.doesNotMatch(mapHtml, /<button/i);
    assert.doesNotMatch(html, />\s*Approve\s*<\/button>/i);
    assert.doesNotMatch(html, />\s*Reject\s*<\/button>/i);
    assert.doesNotMatch(html, />\s*Resume\s*<\/button>/i);
    assert.doesNotMatch(html, /\/panel\/workflows\/[^"' <]+\/actions\/[^"' <]+/);
    assert.doesNotMatch(html, /\/panel\/workflows\/[^"' <]+\/timeline/);
  });
});

test("mock failure task retries three times and is visible in detail", async () => {
  const server = createServer(testConfig());
  await usingServer(server, async (baseUrl) => {
    const enqueueResponse = await fetch(`${baseUrl}/api/task/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "fail", priority: 1, maxRetries: 3, reason: "test retry" })
    });
    const enqueueBody = await enqueueResponse.json();
    const taskId = enqueueBody.data.task.id;

    await waitFor(async () => {
      const response = await fetch(`${baseUrl}/api/task/${taskId}`);
      const body = await response.json();
      return body.data.task?.status === "failed";
    });

    const detailResponse = await fetch(`${baseUrl}/api/task/${taskId}`);
    const detailBody = await detailResponse.json();

    assert.equal(detailResponse.status, 200);
    assert.equal(detailBody.data.task.status, "failed");
    assert.equal(detailBody.data.task.attempts, 3);
    assert.equal(detailBody.data.task.error, "Forced local mock failure for retry testing.");
  });
});

test("completed task cannot be canceled", async () => {
  const server = createServer(testConfig());
  await usingServer(server, async (baseUrl) => {
    const enqueueResponse = await fetch(`${baseUrl}/api/task/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "browser", profileId: "cancel-check-profile" })
    });
    const enqueueBody = await enqueueResponse.json();
    const taskId = enqueueBody.data.task.id;

    await waitFor(async () => {
      const response = await fetch(`${baseUrl}/api/task/${taskId}`);
      const body = await response.json();
      return body.data.task?.status === "succeeded";
    });

    const cancelResponse = await fetch(`${baseUrl}/api/task/${taskId}/cancel`, { method: "POST" });
    const cancelBody = await cancelResponse.json();

    assert.equal(cancelResponse.status, 409);
    assert.equal(cancelBody.ok, false);
    assert.equal(cancelBody.message, "Task already completed and cannot be canceled.");
  });
});

async function usingServer(server, callback) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await callback(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function waitFor(predicate, timeoutMs = 1000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error("Timed out waiting for condition.");
}

async function startStubServer(routes) {
  const server = http.createServer((req, res) => {
    const route = routes[req.url];
    if (!route) {
      res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, path: req.url }));
      return;
    }

    const headers = route.headers || { "content-type": "application/json; charset=utf-8" };
    res.writeHead(route.statusCode || 200, headers);
    res.end(JSON.stringify(route.body || {}));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    })
  };
}
