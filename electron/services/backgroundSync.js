import { BrowserWindow } from "electron";
import dns from "dns";
import {
  getPendingTransactions,
  markTransactionSynced,
  incrementSyncAttempts,
  getLastSyncedTransaction,
  insertSyncedTransactionSqlite,
} from "../repositories/transaction.sqlite.repo.js";
import { API_BASE_URL } from "../config.js";

const SYNC_INTERVAL = 60 * 1000;
const API_URL = `${API_BASE_URL}/transaction-sync/sync`;

const MAX_RETRY_ATTEMPTS = 5;
const BATCH_SIZE = 10;
const PULL_LIMIT = 100;

let isSyncing = false;
let syncTimer = null;
let backoffDelay = 1000;
let currentFyCode = null;

function isOnline() {
  return new Promise(resolve =>
    dns.lookup("google.com", err => resolve(!err))
  );
}

export function startBackgroundSync(fy_code) {
  if (fy_code) currentFyCode = fy_code;
  console.log("🚀 Background Sync Started for FY:", currentFyCode);
  runSync();
}

export function triggerSync(fy_code) {
  if (fy_code) currentFyCode = fy_code;
  console.log("⚡ Manual Sync Triggered");

  backoffDelay = 1000;
  if (syncTimer) clearTimeout(syncTimer);

  runSync();
}

function sendStatusToRenderer(status) {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send("sync-status-change", status);
    }
  });
}

async function runSync() {
  if (isSyncing || !currentFyCode) return;

  if (!(await isOnline())) {
    console.log("🌐 Offline — skipping sync");
    scheduleNextSync(SYNC_INTERVAL);
    return;
  }

  isSyncing = true;
  sendStatusToRenderer("syncing");

  let pending = [];

  try {
    // ⬇️ pull remote first
    await pullRemoteTransactions();

    pending = getPendingTransactions(BATCH_SIZE, currentFyCode);

    if (!pending.length) {
      sendStatusToRenderer("idle");
      return;
    }

    console.log(`🔄 Syncing ${pending.length} transactions (FY ${currentFyCode})`);

    const payload = {
      fy_code: currentFyCode,
      transactions: pending.map(tx => ({
        id: tx.id,
        bill_no: tx.bill_no,
        branch_code: tx.branch_code,
        terminal_code: tx.terminal_code,
        cashier_id: String(tx.cashier_id || ""),
        customer_mobile: tx.customer_mobile || "",
        total_qty: tx.total_qty || 0,
        gross_amount: tx.gross_amount || 0,
        total_discount: tx.total_discount || 0,
        taxable_value: tx.taxable_value || 0,
        total_tax: tx.total_tax || 0,
        grand_total: tx.grand_total || 0,
        payment_mode: tx.payment_mode || "cash",
        amount_received: tx.amount_received || 0,
        transaction_ref: tx.transaction_ref || "",
        cart_items:
          typeof tx.cart_items === "string"
            ? JSON.parse(tx.cart_items || "[]")
            : tx.cart_items || [],
        time: tx.time,
        month_range: tx.month_range,
        hour_range: tx.hour_range,
        fin_year: tx.fin_year,
        financial_year: tx.financial_year,
      }))
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

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
    scheduleNextSync(backoffDelay > 1000 ? backoffDelay : SYNC_INTERVAL);
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
  syncTimer = setTimeout(runSync, delay);
}





// import { BrowserWindow } from "electron";
// import dns from "dns";
// import {
//   getPendingTransactions,
//   markTransactionSynced,
//   incrementSyncAttempts,
//   getLastSyncedTransaction,
//   insertSyncedTransactionSqlite,
// } from "../repositories/transaction.sqlite.repo.js";
// import { API_BASE_URL } from "../config.js";

// const SYNC_INTERVAL = 60 * 1000;
// const API_URL = `${API_BASE_URL}/transaction-sync/sync`;
// const MAX_RETRY_ATTEMPTS = 5;
// const PULL_LIMIT = 100;

// let isSyncing = false;
// let syncTimer = null;
// let backoffDelay = 1000;

// // ✅ Check internet connectivity
// function isOnline() {
//   return new Promise(resolve =>
//     dns.lookup("google.com", err => resolve(!err))
//   );
// }

// export function startBackgroundSync() {
//   console.log("🚀 Background Sync Service Started");
//   runSync();
// }

// export function triggerSync() {
//   console.log("⚡ Manual Sync Triggered");
//   backoffDelay = 1000;
//   if (syncTimer) clearTimeout(syncTimer);
//   runSync();
// }

// function sendStatusToRenderer(status) {
//   BrowserWindow.getAllWindows().forEach(win => {
//     if (!win.isDestroyed()) {
//       win.webContents.send("sync-status-change", status);
//     }
//   });
// }

// async function runSync() {
//   if (isSyncing) return;

//   if (!(await isOnline())) {
//     console.log("🌐 Offline — skipping sync");
//     scheduleNextSync(SYNC_INTERVAL);
//     return;
//   }

//   isSyncing = true;
//   sendStatusToRenderer("syncing");

//   let pending = [];

//   try {
//     // ⬇️ Pull remote changes first
//     await pullRemoteTransactions();

//     // only fetch records below retry limit
//     pending = getPendingTransactions(10, MAX_RETRY_ATTEMPTS);

//     if (!pending.length) {
//       sendStatusToRenderer("idle");
//       return;
//     }

//     console.log(`🔄 Syncing ${pending.length} transactions...`);

//     const payload = {
//       transactions: pending.map(tx => ({
//         id: tx.id,
//         bill_no: tx.bill_no,
//         branch_code: tx.branch_code,
//         terminal_code: tx.terminal_code,
//         cashier_id: String(tx.cashier_id),
//         customer_mobile: tx.customer_mobile,
//         total_qty: tx.total_qty,
//         gross_amount: tx.gross_amount,
//         total_discount: tx.total_discount,
//         taxable_value: tx.taxable_value,
//         total_tax: tx.total_tax,
//         grand_total: tx.grand_total,
//         payment_mode: tx.payment_mode,
//         amount_received: tx.amount_received,
//         transaction_ref: tx.transaction_ref,
//         cart_items:
//           typeof tx.cart_items === "string"
//             ? JSON.parse(tx.cart_items || "[]")
//             : tx.cart_items,
//         time: tx.time,
//       }))
//     };

//     const controller = new AbortController();
//     const timeout = setTimeout(() => controller.abort(), 15000);

//     const response = await fetch(API_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//       signal: controller.signal
//     });

//     clearTimeout(timeout);

//     if (!response.ok) throw new Error(response.statusText);

//     const result = await response.json();

//     console.log("✅ Sync Result:", result);

//     result.synced?.forEach(id => id && markTransactionSynced(id));
//     result.failed?.forEach(id => id && incrementSyncAttempts(id));

//     backoffDelay = 1000;
//     sendStatusToRenderer("synced");

//     // process next batch immediately if more exist
//     if (pending.length === 10 && result.synced?.length > 0) {
//       isSyncing = false;
//       runSync();
//       return;
//     }

//   } catch (error) {
//     console.error("❌ Sync Failed:", error.message);

//     pending.forEach(tx => {
//       if (tx.sync_attempts < MAX_RETRY_ATTEMPTS) {
//         incrementSyncAttempts(tx.id);
//       }
//     });

//     sendStatusToRenderer("error");

//     backoffDelay = Math.min(backoffDelay * 2, 60000);
//   } finally {
//     isSyncing = false;
//     scheduleNextSync(backoffDelay > 1000 ? backoffDelay : SYNC_INTERVAL);
//   }
// }

// async function pullRemoteTransactions() {
//   try {
//     const lastTxn = getLastSyncedTransaction();
//     const lastSyncedTime = lastTxn?.created_at || "1970-01-01T00:00:00Z";

//     const url = new URL(API_URL);
//     url.searchParams.append("last_synced", lastSyncedTime);
//     url.searchParams.append("limit", PULL_LIMIT);

//     const response = await fetch(url.toString());

//     if (!response.ok) return;

//     const result = await response.json();

//     if (Array.isArray(result.transactions) && result.transactions.length) {
//       console.log(`⬇️ Pulled ${result.transactions.length} remote transactions`);

//       for (const txn of result.transactions) {
//         // repository must UPSERT to prevent duplicates
//         insertSyncedTransactionSqlite(txn);
//       }
//     }
//   } catch (error) {
//     console.warn("⚠️ Pull Sync Warning:", error.message);
//   }
// }

// function scheduleNextSync(delay) {
//   if (syncTimer) clearTimeout(syncTimer);
//   syncTimer = setTimeout(runSync, delay);
// }
