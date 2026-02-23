import {
  getPendingInvoices,
  markInvoiceSynced,
  incrementInvoiceSyncAttempts,
} from "../repositories/invoice.sqlite.repo.js";
import { API_BASE_URL } from "../config.js";

const SYNC_INTERVAL = 60000;
const API_URL = `${API_BASE_URL}/invoice-sync/sync`;

let isSyncing = false;
let timer = null;
let isManualSyncQueued = false;
let currentFyCode = null;

export function startInvoiceSync(fy_code) {
  if (fy_code) currentFyCode = fy_code;
  console.log("🚀 Invoice Sync Started");
  runSync();
}

export function triggerInvoiceSync(fy_code) {
  if (fy_code) currentFyCode = fy_code;
  console.log("⚡ Manual Sync Triggered");
  if (isSyncing) {
    isManualSyncQueued = true;
    return;
  }
  if (timer) clearTimeout(timer);
  runSync();
}

async function runSync() {
  if (isSyncing || !currentFyCode) {
    isManualSyncQueued = true;
    return;
  }

  isSyncing = true;

  try {
    const pending = getPendingInvoices(20);

    if (!pending.length) {
      return;
    }

    console.log(`🔄 Syncing ${pending.length} invoices`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoices: pending, fy_code: currentFyCode }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(response.statusText);

    const result = await response.json();

    pending.forEach(inv => markInvoiceSynced(inv.bill_no));

    if (pending.length === 20) {
      isManualSyncQueued = true;
    }

  } catch (error) {
    console.error("❌ Sync Failed:", error.message);

    const failed = getPendingInvoices(20);
    failed.forEach(inv =>
      incrementInvoiceSyncAttempts(inv.bill_no)
    );
  } finally {
    isSyncing = false;
    if (isManualSyncQueued) {
      isManualSyncQueued = false;
      setTimeout(runSync, 0);
    } else {
      scheduleNext();
    }
  }
}

function scheduleNext() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(runSync, SYNC_INTERVAL);
}
