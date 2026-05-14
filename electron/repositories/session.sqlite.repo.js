import { db } from "../database/sqlite.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { app } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TABLE_NAME = "app_session";
const LOCAL_SESSION_FILE_PATH = path.join(
  __dirname,
  "../../session_config.json",
);

const getUserDataSessionPath = () => {
  try {
    return path.join(app.getPath("userData"), "session_config.json");
  } catch (e) {
    return null;
  }
};

export const initSessionTable = () => {
  try {
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `,
    ).run();

    const rowCount = db
      .prepare(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`)
      .get();
    console.log(`✅ Session Table Initialized. Rows: ${rowCount.count}`);

    const rows = db.prepare(`SELECT * FROM ${TABLE_NAME}`).all();
    console.log("💾 Current Session Data:", rows);

    const userDataPath = getUserDataSessionPath();
    if (userDataPath && fs.existsSync(userDataPath)) {
      console.log("📂 Backup Session Config Found (UserData):", userDataPath);
    }

    if (fs.existsSync(LOCAL_SESSION_FILE_PATH)) {
      console.log(
        "📂 Backup Session Config Found (Local):",
        LOCAL_SESSION_FILE_PATH,
      );
    }
  } catch (err) {
    console.error("❌ Init Session Table Error:", err.message);
  }
};

export const setSessionValue = (key, value) => {
  try {
    db.prepare(
      `INSERT OR REPLACE INTO ${TABLE_NAME} (key, value) VALUES (?, ?)`,
    ).run(key, String(value));
    console.log(`✅ Session Persisted: ${key}=${value}`);
  } catch (err) {
    console.error(`❌ Set Session Value Error (${key}):`, err.message);
  }
};

export const getSessionValue = (key) => {
  try {
    const row = db
      .prepare(`SELECT value FROM ${TABLE_NAME} WHERE key = ?`)
      .get(key);
    return row ? row.value : null;
  } catch (err) {
    console.error(`❌ Get Session Value Error (${key}):`, err.message);
    return null;
  }
};

export const getSessionCount = () => {
  try {
    const result = db
      .prepare(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`)
      .get();
    return result ? result.count : 0;
  } catch (err) {
    console.error("❌ Get Session Count Error:", err.message);
    return 0;
  }
};

export const saveLoginSession = (details) => {
  console.log("📥 Saving Login Session with details:", details);
  if (!details) {
    console.error("❌ Cannot save empty session details");
    return false;
  }

  // Ensure token is explicitly available in the object
  const sessionData = {
    ...details,
    token: details.token || details.auth_token || "",
  };

  const value = JSON.stringify(sessionData);
  let isSaved = false;

  // 1. Save to SQLite
  try {
    const saveTx = db.transaction(() => {
      db.prepare(`DELETE FROM ${TABLE_NAME}`).run(); // Keep only one latest row
      db.prepare(
        `INSERT INTO ${TABLE_NAME} (key, value) VALUES ('session', ?)`,
      ).run(value);
      if (sessionData.token) {
        db.prepare(
          `INSERT INTO ${TABLE_NAME} (key, value) VALUES ('token', ?)`,
        ).run(sessionData.token);
      }
    });
    saveTx();
    console.log(`✅ Login Session & Token Updated (SQLite)`);
    isSaved = true;
  } catch (err) {
    console.error("❌ Save Login Session (SQLite) Error:", err.message);
  }

  // 2. Save to Backup File (Config)
  try {
    fs.writeFileSync(LOCAL_SESSION_FILE_PATH, value);
    console.log(`✅ Login Session Backed up to Local Config`);
  } catch (err) {
    console.error("❌ Save Local Session Error:", err.message);
  }

  try {
    const userDataPath = getUserDataSessionPath();
    if (userDataPath) {
      fs.writeFileSync(userDataPath, value);
      console.log(`✅ Login Session Backed up to UserData Config`);
    }
  } catch (err) {
    console.error("❌ Save UserData Session Error:", err.message);
  }

  return isSaved;
};

export const getLoginSession = () => {
  try {
    // Try SQLite first
    const row = db
      .prepare(`SELECT value FROM ${TABLE_NAME} WHERE key = 'session'`)
      .get();
    if (row) {
      const sessionData = JSON.parse(row.value);
      // console.log("✅ Recovered Session from SQLite:", sessionData);
      return sessionData;
    }

    throw new Error("SQLite session empty");
  } catch (err) {
    // Fallback to Backup File
    console.warn("⚠️ SQLite Session missing/failed. Trying Backup Config...");
    try {
      const userDataPath = getUserDataSessionPath();
      if (userDataPath && fs.existsSync(userDataPath)) {
        const data = fs.readFileSync(userDataPath, "utf8");
        const sessionData = JSON.parse(data);
        console.log("✅ Recovered Session from UserData Config:", sessionData);
        return sessionData;
      }
    } catch (fileErr) {
      console.error("❌ UserData Config Read Failed:", fileErr.message);
    }

    try {
      if (fs.existsSync(LOCAL_SESSION_FILE_PATH)) {
        const data = fs.readFileSync(LOCAL_SESSION_FILE_PATH, "utf8");
        const sessionData = JSON.parse(data);
        console.log("✅ Recovered Session from Local Config:", sessionData);
        return sessionData;
      }
    } catch (fileErr) {
      console.error("❌ Local Config Read Failed:", fileErr.message);
    }
    return null;
  }
};

export const clearLoginSession = () => {
  try {
    const clearTx = db.transaction(() => {
      db.prepare(`DELETE FROM ${TABLE_NAME}`).run();
    });
    clearTx();
    const userDataPath = getUserDataSessionPath();
    if (userDataPath && fs.existsSync(userDataPath)) {
      fs.unlinkSync(userDataPath);
    }
    if (fs.existsSync(LOCAL_SESSION_FILE_PATH)) {
      fs.unlinkSync(LOCAL_SESSION_FILE_PATH);
    }
    console.log(`✅ Login Session & Token Cleared`);
    return true;
  } catch (err) {
    console.error("❌ Clear Login Session Error:", err.message);
    return false;
  }
};
