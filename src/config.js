export function getConfig(env = process.env) {
  return {
    appName: env.APP_NAME || "origyuan-automation-service",
    appEnv: env.APP_ENV || "local",
    port: Number.parseInt(env.APP_PORT || env.PORT || "3000", 10),
    taskMode: env.TASK_MODE || "mock",
    fingerprintBrowser: {
      url: env.FINGERPRINT_BROWSER_URL || "http://127.0.0.1:50325",
      tokenConfigured: Boolean(env.FINGERPRINT_BROWSER_TOKEN)
    },
    vps: {
      sshHost: env.VPS_SSH_HOST || "127.0.0.1",
      sshPort: Number.parseInt(env.VPS_SSH_PORT || "22", 10),
      sshUser: env.VPS_SSH_USER || "root",
      sshKeyPath: env.VPS_SSH_KEY_PATH || "~/.ssh/id_rsa"
    },
    openclaw: {
      baseUrl: env.OPENCLAW_BASE_URL || "http://127.0.0.1:8080",
      apiKeyConfigured: Boolean(env.OPENCLAW_API_KEY),
    },
    tasks: {
      defaultTimeoutMs: Number.parseInt(env.TASK_DEFAULT_TIMEOUT_MS || "30000", 10)
    },
    queue: {
      maxRetries: Number.parseInt(env.QUEUE_MAX_RETRIES || "3", 10)
    },
    logs: {
      dir: env.LOG_DIR || "logs"
    }
  };
}
