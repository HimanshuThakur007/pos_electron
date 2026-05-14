import { ipcMain } from "electron";
import {
  insertTransactionSqlite,
  getLastTransactionSqlite,
  getTransactionsSqlite,
  getTransactionCountSqlite,
  insertSyncedTransactionSqlite,
  getPendingTransactions,
} from "../repositories/transaction.sqlite.repo.js";
import { decreaseStockQtySqlite } from "../repositories/stock.sqlite.repo.js";
import {
  insertInvoiceSqlite,
  getInvoiceCountSqlite,
  insertSyncedInvoiceSqlite,
  getLastSyncedInvoiceSqlite,
  getPendingInvoices,
  getAllInvoiceSeries,
} from "../repositories/invoice.sqlite.repo.js";
import { triggerInvoiceSync } from "../services/invoiceSync.js";
import {
  syncSpecificTransaction,
  triggerSync,
} from "../services/backgroundSync.js";
import { triggerShiftSync } from "../services/shiftSync.js";
import { API_BASE_URL, API_BASE_URL2 } from "../config.js";
import { getLoginSession } from "../repositories/session.sqlite.repo.js";
import { isServerOnline } from "../utils/network.js";

// console.log("🔄 Loading Transaction IPC...");

ipcMain.handle("save-bill", async (_, billData) => {
  console.log("💾 Saving bill...", billData?.bill_no);
  try {
    const id = insertTransactionSqlite(billData);
    console.log("✅ Bill saved, ID:", id);

    if (billData.cart_items && billData.cart_items.length > 0) {
      decreaseStockQtySqlite(billData.cart_items);
      console.log("📉 Stock updated for", billData.cart_items.length, "items");
    }

    return { status: "success", id };
  } catch (err) {
    console.error("Save bill error:", err);
    return { status: "error", message: err.message };
  }
});

ipcMain.handle("get-last-bill", async (_, params = {}) => {
  try {
    console.log("Params", params);
    const count = getTransactionCountSqlite(params.fy_code);
    console.log(`📊 Get Last Bill - Count: ${count}`);

    // If DB is empty and we have branch info, try to fetch last transaction from API
    if (count === 0 && params && params.branch_code) {
      const isOnline =
        params.isServerOnline !== undefined
          ? params.isServerOnline
          : await isServerOnline();

      if (!isOnline) {
        console.log("🌐 Server Offline — skipping API fetch for last bill");
      } else {
        console.log("Api called tran");
        console.log("🔄 DB Empty. Fetching last transaction from API...");
        const branch = params.branch_code;
        const terminal = params.terminal_code || "A";
        const cashier = params.cashier_id || 0;
        const fy_code = params.fy_code;

        try {
          const url = `${API_BASE_URL}/transaction-sync/last/${fy_code}/${branch}/${terminal}/${cashier}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          //   console.log('response',response)
          if (response.ok) {
            const json = await response.json();
            if (json.success && json.data) {
              const tx = json.data;
              console.log("✅ Fetched last transaction:", tx.bill_no);

              insertSyncedTransactionSqlite({
                bill_no: tx.bill_no,
                branch_code: tx.branch_code,
                terminal_code: tx.terminal_code,
                cashier_id: tx.cashier_id,
                customer_name: "Walk-in",
                customer_mobile: tx.customer_mobile || "",
                total_qty: tx.total_qty,
                gross_amount: tx.gross_amount,
                total_discount: tx.total_discount,
                taxable_value: tx.taxable_value,
                total_tax: tx.total_tax,
                round_off: tx.round_off || 0,
                grand_total: tx.grand_total,
                payment_mode: tx.payment_mode,
                amount_received: tx.amount_received,
                transaction_ref: tx.transaction_ref || "",
                cart_items: tx.cart_items,
                time: tx.created_at,
                month_range: tx.month_range,
                hour_range: tx.hour_range,
                fin_year: tx.fin_year,
                financial_year: tx.financial_year,
                fy_code: params.fy_code,
              });
            }
          }
        } catch (fetchErr) {
          console.error(
            "⚠️ Failed to fetch last transaction from API:",
            fetchErr.message,
          );
        }
      }
    }
  } catch (err) {
    console.error("❌ get-last-bill error:", err.message);
  }

  const lastBill = getLastTransactionSqlite(params);
  return lastBill;
});

ipcMain.handle("get-transactions", async (_, params) => {
  console.log("Backend: get-transactions params received:", params);
  if (!params) {
    console.warn("⚠️ Warning: get-transactions called without parameters.");
  }
  const result = getTransactionsSqlite(params || {});
  console.log("Backend: get-transactions result count:", result.length);
  return result;
});

ipcMain.handle("get-pending-sync-count", async (_, fy_code, options) => {
  try {
    const forLogout = options?.forLogout || false;
    // `strictlyPending` is for the dashboard count, to only show brand new items.
    // It should not be automatically true when forLogout is true.
    const strictlyPending = options?.strictlyPending || false;

    // For logout, we check all pending transactions, then filter out the permanently failed ones.
    // For the dashboard, we use the `strictlyPending` flag.
    const useStrictForGet = forLogout ? false : strictlyPending;
    let pendingTx = getPendingTransactions(9999, fy_code, useStrictForGet);

    // Exclude permanently failed transactions if requested by UI
    if (options?.excludeFailed) {
      pendingTx = pendingTx.filter((tx) => (tx.sync_attempts || 0) < 3);
    }

    // Invoice series sync is a background task and should not block user logout or be shown in UI count.
    const pendingInvoices = [];

    return pendingTx.length + pendingInvoices.length;
  } catch (err) {
    console.error("get-pending-sync-count error:", err);
    return 0; // fail safe
  }
});

ipcMain.handle("trigger-invoice-sync", async () => {
  triggerInvoiceSync();
  return { status: "success" };
});

ipcMain.handle("trigger-background-sync", async (_, fy_code) => {
  triggerSync(fy_code);
  return { status: "success" };
});

ipcMain.handle("trigger-shift-sync", async () => {
  triggerShiftSync();
  return { status: "success" };
});

ipcMain.handle("sync-specific-transaction", async (_, { bill_no, fy_code }) => {
  try {
    await syncSpecificTransaction(bill_no, fy_code);
    return { status: "success" };
  } catch (err) {
    console.error("Manual sync error:", err);
    return { status: "error", message: err.message };
  }
});

ipcMain.handle("get-last-synced-invoice", async (_, params) => {
  try {
    const doc_type = params?.doc_type || (params?.isB2B ? 2 : 1);

    if (params && params.branch_code) {
      const isOnline =
        params.isServerOnline !== undefined
          ? params.isServerOnline
          : await isServerOnline();

      if (!isOnline) {
        console.log(
          "🌐 Server Offline — skipping invoice series check from API",
        );
      } else {
        console.log("🔄 Fetching latest invoice series from API to compare...");
        const branch = params.branch_code;
        const terminal = params.terminal_code || "A";
        const cashier = params.cashier_id || 0;
        const fullFyCode = params.fy_code || "";
        const shortFyCode =
          fullFyCode.length >= 2 ? fullFyCode.slice(-2) : fullFyCode;

        const url = `${API_BASE_URL2}/pos/invoice-series?branch_code=${branch}&terminal_code=${terminal}&fy_code=${shortFyCode}&user_id=${cashier}&doc_type=${doc_type}`;
        console.log("url-get-last-synced-invoice", url);
        const session = getLoginSession() || {};
        const token = session.token || session.auth_token || "";

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          const json = await response.json();
          // Safely extract from rows array or data object
          const data = json.data || json.rows || json;
          const invoiceData = Array.isArray(data) ? data[0] : data;
          if (invoiceData && invoiceData.current_number !== undefined) {
            const apiNumber = Number(invoiceData.current_number || 0);

            const localInvoice = getLastSyncedInvoiceSqlite(params);
            const localNumber = localInvoice
              ? Number(localInvoice.current_number || 0)
              : 0;

            console.log(
              `📊 Comparing Invoice Series (Doc ${doc_type}) - Local: ${localNumber}, API: ${apiNumber}`,
            );

            if (apiNumber > localNumber) {
              console.log(
                "✅ API number is greater, updating local series:",
                apiNumber,
              );
              insertSyncedInvoiceSqlite({
                branch_code: branch, // Force strictly to requested context to prevent API mismatch
                terminal_code: terminal,
                user_id: cashier,
                fy_code: fullFyCode, // keep full fy_code for local db matching
                current_number: apiNumber,
                bill_no: invoiceData.bill_no || invoiceData.invoice_no,
                doc_type: doc_type,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("❌ Failed to sync last invoice:", err.message);
  }
  return getLastSyncedInvoiceSqlite(params);
});

ipcMain.handle("get-all-invoice-series", async (_, fy_code) => {
  try {
    return getAllInvoiceSeries(fy_code);
  } catch (err) {
    console.error("❌ Failed to get all invoice series:", err.message);
    return [];
  }
});
