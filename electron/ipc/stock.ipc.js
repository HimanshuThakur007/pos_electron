import { ipcMain } from "electron";
import {
  getStockByLogicUserCodeSqlite,
  getAllStockSqlite,
  getStockCountSqlite,
} from "../repositories/stock.sqlite.repo.js";
import { syncStockData } from "../services/sync.js";

ipcMain.handle("get-stock-by-code", async (_, logicUserCode) => {
  // Use SQLite for search (Offline-first)
  return getStockByLogicUserCodeSqlite(logicUserCode);
});

ipcMain.handle("get-all-stock", async () => {
  try {
    return getAllStockSqlite();
  } catch (err) {
    console.error("Failed to get all stock:", err);
    return [];
  }
});

ipcMain.handle("get-stock-count", async (_, branchCode) => {
  return getStockCountSqlite(branchCode);
});

ipcMain.handle("sync-stock", async (event, branchCode, isManual = true) => {
  console.log("branchCode", branchCode);
  // if (typeof branchCode !== 'string') {
  //   console.error("Invalid branchCode provided");
  //   return { status: "error", message: "Invalid branchCode provided" };
  // }

  try {
    await syncStockData(branchCode, isManual);
    return { status: "success" };
  } catch (err) {
    console.error("Manual sync error:", err);
    return { status: "error", message: err.message };
  }
});
