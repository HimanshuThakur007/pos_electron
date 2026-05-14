import { ipcMain } from "electron";
import { logDeletedItemSqlite } from "../repositories/cart_delete_log.sqlite.repo.js";

ipcMain.handle("log-deleted-item", async (_, data) => {
  try {
    const success = logDeletedItemSqlite(data);
    return { success };
  } catch (error) {
    console.error("IPC: Failed to log deleted item", error);
    return { success: false, error: error.message };
  }
});
