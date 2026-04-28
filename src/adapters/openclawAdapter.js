import { buildResponse } from "../utils/response.js";

export function createOpenClawAdapter(config, controlPlaneService) {
  return {
    async getStatus() {
      if (controlPlaneService) {
        return controlPlaneService.getOpenClawStatus();
      }

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
        message: "Dry-run OpenClaw task prepared. No real production dispatch was executed.",
        data: {
          taskName,
          payload,
          dispatchId: `mock-openclaw-${Date.now()}`,
          mode: config.taskMode
        }
      });
    }
  };
}
