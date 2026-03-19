import { db } from "../database/sqlite.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TABLE_NAME = "app_session";
const SESSION_FILE_PATH = path.join(__dirname, "../../session_config.json");

export const initSessionTable = () => {
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `).run();

    const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`).get();
    console.log(`✅ Session Table Initialized. Rows: ${rowCount.count}`);

    const rows = db.prepare(`SELECT * FROM ${TABLE_NAME}`).all();
    console.log("💾 Current Session Data:", rows);

    console.log("📂 Target Session Config Path:", SESSION_FILE_PATH);

    if (fs.existsSync(SESSION_FILE_PATH)) {
      console.log("📂 Backup Session Config Found:", SESSION_FILE_PATH);
    }
  } catch (err) {
    console.error("❌ Init Session Table Error:", err.message);
  }
};

export const setSessionValue = (key, value) => {
  try {
    db.prepare(`INSERT OR REPLACE INTO ${TABLE_NAME} (key, value) VALUES (?, ?)`).run(key, String(value));
    console.log(`✅ Session Persisted: ${key}=${value}`);
  } catch (err) {
    console.error(`❌ Set Session Value Error (${key}):`, err.message);
  }
};

export const getSessionValue = (key) => {
  try {
    const row = db.prepare(`SELECT value FROM ${TABLE_NAME} WHERE key = ?`).get(key);
    return row ? row.value : null;
  } catch (err) {
    console.error(`❌ Get Session Value Error (${key}):`, err.message);
    return null;
  }
};

export const getSessionCount = () => {
  try {
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`).get();
    return result ? result.count : 0;
  } catch (err) {
    console.error("❌ Get Session Count Error:", err.message);
    return 0;
  }
};

export const saveLoginSession = (details) => {
  const value = JSON.stringify(details);

  // 1. Save to SQLite
  try {
    db.transaction(() => {
      db.prepare(`DELETE FROM ${TABLE_NAME}`).run(); // Keep only one latest row
      db.prepare(`INSERT INTO ${TABLE_NAME} (key, value) VALUES ('session', ?)`).run(value);
    })();
    console.log(`✅ Login Session Updated (SQLite)`);
  } catch (err) {
    console.error("❌ Save Login Session (SQLite) Error:", err.message);
  }

  // 2. Save to Backup File (Config)
  try {
    fs.writeFileSync(SESSION_FILE_PATH, value);
    console.log(`✅ Login Session Backed up to Config File`);
  } catch (err) {
    console.error("❌ Save Login Session (File) Error:", err.message);
  }
};

export const getLoginSession = () => {
  try {
    // Try SQLite first
    const row = db.prepare(`SELECT value FROM ${TABLE_NAME} WHERE key = 'session'`).get();
    if (row) return JSON.parse(row.value);
    
    throw new Error("SQLite session empty");
  } catch (err) {
    // Fallback to Backup File
    console.warn("⚠️ SQLite Session missing/failed. Trying Backup Config...");
    try {
      if (fs.existsSync(SESSION_FILE_PATH)) {
        const data = fs.readFileSync(SESSION_FILE_PATH, "utf8");
        console.log("✅ Recovered Session from Backup Config");
        return JSON.parse(data);
      }
    } catch (fileErr) {
      console.error("❌ Backup Config Read Failed:", fileErr.message);
    }
    return null;
  }
};