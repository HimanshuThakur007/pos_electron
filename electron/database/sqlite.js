import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";

// Store database in the user data directory so it persists
const dbPath = path.join(app.getPath("userData"), "pos_database.db");
export const db = new Database(dbPath);

// Register MySQL compatibility function: SUBSTRING_INDEX
// This allows your existing queries to work in SQLite
db.function("SUBSTRING_INDEX", (str, delim, count) => {
  if (!str) return null;
  const parts = str.split(delim);
  if (count > 0) return parts.slice(0, count).join(delim);
  return parts.slice(count).join(delim);
});

// Optional: Enable WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
db.pragma("temp_store = MEMORY");
db.pragma("cache_size = -64000");
// db.pragma("mmap_size = 30000000000");
db.pragma("mmap_size = 268435456");

export async function checkConnection() {
  try {
    // Simple query to verify connection
    db.prepare("SELECT 1").get();

    // 🧹 Clean up mistakenly created 'undefined' tables
    try {
      db.prepare("DROP TABLE IF EXISTS sl_transactionundefined").run();
      db.prepare("DROP TABLE IF EXISTS sl_headundefined").run();
    } catch (cleanupErr) {}

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all();

    // Log columns for sl_transaction tables
    const transactionTables = tables.filter((t) =>
      t.name.startsWith("sl_transaction"),
    );
    if (transactionTables.length > 0) {
      for (const table of transactionTables) {
        const tableInfo = db.prepare(`PRAGMA table_info(${table.name})`).all();
        const columnNames = tableInfo.map((col) => `${col.name} (${col.type})`);
      }
    }

    // Check invoice_series table and log a sample
    const invoiceSeriesTable = tables.find((t) => t.name === "invoice_series");
    if (invoiceSeriesTable) {
      const rowCount = db
        .prepare("SELECT COUNT(*) as count FROM invoice_series")
        .get();
      if (rowCount.count > 0) {
        const sample = db.prepare("SELECT * FROM invoice_series LIMIT 5").all();
      }
    }
    return true;
  } catch (error) {
    return false;
  }
}
