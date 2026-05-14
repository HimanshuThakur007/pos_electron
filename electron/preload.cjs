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
   * Get all items at once
   */
  getAllItems() {
    return ipcRenderer.invoke("get-all-items");
  },

  /**
   * Get total item count
   */
  getItemsCount() {
    return ipcRenderer.invoke("get-items-count");
  },

  /**
   * Get all stock at once
   */
  getAllStock() {
    return ipcRenderer.invoke("get-all-stock");
  },

  /**
   * Get total stock count for a branch
   */
  getStockCount(branchCode) {
    return ipcRenderer.invoke("get-stock-count", branchCode);
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
  checkDbConnection(branchCode) {
    return ipcRenderer.invoke("check-db-connection", branchCode);
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
   * Get paginated items from SQLite
   */
  getItemsPaginated(params) {
    return ipcRenderer.invoke("get-items-paginated", params);
  },

  /**
   * Get paginated stock from SQLite
   */
  getStockPaginated(params) {
    return ipcRenderer.invoke("get-stock-paginated", params);
  },

  /**
   * Get paginated branches from SQLite
   */
  getBranchesPaginated(params) {
    return ipcRenderer.invoke("get-branches-paginated", params);
  },

  /**
   * Get all schemes from SQLite
   */
  getSchemes() {
    return ipcRenderer.invoke("get-schemes");
  },

  /**
   * Get total schemes count
   */
  getSchemesCount() {
    return ipcRenderer.invoke("get-schemes-count");
  },

  /**
   * Get paginated schemes from SQLite
   */
  getSchemesPaginated(params) {
    return ipcRenderer.invoke("get-schemes-paginated", params);
  },

  /**
   * Get all branches from SQLite
   */
  getBranches() {
    return ipcRenderer.invoke("get-branches");
  },

  /**
   * Get total branches count
   */
  getBranchesCount() {
    return ipcRenderer.invoke("get-branches-count");
  },

  /**
   * Get branch details by code
   */
  getBranchByCode(branchCode) {
    return ipcRenderer.invoke("get-branch-by-code", branchCode);
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
    return ipcRenderer.invoke("sync-specific-transaction", {
      bill_no,
      fy_code,
    });
  },

  /**
   * Trigger manual invoice sync
   */
  triggerInvoiceSync() {
    return ipcRenderer.invoke("trigger-invoice-sync");
  },

  /**
   * Trigger manual shift sync
   */
  triggerShiftSync() {
    return ipcRenderer.invoke("trigger-shift-sync");
  },

  /**
   * Get last synced invoice
   */
  getLastSyncedInvoice(params) {
    return ipcRenderer.invoke("get-last-synced-invoice", params);
  },

  /**
   * Get all invoice series
   */
  getAllInvoiceSeries(fy_code) {
    return ipcRenderer.invoke("get-all-invoice-series", fy_code);
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
  getPendingSyncCount(fy_code, options) {
    return ipcRenderer.invoke("get-pending-sync-count", fy_code, options);
  },

  /**
   * Persist login details for auto-resume on startup
   */
  setLoginDetails(details) {
    return ipcRenderer.invoke("set-login-details", details);
  },

  /**
   * Get the persisted session details (including auth token)
   */
  getSession() {
    return ipcRenderer.invoke("get-session");
  },

  /**
   * Clear the persisted session details on logout
   */
  clearSession() {
    return ipcRenderer.invoke("clear-session");
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

  /**
   * Save the terminal license key
   */
  saveLicense(key) {
    return ipcRenderer.invoke("save-license", key);
  },

  /**
   * Get the stored terminal license key
   */
  getLicense() {
    return ipcRenderer.invoke("get-license");
  },

  /**
   * Remove the terminal license key
   */
  removeLicense() {
    return ipcRenderer.invoke("remove-license");
  },

  /**
   * Validate GST via Node to bypass CORS
   */
  validateGst(gstin) {
    return ipcRenderer.invoke("validate-gst", gstin);
  },

  /**
   * Get all remembered user emails
   */
  getRememberedUsers() {
    return ipcRenderer.invoke("get-remembered-users");
  },

  /**
   * Get credentials for a specific remembered user
   */
  getCredentialsForUser(email) {
    return ipcRenderer.invoke("get-credentials-for-user", email);
  },

  /**
   * Save a user's credentials
   */
  saveRememberedUser(credentials) {
    return ipcRenderer.invoke("save-remembered-user", credentials);
  },

  /**
   * Remove a remembered user
   */
  removeRememberedUser(email) {
    return ipcRenderer.invoke("remove-remembered-user", email);
  },

  /**
   * Terminal Session
   */
  openTerminalSession(data) {
    return ipcRenderer.invoke("open-terminal-session", data);
  },
  getActiveTerminalSession(data) {
    return ipcRenderer.invoke("get-active-terminal-session", data);
  },
  closeTerminalSession(id, data) {
    return ipcRenderer.invoke("close-terminal-session", { id, data });
  },
  getLastClosedSession(data) {
    return ipcRenderer.invoke("get-last-closed-session", data);
  },

  /**
   * Offline Login & Credentials Caching
   */
  offlineLogin(credentials) {
    return ipcRenderer.invoke("offline-login", credentials);
  },
  cacheUserLogin(data) {
    if (!data || !data.email || !data.password || !data.payload) {
      return Promise.reject(
        new Error(
          "Invalid cache data: email, password, and payload are required",
        ),
      );
    }
    return ipcRenderer.invoke("cache-user-login", data);
  },

  /**
   * Log a deleted cart item to the database
   */
  logDeletedItem(data) {
    return ipcRenderer.invoke("log-deleted-item", data);
  },
};

// Expose API safely & immutably
contextBridge.exposeInMainWorld("posApi", Object.freeze(posApi));
