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
// const PUSH_API_URL = `${API_BASE_URL2}/pos/push-transactions`;
const PUSH_API_URL = `${API_BASE_URL2}/pos/central/push-transactions`;
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
    month_range: `${year}-${String(month).padStart(2, "0")}`,
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

  const uniqueModes = [...new Set(payments.map((p) => p.mode || "cash"))];
  const tender_mode = uniqueModes.length > 1 ? "split" : uniqueModes[0];

  return {
    idempotency_key: `TXN_${tx.id}_${tx.bill_no}`,
    invoice_no: tx.bill_no,
    invoice_source: "offline",
    branch: tx.branch_code,
    doc_type: tx.doc_type ?? (isB2B ? 2 : 1),
    mod: "offline",
    tender_mode: tender_mode,
    counter: tx.terminal_code,
    user_id: Number(tx.cashier_id) || null,
    customer_id: Number(tx.customer_id) || 1,
    financial_year: tx.financial_year ?? d.financial_year,
    fin_year: tx.fin_year ?? d.fin_year,
    fy_code: fyCode,
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
      taxable: Number(tx.taxable_value) || 0,
      tax: Number(tx.total_tax) || 0,
      discount: Number(tx.total_discount) || 0,
      total: Number(tx.grand_total) || 0,
      skuCount: parsedCart.length,
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

  await pushFailedSync(tx, payload, errMessage, token, fyCode);
  return errMessage;
}

async function handleNetworkFailure(tx, payload, err, token, fyCode) {
  Logger.error(`❌ Network/timeout for ${tx.bill_no}:`, err.message);
  incrementSyncAttempts(tx.id, fyCode);
  await pushFailedSync(tx, payload, err.message, token, fyCode);
}

// ─── Fallback logger ──────────────────────────────────────────────────────────

async function pushFailedSync(tx, payload, errorMessage, token, fyCode) {
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
    fy_code: fyCode || tx.fy_code,
    failed_reason: errorMessage || "Central server unreachable",
    archived_from_device_uid: os.hostname().toLowerCase(),
  };
  console.log(
    "PUSH_FAILED_API_URL request body:",
    JSON.stringify(failedPayload, null, 2),
  );
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
          console.log(
            "PUSH_API_URL request body:",
            JSON.stringify(payload, null, 2),
          );
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

  console.log("PUSH_API_URL request body:", JSON.stringify(payload, null, 2));
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
