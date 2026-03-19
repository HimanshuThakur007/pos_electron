import { ipcMain } from "electron";
import { insertTransactionSqlite, getLastTransactionSqlite, getTransactionsSqlite, getTransactionCountSqlite, insertSyncedTransactionSqlite, getPendingTransactions } from "../repositories/transaction.sqlite.repo.js";
import { decreaseStockQtySqlite } from "../repositories/stock.sqlite.repo.js";
import { insertInvoiceSqlite, getInvoiceCountSqlite, insertSyncedInvoiceSqlite, getLastSyncedInvoiceSqlite, getPendingInvoices } from "../repositories/invoice.sqlite.repo.js";
import { triggerInvoiceSync } from "../services/invoiceSync.js";
import { syncSpecificTransaction } from "../services/backgroundSync.js";
import { API_BASE_URL } from "../config.js";

// console.log("🔄 Loading Transaction IPC...");

ipcMain.handle("save-bill", async (_, billData) => {
  console.log("💾 Saving bill...", billData?.bill_no);
  try {
    const id = insertTransactionSqlite(billData);
    console.log("✅ Bill saved, ID:", id);

    insertInvoiceSqlite(billData);
    triggerInvoiceSync(billData.fy_code);

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
    console.log("Params",params)
    const count = getTransactionCountSqlite(params.fy_code);
    console.log(`📊 Get Last Bill - Count: ${count}`);

    // If DB is empty and we have branch info, try to fetch last transaction from API
    if (count === 0 && params && params.branch_code) {
        console.log("Api called tran")
      console.log("🔄 DB Empty. Fetching last transaction from API...");
      const branch = params.branch_code;
      const terminal = params.terminal_code || "A";
      const cashier = params.cashier_id || 0;
      const fy_code = params.fy_code;


      try {
         const url = `${API_BASE_URL}/transaction-sync/last/${fy_code}/${branch}/${terminal}/${cashier}`;
         const response = await fetch(url);
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
              fy_code: params.fy_code
            });
          }
        }
      } catch (fetchErr) {
        console.error("⚠️ Failed to fetch last transaction from API:", fetchErr.message);
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

ipcMain.handle("get-pending-sync-count", async (_, fy_code) => {
  try {
    const pendingTx = getPendingTransactions(9999, fy_code);
    const pendingInvoices = getPendingInvoices(9999);
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
    const count = getInvoiceCountSqlite();
    console.log(`📊 Get Last Synced Invoice - Count: ${count}`);

    if (count === 0) {
      if (params && params.branch_code) {
        console.log("Api called invoice")
        console.log("🔄 Invoice DB Empty. Fetching last synced invoice...");
        const branch = params.branch_code;
        const terminal = params.terminal_code || "A";
        const cashier = params.cashier_id || 0;
        // const fy_code = params.fy_code;

        const url = `${API_BASE_URL}/invoice-sync/last-synced/${branch}/${terminal}/${cashier}`;
     
        const response = await fetch(url);

        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data) {
            console.log("✅ Fetched last synced invoice:", json.data.bill_no);
            insertSyncedInvoiceSqlite({
              ...json.data,
              time: json.data.time || new Date().toLocaleTimeString()
            });
            return getLastSyncedInvoiceSqlite(params);
          }
        }
      }
      return null;
    }
  } catch (err) {
    console.error("❌ Failed to sync last invoice:", err.message);
  }
  return getLastSyncedInvoiceSqlite(params);
});