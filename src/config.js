export function getConfig(env = process.env) {
  const approvedNorthboundModels = [
    "team/gpt-5-codex",
    "team/claude-sonnet",
    "team/gemini-pro",
    "backup/payg"
  ];

  return {
    appName: env.APP_NAME || "origyuan-automation-service",
    appEnv: env.APP_ENV || "local",
    port: Number.parseInt(env.APP_PORT || env.PORT || "3000", 10),
    taskMode: env.TASK_MODE || "hybrid",
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
      baseUrl: env.OPENCLAW_BASE_URL || "",
      apiKeyConfigured: Boolean(env.OPENCLAW_API_KEY),
      northProvider: "north",
      modelSlots: {
        primary: "north/team/gpt-5-codex",
        fallbacks: [
          "north/team/claude-sonnet",
          "north/backup/payg"
        ]
      }
    },
    northbound: {
      newApi: {
        baseUrl: env.NEW_API_BASE_URL || "",
        apiKey: env.NEW_API_API_KEY || "",
        apiKeyConfigured: Boolean(env.NEW_API_API_KEY),
        timeoutMs: Number.parseInt(env.NEW_API_TIMEOUT_MS || "3000", 10),
        approvedModels: approvedNorthboundModels
      }
    },
    southbound: {
      sub2api: {
        baseUrl: env.SUB2API_BASE_URL || "",
        apiKey: env.SUB2API_API_KEY || "",
        apiKeyConfigured: Boolean(env.SUB2API_API_KEY),
        timeoutMs: Number.parseInt(env.SUB2API_TIMEOUT_MS || "3000", 10),
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
        baseUrl: env.LEGACY_PROXY_BASE_URL || "",
        apiKey: env.LEGACY_PROXY_API_KEY || "",
        apiKeyConfigured: Boolean(env.LEGACY_PROXY_API_KEY)
      }
    },
    lab: {
      router9: {
        baseUrl: env.ROUTER9_BASE_URL || "",
        timeoutMs: Number.parseInt(env.ROUTER9_TIMEOUT_MS || "2000", 10)
      }
    },
    cloudflare: {
      zoneName: env.CLOUDFLARE_ZONE_NAME || "",
      apiHostname: env.CLOUDFLARE_API_HOSTNAME || "",
      legacyHostname: env.CLOUDFLARE_LEGACY_HOSTNAME || "",
      accessAudience: env.CLOUDFLARE_ACCESS_AUDIENCE || ""
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
