import { BrowserWindow } from "electron";
import dns from "dns";
import {
  getPendingTransactions,
  markTransactionSynced,
  incrementSyncAttempts,
  getLastSyncedTransaction,
  insertSyncedTransactionSqlite,
  getTransactionsSqlite,
  lockTransactionsSqlite,
  resetStuckTransactionsSqlite
} from "../repositories/transaction.sqlite.repo.js";
import config from "../config.cjs";

const { API_BASE_URL } = config;

const SYNC_INTERVAL = 60 * 1000;
const API_URL = `${API_BASE_URL}/transaction-sync/sync`;

const MAX_RETRY_ATTEMPTS = 5;
const BATCH_SIZE = 10;
const PULL_LIMIT = 100;

// ⭐ jitter range (0–5 sec)
const JITTER_MAX = 5000;

let isSyncing = false;
let syncTimer = null;
let backoffDelay = 1000;
let currentFyCode = null;

function getJitterDelay(baseDelay) {
  const jitter = Math.floor(Math.random() * JITTER_MAX);
  return baseDelay + jitter;
}

function isOnline() {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(false), 3000); // Prevent hanging on captive portals
    dns.lookup("google.com", (err) => {
      clearTimeout(timer);
      resolve(!err);
    });
  });
}

export function startBackgroundSync(fy_code) {
  if (fy_code) currentFyCode = fy_code;
  console.log("🚀 Background Sync Started for FY:", currentFyCode);

  // 🧹 CRASH RECOVERY: Release any locks that were stuck due to an unexpected app exit
  if (currentFyCode) {
    resetStuckTransactionsSqlite(currentFyCode);
    console.log("🧹 Checked and cleared stuck transactions (Crash Recovery)");
  }

  runSync();
}

export function triggerSync(fy_code) {
  if (fy_code) currentFyCode = fy_code;

  if (!isSyncing && !syncTimer) {
    runSync();
  }
}

function sendStatusToRenderer(status) {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send("sync-status-change", status);
    }
  });
}

function formatTransactionPayload(tx) {
  let parsedCart = [];
  try {
    parsedCart = typeof tx.cart_items === "string" ? JSON.parse(tx.cart_items || "[]") : (tx.cart_items || []);
  } catch (e) {
    console.warn(`⚠️ Cart items parse error for bill ${tx.bill_no}, returning empty array`);
  }

  return {
    id: tx.id,
    bill_no: tx.bill_no,
    branch_code: tx.branch_code,
    terminal_code: tx.terminal_code,
    cashier_id: String(tx.cashier_id || ""),
    customer_name: tx.customer_name || "Walk-in",
    customer_mobile: tx.customer_mobile || "",
    total_qty: tx.total_qty || 0,
    gross_amount: tx.gross_amount || 0,
    total_discount: tx.total_discount || 0,
    taxable_value: tx.taxable_value || 0,
    total_tax: tx.total_tax || 0,
    round_off: tx.round_off || 0,
    grand_total: tx.grand_total || 0,
    payment_mode: tx.payment_mode || "cash",
    amount_received: tx.amount_received || 0,
    transaction_ref: tx.transaction_ref || "",
    cart_items: parsedCart,
    time: tx.time,
    integrity_hash: tx.integrity_hash || "",
    month_range: tx.month_range,
    hour_range: tx.hour_range,
    fin_year: tx.fin_year,
    financial_year: tx.financial_year,
    created_at: tx.created_at || new Date().toISOString()
  };
}

async function runSync() {
  if (isSyncing || !currentFyCode) return;

  if (!(await isOnline())) {
    console.log("🌐 Offline — skipping sync");
    scheduleNextSync(SYNC_INTERVAL);
    return;
  }

  const allPending = getPendingTransactions(BATCH_SIZE, currentFyCode);

  // Filter out transactions that have already failed the max number of times
  const pending = allPending.filter(tx => tx.sync_attempts < MAX_RETRY_ATTEMPTS);

  if (!pending.length) {
    sendStatusToRenderer("idle");

    // If there's nothing to sync, or all pending items have failed, check again later.
    scheduleNextSync(3 * 60 * 1000);
    return;
  }

  // 🔒 TRANSACTION LOCK: Mark these as 'syncing' (status = 2) to prevent concurrent double-syncs
  const pendingIds = pending.map(tx => tx.id);
  lockTransactionsSqlite(pendingIds, currentFyCode);

  isSyncing = true;
  sendStatusToRenderer("syncing");

  try {
    // ⬇️ pull remote first
    await pullRemoteTransactions();

    console.log(`🔄 Syncing ${pending.length} transactions (FY ${currentFyCode})`);

    const payload = {
      fy_code: currentFyCode,
      transactions: pending.map(formatTransactionPayload)
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(response.statusText);

    const result = await response.json();

    console.log("✅ Sync Result:", result);

    result.synced?.forEach(id =>
      markTransactionSynced(id, currentFyCode)
    );

    result.failed?.forEach(id =>
      incrementSyncAttempts(id, currentFyCode)
    );

    backoffDelay = 1000;
    sendStatusToRenderer("synced");

    // process next batch immediately
    if (pending.length === BATCH_SIZE && result.synced?.length > 0) {
      isSyncing = false;
      runSync();
      return;
    }

  } catch (error) {
    console.error("❌ Sync Failed:", error.message);

    pending.forEach(tx => {
      if (tx.sync_attempts < MAX_RETRY_ATTEMPTS) {
        incrementSyncAttempts(tx.id, currentFyCode);
      }
    });

    sendStatusToRenderer("error");

    backoffDelay = Math.min(backoffDelay * 2, 60000);
  } finally {
    isSyncing = false;

    const delay =
      backoffDelay > 1000
        ? backoffDelay
        : SYNC_INTERVAL;

    scheduleNextSync(delay);
  }
}

async function pullRemoteTransactions() {
  try {
    const lastTxn = getLastSyncedTransaction(currentFyCode);
    const lastSyncedTime = lastTxn?.created_at || "1970-01-01T00:00:00Z";

    const url = new URL(API_URL);
    url.searchParams.append("fy_code", currentFyCode);
    url.searchParams.append("last_synced", lastSyncedTime);
    url.searchParams.append("limit", PULL_LIMIT);

    const response = await fetch(url.toString());

    if (!response.ok) return;

    const result = await response.json();

    if (Array.isArray(result.transactions) && result.transactions.length) {
      console.log(`⬇️ Pulled ${result.transactions.length} transactions`);

      for (const txn of result.transactions) {
        insertSyncedTransactionSqlite({
          ...txn,
          fy_code: currentFyCode,
        });
      }
    }
  } catch (error) {
    console.warn("⚠️ Pull Sync Warning:", error.message);
  }
}

function scheduleNextSync(delay) {
  if (syncTimer) clearTimeout(syncTimer);

  const finalDelay = getJitterDelay(delay);

  console.log(`⏳ Next sync in ${(finalDelay / 1000).toFixed(1)}s`);

  syncTimer = setTimeout(runSync, finalDelay);
}

export async function syncSpecificTransaction(bill_no, fy_code) {
  console.log(`🚀 Manual Sync for Bill: ${bill_no}`);

  const activeFyCode = fy_code || currentFyCode;

  // Fetch the specific transaction
  let transactions = getTransactionsSqlite({ bill_no, fy_code: activeFyCode });

  if (!transactions || transactions.length === 0) {
    throw new Error("Transaction not found");
  }

  const tx = transactions[0];

  // 🔒 TRANSACTION LOCK: Prevent manual double syncing
  if (tx.sync_status === 2) {
    console.warn(`⚠️ Transaction ${bill_no} is currently locked by background sync.`);
    throw new Error("Transaction is currently syncing in the background. Please wait.");
  }
  if (tx.sync_status === 1) {
    console.log(`ℹ️ Transaction ${bill_no} is already synced.`);
    return { status: "success" };
  }

  // Lock it for this manual operation
  lockTransactionsSqlite([tx.id], activeFyCode);

  try {
    const payload = {
      fy_code: activeFyCode,
      transactions: [formatTransactionPayload(tx)]
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(response.statusText);

    const result = await response.json();
    console.log("✅ Manual Sync Result:", result);

    if (result.synced?.includes(tx.id)) {
      markTransactionSynced(tx.id, activeFyCode);
      return { status: "success" };
    } else {
      throw new Error("Server did not acknowledge sync");
    }
  } catch (error) {
    // Failure gracefully releases the lock
    incrementSyncAttempts(tx.id, activeFyCode);
    throw error;
  }
}
