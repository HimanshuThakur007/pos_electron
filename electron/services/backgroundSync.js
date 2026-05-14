// import { BrowserWindow } from "electron";
// import dns from "dns";
// import os from "os";
// import {
//   getPendingTransactions,
//   markTransactionSynced,
//   incrementSyncAttempts,
//   getTransactionsSqlite,
//   lockTransactionsSqlite,
//   resetStuckTransactionsSqlite,
//   markTransactionFailed,
// } from "../repositories/transaction.sqlite.repo.js";
// import { getLoginSession } from "../repositories/session.sqlite.repo.js";
// import config from "../config.cjs";

// const { API_BASE_URL2 } = config;

// const SYNC_INTERVAL = 60 * 1000;
// const PUSH_API_URL = `${API_BASE_URL2}/pos/push-transactions`;
// const PUSH_FAILED_API_URL = `${API_BASE_URL2}/pos/push-failed-sync`;

// const MAX_RETRY_ATTEMPTS = 2;
// const BATCH_SIZE = 10;

// // ⭐ jitter range (0–5 sec)
// const JITTER_MAX = 5000;

// let isSyncing = false;
// let syncTimer = null;
// let backoffDelay = 1000;
// let currentFyCode = null;

// function getJitterDelay(baseDelay) {
//   const jitter = Math.floor(Math.random() * JITTER_MAX);
//   return baseDelay + jitter;
// }

// function isOnline() {
//   return new Promise((resolve) => {
//     const timer = setTimeout(() => resolve(false), 3000); // Prevent hanging on captive portals
//     dns.lookup("google.com", (err) => {
//       clearTimeout(timer);
//       resolve(!err);
//     });
//   });
// }

// async function pushFailedSync(tx, payload, errorMessage, token) {
//   try {
//     const failedPayload = {
//       local_queue_id: String(tx.id),
//       ref_id: tx.bill_no,
//       type: "transaction",
//       payload: payload,
//       local_status: "failed",
//       retry_count: (tx.sync_attempts || 0) + 1,
//       error_message: errorMessage || "Unknown error",
//       branch_code: tx.branch_code,
//       counter_code: tx.terminal_code,
//       user_id: Number(tx.cashier_id) || 3,
//       customer_id: null,
//       invoice_no: tx.bill_no,
//       failed_reason: errorMessage || "Central server unreachable",
//       archived_from_device_uid: os.hostname().toLowerCase(),
//     };

//     const controller = new AbortController();
//     const timeout = setTimeout(() => controller.abort(), 15000);

//     const response = await fetch(PUSH_FAILED_API_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify(failedPayload),
//       signal: controller.signal,
//     });

//     clearTimeout(timeout);

//     if (response.ok) {
//       console.log(
//         `✅ Logged failed payload for ${tx.bill_no} to fallback API.`,
//       );
//     } else {
//       console.warn(
//         `⚠️ Failed to log fallback payload for ${tx.bill_no} (${response.status})`,
//       );
//     }
//   } catch (err) {
//     console.error(
//       `❌ Network error while logging fallback payload for ${tx?.bill_no}:`,
//       err.message,
//     );
//   }
// }

// export function startBackgroundSync(fy_code) {
//   if (fy_code) currentFyCode = fy_code;
//   console.log("🚀 Background Sync Started for FY:", currentFyCode);

//   // 🧹 CRASH RECOVERY: Release any locks that were stuck due to an unexpected app exit
//   if (currentFyCode) {
//     resetStuckTransactionsSqlite(currentFyCode);
//     console.log("🧹 Checked and cleared stuck transactions (Crash Recovery)");
//   }

//   runSync();
// }

// export function triggerSync(fy_code) {
//   if (fy_code) currentFyCode = fy_code;

//   if (!isSyncing && !syncTimer) {
//     runSync();
//   }
// }

// function sendStatusToRenderer(status) {
//   BrowserWindow.getAllWindows().forEach((win) => {
//     if (!win.isDestroyed()) {
//       win.webContents.send("sync-status-change", status);
//     }
//   });
// }

// function convertToIST(utcDateString) {
//   if (!utcDateString) utcDateString = new Date().toISOString();
//   const date = new Date(utcDateString);

//   // IST is UTC+5:30
//   date.setHours(date.getHours() + 5);
//   date.setMinutes(date.getMinutes() + 30);

//   const year = date.getUTCFullYear();
//   const month = String(date.getUTCMonth() + 1).padStart(2, "0");
//   const day = String(date.getUTCDate()).padStart(2, "0");
//   const hours = String(date.getUTCHours()).padStart(2, "0");
//   const minutes = String(date.getUTCMinutes()).padStart(2, "0");
//   const seconds = String(date.getUTCSeconds()).padStart(2, "0");

//   // Format to 'YYYY-MM-DD HH:MM:SS' which is universally accepted by SQL databases
//   return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
// }

// function formatTransactionPayload(tx, fyCode = currentFyCode) {
//   let parsedCart = [];
//   try {
//     parsedCart =
//       typeof tx.cart_items === "string"
//         ? JSON.parse(tx.cart_items || "[]")
//         : tx.cart_items || [];
//   } catch (e) {
//     console.warn(
//       `⚠️ Cart items parse error for bill ${tx.bill_no}, returning empty array`,
//     );
//   }

//   const savedAt = tx.time || new Date().toISOString();
//   const istTime = convertToIST(savedAt);

//   const isB2B = tx.bill_no && tx.bill_no.startsWith("B");
//   const taxRegion = tx.tax_region || "CGST/SGST";

//   // Extract 6 digit pincode from the end of the address if present
//   let pincode = null;
//   if (tx.gst_address) {
//     const match = tx.gst_address.match(/\b\d{6}\b/);
//     if (match) pincode = match[0];
//   }

//   return {
//     invoice_no: tx.bill_no,
//     branch: tx.branch_code,
//     doc_type: tx.doc_type !== undefined ? tx.doc_type : isB2B ? 2 : 1,
//     mod: "offline",
//     // branch: "",
//     counter: tx.terminal_code,
//     user_id: Number(tx.cashier_id) || 3,
//     customer_id: Number(tx.customer_id) || 1,

//     financial_year: tx.financial_year || "26",
//     fin_year: tx.fin_year || "2025-26",

//     month_range: tx.month_range || "2026-03",
//     hour_range: tx.hour_range || "10-11",

//     pos_bill_saved_at: istTime,

//     tax_region: taxRegion,
//     gst_details: {
//       gst_number: tx.gst_number || null,
//       gst_address: tx.gst_address || null,
//       company_name: tx.company_name || null,
//       state: taxRegion === "IGST" ? "IGST" : "SGST/CGST",
//       pincode: pincode,
//     },

//     summary: {
//       qty: Number(tx.total_qty) || 0,
//       total: Number(tx.grand_total) || 0,
//       total_discount: Number(tx.total_discount) || 0,
//       total_tax: Number(tx.total_tax) || 0,
//     },

//     cart: parsedCart.map((item) => ({
//       item_code: item.itemCode || item.item_code,
//       item_name: item.itemName || item.item_name,
//       print_desc: item.printDesc || item.itemName || "ITEM",
//       scheme_code: item.schm_type || item.schm_camp_grp || null,
//       qty: Number(item.qty) || 1,
//       rate: Number(item.rate || item.price) || 0,
//       tax_percent: Number(item.tax) || 0,
//       discount: Number(item.discount) || 0,
//       subtotal: Number(item.total) || 0,
//       scanned_at: istTime,
//     })),

//     payments:
//       tx.payments && tx.payments.length > 0
//         ? tx.payments.map((p) => ({
//             id: p.id || null,
//             invoice_no: p.invoice_no || tx.bill_no,
//             branch_code: p.branch_code || tx.branch_code,
//             terminal_code: p.counter_code || tx.terminal_code,
//             financial_year: p.financial_year || tx.financial_year || "26",
//             fin_year: p.fin_year || tx.fin_year || "2025-26",
//             fy_code: p.fy_code || fyCode,
//             month_range: p.month_range || tx.month_range || "2026-03",
//             hour_range: p.hour_range || tx.hour_range || "10-11",
//             mode: p.mode || "cash",
//             amount: Number(p.amount) || 0,
//             edc_terminal_id: p.edc_terminal_id || null,
//             edc_tid: p.edc_tid || null,
//             edc_mid: p.edc_mid || null,
//             upi_vpa: p.upi_vpa || null,
//             paytm_merchant_txn_id: p.paytm_merchant_txn_id || null,
//             paytm_order_id: p.paytm_order_id || null,
//             paytm_rrn: p.paytm_rrn || p.rrn || null,
//             paytm_response_code: p.paytm_response_code || null,
//             paytm_response_msg: p.paytm_response_msg || null,
//             issuer_masked_card_no: p.issuer_masked_card_no || null,
//             issuing_bank_name: p.issuing_bank_name || null,
//             pay_method: p.pay_method || null,
//             rrn: p.rrn || p.paytm_rrn || null,
//             auth_code: p.auth_code || null,
//             card_last4: p.card_last4 || null,
//             status: p.status || "success",
//             synced: p.synced || 0,
//             created_at:
//               p.created_at || p.pos_created_at
//                 ? convertToIST(p.created_at || p.pos_created_at)
//                 : istTime,
//             updated_at: p.updated_at ? convertToIST(p.updated_at) : istTime,
//           }))
//         : [
//             {
//               id: null,
//               invoice_no: tx.bill_no,
//               branch_code: tx.branch_code,
//               terminal_code: tx.terminal_code,
//               financial_year: tx.financial_year || "26",
//               fin_year: tx.fin_year || "2025-26",
//               fy_code: fyCode,
//               month_range: tx.month_range || "2026-03",
//               hour_range: tx.hour_range || "10-11",
//               mode: tx.payment_mode || "cash",
//               amount: Number(tx.amount_received || tx.grand_total) || 0,
//               edc_terminal_id: null,
//               edc_tid: null,
//               edc_mid: null,
//               upi_vpa: null,
//               paytm_merchant_txn_id: null,
//               paytm_order_id: null,
//               paytm_rrn: null,
//               paytm_response_code: null,
//               paytm_response_msg: null,
//               issuer_masked_card_no: null,
//               issuing_bank_name: null,
//               pay_method: null,
//               rrn: null,
//               auth_code: null,
//               card_last4: null,
//               status: "success",
//               synced: 0,
//               created_at: istTime,
//               updated_at: istTime,
//             },
//           ],
//   };
// }

// async function runSync() {
//   if (isSyncing || !currentFyCode) return;

//   if (!(await isOnline())) {
//     console.log("🌐 Offline — skipping sync");
//     scheduleNextSync(SYNC_INTERVAL);
//     return;
//   }

//   const allPending = getPendingTransactions(BATCH_SIZE, currentFyCode);

//   // Filter out transactions that have already failed the max number of times
//   const pending = allPending.filter(
//     (tx) => tx.sync_attempts < MAX_RETRY_ATTEMPTS,
//   );

//   if (!pending.length) {
//     sendStatusToRenderer("idle");

//     // If there's nothing to sync, or all pending items have failed, check again later.
//     scheduleNextSync(3 * 60 * 1000);
//     return;
//   }

//   // 🔒 TRANSACTION LOCK: Mark these as 'syncing' (status = 2) to prevent concurrent double-syncs
//   const pendingIds = pending.map((tx) => tx.id);
//   lockTransactionsSqlite(pendingIds, currentFyCode);

//   isSyncing = true;
//   sendStatusToRenderer("syncing");

//   try {
//     console.log(
//       `🔄 Syncing ${pending.length} transactions (FY ${currentFyCode})`,
//     );

//     const session = getLoginSession() || {};
//     const token = session.token || session.auth_token || "";
//     console.log("🔑 Using Token:", token);

//     let hasSuccess = false;

//     for (const tx of pending) {
//       const payload = formatTransactionPayload(tx, currentFyCode);

//       console.log(
//         `📤 Pushing Transaction ${tx.bill_no}:`,
//         JSON.stringify(payload, null, 2),
//       );

//       const controller = new AbortController();
//       const timeout = setTimeout(() => controller.abort(), 30000);

//       try {
//         const response = await fetch(PUSH_API_URL, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify(payload),
//           signal: controller.signal,
//         });

//         clearTimeout(timeout);

//         if (!response.ok) {
//           const errText = await response.text();
//           console.error(
//             `❌ Sync Server Error for ${tx.bill_no} (${response.status}):`,
//             errText,
//           );
//           await pushFailedSync(
//             tx,
//             payload,
//             `HTTP ${response.status} - ${errText.substring(0, 250)}`,
//             token,
//           );
//           markTransactionFailed(tx.id, currentFyCode);
//         } else {
//           const result = await response.json();
//           console.log(`✅ Sync Result for ${tx.bill_no}:`, result);
//           markTransactionSynced(tx.id, currentFyCode);
//           hasSuccess = true;
//         }
//       } catch (err) {
//         clearTimeout(timeout);
//         console.error(
//           `❌ Network/Timeout Error for ${tx.bill_no}:`,
//           err.message,
//         );
//         incrementSyncAttempts(tx.id, currentFyCode);
//         await pushFailedSync(tx, payload, err.message, token);
//       }
//     }

//     backoffDelay = 1000;
//     sendStatusToRenderer("synced");

//     // process next batch immediately
//     if (pending.length === BATCH_SIZE && hasSuccess) {
//       isSyncing = false;
//       runSync();
//       return;
//     }
//   } catch (error) {
//     console.error("❌ Sync Failed:", error.message);

//     pending.forEach((tx) => {
//       if (tx.sync_attempts < MAX_RETRY_ATTEMPTS) {
//         incrementSyncAttempts(tx.id, currentFyCode);
//       }
//     });

//     sendStatusToRenderer("error");

//     backoffDelay = Math.min(backoffDelay * 2, 60000);
//   } finally {
//     isSyncing = false;

//     const delay = backoffDelay > 1000 ? backoffDelay : SYNC_INTERVAL;

//     scheduleNextSync(delay);
//   }
// }

// function scheduleNextSync(delay) {
//   if (syncTimer) clearTimeout(syncTimer);

//   const finalDelay = getJitterDelay(delay);

//   console.log(`⏳ Next sync in ${(finalDelay / 1000).toFixed(1)}s`);

//   syncTimer = setTimeout(runSync, finalDelay);
// }

// export async function syncSpecificTransaction(bill_no, fy_code) {
//   console.log(`🚀 Manual Sync for Bill: ${bill_no}`);

//   const activeFyCode = fy_code || currentFyCode;

//   // Fetch the specific transaction
//   let transactions = getTransactionsSqlite({ bill_no, fy_code: activeFyCode });

//   if (!transactions || transactions.length === 0) {
//     throw new Error("Transaction not found");
//   }

//   const tx = transactions[0];

//   // 🔒 TRANSACTION LOCK: Prevent manual double syncing
//   if (tx.sync_status === 2) {
//     console.warn(
//       `⚠️ Transaction ${bill_no} is currently locked by background sync.`,
//     );
//     throw new Error(
//       "Transaction is currently syncing in the background. Please wait.",
//     );
//   }
//   if (tx.sync_status === 1) {
//     console.log(`ℹ️ Transaction ${bill_no} is already synced.`);
//     return { status: "success" };
//   }

//   // Lock it for this manual operation
//   lockTransactionsSqlite([tx.id], activeFyCode);

//   try {
//     const payload = formatTransactionPayload(tx, activeFyCode);

//     console.log(
//       "📤 Pushing Specific Transaction Data JSON:",
//       JSON.stringify(payload, null, 2),
//     );

//     const session = getLoginSession() || {};
//     const token = session.token || session.auth_token || "";

//     const controller = new AbortController();
//     const timeout = setTimeout(() => controller.abort(), 30000);

//     const response = await fetch(PUSH_API_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify(payload),
//       signal: controller.signal,
//     });

//     clearTimeout(timeout);

//     if (!response.ok) {
//       const errText = await response.text();
//       console.error(
//         `❌ Manual Sync Server Error (${response.status}):`,
//         errText,
//       );
//       await pushFailedSync(
//         tx,
//         payload,
//         `HTTP ${response.status} - ${errText.substring(0, 250)}`,
//         token,
//       );
//       markTransactionFailed(tx.id, activeFyCode);
//       throw new Error(`HTTP ${response.status} - ${errText}`);
//     }

//     const result = await response.json();
//     console.log("✅ Manual Sync Result:", result);

//     markTransactionSynced(tx.id, activeFyCode);
//     return { status: "success" };
//   } catch (error) {
//     // If it was a network error and not already handled by the HTTP block above
//     if (!error.message.startsWith("HTTP ")) {
//       incrementSyncAttempts(tx.id, activeFyCode);
//       const session = getLoginSession() || {};
//       const token = session.token || session.auth_token || "";
//       try {
//         await pushFailedSync(
//           tx,
//           formatTransactionPayload(tx, activeFyCode),
//           error.message,
//           token,
//         );
//       } catch (e) {}
//     }

//     throw error;
//   }
// }

// ===========================1 step-new=================================

// import { BrowserWindow } from "electron";
// import dns from "dns";
// import os from "os";
// import {
//   getPendingTransactions,
//   markTransactionSynced,
//   incrementSyncAttempts,
//   getTransactionsSqlite,
//   lockTransactionsSqlite,
//   resetStuckTransactionsSqlite,
//   markTransactionFailed,
//   getPendingQueueCount,
//   unlockTransactionsSqlite,
// } from "../repositories/transaction.sqlite.repo.js";
// import {
//   getLoginSession,
//   getSessionValue,
//   setSessionValue,
// } from "../repositories/session.sqlite.repo.js";
// import config from "../config.cjs";
// import pLimit from "p-limit";

// // ─── Constants ────────────────────────────────────────────────────────────────

// const { API_BASE_URL2 } = config;

// const SYNC_INTERVAL_MS = 60 * 1000;
// const IDLE_INTERVAL_MS = 3 * 60 * 1000;
// const PUSH_API_URL = `${API_BASE_URL2}/pos/push-transactions`;
// const PUSH_FAILED_API_URL = `${API_BASE_URL2}/pos/push-failed-sync`;
// const MAX_RETRY_ATTEMPTS = 3;
// const BATCH_SIZE = 10;
// const JITTER_MAX_MS = 5_000;
// const FETCH_TIMEOUT_MS = 30_000;
// const ONLINE_CHECK_TIMEOUT_MS = 3_000;
// const CONCURRENCY_LIMIT = 3;

// // ─── Payment field defaults ───────────────────────────────────────────────────
// // Single source of truth for every nullable payment field.
// // Both formatPaymentEntry and buildFallbackPayment spread this,
// // then each overrides only the fields it owns.

// const PAYMENT_NULL_FIELDS = {
//   edc_terminal_id: null,
//   edc_tid: null,
//   edc_mid: null,
//   upi_vpa: null,
//   paytm_merchant_txn_id: null,
//   paytm_order_id: null,
//   paytm_rrn: null,
//   paytm_response_code: null,
//   paytm_response_msg: null,
//   issuer_masked_card_no: null,
//   issuing_bank_name: null,
//   pay_method: null,
//   rrn: null,
//   auth_code: null,
//   card_last4: null,
// };

// // ─── Module state ─────────────────────────────────────────────────────────────

// let isSyncing = false;
// let syncTimer = null;
// let backoffDelay = 1_000;
// let registeredFyCode = null;
// let triggerSyncTimer = null;
// let lastSyncTime = 0;
// let consecutiveFailures = 0;
// const circuitBreakers = new Map();

// let syncMetrics = {
//   totalBatches: 0,
//   totalSynced: 0,
//   totalErrors: 0,
//   avgSyncTimeMs: 0,
// };

// // ─── Config & Logger ──────────────────────────────────────────────────────────

// const IS_PROD = process.env.NODE_ENV === "production";

// const Logger = {
//   debug: (...args) => {
//     if (!IS_PROD) console.log(...args);
//   },
//   info: (...args) => console.log(...args),
//   warn: (...args) => console.warn(...args),
//   error: (...args) => console.error(...args),
// };

// // ─── Network helpers ──────────────────────────────────────────────────────────

// function isOnline() {
//   return new Promise((resolve) => {
//     const timer = setTimeout(() => resolve(false), ONLINE_CHECK_TIMEOUT_MS);
//     dns.lookup("google.com", (err) => {
//       clearTimeout(timer);
//       resolve(!err);
//     });
//   });
// }

// /**
//  * Fetch with an AbortController timeout.
//  * Returns { ok, status, body } — callers never touch the raw Response.
//  */
// async function fetchWithTimeout(url, options, timeoutMs = FETCH_TIMEOUT_MS) {
//   const controller = new AbortController();
//   const timer = setTimeout(() => controller.abort(), timeoutMs);

//   try {
//     const response = await fetch(url, {
//       ...options,
//       signal: controller.signal,
//     });
//     const contentType = response.headers.get("content-type") || "";

//     let body = null;
//     try {
//       body = contentType.includes("application/json")
//         ? await response.json()
//         : await response.text();
//     } catch {
//       /* leave body as null */
//     }

//     return { ok: response.ok, status: response.status, body };
//   } finally {
//     clearTimeout(timer);
//   }
// }

// /**
//  * POST JSON to a URL with the current auth token.
//  * Thin wrapper over fetchWithTimeout so callers don't repeat headers/method.
//  */
// function postJSON(url, payload, token, timeoutMs) {
//   return fetchWithTimeout(
//     url,
//     {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify(payload),
//     },
//     timeoutMs,
//   );
// }

// // ─── Utility helpers ──────────────────────────────────────────────────────────

// function getJitter() {
//   return Math.floor(Math.random() * JITTER_MAX_MS);
// }

// function getAuthToken() {
//   const session = getLoginSession() || {};
//   return session.token || session.auth_token || "";
// }

// function sendStatusToRenderer(status, metrics = null) {
//   BrowserWindow.getAllWindows().forEach((win) => {
//     if (!win.isDestroyed())
//       win.webContents.send("sync-status-change", { status, metrics });
//   });
// }

// /**
//  * Truncate a response body to a readable error string.
//  * Works for both plain-text and JSON bodies.
//  */
// function extractErrorSummary(body, maxLen = 250) {
//   const raw = typeof body === "string" ? body : JSON.stringify(body);
//   return raw.substring(0, maxLen);
// }

// /**
//  * Convert a UTC date string to IST ("YYYY-MM-DD HH:MM:SS") via the Intl API.
//  * No manual arithmetic — safe across midnight, month, and year rollovers.
//  */
// function convertToIST(utcDateString) {
//   const date = utcDateString ? new Date(utcDateString) : new Date();

//   if (isNaN(date.getTime())) {
//     console.warn(
//       `⚠️ convertToIST received invalid date: "${utcDateString}", falling back to now`,
//     );
//     return convertToIST(null);
//   }

//   const parts = new Intl.DateTimeFormat("en-CA", {
//     timeZone: "Asia/Kolkata",
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//     hour: "2-digit",
//     minute: "2-digit",
//     second: "2-digit",
//     hour12: false,
//   }).formatToParts(date);

//   const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";

//   return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
// }

// function getDynamicDateRanges(dateStr) {
//   const date = dateStr ? new Date(dateStr) : new Date();
//   if (isNaN(date.getTime()))
//     return getDynamicDateRanges(new Date().toISOString());

//   const year = date.getFullYear();
//   const month = date.getMonth() + 1; // 1-12
//   const hour = date.getHours();

//   const isNextFy = month >= 4;
//   const startYear = isNextFy ? year : year - 1;
//   const endYear = startYear + 1;

//   return {
//     financial_year: String(endYear).slice(-2),
//     fin_year: `${startYear}-${String(endYear).slice(-2)}`,
//     month_range: `${year}_${String(month).padStart(2, "0")}`,
//     hour_range: `${String(hour).padStart(2, "0")}-${String(hour + 1).padStart(2, "0")}`,
//   };
// }

// // ─── Payload helpers ──────────────────────────────────────────────────────────

// function parseCartItems(tx) {
//   if (!tx.cart_items) return [];
//   if (Array.isArray(tx.cart_items)) return tx.cart_items;
//   try {
//     return JSON.parse(tx.cart_items);
//   } catch {
//     console.warn(
//       `⚠️ Cart items parse error for bill ${tx.bill_no} — using empty array`,
//     );
//     return [];
//   }
// }

// function extractPincode(address) {
//   if (!address) return null;
//   const match = address.match(/\b\d{6}\b/);
//   return match ? match[0] : null;
// }

// /**
//  * Build a payment entry from a real payment record.
//  * Spreads PAYMENT_NULL_FIELDS first, then overrides with real values.
//  */
// function formatPaymentEntry(p, tx, fyCode, istTime) {
//   const d = getDynamicDateRanges(istTime);
//   return {
//     ...PAYMENT_NULL_FIELDS,
//     id: p.id ?? null,
//     invoice_no: p.invoice_no ?? tx.bill_no,
//     branch_code: p.branch_code ?? tx.branch_code,
//     terminal_code: p.counter_code ?? tx.terminal_code,
//     financial_year: p.financial_year ?? tx.financial_year ?? d.financial_year,
//     fin_year: p.fin_year ?? tx.fin_year ?? d.fin_year,
//     fy_code: p.fy_code ?? fyCode,
//     month_range: p.month_range ?? tx.month_range ?? d.month_range,
//     hour_range: p.hour_range ?? tx.hour_range ?? d.hour_range,
//     mode: p.mode ?? "cash",
//     amount: Number(p.amount) || 0,
//     // cross-field aliases (override the null spread above)
//     paytm_rrn: p.paytm_rrn ?? p.rrn ?? null,
//     rrn: p.rrn ?? p.paytm_rrn ?? null,
//     status: p.status ?? "success",
//     synced: p.synced ?? 0,
//     created_at:
//       convertToIST(p.created_at ?? p.pos_created_at ?? null) || istTime,
//     updated_at: p.updated_at ? convertToIST(p.updated_at) : istTime,
//   };
// }

// /**
//  * Synthesise a single cash payment from the transaction itself
//  * when no payment records exist.
//  * Spreads PAYMENT_NULL_FIELDS — shares the same shape as formatPaymentEntry.
//  */
// function buildFallbackPayment(tx, fyCode, istTime) {
//   const d = getDynamicDateRanges(istTime);
//   return {
//     ...PAYMENT_NULL_FIELDS,
//     id: null,
//     invoice_no: tx.bill_no,
//     branch_code: tx.branch_code,
//     terminal_code: tx.terminal_code,
//     financial_year: tx.financial_year ?? d.financial_year,
//     fin_year: tx.fin_year ?? d.fin_year,
//     fy_code: fyCode,
//     month_range: tx.month_range ?? d.month_range,
//     hour_range: tx.hour_range ?? d.hour_range,
//     mode: tx.payment_mode ?? "cash",
//     amount: Number(tx.amount_received ?? tx.grand_total) || 0,
//     status: "success",
//     synced: 0,
//     created_at: istTime,
//     updated_at: istTime,
//   };
// }

// function formatTransactionPayload(tx, fyCode) {
//   const parsedCart = parseCartItems(tx);
//   const istTime = convertToIST(tx.time ?? null);
//   const d = getDynamicDateRanges(istTime);
//   const isB2B = tx.bill_no?.startsWith("B") ?? false;
//   const taxRegion = tx.tax_region ?? "CGST/SGST";

//   const payments =
//     Array.isArray(tx.payments) && tx.payments.length > 0
//       ? tx.payments.map((p) => formatPaymentEntry(p, tx, fyCode, istTime))
//       : [buildFallbackPayment(tx, fyCode, istTime)];

//   return {
//     idempotency_key: `TXN_${tx.id}_${tx.bill_no}`,
//     invoice_no: tx.bill_no,
//     branch: tx.branch_code,
//     doc_type: tx.doc_type ?? (isB2B ? 2 : 1),
//     mod: "offline",
//     counter: tx.terminal_code,
//     user_id: Number(tx.cashier_id) || null,
//     customer_id: Number(tx.customer_id) || 1,
//     financial_year: tx.financial_year ?? d.financial_year,
//     fin_year: tx.fin_year ?? d.fin_year,
//     month_range: tx.month_range ?? d.month_range,
//     hour_range: tx.hour_range ?? d.hour_range,
//     pos_bill_saved_at: istTime,
//     tax_region: taxRegion,
//     gst_details: {
//       gst_number: tx.gst_number ?? null,
//       gst_address: tx.gst_address ?? null,
//       company_name: tx.company_name ?? null,
//       state: taxRegion === "IGST" ? "IGST" : "SGST/CGST",
//       pincode: extractPincode(tx.gst_address),
//     },
//     summary: {
//       qty: Number(tx.total_qty) || 0,
//       total: Number(tx.grand_total) || 0,
//       total_discount: Number(tx.total_discount) || 0,
//       total_tax: Number(tx.total_tax) || 0,
//     },
//     cart: parsedCart.map((item) => ({
//       item_code: item.itemCode ?? item.item_code,
//       item_name: item.itemName ?? item.item_name,
//       print_desc: item.printDesc ?? item.itemName ?? "ITEM",
//       scheme_code: item.schm_type ?? item.schm_camp_grp ?? null,
//       qty: Number(item.qty) || 1,
//       rate: Number(item.rate ?? item.price) || 0,
//       tax_percent: Number(item.tax) || 0,
//       discount: Number(item.discount) || 0,
//       subtotal: Number(item.total) || 0,
//       scanned_at: istTime,
//     })),
//     payments,
//   };
// }

// // ─── Transaction failure handlers ─────────────────────────────────────────────
// // These two functions are the single call-site for every failure path.
// // No caller ever calls pushFailedSync, markTransactionFailed, or
// // incrementSyncAttempts directly — they go through one of these two.

// /**
//  * Handle a permanent HTTP failure:
//  *   increment or permanently fail the row, then log to the fallback API.
//  *   Returns the formatted error string so callers can throw it if needed.
//  */
// async function handleHttpFailure(tx, payload, status, body, token, fyCode) {
//   const errSummary = extractErrorSummary(body);
//   const errMessage = `HTTP ${status} — ${errSummary}`;

//   Logger.error(
//     `❌ Server error for ${tx.bill_no} (HTTP ${status}):`,
//     errSummary,
//   );

//   const nextAttempts = (tx.sync_attempts ?? 0) + 1;
//   // Do not retry on 4xx client errors, as they are usually permanent (e.g. bad payload/validation)
//   if ((status >= 400 && status < 500) || nextAttempts >= MAX_RETRY_ATTEMPTS) {
//     markTransactionFailed(tx.id, fyCode);
//   } else {
//     incrementSyncAttempts(tx.id, fyCode);
//   }

//   await pushFailedSync(tx, payload, errMessage, token);

//   return errMessage;
// }

// /**
//  * Handle a network / timeout failure:
//  *   increment attempts, then log to the fallback API.
//  */
// async function handleNetworkFailure(tx, payload, err, token, fyCode) {
//   Logger.error(`❌ Network/timeout for ${tx.bill_no}:`, err.message);
//   incrementSyncAttempts(tx.id, fyCode);
//   await pushFailedSync(tx, payload, err.message, token);
// }

// // ─── Failed-sync fallback ─────────────────────────────────────────────────────

// async function pushFailedSync(tx, payload, errorMessage, token) {
//   const failedPayload = {
//     local_queue_id: String(tx.id),
//     ref_id: tx.bill_no,
//     type: "transaction",
//     payload,
//     local_status: "failed",
//     retry_count: (tx.sync_attempts ?? 0) + 1,
//     error_message: errorMessage || "Unknown error",
//     branch_code: tx.branch_code,
//     counter_code: tx.terminal_code,
//     user_id: Number(tx.cashier_id) || null,
//     customer_id: null,
//     invoice_no: tx.bill_no,
//     failed_reason: errorMessage || "Central server unreachable",
//     archived_from_device_uid: os.hostname().toLowerCase(),
//   };

//   try {
//     const { ok, status } = await postJSON(
//       PUSH_FAILED_API_URL,
//       failedPayload,
//       token,
//       15_000,
//     );

//     if (ok) {
//       Logger.debug(
//         `✅ Logged failed payload for ${tx.bill_no} to fallback API`,
//       );
//     } else {
//       Logger.warn(`⚠️ Fallback API rejected ${tx.bill_no} (HTTP ${status})`);
//     }
//   } catch (err) {
//     // Never throw from the fallback logger — it must never mask the original error
//     Logger.error(
//       `❌ Network error while logging fallback for ${tx?.bill_no}:`,
//       err.message,
//     );
//   }
// }

// // ─── Scheduler ────────────────────────────────────────────────────────────────

// function scheduleNextSync(baseDelay) {
//   if (syncTimer) clearTimeout(syncTimer);
//   const delay = baseDelay + getJitter();
//   Logger.debug(`⏳ Next sync in ${(delay / 1000).toFixed(1)} s`);
//   syncTimer = setTimeout(runSync, delay);
// }

// // ─── Core sync loop ───────────────────────────────────────────────────────────

// async function runSync() {
//   const activeFyCode = registeredFyCode; // snapshot — must not change mid-batch

//   // Per-Endpoint Circuit Breaker Evaluation
//   const breakerTime = circuitBreakers.get(PUSH_API_URL) || 0;
//   if (Date.now() < breakerTime) {
//     Logger.warn(
//       `🛑 Circuit breaker for ${PUSH_API_URL} active until ${new Date(breakerTime).toLocaleTimeString()} — skipping sync`,
//     );
//     scheduleNextSync(10_000); // Wait 10s and check the breaker again
//     return;
//   }

//   if (isSyncing) {
//     Logger.debug("⏭️  Sync already in progress — skipping");
//     return;
//   }
//   if (!activeFyCode) {
//     Logger.warn("⚠️  runSync called before FY code was registered");
//     return;
//   }

//   if (!(await isOnline())) {
//     Logger.debug("🌐 Offline — skipping sync");
//     scheduleNextSync(SYNC_INTERVAL_MS);
//     return;
//   }

//   const allPending = getPendingTransactions(BATCH_SIZE, activeFyCode);
//   const pending = allPending.filter(
//     (tx) => tx.sync_attempts < MAX_RETRY_ATTEMPTS,
//   );

//   if (!pending.length) {
//     sendStatusToRenderer("idle");
//     scheduleNextSync(IDLE_INTERVAL_MS);
//     return;
//   }

//   lockTransactionsSqlite(
//     pending.map((tx) => tx.id),
//     activeFyCode,
//   );

//   isSyncing = true;
//   sendStatusToRenderer("syncing");

//   let hasSuccess = false;
//   let syncResults = null;

//   try {
//     Logger.info(
//       `🔄 Syncing ${pending.length} transactions (FY ${activeFyCode})`,
//     );

//     const token = getAuthToken();
//     if (!token) {
//       Logger.warn("⚠️ No auth token — skipping sync. Retrying in 5 minutes.");
//       unlockTransactionsSqlite(
//         pending.map((tx) => tx.id),
//         activeFyCode,
//       );
//       isSyncing = false;
//       scheduleNextSync(5 * 60 * 1000); // 5 minute backoff to prevent token-missing spam
//       return;
//     }

//     const limit = pLimit(CONCURRENCY_LIMIT);
//     const batchStartTime = Date.now();

//     // Memory Protection: Pending array is capped strictly at BATCH_SIZE (10).
//     // Payloads are dynamically generated inline within the pLimit scope to prevent memory spikes.
//     syncResults = await Promise.allSettled(
//       pending.map((tx) =>
//         limit(async () => {
//           const payload = formatTransactionPayload(tx, activeFyCode);
//           Logger.debug(
//             `📤 Pushing ${tx.bill_no} (items: ${payload.cart.length}, amount: ₹${payload.summary.total})`,
//           );

//           try {
//             const { ok, status, body } = await postJSON(
//               PUSH_API_URL,
//               payload,
//               token,
//             );

//             if (ok) {
//               Logger.debug(`✅ Synced ${tx.bill_no}:`, body);
//               markTransactionSynced(tx.id, activeFyCode);
//               return { type: "success" };
//             } else {
//               await handleHttpFailure(
//                 tx,
//                 payload,
//                 status,
//                 body,
//                 token,
//                 activeFyCode,
//               );
//               return { type: "http", status };
//             }
//           } catch (err) {
//             await handleNetworkFailure(tx, payload, err, token, activeFyCode);
//             return { type: "network" };
//           }
//         }),
//       ),
//     );

//     const successCount = syncResults.filter(
//       (res) =>
//         res.status === "fulfilled" && res.value && res.value.type === "success",
//     ).length;

//     const serverErrorCount = syncResults.filter(
//       (res) =>
//         res.status === "fulfilled" &&
//         res.value &&
//         res.value.type === "http" &&
//         res.value.status >= 500,
//     ).length;

//     const timeoutCount = syncResults.filter(
//       (res) =>
//         res.status === "fulfilled" && res.value && res.value.type === "network",
//     ).length;

//     hasSuccess = successCount > 0;

//     const batchDuration = Date.now() - batchStartTime;
//     syncMetrics.totalBatches++;
//     syncMetrics.totalSynced += successCount;
//     syncMetrics.totalErrors += pending.length - successCount;
//     syncMetrics.avgSyncTimeMs = Math.round(
//       (syncMetrics.avgSyncTimeMs * (syncMetrics.totalBatches - 1) +
//         batchDuration) /
//         syncMetrics.totalBatches,
//     );

//     if (successCount > 0) {
//       lastSyncTime = Date.now();
//     }

//     // Only trip the global circuit breaker for actual server/network issues (ignore 4xx client data errors)
//     const criticalFailureRate =
//       (serverErrorCount + timeoutCount) / pending.length;

//     if (criticalFailureRate > 0.5) {
//       consecutiveFailures++;

//       if (consecutiveFailures >= 3) {
//         Logger.warn(
//           `🛑 Circuit Breaker tripped! High Server/Network failure rate (${(criticalFailureRate * 100).toFixed(0)}%). Pausing sync for 2 minutes.`,
//         );
//         circuitBreakers.set(PUSH_API_URL, Date.now() + 120_000);
//         consecutiveFailures = 0; // reset for when it wakes up
//         backoffDelay = 1_000;
//       } else if (serverErrorCount > 0) {
//         // 500 server errors -> heavy backoff
//         backoffDelay = Math.min(backoffDelay * 3, 60_000);
//       } else if (timeoutCount > 0) {
//         // timeouts -> retry relatively faster
//         backoffDelay = Math.min(backoffDelay * 1.5, 15_000);
//       } else {
//         // standard client errors
//         backoffDelay = Math.min(backoffDelay * 2, 30_000);
//       }
//     } else {
//       consecutiveFailures = 0;
//       if (successCount === pending.length) {
//         backoffDelay = 1_000;
//       }
//     }

//     Logger.info(
//       `📊 Sync Metrics - Success: ${successCount}/${pending.length} | Avg Time: ${syncMetrics.avgSyncTimeMs}ms`,
//     );

//     setSessionValue("sync_metrics", JSON.stringify(syncMetrics)); // Persist Metrics
//     sendStatusToRenderer("synced", syncMetrics);

//     if (pending.length === BATCH_SIZE && hasSuccess) {
//       isSyncing = false;
//       syncTimer = null;
//       // Schedule the next batch with a short delay (plus jitter)
//       // to let the server breathe between bursts of heavy inserts.
//       scheduleNextSync(2000);
//       return;
//     }
//   } catch (err) {
//     Logger.error("❌ Unexpected sync failure:", err.message);

//     for (const tx of pending) {
//       if ((tx.sync_attempts ?? 0) < MAX_RETRY_ATTEMPTS) {
//         incrementSyncAttempts(tx.id, activeFyCode);
//       }
//     }

//     sendStatusToRenderer("error");
//     consecutiveFailures++;
//     backoffDelay = Math.min(backoffDelay * 2, 60_000);
//   } finally {
//     // Bulletproof Safety Net: Unlock ONLY for unhandled promise crashes,
//     // total timeouts, or recoverable network failures.
//     // HTTP data failures (4xx/5xx) or permanent failures are skipped as DB handles them.
//     const idsToUnlock = pending
//       .filter((tx, i) => {
//         const res = syncResults?.[i];
//         return (
//           !res ||
//           res.status === "rejected" ||
//           (res.value &&
//             res.value.type === "network" &&
//             (tx.sync_attempts ?? 0) < MAX_RETRY_ATTEMPTS)
//         );
//       })
//       .map((tx) => tx.id);

//     if (idsToUnlock.length > 0) {
//       unlockTransactionsSqlite(idsToUnlock, activeFyCode);
//     }

//     isSyncing = false;
//     scheduleNextSync(backoffDelay > 1_000 ? backoffDelay : SYNC_INTERVAL_MS);
//   }
// }

// // ─── Public API ───────────────────────────────────────────────────────────────

// /**
//  * Start the background sync loop. Call once on app startup.
//  * @param {string} fy_code
//  */
// export function startBackgroundSync(fy_code) {
//   if (!fy_code) {
//     Logger.error("❌ startBackgroundSync called without a fy_code");
//     return;
//   }

//   registeredFyCode = fy_code;
//   Logger.info("🚀 Background sync started for FY:", registeredFyCode);

//   try {
//     const savedMetrics = getSessionValue("sync_metrics");
//     if (savedMetrics) {
//       Object.assign(syncMetrics, JSON.parse(savedMetrics));
//       Logger.info("📊 Loaded persisted sync metrics");
//     }
//   } catch (err) {
//     Logger.warn("⚠️ Could not load persisted sync metrics:", err.message);
//   }

//   resetStuckTransactionsSqlite(registeredFyCode);
//   Logger.info("🧹 Cleared stuck transactions (crash recovery)");

//   runSync();
// }

// /**
//  * Trigger an immediate sync if none is in progress.
//  * Safe to call after saving a new transaction.
//  * @param {string} [fy_code]
//  */
// export async function triggerSync(fy_code) {
//   if (fy_code) registeredFyCode = fy_code;

//   if (isSyncing) {
//     Logger.debug("⏭️  triggerSync — sync already in progress, skipping");
//     return;
//   }

//   if (!(await isOnline())) return;

//   if (Date.now() - lastSyncTime < 10000) {
//     // Advanced Cooldown: Avoid trigger spam if we recently synced
//     return;
//   }

//   const pendingCount = getPendingQueueCount(registeredFyCode);
//   if (pendingCount < 3) {
//     // Let the normal background sync interval handle small queues
//     return;
//   }

//   // Production Jitter + Debounce: Spread syncs over a 5 to 25-second window.
//   // Prevents the "thundering herd" problem where 300+ terminals saving a bill
//   // at the exact same moment would otherwise instantly spike server CPU.
//   if (triggerSyncTimer) {
//     clearTimeout(triggerSyncTimer);
//   }

//   const delayMs = 5000 + Math.floor(Math.random() * 20000);
//   triggerSyncTimer = setTimeout(() => {
//     triggerSyncTimer = null;
//     runSync();
//   }, delayMs);
// }

// /**
//  * Manually sync a single transaction by bill number.
//  * Throws on any unrecoverable error so the caller can surface it to the UI.
//  * @param {string} bill_no
//  * @param {string} [fy_code]
//  * @returns {Promise<{ status: "success" }>}
//  */
// export async function syncSpecificTransaction(bill_no, fy_code) {
//   const activeFyCode = fy_code ?? registeredFyCode;
//   if (!activeFyCode) throw new Error("No FY code available for manual sync");

//   Logger.info(`🚀 Manual sync for bill: ${bill_no} (FY ${activeFyCode})`);

//   const transactions = getTransactionsSqlite({
//     bill_no,
//     fy_code: activeFyCode,
//   });
//   if (!transactions?.length)
//     throw new Error(`Transaction not found: ${bill_no}`);

//   const tx = transactions[0];

//   if (tx.sync_status === 2)
//     throw new Error(
//       "Transaction is currently syncing in the background — please wait.",
//     );
//   if (tx.sync_status === 1) {
//     Logger.info(`ℹ️  ${bill_no} is already synced`);
//     return { status: "success" };
//   }

//   lockTransactionsSqlite([tx.id], activeFyCode);

//   const token = getAuthToken();
//   const payload = formatTransactionPayload(tx, activeFyCode);

//   Logger.debug(
//     `📤 Manual sync payload for ${tx.bill_no} (items: ${payload.cart.length}, amount: ₹${payload.summary.total})`,
//   );

//   try {
//     const { ok, status, body } = await postJSON(PUSH_API_URL, payload, token);

//     if (!ok) {
//       const errMessage = await handleHttpFailure(
//         tx,
//         payload,
//         status,
//         body,
//         token,
//         activeFyCode,
//       );
//       throw new Error(errMessage);
//     }

//     Logger.info(`✅ Manual sync result for ${bill_no}:`, body);
//     markTransactionSynced(tx.id, activeFyCode);
//     return { status: "success" };
//   } catch (err) {
//     if (!err.message.startsWith("HTTP ")) {
//       await handleNetworkFailure(tx, payload, err, token, activeFyCode);
//     }
//     throw err;
//   }
// }

// =====================new step-==================

import { BrowserWindow } from "electron";
import os from "os";
import {
  getPendingTransactions,
  markTransactionSynced,
  incrementSyncAttempts,
  getTransactionsSqlite,
  lockTransactionsSqlite,
  resetStuckTransactionsSqlite,
  markTransactionFailed,
  getPendingQueueCount,
  unlockTransactionsSqlite,
} from "../repositories/transaction.sqlite.repo.js";
import {
  getLoginSession,
  getSessionValue,
  setSessionValue,
} from "../repositories/session.sqlite.repo.js";
import config from "../config.cjs";
import pLimit from "p-limit";
import { isServerOnline } from "../utils/network.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const { API_BASE_URL2 } = config;

// Sync intervals
const SYNC_INTERVAL_MS = 60_000; // normal background interval (60s)
const IDLE_INTERVAL_MS = 5 * 60_000; // slow down when queue is empty (5min)
const BUSY_INTERVAL_MS = 5_000; // fast drain when full batch returned (5s)

// Jitter windows — spread 300 terminals so they don't wake up together
const STARTUP_JITTER_MS = 45_000; // 0–45s random delay at app start
const SCHEDULE_JITTER_MS = 30_000; // 0–30s added to every scheduled sync
const TRIGGER_JITTER_LARGE_MS = 30_000; // triggerSync jitter for queue >= 3
const TRIGGER_JITTER_SMALL_MS = 10_000; // triggerSync jitter for last 1–2 bills
const TRIGGER_MIN_DELAY_MS = 3_000; // minimum delay before any triggered sync

// Cooldowns & limits
const TRIGGER_COOLDOWN_MS = 20_000; // min gap between two triggered syncs (large queue)
const BATCH_SIZE = 10; // max transactions per API call
const MAX_RETRY_ATTEMPTS = 3;
const CONCURRENCY_LIMIT = 1; // sequential pushes within one batch to prevent connection bursting
const FETCH_TIMEOUT_MS = 30_000;
const ONLINE_CHECK_TIMEOUT_MS = 3_000;

// Circuit breaker
const CIRCUIT_BREAKER_PAUSE_MS = 120_000; // 2-min cooldown when tripped
const CIRCUIT_BREAKER_RECHECK_MS = 10_000; // poll interval while breaker is open
const CRITICAL_FAILURE_THRESHOLD = 0.5; // >50% failure rate trips the breaker
const CONSECUTIVE_FAILURES_TO_TRIP = 3;

// Backoff caps
const BACKOFF_SERVER_ERROR_FACTOR = 3;
const BACKOFF_TIMEOUT_FACTOR = 1.5;
const BACKOFF_OTHER_FACTOR = 2;
const BACKOFF_MAX_SERVER_MS = 60_000;
const BACKOFF_MAX_TIMEOUT_MS = 15_000;
const BACKOFF_MAX_OTHER_MS = 30_000;
const BACKOFF_RESET_MS = 1_000;

// API endpoints
const PUSH_API_URL = `${API_BASE_URL2}/pos/push-transactions`;
const PUSH_FAILED_API_URL = `${API_BASE_URL2}/pos/push-failed-sync`;

// ─── Payment field defaults ───────────────────────────────────────────────────

const PAYMENT_NULL_FIELDS = {
  edc_terminal_id: null,
  edc_tid: null,
  edc_mid: null,
  upi_vpa: null,
  paytm_merchant_txn_id: null,
  paytm_order_id: null,
  paytm_rrn: null,
  paytm_response_code: null,
  paytm_response_msg: null,
  issuer_masked_card_no: null,
  issuing_bank_name: null,
  pay_method: null,
  rrn: null,
  auth_code: null,
  card_last4: null,
};

// ─── Module state ─────────────────────────────────────────────────────────────

let isSyncing = false;
let syncTimer = null;
let triggerSyncTimer = null;
let backoffDelay = BACKOFF_RESET_MS;
let registeredFyCode = null;
let lastSyncTime = 0;
let consecutiveFailures = 0;

const circuitBreakers = new Map();

let syncMetrics = {
  totalBatches: 0,
  totalSynced: 0,
  totalErrors: 0,
  avgSyncTimeMs: 0,
};

// ─── Logger ───────────────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === "production";

const Logger = {
  debug: (...a) => {
    if (!IS_PROD) console.log(...a);
  },
  info: (...a) => console.log(...a),
  warn: (...a) => console.warn(...a),
  error: (...a) => console.error(...a),
};

// ─── Network helpers ──────────────────────────────────────────────────────────

async function fetchWithTimeout(url, options, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") || "";
    let body = null;
    try {
      body = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
    } catch {
      /* leave null */
    }
    return { ok: response.ok, status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function postJSON(url, payload, token, timeoutMs) {
  return fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
    timeoutMs,
  );
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

/**
 * Returns a random integer in [0, maxMs).
 * Used everywhere we need jitter to spread terminal load.
 */
function jitter(maxMs) {
  return Math.floor(Math.random() * maxMs);
}

function getAuthToken() {
  const session = getLoginSession() || {};
  return session.token || session.auth_token || "";
}

function sendStatusToRenderer(status, metrics = null) {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed())
      win.webContents.send("sync-status-change", { status, metrics });
  });
}

function extractErrorSummary(body, maxLen = 250) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  return raw.substring(0, maxLen);
}

function convertToIST(utcDateString) {
  const date = utcDateString ? new Date(utcDateString) : new Date();
  if (isNaN(date.getTime())) {
    console.warn(
      `⚠️ convertToIST received invalid date: "${utcDateString}", falling back to now`,
    );
    return convertToIST(null);
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function getDynamicDateRanges(dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(date.getTime()))
    return getDynamicDateRanges(new Date().toISOString());
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const hour = date.getHours();
  const isNextFy = month >= 4;
  const startYear = isNextFy ? year : year - 1;
  const endYear = startYear + 1;
  return {
    financial_year: String(endYear).slice(-2),
    fin_year: `${startYear}-${String(endYear).slice(-2)}`,
    month_range: `${year}_${String(month).padStart(2, "0")}`,
    hour_range: `${String(hour).padStart(2, "0")}-${String(hour + 1).padStart(2, "0")}`,
  };
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ─── Payload helpers ──────────────────────────────────────────────────────────

function parseCartItems(tx) {
  if (!tx.cart_items) return [];
  if (Array.isArray(tx.cart_items)) return tx.cart_items;
  try {
    return JSON.parse(tx.cart_items);
  } catch {
    console.warn(`⚠️ Cart items parse error for bill ${tx.bill_no}`);
    return [];
  }
}

function extractPincode(address) {
  if (!address) return null;
  const match = address.match(/\b\d{6}\b/);
  return match ? match[0] : null;
}

function formatPaymentEntry(p, tx, fyCode, istTime) {
  const d = getDynamicDateRanges(istTime);
  return {
    ...PAYMENT_NULL_FIELDS,
    id: p.id ?? null,
    invoice_no: p.invoice_no ?? tx.bill_no,
    branch_code: p.branch_code ?? tx.branch_code,
    terminal_code: p.counter_code ?? tx.terminal_code,
    financial_year: p.financial_year ?? tx.financial_year ?? d.financial_year,
    fin_year: p.fin_year ?? tx.fin_year ?? d.fin_year,
    fy_code: p.fy_code ?? fyCode,
    month_range: p.month_range ?? tx.month_range ?? d.month_range,
    hour_range: p.hour_range ?? tx.hour_range ?? d.hour_range,
    mode: p.mode ?? "cash",
    amount: Number(p.amount) || 0,
    paytm_rrn: p.paytm_rrn ?? p.rrn ?? null,
    rrn: p.rrn ?? p.paytm_rrn ?? null,
    status: p.status ?? "success",
    synced: p.synced ?? 0,
    created_at:
      convertToIST(p.created_at ?? p.pos_created_at ?? null) || istTime,
    updated_at: p.updated_at ? convertToIST(p.updated_at) : istTime,
  };
}

function buildFallbackPayment(tx, fyCode, istTime) {
  const d = getDynamicDateRanges(istTime);
  return {
    ...PAYMENT_NULL_FIELDS,
    id: null,
    invoice_no: tx.bill_no,
    branch_code: tx.branch_code,
    terminal_code: tx.terminal_code,
    financial_year: tx.financial_year ?? d.financial_year,
    fin_year: tx.fin_year ?? d.fin_year,
    fy_code: fyCode,
    month_range: tx.month_range ?? d.month_range,
    hour_range: tx.hour_range ?? d.hour_range,
    mode: tx.payment_mode ?? "cash",
    amount: Number(tx.amount_received ?? tx.grand_total) || 0,
    status: "success",
    synced: 0,
    created_at: istTime,
    updated_at: istTime,
  };
}

function formatTransactionPayload(tx, fyCode) {
  const parsedCart = parseCartItems(tx);
  const istTime = convertToIST(tx.time ?? null);
  const d = getDynamicDateRanges(istTime);
  const isB2B = tx.bill_no?.startsWith("B") ?? false;
  const taxRegion = tx.tax_region ?? "CGST/SGST";

  const payments =
    Array.isArray(tx.payments) && tx.payments.length > 0
      ? tx.payments.map((p) => formatPaymentEntry(p, tx, fyCode, istTime))
      : [buildFallbackPayment(tx, fyCode, istTime)];

  return {
    idempotency_key: `TXN_${tx.id}_${tx.bill_no}`,
    invoice_no: tx.bill_no,
    branch: tx.branch_code,
    doc_type: tx.doc_type ?? (isB2B ? 2 : 1),
    mod: "offline",
    counter: tx.terminal_code,
    user_id: Number(tx.cashier_id) || null,
    customer_id: Number(tx.customer_id) || 1,
    financial_year: tx.financial_year ?? d.financial_year,
    fin_year: tx.fin_year ?? d.fin_year,
    month_range: tx.month_range ?? d.month_range,
    hour_range: tx.hour_range ?? d.hour_range,
    pos_bill_saved_at: istTime,
    tax_region: taxRegion,
    gst_details: {
      gst_number: tx.gst_number ?? null,
      gst_address: tx.gst_address ?? null,
      company_name: tx.company_name ?? null,
      state: taxRegion === "IGST" ? "IGST" : "SGST/CGST",
      pincode: extractPincode(tx.gst_address),
    },
    summary: {
      qty: Number(tx.total_qty) || 0,
      total: Number(tx.grand_total) || 0,
      total_discount: Number(tx.total_discount) || 0,
      total_tax: Number(tx.total_tax) || 0,
    },
    cart: parsedCart.map((item) => ({
      item_code: item.itemCode ?? item.item_code,
      item_name: item.itemName ?? item.item_name,
      print_desc: item.printDesc ?? item.itemName ?? "ITEM",
      scheme_code: item.schm_type ?? item.schm_camp_grp ?? null,
      qty: Number(item.qty) || 1,
      rate: Number(item.rate ?? item.price) || 0,
      tax_percent: Number(item.tax) || 0,
      discount: Number(item.discount) || 0,
      subtotal: Number(item.total) || 0,
      scanned_at: istTime,
    })),
    payments,
  };
}

// ─── Failure handlers ─────────────────────────────────────────────────────────

async function handleHttpFailure(tx, payload, status, body, token, fyCode) {
  const errSummary = extractErrorSummary(body);
  const errMessage = `HTTP ${status} — ${errSummary}`;
  Logger.error(
    `❌ Server error for ${tx.bill_no} (HTTP ${status}):`,
    errSummary,
  );

  const nextAttempts = (tx.sync_attempts ?? 0) + 1;
  if ((status >= 400 && status < 500) || nextAttempts >= MAX_RETRY_ATTEMPTS) {
    markTransactionFailed(tx.id, fyCode);
  } else {
    incrementSyncAttempts(tx.id, fyCode);
  }

  await pushFailedSync(tx, payload, errMessage, token);
  return errMessage;
}

async function handleNetworkFailure(tx, payload, err, token, fyCode) {
  Logger.error(`❌ Network/timeout for ${tx.bill_no}:`, err.message);
  incrementSyncAttempts(tx.id, fyCode);
  await pushFailedSync(tx, payload, err.message, token);
}

// ─── Fallback logger ──────────────────────────────────────────────────────────

async function pushFailedSync(tx, payload, errorMessage, token) {
  const failedPayload = {
    local_queue_id: String(tx.id),
    ref_id: tx.bill_no,
    type: "transaction",
    payload,
    local_status: "failed",
    retry_count: (tx.sync_attempts ?? 0) + 1,
    error_message: errorMessage || "Unknown error",
    branch_code: tx.branch_code,
    counter_code: tx.terminal_code,
    user_id: Number(tx.cashier_id) || null,
    customer_id: null,
    invoice_no: tx.bill_no,
    failed_reason: errorMessage || "Central server unreachable",
    archived_from_device_uid: os.hostname().toLowerCase(),
  };
  try {
    const { ok, status } = await postJSON(
      PUSH_FAILED_API_URL,
      failedPayload,
      token,
      15_000,
    );
    if (ok) {
      Logger.debug(
        `✅ Logged failed payload for ${tx.bill_no} to fallback API`,
      );
    } else {
      Logger.warn(`⚠️ Fallback API rejected ${tx.bill_no} (HTTP ${status})`);
    }
  } catch (err) {
    Logger.error(
      `❌ Network error while logging fallback for ${tx?.bill_no}:`,
      err.message,
    );
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

/**
 * Schedule the next background runSync call.
 *
 * Every call adds a fresh random jitter (0–SCHEDULE_JITTER_MS) on top of
 * the base delay. This ensures that even if 300 terminals all finish a sync
 * batch at the same moment, their next wake-up times are spread across a
 * 20-second window instead of hammering the server in unison.
 *
 * @param {number} baseDelay  Core delay in ms (e.g. SYNC_INTERVAL_MS).
 */
function scheduleNextSync(baseDelay) {
  if (syncTimer) clearTimeout(syncTimer);
  const delay = baseDelay + jitter(SCHEDULE_JITTER_MS);
  Logger.debug(`⏳ Next sync in ${(delay / 1000).toFixed(1)}s`);
  syncTimer = setTimeout(runSync, delay);
}

// ─── Core sync loop ───────────────────────────────────────────────────────────

async function runSync() {
  // ── 1. Circuit breaker check ──────────────────────────────────────────────
  // If the breaker is open (server was melting), pause and re-check later
  // without touching the server at all.
  const breakerUntil = circuitBreakers.get(PUSH_API_URL) || 0;
  if (Date.now() < breakerUntil) {
    Logger.warn(
      `🛑 Circuit breaker active until ${new Date(breakerUntil).toLocaleTimeString()} — skipping`,
    );
    scheduleNextSync(CIRCUIT_BREAKER_RECHECK_MS);
    return;
  }

  // ── 2. Guard against re-entrant calls ────────────────────────────────────
  if (isSyncing) {
    Logger.debug("⏭️  Sync already in progress — skipping");
    return;
  }

  // ── 3. FY code must be set before any sync ────────────────────────────────
  const activeFyCode = registeredFyCode;
  if (!activeFyCode) {
    Logger.warn("⚠️  runSync called before FY code was registered");
    return;
  }

  // ── 4. Offline check (local DNS — no server hit) ──────────────────────────
  if (!(await isServerOnline(ONLINE_CHECK_TIMEOUT_MS))) {
    Logger.debug("🌐 Offline — skipping sync");
    scheduleNextSync(SYNC_INTERVAL_MS);
    return;
  }

  // ── 5. Queue check ────────────────────────────────────────────────────────
  // getPendingTransactions is a local SQLite call — zero network cost.
  // We filter out rows that have already exhausted their retries here so
  // we never lock them again.
  const allPending = getPendingTransactions(BATCH_SIZE, activeFyCode);
  const pending = allPending.filter(
    (tx) => tx.sync_attempts < MAX_RETRY_ATTEMPTS,
  );

  if (!pending.length) {
    sendStatusToRenderer("idle");
    scheduleNextSync(IDLE_INTERVAL_MS);
    return;
  }

  // ── 6. Lock selected rows so no other process/window double-sends them ────
  lockTransactionsSqlite(
    pending.map((tx) => tx.id),
    activeFyCode,
  );

  isSyncing = true;
  sendStatusToRenderer("syncing");

  let syncResults = null;
  let hasSuccess = false;

  try {
    Logger.info(
      `🔄 Syncing ${pending.length} transactions (FY ${activeFyCode})`,
    );

    // ── 7. Auth token guard ───────────────────────────────────────────────
    const token = getAuthToken();
    if (!token) {
      Logger.warn("⚠️ No auth token — skipping. Retry in 5 min.");
      unlockTransactionsSqlite(
        pending.map((tx) => tx.id),
        activeFyCode,
      );
      isSyncing = false;
      scheduleNextSync(5 * 60_000);
      return;
    }

    // ── 8. Sequential batch push ──────────────────────────────────────────
    // pLimit caps parallel fetch calls to CONCURRENCY_LIMIT (1).
    // This prevents connection bursting and ensures the central Redis server
    // is never overwhelmed, even when hundreds of terminals wake up simultaneously.
    const limit = pLimit(CONCURRENCY_LIMIT);
    const batchStartTime = Date.now();

    syncResults = await Promise.allSettled(
      pending.map((tx, idx) =>
        limit(async () => {
          if (idx > 0) {
            await sleep(300); // 300ms pacing between requests in the same batch
          }
          const payload = formatTransactionPayload(tx, activeFyCode);
          Logger.debug(
            `📤 Pushing ${tx.bill_no} (items: ${payload.cart.length}, ₹${payload.summary.total})`,
          );
          try {
            const { ok, status, body } = await postJSON(
              PUSH_API_URL,
              payload,
              token,
            );
            if (ok) {
              Logger.debug(`✅ Synced ${tx.bill_no}:`, body);
              markTransactionSynced(tx.id, activeFyCode);
              return { type: "success" };
            } else {
              await handleHttpFailure(
                tx,
                payload,
                status,
                body,
                token,
                activeFyCode,
              );
              return { type: "http", status };
            }
          } catch (err) {
            await handleNetworkFailure(tx, payload, err, token, activeFyCode);
            return { type: "network" };
          }
        }),
      ),
    );

    // ── 9. Result tallying ────────────────────────────────────────────────
    const successCount = syncResults.filter(
      (r) => r.status === "fulfilled" && r.value?.type === "success",
    ).length;
    const serverErrorCount = syncResults.filter(
      (r) =>
        r.status === "fulfilled" &&
        r.value?.type === "http" &&
        r.value.status >= 500,
    ).length;
    const timeoutCount = syncResults.filter(
      (r) => r.status === "fulfilled" && r.value?.type === "network",
    ).length;

    hasSuccess = successCount > 0;

    // ── 10. Metrics ───────────────────────────────────────────────────────
    const batchDuration = Date.now() - batchStartTime;
    syncMetrics.totalBatches++;
    syncMetrics.totalSynced += successCount;
    syncMetrics.totalErrors += pending.length - successCount;
    syncMetrics.avgSyncTimeMs = Math.round(
      (syncMetrics.avgSyncTimeMs * (syncMetrics.totalBatches - 1) +
        batchDuration) /
        syncMetrics.totalBatches,
    );
    if (successCount > 0) lastSyncTime = Date.now();

    Logger.info(
      `📊 Sync — ✅ ${successCount}/${pending.length} | 🕐 ${syncMetrics.avgSyncTimeMs}ms avg`,
    );
    setSessionValue("sync_metrics", JSON.stringify(syncMetrics));
    sendStatusToRenderer("synced", syncMetrics);

    // ── 11. Adaptive backoff based on failure type ────────────────────────

    const criticalFailureRate =
      (serverErrorCount + timeoutCount) / pending.length;

    if (criticalFailureRate > CRITICAL_FAILURE_THRESHOLD) {
      consecutiveFailures++;

      if (consecutiveFailures >= CONSECUTIVE_FAILURES_TO_TRIP) {
        // ── Circuit breaker tripped ───────────────────────────────────────
        // All terminals that reach this point pause for 2 minutes.
        // Because each terminal independently decides this based on its own
        // failure data, the 2-min window gives the server real breathing room.
        const resumeAt = Date.now() + CIRCUIT_BREAKER_PAUSE_MS;
        circuitBreakers.set(PUSH_API_URL, resumeAt);
        Logger.warn(
          `🛑 Circuit breaker tripped (${(criticalFailureRate * 100).toFixed(0)}% failures). ` +
            `Pausing until ${new Date(resumeAt).toLocaleTimeString()}`,
        );
        consecutiveFailures = 0;
        backoffDelay = BACKOFF_RESET_MS;
      } else if (serverErrorCount > 0) {
        backoffDelay = Math.min(
          backoffDelay * BACKOFF_SERVER_ERROR_FACTOR,
          BACKOFF_MAX_SERVER_MS,
        );
        Logger.warn(
          `⚠️ Server errors detected — backoff now ${backoffDelay / 1000}s`,
        );
      } else if (timeoutCount > 0) {
        backoffDelay = Math.min(
          backoffDelay * BACKOFF_TIMEOUT_FACTOR,
          BACKOFF_MAX_TIMEOUT_MS,
        );
        Logger.warn(
          `⚠️ Timeouts detected — backoff now ${backoffDelay / 1000}s`,
        );
      } else {
        backoffDelay = Math.min(
          backoffDelay * BACKOFF_OTHER_FACTOR,
          BACKOFF_MAX_OTHER_MS,
        );
      }
    } else {
      // Good batch → reset failure tracking
      consecutiveFailures = 0;
      if (successCount === pending.length) backoffDelay = BACKOFF_RESET_MS;
    }

    // ── 12. Decide next interval ──────────────────────────────────────────
    // spread across a ~20s window.
    if (pending.length === BATCH_SIZE && hasSuccess) {
      isSyncing = false;
      syncTimer = null;
      scheduleNextSync(BUSY_INTERVAL_MS); // fast drain, still jittered
      return;
    }
  } catch (err) {
    // ── Unexpected crash (should never happen, but bulletproofing) ────────
    Logger.error("❌ Unexpected sync failure:", err.message);
    for (const tx of pending) {
      if ((tx.sync_attempts ?? 0) < MAX_RETRY_ATTEMPTS) {
        incrementSyncAttempts(tx.id, activeFyCode);
      }
    }
    sendStatusToRenderer("error");
    consecutiveFailures++;
    backoffDelay = Math.min(
      backoffDelay * BACKOFF_OTHER_FACTOR,
      BACKOFF_MAX_SERVER_MS,
    );
  } finally {
    // ── Unlock only rows whose outcome is truly uncertain ─────────────────
    const idsToUnlock = pending
      .filter((tx, i) => {
        const res = syncResults?.[i];
        return (
          !res ||
          res.status === "rejected" ||
          (res.value?.type === "network" &&
            (tx.sync_attempts ?? 0) < MAX_RETRY_ATTEMPTS)
        );
      })
      .map((tx) => tx.id);

    if (idsToUnlock.length > 0) {
      unlockTransactionsSqlite(idsToUnlock, activeFyCode);
    }

    isSyncing = false;
    scheduleNextSync(
      backoffDelay > BACKOFF_RESET_MS ? backoffDelay : SYNC_INTERVAL_MS,
    );
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the background sync loop. Call ONCE on app startup after login.
 *
 * @param {string} fy_code  Financial year code from the login session.
 */
export function startBackgroundSync(fy_code) {
  if (!fy_code) {
    Logger.error("❌ startBackgroundSync called without a fy_code");
    return;
  }

  registeredFyCode = fy_code;
  Logger.info(`🚀 Background sync registered for FY: ${registeredFyCode}`);

  // Restore persisted metrics across restarts
  try {
    const saved = getSessionValue("sync_metrics");
    if (saved) {
      Object.assign(syncMetrics, JSON.parse(saved));
      Logger.info("📊 Loaded persisted sync metrics");
    }
  } catch (err) {
    Logger.warn("⚠️ Could not load persisted sync metrics:", err.message);
  }

  // Release any rows left locked by a previous crash
  resetStuckTransactionsSqlite(registeredFyCode);
  Logger.info("🧹 Cleared stuck transactions (crash recovery)");

  // Startup jitter: spread 300 terminals across 0–30s window
  const startupDelay = jitter(STARTUP_JITTER_MS);
  Logger.info(
    `⏳ First sync in ${(startupDelay / 1000).toFixed(1)}s (startup jitter)`,
  );
  setTimeout(runSync, startupDelay);
}

/**
 
 * @param {string} [fy_code]  Pass if the FY code isn't registered yet.
 */
export async function triggerSync(fy_code) {
  if (fy_code) registeredFyCode = fy_code;

  // Already running — background loop will pick up new rows next iteration
  if (isSyncing) {
    Logger.debug("⏭️  triggerSync — sync in progress, skipping");
    return;
  }

  // No network → pointless to schedule
  if (!(await isServerOnline(ONLINE_CHECK_TIMEOUT_MS))) return;

  // Local SQLite count — zero network cost
  const pendingCount = getPendingQueueCount(registeredFyCode);
  if (pendingCount === 0) return;

  const isLastBills = pendingCount < 3;

  if (!isLastBills) {
    // Large queue: enforce cooldown to prevent trigger spam
    const timeSinceLastSync = Date.now() - lastSyncTime;
    if (timeSinceLastSync < TRIGGER_COOLDOWN_MS) {
      Logger.debug(
        `⏭️  triggerSync — cooldown active (${((TRIGGER_COOLDOWN_MS - timeSinceLastSync) / 1000).toFixed(1)}s left)`,
      );
      return;
    }
  }

  // Debounce: cancel any pending trigger and restart the window.
  // This collapses rapid bill-saves from one terminal into a single sync.
  if (triggerSyncTimer) clearTimeout(triggerSyncTimer);

  // Adaptive jitter:
  //  Last bills (1–2):  2s base + 0–6s  jitter  →  fires in 2–8s
  //  Normal queue (3+): 5s base + 0–20s jitter  →  fires in 5–25s
  const minDelay = TRIGGER_MIN_DELAY_MS;
  const jitterRange = isLastBills
    ? TRIGGER_JITTER_SMALL_MS
    : TRIGGER_JITTER_LARGE_MS;
  const delayMs = minDelay + jitter(jitterRange);

  Logger.debug(
    `⏳ triggerSync in ${(delayMs / 1000).toFixed(1)}s ` +
      `(pending: ${pendingCount}, lastBills: ${isLastBills})`,
  );

  triggerSyncTimer = setTimeout(() => {
    triggerSyncTimer = null;
    runSync();
  }, delayMs);
}

/**
 * Manually sync a single transaction by bill number.
 * Bypasses the background queue — intended for the "Retry" button in the UI.
 *
 * @param {string}  bill_no
 * @param {string}  [fy_code]
 * @returns {Promise<{ status: "success" }>}
 */
export async function syncSpecificTransaction(bill_no, fy_code) {
  const activeFyCode = fy_code ?? registeredFyCode;
  if (!activeFyCode) throw new Error("No FY code available for manual sync");

  Logger.info(`🚀 Manual sync for bill: ${bill_no} (FY ${activeFyCode})`);

  const transactions = getTransactionsSqlite({
    bill_no,
    fy_code: activeFyCode,
  });
  if (!transactions?.length)
    throw new Error(`Transaction not found: ${bill_no}`);

  const tx = transactions[0];

  if (tx.sync_status === 2)
    throw new Error(
      "Transaction is currently syncing in the background — please wait.",
    );
  if (tx.sync_status === 1) {
    Logger.info(`ℹ️  ${bill_no} is already synced`);
    return { status: "success" };
  }

  lockTransactionsSqlite([tx.id], activeFyCode);

  const token = getAuthToken();
  const payload = formatTransactionPayload(tx, activeFyCode);

  Logger.debug(
    `📤 Manual sync payload for ${tx.bill_no} (items: ${payload.cart.length}, ₹${payload.summary.total})`,
  );

  try {
    const { ok, status, body } = await postJSON(PUSH_API_URL, payload, token);
    if (!ok) {
      const errMessage = await handleHttpFailure(
        tx,
        payload,
        status,
        body,
        token,
        activeFyCode,
      );
      throw new Error(errMessage);
    }
    Logger.info(`✅ Manual sync result for ${bill_no}:`, body);
    markTransactionSynced(tx.id, activeFyCode);
    return { status: "success" };
  } catch (err) {
    if (!err.message.startsWith("HTTP ")) {
      await handleNetworkFailure(tx, payload, err, token, activeFyCode);
    }
    throw err;
  }
}
