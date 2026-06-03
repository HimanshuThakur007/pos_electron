import { ipcMain } from "electron";
import {
  openTerminalSessionSqlite,
  closeTerminalSessionSqlite,
  getActiveTerminalSessionSqlite,
  getLastClosedSessionSqlite,
} from "../repositories/terminal_session.sqlite.repo.js";
import { API_BASE_URL2 } from "../config.js";
import { getLoginSession } from "../repositories/session.sqlite.repo.js";
import { triggerShiftSync } from "../services/shiftSync.js";
import { db } from "../database/sqlite.js";

ipcMain.handle("open-terminal-session", async (_, data) => {
  try {
    const sessionConfig = getLoginSession() || {};
    const token = sessionConfig.token || sessionConfig.auth_token || "";

    let shift = null;
    let sync_status = 0;

    try {
      const payload = {
        opening_amount: data.opening_amount,
        branch_code: data.branch_code,
        terminal_code: data.terminal_code,
        opened_at: new Date().toISOString(),
      };
      console.log("📤 Open Shift Payload (Online):", JSON.stringify(payload));

      const response = await fetch(`${API_BASE_URL2}/shifts/open`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const json = await response.json();
        console.log("📡 Open Shift API Response (Online Success):", json);
        if (json.shift) {
          shift = {
            ...data, // Keep the requested branch/terminal codes
            ...json.shift, // Overlay server properties (shift_id)
            branch_code: data.branch_code, // ENFORCE correct local branch code over server's
            terminal_code: data.terminal_code, // ENFORCE correct local terminal code over server's
            shift_id: json.shift.id, // Explicitly map server's ID
            status: "open", // Force local status to lowercase 'open'
          };
          sync_status = 1; // Successfully synced with server
        }
      } else {
        const json = await response.json().catch(() => null);
        console.log("📡 Open Shift API Response (Online Error):", json);
        if (json && json.shift) {
          shift = {
            ...data,
            ...json.shift,
            branch_code: data.branch_code,
            terminal_code: data.terminal_code,
            shift_id: json.shift.id,
            status: "open",
          };
          sync_status = 1; // Mark as synced if the server provides the shift
        }
      }
    } catch (apiError) {
      console.warn(
        "⚠️ API open shift failed, falling back to local:",
        apiError.message,
      );
    }

    // If API call failed or didn't return shift, create local dummy shift
    if (!shift) {
      shift = {
        user_id: data.user_id,
        terminal_id: data.terminal_id || null,
        branch_code: data.branch_code,
        terminal_code: data.terminal_code,
        opening_amount: data.opening_amount,
        status: "open",
        opened_at: new Date().toISOString(),
        notes: data.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      sync_status = 0;
    }

    shift.sync_status = sync_status;

    const sessionId = openTerminalSessionSqlite(shift);

    shift.id = sessionId; // Ensure the frontend gets the local SQLite ID to close it later

    if (sync_status === 0) {
      triggerShiftSync();
    }

    return { success: true, sessionId, session: shift };
  } catch (error) {
    console.error("IPC: Failed to open terminal session", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("close-terminal-session", async (_, { id, data }) => {
  try {
    const sessionConfig = getLoginSession() || {};
    const token = sessionConfig.token || sessionConfig.auth_token || "";

    let sync_status = 2; // Assume close is pending by default
    console.log(
      `Attempting to close shift for terminal ID: ${id} with data:`,
      data,
    );
    try {
      let terminalId = data.shift_id;

      // If the frontend didn't pass the shift_id (e.g., restoring a previous day's shift),
      // fetch it directly from the local database using the internal SQLite id.
      if (!terminalId) {
        try {
          const row = db
            .prepare(`SELECT shift_id FROM terminal_sessions WHERE id = ?`)
            .get(id);
          if (row && row.shift_id) {
            terminalId = row.shift_id;
          }
        } catch (dbErr) {
          console.error("Failed to fetch shift_id from DB:", dbErr.message);
        }
      }

      console.log(`Attempting to close shift for terminal ID: ${terminalId}`);
      if (terminalId) {
        const closePayload = {
          closing_amount: data.closing_amount,
          notes: data.notes || "Cash verified and closed successfully",
          // closed_at: new Date().toISOString(),
        };
        console.log(
          "📤 Close Shift Payload (Online):",
          JSON.stringify(closePayload),
        );

        console.log("url", `${API_BASE_URL2}/shifts/${terminalId}/close`);
        const response = await fetch(
          `${API_BASE_URL2}/shifts/${terminalId}/close`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(closePayload),
          },
        );

        if (!response.ok) {
          console.warn(`⚠️ API close shift failed: HTTP ${response.status}`);
          const result = await response.json().catch(() => null);
          console.log("📡 Close Shift API Response (Online Error):", result);
          if (
            response.status === 404 ||
            (result &&
              result.message &&
              result.message.toLowerCase().includes("already closed"))
          ) {
            sync_status = 1;
          }
        } else {
          const result = await response.json().catch(() => null);
          console.log("📡 Close Shift API Response (Online Success):", result);
          sync_status = 1; // Fully synced
        }
      }
    } catch (apiError) {
      console.warn("⚠️ API close shift network error:", apiError.message);
    }

    data.sync_status = sync_status;
    const success = closeTerminalSessionSqlite(id, data);

    if (sync_status !== 1) {
      triggerShiftSync();
    }

    return { success };
  } catch (error) {
    console.error("IPC: Failed to close terminal session", error);
    return { success: false, error: error.message };
  }
});

// ipcMain.handle(
//   "get-active-terminal-session",
//   async (_, { branch_code, terminal_code }) => {
//     try {
//       const session = getActiveTerminalSessionSqlite(
//         branch_code,
//         terminal_code,
//       );
//       return { success: true, session };
//     } catch (error) {
//       console.error("IPC: Failed to get active terminal session", error);
//       return { success: false, error: error.message, session: null };
//     }
//   },
// );

ipcMain.handle(
  "get-active-terminal-session",
  async (_, { branch_code, terminal_code }) => {
    try {
      const session = getActiveTerminalSessionSqlite(
        branch_code,
        terminal_code,
      );

      console.log("📦 Active Session Response:", session);

      return {
        success: true,
        session,
        isPreviousDay: session?.isPreviousDay || false,
      };
    } catch (error) {
      console.error("IPC: Failed to get active terminal session", error);

      return {
        success: false,
        error: error.message,
        session: null,
        isPreviousDay: false,
      };
    }
  },
);

ipcMain.handle(
  "get-last-closed-session",
  async (_, { branch_code, terminal_code }) => {
    try {
      const session = getLastClosedSessionSqlite(branch_code, terminal_code);
      return { success: true, session };
    } catch (error) {
      console.error("IPC: Failed to get last closed session", error);
      return { success: false, error: error.message, session: null };
    }
  },
);
