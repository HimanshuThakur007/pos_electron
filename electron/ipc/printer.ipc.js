import { ipcMain } from "electron";
import { printReceiptHtml } from "../services/printer.service.js";


ipcMain.handle("print-receipt", async (event, htmlContent) => {
  try {
    const result = await printReceiptHtml(htmlContent);
    return result;
  } catch (error) {
    return { status: "error", message: error.message };
  }
});