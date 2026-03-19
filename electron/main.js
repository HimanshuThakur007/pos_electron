import { app, BrowserWindow, Tray, Menu, nativeImage, powerSaveBlocker } from "electron";
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
import "./ipc/printer.ipc.js";
import "./ipc/escpos.ipc.js";
import "./ipc/device.ipc.js";

// DB
import { checkConnection as checkMysqlConnection } from "./database/mysql.js";
import { checkConnection as checkSqliteConnection } from "./database/sqlite.js";

// Sync
import { syncStockData, syncItemsData, syncSchemesData, syncBranchesData } from "./services/sync.js";
import { startBackgroundSync, triggerSync } from "./services/backgroundSync.js";
import { startInvoiceSync, triggerInvoiceSync } from "./services/invoiceSync.js";
import { initSessionTable, getLoginSession } from "./repositories/session.sqlite.repo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let tray = null;
let isQuitting = false;

// Set app name to fix "electron" on hover in dev mode
app.setName("M99 POS");

function createWindow() {
  const iconPath = path.join(__dirname, "logo1.png");
  const appIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    title: "M99 POS",
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Prevent the HTML title from overriding the window title
  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
  });

  // Explicitly set the dock icon for macOS
  if (process.platform === "darwin") {
    app.dock.setIcon(appIcon);
  }

  if (!app.isPackaged) {
    // DEV
    const loadDevUrl = () => {
      mainWindow.loadURL("http://localhost:5173").catch(() => {
        console.log("Waiting for Vite server to start...");
        setTimeout(loadDevUrl, 1000);
      });
    };
    loadDevUrl();
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

  // 🚀 Prevent closing, hide to tray instead to keep Sync running
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, "logo1.png");
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("M99 POS - Background Sync Active");
  
  const contextMenu = Menu.buildFromTemplate([
    { label: "Open POS", click: () => mainWindow.show() },
    { type: "separator" },
    { 
      label: "Quit", 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => mainWindow.show());
}

app.whenReady().then(async () => {
  // Set App User Model ID so OS dialogs/notifications use the custom app icon instead of default Electron
  app.setAppUserModelId("com.m99.pos");

  // 🚀 Prevent the OS from suspending/sleeping while the POS is running
  powerSaveBlocker.start("prevent-app-suspension");

  // 🚀 Configure Auto-Launch on System Startup
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath("exe"),
    });
  }

  // Local DB (must succeed)
  await checkSqliteConnection();
  initSessionTable();

  // Remote DB (optional)
  const isOnline = await checkMysqlConnection();
  if (isOnline) {
    console.log("✅ Online mode");

    const session = getLoginSession() || {};

    // Get branch code from environment
    let branchCode = process.env.BRANCH_CODE || session.branch_code || "";

    // initial sync
    syncStockData(branchCode).catch(console.error);
    syncItemsData().catch(console.error);
    syncSchemesData().catch(console.error);
    syncBranchesData().catch(console.error);
    
    // 🔄 Auto-resume sync using persisted session details
    const lastFyCode = session.fy_code;
    if (lastFyCode) {
      console.log("🔄 Auto-resuming sync services for FY:", lastFyCode);
      triggerSync(lastFyCode);
      triggerInvoiceSync(lastFyCode);
    } else {
      console.log("ℹ️ No saved session found. Waiting for login to sync.");
    }
  } else {
    console.log("⚠️ Offline mode");
  }

  createWindow();
  createTray();
});

// macOS
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Windows / Linux
app.on("window-all-closed", () => {
  // Keep the app running in background for sync
});

// Handle proper quit
app.on("before-quit", () => {
  isQuitting = true;
});
