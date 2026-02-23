import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";

// IPC
import "./ipc/item.ipc.js";
import "./ipc/system.ipc.js";
import "./ipc/stock.ipc.js";
import "./ipc/scheme.ipc.js";
import "./ipc/branch.ipc.js";
import "./ipc/transaction.ipc.js";
import "./ipc/hold_sales.ipc.js";

// DB
import { checkConnection as checkMysqlConnection } from "./database/mysql.js";
import { checkConnection as checkSqliteConnection } from "./database/sqlite.js";

// Sync
import { syncStockData, syncItemsData, syncSchemesData, syncBranchesData } from "./services/sync.js";
import { startBackgroundSync } from "./services/backgroundSync.js";
import { startInvoiceSync } from "./services/invoiceSync.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    // DEV
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    // PROD
    mainWindow.loadFile(
      path.join(__dirname, "../renderer/pos-ui/dist/index.html")
    );
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
}

app.whenReady().then(async () => {
  // Local DB (must succeed)
  await checkSqliteConnection();

  // Remote DB (optional)
  const isOnline = await checkMysqlConnection();
  if (isOnline) {
    console.log("✅ Online mode");

    // Get branch code from environment
    let branchCode = process.env.BRANCH_CODE || "";

    // initial sync
    syncStockData(branchCode).catch(console.error);
    syncItemsData().catch(console.error);
    syncSchemesData().catch(console.error);
    syncBranchesData().catch(console.error);
    startBackgroundSync();
    startInvoiceSync();
  } else {
    console.log("⚠️ Offline mode");
  }

  createWindow();
});

// macOS
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Windows / Linux
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
