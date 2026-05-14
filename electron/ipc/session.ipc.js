import { ipcMain } from "electron";
import {
  saveLoginSession,
  getLoginSession,
  clearLoginSession,
} from "../repositories/session.sqlite.repo.js";

// This handler is called on successful login
ipcMain.handle("set-login-details", (_, details) => {
  console.log("IPC: Setting login details in secure storage.");
  return saveLoginSession(details);
});

// This handler is called on app startup to check for an existing session
ipcMain.handle("get-session", () => {
  console.log("IPC: Getting session from secure storage.");
  return getLoginSession();
});

// This handler is called on logout
ipcMain.handle("clear-session", () => {
  console.log("IPC: Clearing session from secure storage.");
  return clearLoginSession();
});
