import { ipcMain } from "electron";
import { getStockByLogicUserCodeSqlite } from "../repositories/stock.sqlite.repo.js";
import { syncStockData } from "../services/sync.js";

ipcMain.handle("get-stock-by-code", async (_, logicUserCode) => {
  // Use SQLite for search (Offline-first)
  return getStockByLogicUserCodeSqlite(logicUserCode);
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
