// import {
//   app,
//   BrowserWindow,
//   Tray,
//   Menu,
//   nativeImage,
//   powerSaveBlocker,
//   ipcMain,
// } from "electron";
// import path from "path";
// import { fileURLToPath } from "url";

// // 🚀 Catch unhandled exceptions to prevent silent crashes
// process.on("uncaughtException", (error) => {
//   console.error("<<<<< UNCAUGHT EXCEPTION >>>>>");
//   console.error("An unexpected error occurred:", error);
//   // In a real production app, you would log this to a file or remote service
//   // before the process terminates.
// });

// // 🚀 Catch unhandled promise rejections
// process.on("unhandledRejection", (reason, promise) => {
//   console.error("<<<<< UNHANDLED REJECTION >>>>>");
//   console.error("Unhandled Rejection at:", promise, "reason:", reason);
// });

// // IPC
// import "./ipc/item.ipc.js";
// import "./ipc/system.ipc.js";
// import "./ipc/stock.ipc.js";
// import "./ipc/scheme.ipc.js";
// import "./ipc/branch.ipc.js";
// import "./ipc/transaction.ipc.js";
// import "./ipc/hold_sales.ipc.js";
// import "./ipc/printer.ipc.js";
// import "./ipc/escpos.ipc.js";
// import "./ipc/device.ipc.js";
// import "./ipc/license.ipc.js";
// import "./ipc/session.ipc.js";

// // DB
// import { checkConnection as checkMysqlConnection } from "./database/mysql.js";
// import { checkConnection as checkSqliteConnection } from "./database/sqlite.js";

// // Sync
// import {
//   syncStockData,
//   syncItemsData,
//   syncSchemesData,
//   syncBranchesData,
// } from "./services/sync.js";
// import { startBackgroundSync, triggerSync } from "./services/backgroundSync.js";
// import {
//   startInvoiceSync,
//   triggerInvoiceSync,
// } from "./services/invoiceSync.js";
// import {
//   initSessionTable,
//   getLoginSession,
// } from "./repositories/session.sqlite.repo.js";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// let mainWindow;
// let tray = null;
// let isQuitting = false;

// // Set app name to fix "electron" on hover in dev mode
// app.setName("M99 POS");

// // 🚀 Disable Hardware Acceleration to prevent GPU process crashes
// // This resolves the "GPU process exited unexpectedly" error on systems with weak/no GPUs.
// app.disableHardwareAcceleration();

// // 🚀 Prevent multiple instances from running at the same time
// const gotTheLock = app.requestSingleInstanceLock();
// if (!gotTheLock) {
//   // A second instance was started, so quit this new one immediately.
//   app.quit();
//   process.exit(0); // Exit to prevent any further code execution in ES Modules
// } else {
//   app.on("second-instance", () => {
//     if (mainWindow) {
//       if (!mainWindow.isVisible()) mainWindow.show();
//       if (mainWindow.isMinimized()) mainWindow.restore();
//       mainWindow.focus();
//     }
//   });
// }

// function createWindow() {
//   const iconPath = path.join(__dirname, "logo1.png");
//   const appIcon = nativeImage.createFromPath(iconPath);

//   mainWindow = new BrowserWindow({
//     width: 1200,
//     height: 800,
//     show: false,
//     title: "M99 POS",
//     icon: appIcon,
//     webPreferences: {
//       preload: path.join(__dirname, "preload.cjs"),
//       contextIsolation: true,
//       nodeIntegration: false,
//       sandbox: false,
//     },
//   });

//   // Prevent the HTML title from overriding the window title
//   mainWindow.on("page-title-updated", (event) => {
//     event.preventDefault();
//   });

//   // Explicitly set the dock icon for macOS
//   if (process.platform === "darwin") {
//     app.dock.setIcon(appIcon);
//   }

//   if (!app.isPackaged) {
//     // DEV
//     const loadDevUrl = () => {
//       mainWindow.loadURL("http://localhost:5173").catch(() => {
//         console.log("Waiting for Vite server to start...");
//         setTimeout(loadDevUrl, 1000);
//       });
//     };
//     loadDevUrl();
//     mainWindow.webContents.openDevTools();
//   } else {
//     // PROD
//     mainWindow.loadFile(
//       path.join(__dirname, "../renderer/pos-ui/dist/index.html"),
//     );
//   }

//   mainWindow.once("ready-to-show", () => {
//     mainWindow.show();
//   });

//   // 🚀 Prevent closing, hide to tray instead to keep Sync running
//   mainWindow.on("close", (event) => {
//     if (!isQuitting) {
//       event.preventDefault();
//       mainWindow.hide();
//       return false;
//     }
//   });
// }

// function createTray() {
//   const iconPath = path.join(__dirname, "logo1.png");
//   const icon = nativeImage.createFromPath(iconPath);

//   tray = new Tray(icon.resize({ width: 16, height: 16 }));
//   tray.setToolTip("M99 POS - Background Sync Active");

//   const contextMenu = Menu.buildFromTemplate([
//     { label: "Open POS", click: () => mainWindow.show() },
//     { type: "separator" },
//     {
//       label: "Quit",
//       click: () => {
//         isQuitting = true;
//         app.quit();
//       },
//     },
//   ]);

//   tray.setContextMenu(contextMenu);
//   tray.on("double-click", () => mainWindow.show());
// }

// app.whenReady().then(async () => {
//   // Set App User Model ID so OS dialogs/notifications use the custom app icon instead of default Electron
//   app.setAppUserModelId("com.m99.pos");

//   // 🚀 Prevent the OS from suspending/sleeping while the POS is running
//   try {
//     const blockerId = powerSaveBlocker.start("prevent-display-sleep");
//     console.log(`🔋 Power save blocker started (ID: ${blockerId})`);
//   } catch (err) {
//     console.error("⚠️ Failed to start power save blocker:", err);
//   }

//   // 🚀 Configure Auto-Launch on System Startup
//   if (app.isPackaged) {
//     app.setLoginItemSettings({
//       openAtLogin: true,
//       path: app.getPath("exe"),
//     });
//   }

//   try {
//     // Local DB (must succeed)
//     await checkSqliteConnection();
//     initSessionTable();
//   } catch (dbError) {
//     console.error("❌ Critical SQLite DB Initialization Error:", dbError);
//     app.quit();
//     return;
//   }

//   // Remote DB (optional)
//   const isOnline = await checkMysqlConnection();
//   if (isOnline) {
//     // console.log("✅ Online mode");

//     const session = getLoginSession() || {};

//     // Get branch code from environment
//     let branchCode = process.env.BRANCH_CODE || session.branch_code || "";

//     // initial sync
//     syncStockData(branchCode).catch(console.error);
//     syncItemsData().catch(console.error);
//     syncSchemesData().catch(console.error);
//     syncBranchesData().catch(console.error);

//     // 🔄 Auto-resume sync using persisted session details
//     const lastFyCode = session.fy_code;
//     if (lastFyCode) {
//       console.log("🔄 Auto-resuming sync services for FY:", lastFyCode);
//       startBackgroundSync(lastFyCode); // Use start to ensure crash recovery runs
//       startInvoiceSync(lastFyCode);
//     } else {
//       console.log("ℹ️ No saved session found. Waiting for login to sync.");
//     }
//   } else {
//     console.log("⚠️ Offline mode");
//   }

//   createWindow();
//   createTray();
// });

// // macOS
// app.on("activate", () => {
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow();
//   }
// });

// // Windows / Linux
// app.on("window-all-closed", () => {
//   // Keep the app running in background for sync
// });

// // Handle proper quit
// app.on("before-quit", () => {
//   isQuitting = true;
// });

import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  powerSaveBlocker,
  powerMonitor,
  ipcMain,
} from "electron";
import path from "path";
import { fileURLToPath } from "url";

const log = console;

process.on("uncaughtException", (error) => {
  log.error("<<<<< UNCAUGHT EXCEPTION >>>>>", error);
});
process.on("unhandledRejection", (reason, promise) => {
  log.error("<<<<< UNHANDLED REJECTION >>>>>", promise, reason);
});

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
import "./ipc/license.ipc.js";
import "./ipc/session.ipc.js";
import "./ipc/remembered_users.ipc.js";
import "./ipc/terminal_session.ipc.js";
import "./ipc/auth.ipc.js";
import "./ipc/cart_log.ipc.js";

import { checkConnection as checkMysqlConnection } from "./database/mysql.js";
import { checkConnection as checkSqliteConnection } from "./database/sqlite.js";
import {
  syncStockData,
  syncItemsData,
  syncSchemesData,
  syncBranchesData,
} from "./services/sync.js";
import { startBackgroundSync } from "./services/backgroundSync.js";
import { startInvoiceSync } from "./services/invoiceSync.js";
import { startShiftSync } from "./services/shiftSync.js";
import {
  initSessionTable,
  getLoginSession,
} from "./repositories/session.sqlite.repo.js";
import { initRememberedUsersTable } from "./repositories/remembered_users.sqlite.repo.js";
import { initUsersCacheTable } from "./repositories/user.sqlite.repo.js";
import { initCartDeleteLogTable } from "./repositories/cart_delete_log.sqlite.repo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let tray = null;
let isQuitting = false;

class PowerManager {
  constructor() {
    this.blockerId = null;
    this.mode = "none";
    this.userEnabled = true;
    this.billingActive = false;
    this.syncActive = false;
  }
  init() {
    powerMonitor.on("on-battery", () => this.evaluate());
    powerMonitor.on("on-ac", () => this.evaluate());
    app.on("before-quit", () => this.cleanup());
    this.evaluate();
  }
  setBilling(v) {
    this.billingActive = v;
    this.evaluate();
  }
  setSync(v) {
    this.syncActive = v;
    this.evaluate();
  }
  toggle() {
    this.userEnabled = !this.userEnabled;
    this.evaluate();
  }
  desiredMode() {
    if (!this.userEnabled) return "none";
    const onBattery = powerMonitor.isOnBatteryPower();
    if (this.billingActive) return "prevent-display-sleep";
    if (this.syncActive) return onBattery ? "none" : "prevent-app-suspension";
    return "none";
  }
  evaluate() {
    const next = this.desiredMode();
    if (next === this.mode) return;
    this.stop();
    if (next !== "none") {
      this.blockerId = powerSaveBlocker.start(next);
      this.mode = next;
      log.log("Power mode:", next);
    } else {
      this.mode = "none";
      log.log("Power mode disabled");
    }
    createTrayMenu();
  }
  stop() {
    if (this.blockerId && powerSaveBlocker.isStarted(this.blockerId)) {
      powerSaveBlocker.stop(this.blockerId);
    }
    this.blockerId = null;
  }
  cleanup() {
    this.stop();
  }
}

const powerManager = new PowerManager();

app.setName("M99 POS");
app.disableHardwareAcceleration();

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

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
  mainWindow.on("page-title-updated", (e) => e.preventDefault());
  if (process.platform === "darwin") app.dock.setIcon(appIcon);

  if (!app.isPackaged) {
    const loadDevUrl = () => {
      mainWindow
        .loadURL("http://localhost:5173")
        .catch(() => setTimeout(loadDevUrl, 1000));
    };
    loadDevUrl();
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "../renderer/pos-ui/dist/index.html"),
    );
  }

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: "Open POS", click: () => mainWindow.show() },
    { label: `Power: ${powerManager.mode}`, enabled: false },
    {
      label: powerManager.userEnabled
        ? "Disable Power Protection"
        : "Enable Power Protection",
      click: () => powerManager.toggle(),
    },
    { label: "Billing ON", click: () => powerManager.setBilling(true) },
    { label: "Billing OFF", click: () => powerManager.setBilling(false) },
    { label: "Sync ON", click: () => powerManager.setSync(true) },
    { label: "Sync OFF", click: () => powerManager.setSync(false) },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip(`M99 POS - ${powerManager.mode}`);
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, "logo1.png"));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  createTrayMenu();
  tray.on("double-click", () => mainWindow.show());
}

app.whenReady().then(async () => {
  app.setAppUserModelId("com.m99.pos");
  powerManager.init();

  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: true, path: app.getPath("exe") });
  }

  try {
    await checkSqliteConnection();
    initSessionTable();
    initRememberedUsersTable();
    initUsersCacheTable();
    initCartDeleteLogTable();
  } catch (err) {
    log.error("SQLite init failed", err);
    app.quit();
    return;
  }

  const session = getLoginSession() || {};
  const branchCode = process.env.BRANCH_CODE || session.branch_code || "";

  const isOnline = await checkMysqlConnection();
  if (isOnline) {
    powerManager.setSync(true);
    syncStockData(branchCode).catch(log.error);
    syncItemsData().catch(log.error);
    syncSchemesData().catch(log.error);
    syncBranchesData().catch(log.error);
  }

  // Always start background services so they can automatically resume and poll when online
  if (session.fy_code) {
    startBackgroundSync(session.fy_code);
    startInvoiceSync(session.fy_code);
  }
  startShiftSync();

  createWindow();
  createTray();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on("window-all-closed", () => {});
app.on("before-quit", () => {
  isQuitting = true;
});
