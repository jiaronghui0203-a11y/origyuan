import { drizzle } from "drizzle-orm/d1";
import { tools } from "./schema";

/**
 * Seed the database with built-in tools.
 * Run this after initial migration to populate the tool registry.
 *
 * Usage:
 *   wrangler d1 execute DB --local --command="$(tsx db/seed.ts)"
 */

const builtinTools = [
  {
    id: "web-search",
    name: "Web Search",
    description: "Search the web for current information and return relevant results.",
    inputSchema: JSON.stringify({
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        maxResults: { type: "number", default: 5 },
      },
      required: ["query"],
    }),
    kind: "builtin" as const,
    enabled: true,
  },
  {
    id: "url-fetch",
    name: "URL Fetch",
    description: "Fetch and extract content from a given URL.",
    inputSchema: JSON.stringify({
      type: "object",
      properties: {
        url: { type: "string", format: "uri", description: "URL to fetch" },
      },
      required: ["url"],
    }),
    kind: "builtin" as const,
    enabled: true,
  },
  {
    id: "code-interpreter",
    name: "Code Interpreter",
    description: "Execute Python code in a sandboxed environment and return the output.",
    inputSchema: JSON.stringify({
      type: "object",
      properties: {
        code: { type: "string", description: "Python code to execute" },
        timeout: { type: "number", default: 30000, description: "Timeout in milliseconds" },
      },
      required: ["code"],
    }),
    kind: "builtin" as const,
    enabled: true,
  },
  {
    id: "image-analysis",
    name: "Image Analysis",
    description: "Analyze an image and return descriptions, detected objects, or OCR results.",
    inputSchema: JSON.stringify({
      type: "object",
      properties: {
        imageUrl: { type: "string", format: "uri", description: "URL of the image to analyze" },
        tasks: {
          type: "array",
          items: { type: "string", enum: ["describe", "ocr", "detect-objects"] },
          description: "Analysis tasks to perform",
        },
      },
      required: ["imageUrl", "tasks"],
    }),
    kind: "builtin" as const,
    enabled: true,
  },
];

export async function seedTools(d1: D1Database) {
  const db = drizzle(d1);

  console.log("🌱 Seeding built-in tools...");

  for (const tool of builtinTools) {
    await db.insert(tools).values(tool).onConflictDoNothing();
    console.log(`  ✓ ${tool.name} (${tool.id})`);
  }

  console.log("✅ Seed completed");
}

// For direct execution in CLI context
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Direct execution not supported. Use wrangler d1 execute or import seedTools().");
  process.exit(1);
}
