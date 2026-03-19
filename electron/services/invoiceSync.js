import dns from "dns";
import {
  getPendingInvoices,
  markInvoiceSynced,
  incrementInvoiceSyncAttempts,
} from "../repositories/invoice.sqlite.repo.js";
import config from "../config.cjs";

const { API_BASE_URL } = config;

const SYNC_INTERVAL = 60 * 1000;
const API_URL = `${API_BASE_URL}/invoice-sync/sync`;

const MAX_RETRY_ATTEMPTS = 5;
const BATCH_SIZE = 10;
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
    const timer = setTimeout(() => resolve(false), 3000);
    dns.lookup("google.com", (err) => {
      clearTimeout(timer);
      resolve(!err);
    });
  });
}

export function startInvoiceSync(fy_code) {
  if (fy_code) currentFyCode = fy_code;
  console.log("🚀 Invoice Sync Started for FY:", currentFyCode);
  runSync();
}

export function triggerInvoiceSync(fy_code) {
  if (fy_code) currentFyCode = fy_code;

  // Only start if not running/scheduled (let interval handle it)
  if (!isSyncing && !syncTimer) {
    runSync();
  }
}

async function runSync() {
  if (isSyncing || !currentFyCode) return;

  if (!(await isOnline())) {
    console.log("🌐 Offline — skipping invoice sync");
    scheduleNextSync(SYNC_INTERVAL);
    return;
  }

  // Repository already filters sync_attempts < 5
  const pending = getPendingInvoices(BATCH_SIZE);

  if (!pending.length) {
    // Check again later (3 mins)
    scheduleNextSync(3 * 60 * 1000);
    return;
  }

  isSyncing = true;
  console.log(`🔄 Syncing ${pending.length} invoices`);

  try {
    const payload = {
      fy_code: currentFyCode,
      invoices: pending
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(response.statusText);

    const result = await response.json();
    console.log("✅ Invoice Sync Result:", result);

    // Handle smart response (synced ids) or fallback to all
    if (result.synced && Array.isArray(result.synced)) {
      result.synced.forEach(bill_no => markInvoiceSynced(bill_no));
      
      if (result.failed && Array.isArray(result.failed)) {
        result.failed.forEach(bill_no => incrementInvoiceSyncAttempts(bill_no));
      }
    } else {
      // Fallback: Assume all synced if 200 OK
      pending.forEach(inv => markInvoiceSynced(inv.bill_no));
    }

    backoffDelay = 1000;

    // Process next batch immediately if full batch was processed
    if (pending.length === BATCH_SIZE) {
      isSyncing = false;
      runSync();
      return;
    }

  } catch (error) {
    console.error("❌ Invoice Sync Failed:", error.message);

    // Increment attempts locally on network failure
    pending.forEach(inv => incrementInvoiceSyncAttempts(inv.bill_no));

    backoffDelay = Math.min(backoffDelay * 2, 60000);
  } finally {
    isSyncing = false;
    
    const delay = backoffDelay > 1000 ? backoffDelay : SYNC_INTERVAL;
    scheduleNextSync(delay);
  }
}

function scheduleNextSync(delay) {
  if (syncTimer) clearTimeout(syncTimer);
  const finalDelay = getJitterDelay(delay);
  syncTimer = setTimeout(runSync, finalDelay);
}
