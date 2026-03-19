import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";

// Store database in the user data directory so it persists
const dbPath = path.join(app.getPath("userData"), "pos_database.db");
console.log("📂 SQLite DB Path:", dbPath);
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
    console.log(`✅ SQLite connected successfully at ${dbPath}`);

    // 🧹 Clean up mistakenly created 'undefined' tables
    try {
      db.prepare("DROP TABLE IF EXISTS sl_transactionundefined").run();
      db.prepare("DROP TABLE IF EXISTS sl_headundefined").run();
      console.log("🗑️ Dropped accidental tables: sl_transactionundefined, sl_headundefined");
    } catch (cleanupErr) {
      console.error("❌ Failed to drop undefined tables:", cleanupErr.message);
    }

    // Log existing tables for debugging
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log("📊 Existing SQLite Tables:", tables.map((t) => t.name));

    // Check if stock table exists and has data
    const stockTable = tables.find((t) => t.name === "wms_stock_in_hand");
    if (stockTable) {
      const rowCount = db.prepare("SELECT COUNT(*) as count FROM wms_stock_in_hand").get();
      console.log(`📦 Stock Table Rows: ${rowCount.count}`);
      if (rowCount.count > 0) {
        const sample = db.prepare("SELECT * FROM wms_stock_in_hand LIMIT 1").get();
        console.log("📄 Sample Data:", sample);
      }
    }

    // Check items table count
    const itemsTable = tables.find((t) => t.name === "items");
    if (itemsTable) {
      const rowCount = db.prepare("SELECT COUNT(*) as count FROM items").get();
      console.log(`📦 Items Table Rows: ${rowCount.count}`);
    }

    // Check schemes table and log a sample
    const schemesTable = tables.find((t) => t.name === "m99_reg_offer");
    if (schemesTable) {
      const rowCount = db.prepare("SELECT COUNT(*) as count FROM m99_reg_offer").get();
      console.log(`🎁 Schemes Table Rows: ${rowCount.count}`);
      if (rowCount.count > 0) {
        const sample = db.prepare("SELECT * FROM m99_reg_offer LIMIT 2").all();
        console.log("📄 Sample Scheme Data:", sample);
      }
    }

    // Check multi-payment (MPM) table and log a sample
    const mpmTable = tables.find((t) => t.name === "sl_mpm20252026" || t.name.startsWith("sl_mpm"));
    if (mpmTable) {
      const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${mpmTable.name}`).get();
      console.log(`💳 MPM Table (${mpmTable.name}) Rows: ${rowCount.count}`);
      if (rowCount.count > 0) {
        const sample = db.prepare(`SELECT * FROM ${mpmTable.name} LIMIT 2`).all();
        console.log(`📄 Sample MPM Data (${mpmTable.name}):`, sample);
      }
    }

    // Check sync_queue table and log a sample
    const syncQueueTable = tables.find((t) => t.name === "sync_queue");
    if (syncQueueTable) {
      const rowCount = db.prepare("SELECT COUNT(*) as count FROM sync_queue").get();
      console.log(`🔄 Sync Queue Table Rows: ${rowCount.count}`);
      if (rowCount.count > 0) {
        const sample = db.prepare("SELECT * FROM sync_queue LIMIT 5").all();
        console.log("📄 Sample Sync Queue Data:", sample);
      }
    }
    return true;
  } catch (error) {
    console.error("❌ SQLite connection failed:", error.message);
    return false;
  }
}
