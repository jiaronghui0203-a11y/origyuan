import { buildResponse } from "../utils/response.js";

export function createTaskService({ browserAdapter, vpsAdapter, openclawAdapter }) {
  async function executeTask(body = {}) {
    const type = body.type;

    if (type === "fail") {
      return buildResponse({
        ok: false,
        source: "task-service",
        message: "Forced local mock failure for retry testing.",
        data: {
          type,
          reason: body.reason || "mock failure"
        }
      });
    }

    if (type === "browser") {
      const result = await browserAdapter.openProfile(body.profileId || body.payload?.profileId || "demo-profile");
      return buildResponse({
        source: "task-service",
        message: "Browser task completed in mock mode.",
        data: { type, result }
      });
    }

    if (type === "vps") {
      const result = await vpsAdapter.mockRunCommand(body.command || body.payload?.command || "echo mock");
      return buildResponse({
        source: "task-service",
        message: "VPS task completed in mock mode.",
        data: { type, result }
      });
    }

    if (type === "openclaw") {
      const result = await openclawAdapter.dispatch(body.taskName || "demo-task", body.payload || {});
      return buildResponse({
        source: "task-service",
        message: "OpenClaw task completed in mock mode.",
        data: { type, result }
      });
    }

    return buildResponse({
      ok: false,
      source: "task-service",
      message: "Unsupported task type. Use browser, vps, or openclaw.",
      data: { type }
    });
  }

  return {
    executeTask,
    runTask: executeTask,
    async demo() {
      const browser = await browserAdapter.openProfile("demo-profile-1");
      const openclaw = await openclawAdapter.dispatch("demo-collaboration-task", {
        profileId: "demo-profile-1",
        intent: "local mock orchestration"
      });
      const vps = await vpsAdapter.mockRunCommand("echo prepare deployment workspace");

      return buildResponse({
        source: "task-service",
        message: "Mock collaboration demo completed.",
        data: {
          browser,
          openclaw,
          vps
        }
      });
    }
  };
}
