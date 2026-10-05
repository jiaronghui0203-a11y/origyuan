import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// ── Users ─────────────────────────────────────────────────────────────────────
// Populated on first login via ChatGPT SSO (chatgpt-auth.ts).
// id maps directly to the oai-authenticated-user-id header so no surrogate key
// is needed — the ChatGPT user ID is already a stable opaque string.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  fullName: text("full_name"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  uniqueIndex("users_email_idx").on(t.email),
]);

// ── Tool registry ─────────────────────────────────────────────────────────────
// Seed rows for built-in tools on first deploy; custom tools added at runtime.
// id is a human-readable slug ("web-search", "url-fetch") so logs are readable.
export const tools = sqliteTable("tools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  inputSchema: text("input_schema").notNull(),   // JSON Schema string
  kind: text("kind", { enum: ["builtin", "custom"] }).notNull().default("builtin"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── Agents ────────────────────────────────────────────────────────────────────
export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),                   // UUID v4
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  model: text("model").notNull().default("claude-opus-5"),
  systemPrompt: text("system_prompt").notNull().default(""),
  toolIds: text("tool_ids").notNull().default("[]"),  // JSON string[] of tool slugs
  maxSteps: integer("max_steps").notNull().default(10),
  status: text("status", { enum: ["active", "archived"] })
    .notNull()
    .default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  index("agents_user_id_idx").on(t.userId),
]);

// ── Runs ──────────────────────────────────────────────────────────────────────
export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),                   // UUID v4
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["queued", "running", "completed", "failed", "cancelled"],
  })
    .notNull()
    .default("queued"),
  input: text("input").notNull(),                // JSON: { message: string }
  output: text("output"),                        // JSON: final assistant message, null until complete
  error: text("error"),
  stepCount: integer("step_count").notNull().default(0),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  index("runs_agent_id_idx").on(t.agentId),
  index("runs_user_id_idx").on(t.userId),
  index("runs_status_idx").on(t.status),
]);

// ── Run steps ─────────────────────────────────────────────────────────────────
// One row per discrete event in a run's execution trace.
// kind determines the shape of the content JSON:
//   llm_call    → { role, content, usage: { input_tokens, output_tokens } }
//   tool_call   → { tool_use_id, name, input }
//   tool_result → { tool_use_id, content, is_error }
//   error       → { message, code }
export const runSteps = sqliteTable("run_steps", {
  id: text("id").primaryKey(),                   // UUID v4
  runId: text("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index").notNull(),
  kind: text("kind", {
    enum: ["llm_call", "tool_call", "tool_result", "error"],
  }).notNull(),
  content: text("content").notNull(),            // JSON payload (shape varies by kind)
  toolId: text("tool_id"),                       // set when kind = tool_call
  durationMs: integer("duration_ms"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  index("run_steps_run_id_idx").on(t.runId),
  index("run_steps_run_step_idx").on(t.runId, t.stepIndex),
]);
