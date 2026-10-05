import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";

/**
 * Run pending migrations against the D1 database.
 *
 * Usage:
 *   wrangler d1 execute DB --local --file=./drizzle/0000_*.sql
 *
 * Or programmatically in worker context:
 *   import { runMigrations } from "./db/migrate";
 *   await runMigrations(env.DB);
 */
export async function runMigrations(d1: D1Database) {
  const db = drizzle(d1);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✅ Migrations completed");
}
