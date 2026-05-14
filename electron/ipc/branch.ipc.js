import { ipcMain } from "electron";
import {
  getBranchesSqlite,
  getBranchesCountSqlite,
  getBranchByCodeSqlite,
} from "../repositories/branch.sqlite.repo.js";
import { syncBranchesData } from "../services/sync.js";

ipcMain.handle("get-branches", async () => {
  return getBranchesSqlite();
});

ipcMain.handle("get-branches-count", async () => {
  return getBranchesCountSqlite();
});

ipcMain.handle("get-branch-by-code", async (_, branchCode) => {
  return getBranchByCodeSqlite(branchCode);
});

ipcMain.handle("sync-branches", async (_, isManual = true) => {
  try {
    await syncBranchesData(isManual);
    return { status: "success" };
  } catch (err) {
    console.error("Manual branches sync error:", err);
    return { status: "error", message: err.message };
  }
});
