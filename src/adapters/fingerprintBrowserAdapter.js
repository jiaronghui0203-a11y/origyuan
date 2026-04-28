import { buildResponse } from "../utils/response.js";

export function createFingerprintBrowserAdapter(config) {
  return {
    async getBrowserStatus() {
      return buildResponse({
        source: "browser",
        message: "Fingerprint browser adapter is running in mock mode.",
        data: {
          mode: config.taskMode,
          connected: false,
          endpoint: config.fingerprintBrowser.url,
          tokenConfigured: config.fingerprintBrowser.tokenConfigured
        }
      });
    },

    async openProfile(profileId) {
      return buildResponse({
        source: "browser",
        message: "Mock browser profile opened.",
        data: {
          profileId,
          sessionId: `mock-browser-session-${profileId || "default"}`,
          wsEndpoint: "mock://fingerprint-browser/session"
        }
      });
    },

    async closeProfile(profileId) {
      return buildResponse({
        source: "browser",
        message: "Mock browser profile closed.",
        data: { profileId }
      });
    },

    async listProfiles() {
      return buildResponse({
        source: "browser",
        message: "Mock browser profiles listed.",
        data: {
          profiles: [
            { profileId: "demo-profile-1", name: "Local demo profile" }
          ]
        }
      });
    }
  };
}
