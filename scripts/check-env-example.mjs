import { readFileSync } from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.example");
const content = readFileSync(envPath, "utf8");
const keys = new Set(
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=", 1)[0])
);

const requiredKeys = [
  "APP_NAME",
  "APP_ENV",
  "APP_PORT",
  "OPENCLAW_BASE_URL",
  "OPENCLAW_API_KEY",
  "NEW_API_BASE_URL",
  "NEW_API_API_KEY",
  "NEW_API_TIMEOUT_MS",
  "SUB2API_BASE_URL",
  "SUB2API_API_KEY",
  "SUB2API_TIMEOUT_MS",
  "LEGACY_PROXY_BASE_URL",
  "LEGACY_PROXY_API_KEY",
  "ROUTER9_BASE_URL",
  "CLOUDFLARE_ZONE_NAME",
  "CLOUDFLARE_API_HOSTNAME",
  "CLOUDFLARE_LEGACY_HOSTNAME",
  "CLOUDFLARE_ACCESS_AUDIENCE",
  "TASK_MODE",
  "TASK_DEFAULT_TIMEOUT_MS",
  "QUEUE_MAX_RETRIES",
  "LOG_DIR"
];

const missingKeys = requiredKeys.filter((key) => !keys.has(key));

if (missingKeys.length > 0) {
  console.error(`Missing required keys in .env.example: ${missingKeys.join(", ")}`);
  process.exit(1);
}

console.log(".env.example contains all required phase-one control-plane keys.");
