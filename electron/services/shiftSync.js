import {
  getPendingTerminalSessions,
  markTerminalSessionSynced,
  markTerminalSessionFullySynced,
} from "../repositories/terminal_session.sqlite.repo.js";
import { getLoginSession } from "../repositories/session.sqlite.repo.js";
import config from "../config.cjs";
import { isServerOnline } from "../utils/network.js";

const { API_BASE_URL2 } = config;
const SYNC_INTERVAL = 60 * 1000;
const IDLE_INTERVAL = 1 * 60 * 1000;
const API_URL = `${API_BASE_URL2}/shifts/open`;

let isSyncing = false;
let syncTimer = null;

export function startShiftSync() {
  console.log("🚀 Shift Sync Started");
  runSync();
}

export function triggerShiftSync() {
  if (!isSyncing) {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    syncTimer = setTimeout(runSync, 500);
  }
}

async function runSync() {
  if (isSyncing) return;

  const pendingShifts = getPendingTerminalSessions();

  if (!pendingShifts || !pendingShifts.length) {
    scheduleNextSync(IDLE_INTERVAL);
    return;
  }

  if (!(await isServerOnline(3000))) {
    scheduleNextSync(5000); // Retry quickly if there is data but the system is temporarily offline
    return;
  }

  isSyncing = true;

  try {
    const session = getLoginSession() || {};
    const token = session.token || session.auth_token || "";

    if (!token) {
      isSyncing = false;
      scheduleNextSync(SYNC_INTERVAL);
      return;
    }

    for (const shift of pendingShifts) {
      console.log(
        `🔄 Syncing pending shift (Status: ${shift.status}, SyncStatus: ${shift.sync_status}) for Branch: ${shift.branch_code}, Terminal: ${shift.terminal_code}`,
      );

      let currentShiftId = shift.shift_id;
      let currentTerminalId = shift.shift_id || shift.terminal_id;
      let openSyncSuccess = !!currentShiftId;

      // 1. OPEN SYNC
      if (!openSyncSuccess) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
          const payload = {
            opening_amount: shift.opening_amount,
          };
          console.log("📤 Open Shift Payload:", JSON.stringify(payload));

          const response = await fetch(API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          clearTimeout(timeout);
          console.log("📡 Open Shift API Response (Success):", response);
          if (response.ok) {
            const result = await response.json();
            console.log("📡 Open Shift API Response (Success):", result);
            if (result.shift && result.shift.id) {
              markTerminalSessionSynced(shift.id, result.shift);
              currentShiftId = result.shift.id;
              currentTerminalId = result.shift.id;
              openSyncSuccess = true;
              console.log(
                `✅ Shift Open Sync Successful for local ID: ${shift.id}, Server ID: ${result.shift.id}`,
              );
            }
          } else {
            const result = await response.json().catch(() => null);
            console.log("📡 Open Shift API Response (Error):", result);
            if (result && result.shift && result.shift.id) {
              markTerminalSessionSynced(shift.id, result.shift);
              currentShiftId = result.shift.id;
              currentTerminalId = result.shift.id;
              openSyncSuccess = true;
              console.log(
                `✅ Shift Open Sync Recovered from HTTP ${response.status} for local ID: ${shift.id}, Server ID: ${result.shift.id}. Updated terminal_id to ${result.shift.terminal_id}`,
              );
            } else {
              console.error(
                `❌ Shift Open Sync HTTP ${response.status}`,
                result || "",
              );
            }
          }
        } catch (err) {
          clearTimeout(timeout);
          console.error(`❌ Shift Open Sync Network Error: ${err.message}`);
        }
      }

      // 2. CLOSE SYNC
      if (shift.status === "closed" && openSyncSuccess && currentTerminalId) {
        // Safety delay to ensure the server DB commits the Open transaction before we Close it
        await new Promise((resolve) => setTimeout(resolve, 500));

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
          const closePayload = {
            closing_amount: shift.closing_amount,
            notes: shift.notes || "Cash verified and closed successfully",
          };
          console.log("📤 Close Shift Payload:", JSON.stringify(closePayload));

          console.log(
            "url",
            `${API_BASE_URL2}/shifts/${currentTerminalId}/close`,
          );
          const response = await fetch(
            `${API_BASE_URL2}/shifts/${currentTerminalId}/close`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(closePayload),
              signal: controller.signal,
            },
          );

          clearTimeout(timeout);

          if (response.ok) {
            const result = await response.json().catch(() => null);
            console.log("📡 Close Shift API Response (Success):", result);
            markTerminalSessionFullySynced(shift.id);
            console.log(
              `✅ Shift Close Sync Successful for local ID: ${shift.id}, Server ID: ${currentShiftId}`,
            );
          } else {
            const result = await response.json().catch(() => null);
            console.log("📡 Close Shift API Response (Error):", result);
            if (
              response.status === 404 ||
              (result &&
                result.message &&
                result.message.toLowerCase().includes("already closed"))
            ) {
              markTerminalSessionFullySynced(shift.id);
              console.log(
                `✅ Shift Close Sync Recovered (already closed or not found) for local ID: ${shift.id}`,
              );
            } else {
              console.error(
                `❌ Shift Close Sync HTTP ${response.status}`,
                result || "",
              );
            }
          }
        } catch (err) {
          clearTimeout(timeout);
          console.error(`❌ Shift Close Sync Network Error: ${err.message}`);
        }
      }

      // Pause briefly before processing the next offline shift in the queue
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error("❌ Shift Sync Failed:", error.message);
  } finally {
    isSyncing = false;

    // If there is still unsynced data left (e.g. partial failure), retry almost immediately
    const remainingShifts = getPendingTerminalSessions();
    if (remainingShifts && remainingShifts.length > 0) {
      scheduleNextSync(2000);
    } else {
      scheduleNextSync(SYNC_INTERVAL);
    }
  }
}

function scheduleNextSync(delay) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(runSync, delay);
}
