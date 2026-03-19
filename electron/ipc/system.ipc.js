import { ipcMain } from "electron";
import { checkConnection as checkMysqlConnection } from "../database/mysql.js";
import { checkConnection as checkSqliteConnection } from "../database/sqlite.js";
import { getLastSyncLogSqlite, clearStockSqlite, clearSyncLogsSqlite } from "../repositories/stock.sqlite.repo.js";
import { getItemCountSqlite } from "../repositories/item.sqlite.repo.js";
import { clearTransactionsSqlite } from "../repositories/transaction.sqlite.repo.js";
import { clearInvoicesSqlite } from "../repositories/invoice.sqlite.repo.js";
import { saveLoginSession } from "../repositories/session.sqlite.repo.js";
import { triggerSync } from "../services/backgroundSync.js";

ipcMain.handle("check-db-connection", async () => {
  const mysql = await checkMysqlConnection();
  const sqlite = await checkSqliteConnection();
  const lastSync = getLastSyncLogSqlite();
  const itemCount = getItemCountSqlite();
  // Return status of both to let UI decide what to show
  return { mysql, sqlite, lastSync, itemCount };
});

ipcMain.handle("reset-database", async (_, fy_code) => {
  try {
    clearStockSqlite();
    clearTransactionsSqlite(fy_code);
    clearInvoicesSqlite();
    clearSyncLogsSqlite();
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
});

ipcMain.handle("trigger-background-sync", (_, fy_code) => {
  triggerSync(fy_code);
  return { status: "success" };
});

ipcMain.handle("set-login-details", (_, details) => {
  console.log("💾 Saving Login Details via IPC:", details);
  saveLoginSession(details);
  return { status: "success" };
});