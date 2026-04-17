import { buildResponse } from "../utils/response.js";

export function createOpenClawAdapter(config) {
  return {
    async getStatus() {
      return buildResponse({
        source: "openclaw",
        message: "OpenClaw adapter is running in mock mode.",
        data: {
          mode: config.taskMode,
          connected: false,
          endpoint: config.openclaw.baseUrl,
          apiKeyConfigured: config.openclaw.apiKeyConfigured
        }
      });
    },

    async dispatch(taskName, payload = {}) {
      return buildResponse({
        source: "openclaw",
        message: "Mock OpenClaw task dispatched.",
        data: {
          taskName,
          payload,
          dispatchId: `mock-openclaw-${Date.now()}`
        }
      });
    }
  };
}
