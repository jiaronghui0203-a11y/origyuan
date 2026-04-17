import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "./server.js";

function testConfig() {
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
    },
    tasks: {
      defaultTimeoutMs: 30000
    },
    queue: {
      maxRetries: 3
    },
    logs: {
      dir: "logs/test"
    }
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
