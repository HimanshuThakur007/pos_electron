import { ipcMain } from "electron";
import { insertHoldSaleSqlite, getHoldSalesSqlite, deleteHoldSaleSqlite } from "../repositories/hold_sales.sqlite.repo.js";

ipcMain.handle("hold-sale", async (_, data) => {
  try {
    const id = insertHoldSaleSqlite(data);
    return { status: "success", id };
  } catch (err) {
    return { status: "error", message: err.message };
  }
});

ipcMain.handle("get-hold-sales", async (_, params) => {
  try {
    const sales = getHoldSalesSqlite(params);
    return { status: "success", data: sales };
  } catch (err) {
    return { status: "error", message: err.message };
  }
});

ipcMain.handle("delete-hold-sale", async (_, id) => {
  try {
    deleteHoldSaleSqlite(id);
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
});