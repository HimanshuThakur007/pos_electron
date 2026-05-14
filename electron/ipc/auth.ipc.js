import { ipcMain } from "electron";
import {
  getCachedUserSqlite,
  verifyPassword,
  cacheUserLoginSqlite,
} from "../repositories/user.sqlite.repo.js";

ipcMain.handle("offline-login", async (_, { email, password }) => {
  try {
    const cachedUser = getCachedUserSqlite(email);
    if (!cachedUser) {
      return {
        success: false,
        error: "User has never logged in on this terminal.",
      };
    }

    const isValid = verifyPassword(password, cachedUser.password_hash);
    if (!isValid) {
      return { success: false, error: "Invalid password for offline login." };
    }

    return { success: true, data: JSON.parse(cachedUser.login_payload) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("cache-user-login", async (_, { email, password, payload }) => {
  try {
    cacheUserLoginSqlite(email, password, payload);
    return { success: true };
  } catch (err) {
    console.error("Cache user login error:", err);
    return { success: false, error: err.message };
  }
});
