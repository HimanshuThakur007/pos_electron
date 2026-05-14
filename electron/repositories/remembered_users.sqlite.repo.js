import { db } from "../database/sqlite.js";
import { encrypt, decrypt } from "../utils/cypher.js";

const initRememberedUsersTable = () => {
  const stmt = db.prepare(`
    CREATE TABLE IF NOT EXISTS remembered_users (
      email TEXT PRIMARY KEY NOT NULL,
      password TEXT NOT NULL,
      last_used_at TEXT DEFAULT (datetime('now'))
    )
  `);
  stmt.run();

  // Migration for existing tables without the new column
  try {
    db.prepare(
      `ALTER TABLE remembered_users ADD COLUMN last_used_at TEXT DEFAULT (datetime('now'))`,
    ).run();
  } catch (e) {
    // Will fail if column exists, which is fine
  }

  // Log existing data on init for debugging
  try {
    const rows = db
      .prepare(
        "SELECT email, last_used_at FROM remembered_users ORDER BY last_used_at DESC",
      )
      .all();
    console.log("Repo Init: Current remembered_users in table:", rows);
  } catch (e) {
    console.error("Repo Init: Failed to read remembered_users table.", e);
  }
};

const saveRememberedUser = async (email, password) => {
  console.log(`Repo: Attempting to save/update user: ${email}`);
  const encryptedPassword = await encrypt(password);
  if (!encryptedPassword) {
    throw new Error("Failed to encrypt password.");
  }
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO remembered_users (email, password, last_used_at) VALUES (?, ?, datetime('now'))",
  );
  stmt.run(email, encryptedPassword);
  console.log(`Repo: Successfully saved/updated user: ${email}`);
};

const getRememberedUsers = () => {
  const stmt = db.prepare(
    "SELECT email FROM remembered_users ORDER BY last_used_at DESC",
  );
  const rows = stmt.all();
  console.log("Repo: Found remembered user rows:", rows);
  return rows.map((row) => row.email);
};

const getCredentialsForUser = async (email) => {
  const stmt = db.prepare(
    "SELECT password FROM remembered_users WHERE email = ?",
  );
  const row = stmt.get(email);
  if (row && row.password) {
    const decryptedPassword = await decrypt(row.password);
    return { email, password: decryptedPassword };
  }
  return null;
};

const removeRememberedUser = (email) => {
  const stmt = db.prepare("DELETE FROM remembered_users WHERE email = ?");
  stmt.run(email);
};

export {
  initRememberedUsersTable,
  saveRememberedUser,
  getRememberedUsers,
  getCredentialsForUser,
  removeRememberedUser,
};
