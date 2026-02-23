import { ipcMain } from "electron";
import { syncItemsData } from "../services/sync.js";
import { getItemByCodeSqlite } from "../repositories/item.sqlite.repo.js";

ipcMain.handle("get-item", async (_, code) => {
  return getItemByCodeSqlite(code);
});

ipcMain.handle("sync-items", async (_, isManual = true) => {
  try {
    await syncItemsData(isManual);
    return { status: "success" };
  } catch (err) {
    console.error("Manual items sync error:", err);
    return { status: "error", message: err.message };
  }
});