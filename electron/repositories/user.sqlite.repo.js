import { db } from "../database/sqlite.js";
import crypto from "crypto";

const TABLE_NAME = "users_cache";

export const initUsersCacheTable = () => {
  try {
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        email TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        login_payload TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `,
    ).run();
    console.log("✅ Users Cache Table Initialized.");
  } catch (err) {
    console.error("❌ Init Users Cache Table Error:", err.message);
  }
};

export const hashPassword = (password) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

export const verifyPassword = (password, hash) => {
  return hashPassword(password) === hash;
};

export const cacheUserLoginSqlite = (email, password, payload) => {
  const hash = hashPassword(password);
  db.prepare(
    `
    INSERT OR REPLACE INTO ${TABLE_NAME} (email, password_hash, login_payload, updated_at)
    VALUES (?, ?, ?, datetime('now'))
  `,
  ).run(email, hash, JSON.stringify(payload));
};

export const getCachedUserSqlite = (email) => {
  const row = db
    .prepare(`SELECT * FROM ${TABLE_NAME} WHERE email = ?`)
    .get(email);
  return row || null;
};
