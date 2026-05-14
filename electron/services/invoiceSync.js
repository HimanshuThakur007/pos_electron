import {
  getAllInvoiceSeries,
  markInvoiceSynced,
} from "../repositories/invoice.sqlite.repo.js";
import { getLoginSession } from "../repositories/session.sqlite.repo.js";
import config from "../config.cjs";
import { isServerOnline } from "../utils/network.js";

const { API_BASE_URL2 } = config;

const SYNC_INTERVAL = 60 * 1000;
const API_URL = `${API_BASE_URL2}/pos/invoice-series/update`;

// ⭐ jitter range (0–5 sec)
const JITTER_MAX = 5000;

let isSyncing = false;
let syncTimer = null;
let backoffDelay = 1000;
let currentFyCode = null;
let triggerSyncTimer = null;

function getJitterDelay(baseDelay) {
  const jitter = Math.floor(Math.random() * JITTER_MAX);
  return baseDelay + jitter;
}

export function startInvoiceSync(fy_code) {
  if (fy_code) currentFyCode = fy_code;
  console.log("🚀 Invoice Series Sync Started for FY:", currentFyCode);
  runSync();
}

export function triggerInvoiceSync(fy_code) {
  if (fy_code) currentFyCode = fy_code;

  if (!isSyncing) {
    if (triggerSyncTimer) {
      clearTimeout(triggerSyncTimer);
    }
    const delayMs = 2000 + Math.floor(Math.random() * 8000); // 2 to 10 seconds
    triggerSyncTimer = setTimeout(() => {
      triggerSyncTimer = null;
      if (syncTimer) {
        clearTimeout(syncTimer);
        syncTimer = null;
      }
      runSync();
    }, delayMs);
  }
}

async function runSync() {
  if (isSyncing || !currentFyCode) return;

  if (!(await isServerOnline(3000))) {
    console.log("🌐 Offline — skipping invoice series sync");
    scheduleNextSync(SYNC_INTERVAL);
    return;
  }

  // Only sync invoice series that are actually pending (status = 0)
  const allSeries = getAllInvoiceSeries(currentFyCode);
  const pendingSeries = allSeries.filter((s) => s.sync_status === 0);

  if (!pendingSeries || !pendingSeries.length) {
    scheduleNextSync(3 * 60 * 1000);
    return;
  }

  isSyncing = true;

  try {
    const session = getLoginSession() || {};
    const token = session.token || session.auth_token || "";

    if (!token) {
      console.warn("⚠️ No auth token — skipping invoice series sync");
      isSyncing = false;
      scheduleNextSync(5 * 60 * 1000);
      return;
    }

    // Sync all active sequence counters individually
    for (const activeSeries of pendingSeries) {
      const shortFyCode =
        activeSeries.fy_code && activeSeries.fy_code.length >= 2
          ? activeSeries.fy_code.slice(-2)
          : activeSeries.fy_code;

      const docType = activeSeries.doc_type || 1;

      const payload = {
        branch_code: activeSeries.branch_code,
        terminal_code: activeSeries.terminal_code,
        fy_code: shortFyCode,
        user_id: activeSeries.user_id,
        current_number: activeSeries.current_number,
        doc_type: docType,
        mod: "offline",
      };
      const payloadStr = JSON.stringify(payload);
      console.log("📦 Syncing Invoice Series with payload", payload);
      console.log(
        `🔄 Syncing invoice series for Branch: ${activeSeries.branch_code}, Terminal: ${activeSeries.terminal_code}, DocType: ${docType} (Current: ${activeSeries.current_number})`,
      );

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: payloadStr,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const result = await response.json(); // Consume the body
          markInvoiceSynced(activeSeries.id);
          console.log(
            `✅ Invoice Sync Successful for Branch: ${activeSeries.branch_code}, Terminal: ${activeSeries.terminal_code}, DocType: ${docType}`,
          );
          console.log("📦 Invoice Sync Response:", result);
        } else {
          const errText = await response.text();
          console.error(`❌ Invoice Sync HTTP ${response.status}: ${errText}`);
        }
      } catch (err) {
        clearTimeout(timeout);
        console.error(`❌ Invoice Sync Network Error: ${err.message}`);
      }
    }

    backoffDelay = 1000;
  } catch (error) {
    console.error("❌ Invoice Series Sync Failed:", error.message);
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
