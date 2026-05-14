import { ipcMain } from "electron";
import { checkConnection as checkMysqlConnection } from "../database/mysql.js";
import { checkConnection as checkSqliteConnection } from "../database/sqlite.js";
import {
  getLastSyncLogSqlite,
  clearStockSqlite,
  clearSyncLogsSqlite,
  getStockCountSqlite,
} from "../repositories/stock.sqlite.repo.js";
import { getItemCountSqlite } from "../repositories/item.sqlite.repo.js";
import { getBranchesCountSqlite } from "../repositories/branch.sqlite.repo.js";
import { getSchemesCountSqlite } from "../repositories/scheme.sqlite.repo.js";
import { clearTransactionsSqlite } from "../repositories/transaction.sqlite.repo.js";
import { clearInvoicesSqlite } from "../repositories/invoice.sqlite.repo.js";
import { triggerSync } from "../services/backgroundSync.js";
import { clearTerminalSessionsSqlite } from "../repositories/terminal_session.sqlite.repo.js";

ipcMain.handle("check-db-connection", async (_, branchCode) => {
  const mysql = await checkMysqlConnection();
  const sqlite = await checkSqliteConnection();
  const lastSync = getLastSyncLogSqlite();
  const itemCount = getItemCountSqlite();
  const stockCount = getStockCountSqlite(branchCode);
  const branchCount = getBranchesCountSqlite();
  const schemeCount = getSchemesCountSqlite();
  // Return status of both to let UI decide what to show
  return {
    mysql,
    sqlite,
    lastSync,
    itemCount,
    stockCount,
    branchCount,
    schemeCount,
  };
});

ipcMain.handle("reset-database", async (_, fy_code) => {
  try {
    clearStockSqlite();
    clearTransactionsSqlite(fy_code);
    clearInvoicesSqlite();
    clearSyncLogsSqlite();
    clearTerminalSessionsSqlite();
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
});
