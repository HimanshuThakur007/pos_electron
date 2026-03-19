import { ipcMain } from "electron";
import { printEscPosReceipt } from "../services/escpos.service.js";

ipcMain.handle("print-escpos-receipt", async (event, data) => {
  try {
    const result = await printEscPosReceipt(data);
    return result;
  } catch (error) {
    return { status: "error", message: error.message };
  }
});