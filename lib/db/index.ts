import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "node:path";

let _db: BetterSQLite3Database<typeof schema> | null = null;

export function getDb() {
  if (!_db) {
    const dbPath = process.env.DATABASE_URL ?? "db.sqlite";
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    _db = drizzle(sqlite, { schema });

    // Auto-migrate on first connection
    try {
      migrate(_db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    } catch (e) {
      // Migrations already applied or folder missing — safe to ignore
      if (!(e instanceof Error) || !e.message.includes("already been applied")) {
        console.warn("[db] Migration warning:", (e as Error).message);
      }
    }
  }
  return _db;
}

export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
