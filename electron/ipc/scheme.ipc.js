import { ipcMain } from "electron";
import { getSchemesSqlite } from "../repositories/scheme.sqlite.repo.js";
import { syncSchemesData } from "../services/sync.js";

ipcMain.handle("get-schemes", async () => {
  return getSchemesSqlite();
});

ipcMain.handle("sync-schemes", async (_, isManual = true) => {
  try {
    await syncSchemesData(isManual);
    return { status: "success" };
  } catch (err) {
    console.error("Manual schemes sync error:", err);
    return { status: "error", message: err.message };
  }
});