const { contextBridge, ipcRenderer } = require("electron");
const { API_BASE_URL, API_BASE_URL2 } = require("./config.cjs");

const posApi = {
  apiBaseUrl: API_BASE_URL,
  apiBaseUrl2: API_BASE_URL2,
  /**
   * Get item by item code
   * @param {string} code
   */
  getItem(code) {
    if (typeof code !== "string" || !code.trim()) {
      return Promise.reject(new Error("Invalid item code"));
    }
    return ipcRenderer.invoke("get-item", code.trim());
  },

  /**
   * Save billing data
   * @param {object} bill
   */
  saveBill(bill) {
    if (!bill || typeof bill !== "object") {
      return Promise.reject(new Error("Invalid bill data"));
    }
    return ipcRenderer.invoke("save-bill", bill);
  },

  /**
   * Get the last bill generated
   */
  getLastBill(params) {
    return ipcRenderer.invoke("get-last-bill", params);
  },

  /**
   * Get all transactions
   */
  getTransactions(params) {
    return ipcRenderer.invoke("get-transactions", params);
  },

  /**
   * Reset Database (Clear Transactions & Stock)
   */
  resetDatabase(fy_code) {
    return ipcRenderer.invoke("reset-database", fy_code);
  },

  /**
   * Check DB connection status
   */
  checkDbConnection() {
    return ipcRenderer.invoke("check-db-connection");
  },

  /**
   * Get stock from SQLite by LogicUserCode
   * @param {string} code
   */
  getStockByLogicUserCodeSqlite(code) {
    if (typeof code !== "string" || !code.trim()) {
      return Promise.reject(new Error("Invalid logic user code"));
    }
    return ipcRenderer.invoke("get-stock-by-code", code.trim());
  },

  /**
   * Get all schemes from SQLite
   */
  getSchemes() {
    return ipcRenderer.invoke("get-schemes");
  },

  /**
   * Get all branches from SQLite
   */
  getBranches() {
    return ipcRenderer.invoke("get-branches");
  },

  /**
   * Trigger manual items sync
   */
  syncItems(isManual = true) {
    return ipcRenderer.invoke("sync-items", isManual);
  },

  /**
   * Trigger manual scheme sync
   */
  syncSchemes(isManual = true) {
    return ipcRenderer.invoke("sync-schemes", isManual);
  },

  /**
   * Trigger manual stock sync
   */
  syncStock(branchCode, isManual = true) {
    return ipcRenderer.invoke("sync-stock", branchCode, isManual);
  },

  /**
   * Trigger manual branches sync
   */
  syncBranches(isManual = true) {
    return ipcRenderer.invoke("sync-branches", isManual);
  },

  /**
   * Trigger background sync manually (e.g. when online)
   */
  triggerBackgroundSync(fy_code) {
    return ipcRenderer.invoke("trigger-background-sync", fy_code);
  },

  /**
   * Sync a specific transaction manually
   */
  syncSpecificTransaction(bill_no, fy_code) {
    return ipcRenderer.invoke("sync-specific-transaction", { bill_no, fy_code });
  },

  /**
   * Trigger manual invoice sync
   */
  triggerInvoiceSync() {
    return ipcRenderer.invoke("trigger-invoice-sync");
  },

  /**
   * Get last synced invoice
   */
  getLastSyncedInvoice(params) {
    return ipcRenderer.invoke("get-last-synced-invoice", params);
  },

  /**
   * Hold the current sale
   */
  holdSale(data) {
    return ipcRenderer.invoke("hold-sale", data);
  },

  /**
   * Get all held sales
   */
  getHoldSales(params) {
    return ipcRenderer.invoke("get-hold-sales", params);
  },

  /**
   * Delete a held sale (usually after resuming)
   */
  deleteHeldSale(id) {
    return ipcRenderer.invoke("delete-hold-sale", id);
  },

  /**
   * Listen for background sync status changes
   */
  onSyncStatusChange(callback) {
    const subscription = (_event, status) => callback(status);
    ipcRenderer.on("sync-status-change", subscription);
    return () => ipcRenderer.removeListener("sync-status-change", subscription);
  },

  /**
   * Get count of all pending sync items (transactions and invoices)
   */
  getPendingSyncCount(fy_code) {
    return ipcRenderer.invoke("get-pending-sync-count", fy_code);
  },

  /**
   * Persist login details for auto-resume on startup
   */
  setLoginDetails(details) {
    return ipcRenderer.invoke("set-login-details", details);
  },

  /**
   * Print receipt silently or save as PDF
   */
  // printReceipt(htmlContent) {
  //   return ipcRenderer.invoke("print-receipt", htmlContent);
  // }

  printReceipt(htmlContent) {
    if (!htmlContent || typeof htmlContent !== "string") {
      return Promise.reject(new Error("Invalid HTML content"));
    }
    return ipcRenderer.invoke("print-receipt", htmlContent);
  },

  /**
   * Print receipt using Raw ESC/POS for ultra-fast printing
   * @param {object} data
   */
  printEscposReceipt(data) {
    if (!data || typeof data !== "object") {
      return Promise.reject(new Error("Invalid receipt data"));
    }
    return ipcRenderer.invoke("print-escpos-receipt", data);
  },

  /**
   * Get unique device ID (SHA-256 hash of MAC address)
   */
  getDeviceId() {
    return ipcRenderer.invoke("get-device-id");
  },

};

// Expose API safely & immutably
contextBridge.exposeInMainWorld(
  "posApi",
  Object.freeze(posApi)
);
