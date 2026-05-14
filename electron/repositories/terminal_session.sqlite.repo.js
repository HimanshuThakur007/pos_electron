// import { db } from "../database/sqlite.js";

// const TABLE_NAME = "terminal_sessions";

// const formatDatesToIST = (session) => {
//   if (!session) return null;

//   const toIST = (dateStr) => {
//     if (!dateStr) return dateStr;
//     // SQLite datetime returns "YYYY-MM-DD HH:MM:SS" in UTC. Append 'Z' to parse correctly.
//     let isoStr = dateStr;
//     if (
//       typeof dateStr === "string" &&
//       !dateStr.includes("T") &&
//       !dateStr.endsWith("Z")
//     ) {
//       isoStr = dateStr.replace(" ", "T") + "Z";
//     }
//     const d = new Date(isoStr);
//     if (isNaN(d.getTime())) return dateStr;

//     const parts = new Intl.DateTimeFormat("en-IN", {
//       timeZone: "Asia/Kolkata",
//       year: "numeric",
//       month: "2-digit",
//       day: "2-digit",
//       hour: "2-digit",
//       minute: "2-digit",
//       second: "2-digit",
//       hour12: true,
//     }).formatToParts(d);

//     const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";
//     const ampm = (
//       parts.find((p) => p.type === "dayPeriod")?.value || ""
//     ).toUpperCase();

//     return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")}:${get("second")} ${ampm}`.trim();
//   };

//   return {
//     ...session,
//     raw_opened_at: session.opened_at,
//     raw_closed_at: session.closed_at,
//     created_at: toIST(session.created_at),
//     updated_at: toIST(session.updated_at),
//     opened_at: toIST(session.opened_at),
//     closed_at: toIST(session.closed_at),
//   };
// };

// /**
//  * Initialize the terminal sessions table
//  */
// export const createTerminalSessionTable = () => {
//   try {
//     db.prepare(
//       `
//       CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         user_id INTEGER NOT NULL,
//         terminal_id INTEGER,
//         branch_code TEXT NOT NULL,
//         terminal_code TEXT NOT NULL,
//         opening_amount REAL NOT NULL DEFAULT 0,
//         closing_amount REAL,
//         expected_amount REAL,
//         difference REAL,
//         status TEXT NOT NULL DEFAULT 'open',
//         opened_at TEXT,
//         closed_at TEXT,
//         notes TEXT,
//         created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//         updated_at TEXT DEFAULT CURRENT_TIMESTAMP
//       )
//     `,
//     ).run();

//     // Migration: Add new columns if they don't exist
//     const addCol = (col, type) => {
//       try {
//         db.prepare(`ALTER TABLE ${TABLE_NAME} ADD COLUMN ${col} ${type}`).run();
//       } catch (e) {}
//     };
//     addCol("shift_id", "INTEGER");
//     addCol("sync_status", "INTEGER DEFAULT 0");

//     // Create performance indexes based on the requested keys
//     db.prepare(
//       `CREATE INDEX IF NOT EXISTS idx_ts_user_id ON ${TABLE_NAME}(user_id)`,
//     ).run();
//     db.prepare(
//       `CREATE INDEX IF NOT EXISTS idx_ts_terminal_id ON ${TABLE_NAME}(terminal_id)`,
//     ).run();
//     db.prepare(
//       `CREATE INDEX IF NOT EXISTS idx_ts_status ON ${TABLE_NAME}(status)`,
//     ).run();

//     console.log(`✅ ${TABLE_NAME} Table Initialized.`);

//     // Log row count and sample data
//     try {
//       const rowCount = db
//         .prepare(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`)
//         .get();
//       console.log(`🧾 ${TABLE_NAME} Rows: ${rowCount ? rowCount.count : 0}`);
//       if (rowCount && rowCount.count > 0) {
//         const sample = db
//           .prepare(`SELECT * FROM ${TABLE_NAME} ORDER BY id DESC LIMIT 2`)
//           .all();
//         console.log(
//           `📄 Sample Data (${TABLE_NAME}):`,
//           sample.map(formatDatesToIST),
//         );
//       }
//     } catch (e) {}
//   } catch (err) {
//     console.error(`❌ Create ${TABLE_NAME} Table Error:`, err.message);
//   }
// };

// // Initialize table on import
// createTerminalSessionTable();

// /**
//  * Open a new terminal session
//  */
// export const openTerminalSessionSqlite = (data) => {
//   try {
//     const stmt = db.prepare(`
//       INSERT INTO ${TABLE_NAME} (
//         shift_id, user_id, terminal_id, branch_code, terminal_code,
//         opening_amount, status, opened_at, notes, sync_status, created_at, updated_at
//       ) VALUES (
//         @shift_id, @user_id, @terminal_id, @branch_code, @terminal_code,
//         @opening_amount, @status, @opened_at, @notes, @sync_status, @created_at, @updated_at
//       )
//     `);

//     const payload = {
//       shift_id: data.shift_id || data.id || null,
//       user_id: data.user_id,
//       terminal_id: data.terminal_id || null,
//       branch_code: String(data.branch_code || "").trim(),
//       terminal_code: String(data.terminal_code || "").trim(),
//       opening_amount: data.opening_amount || 0,
//       status: data.status || "open",
//       opened_at: data.opened_at || new Date().toISOString(),
//       notes: data.notes,
//       sync_status: data.sync_status !== undefined ? data.sync_status : 0,
//       created_at: data.created_at || new Date().toISOString(),
//       updated_at: data.updated_at || new Date().toISOString(),
//     };

//     console.log("💾 Inserting Session to Local DB:", payload);
//     const info = stmt.run(payload);

//     return info.lastInsertRowid;
//   } catch (err) {
//     console.error("❌ Open Terminal Session Error:", err.message);
//     throw err;
//   }
// };

// export const getPendingTerminalSessions = () => {
//   try {
//     return db
//       .prepare(
//         `SELECT * FROM ${TABLE_NAME} WHERE sync_status IN (0, 2) ORDER BY id ASC`,
//       )
//       .all();
//   } catch (err) {
//     return [];
//   }
// };

// export const markTerminalSessionSynced = (id, serverShift) => {
//   if (!serverShift || !serverShift.id) return;
//   try {
//     const params = {
//       id,
//       shift_id: serverShift.id,
//       terminal_id: serverShift.terminal_id || null,
//     };
//     db.prepare(
//       `UPDATE ${TABLE_NAME} SET
//         sync_status = CASE WHEN status = 'closed' THEN 2 ELSE 1 END,
//         shift_id = @shift_id,
//         terminal_id = COALESCE(@terminal_id, terminal_id),
//         updated_at = CURRENT_TIMESTAMP
//       WHERE id = @id`,
//     ).run(params);
//   } catch (err) {
//     console.error("❌ markTerminalSessionSynced Error:", err.message);
//   }
// };

// export const markTerminalSessionFullySynced = (id) => {
//   try {
//     db.prepare(
//       `UPDATE ${TABLE_NAME} SET sync_status = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
//     ).run(id);
//   } catch (err) {
//     console.error("❌ markTerminalSessionFullySynced Error:", err.message);
//   }
// };

// /**
//  * Close an active terminal session
//  */
// export const closeTerminalSessionSqlite = (id, data) => {
//   try {
//     const stmt = db.prepare(`
//       UPDATE ${TABLE_NAME} SET
//         closing_amount = @closing_amount,
//         expected_amount = @expected_amount,
//         difference = @difference,
//         notes = COALESCE(@notes, notes),
//         status = 'closed',
//         closed_at = datetime('now'),
//         updated_at = datetime('now'),
//         sync_status = CASE WHEN sync_status = 0 THEN 0 ELSE @sync_status END
//       WHERE id = @id
//     `);

//     stmt.run({
//       id: id,
//       closing_amount: data.closing_amount || 0,
//       expected_amount: data.expected_amount || 0,
//       difference: data.difference || 0,
//       notes: data.notes,
//       sync_status: data.sync_status !== undefined ? data.sync_status : 2,
//     });

//     return true;
//   } catch (err) {
//     console.error("❌ Close Terminal Session Error:", err.message);
//     return false;
//   }
// };

// /**
//  * Get the currently active open session for a specific terminal
//  */
// export const getActiveTerminalSessionSqlite = (branch_code, terminal_code) => {
//   try {
//     const bCode = String(branch_code || "")
//       .trim()
//       .toLowerCase();
//     const tCode = String(terminal_code || "")
//       .trim()
//       .toLowerCase();

//     const session = db
//       .prepare(
//         `
//       SELECT * FROM ${TABLE_NAME}
//       WHERE LOWER(TRIM(CAST(branch_code AS TEXT))) = ?
//         AND LOWER(TRIM(CAST(terminal_code AS TEXT))) = ?
//         AND LOWER(TRIM(CAST(status AS TEXT))) = 'open'
//       ORDER BY id DESC LIMIT 1
//     `,
//       )
//       .get(bCode, tCode);

//     console.log(
//       `🔍 Fetched Active Session Data [Branch: '${branch_code}', Terminal: '${terminal_code}']:`,
//       session ? "FOUND" : "UNDEFINED",
//     );
//     return formatDatesToIST(session);
//   } catch (err) {
//     console.error("❌ Get Active Terminal Session Error:", err.message);
//     return null;
//   }
// };

// /**
//  * Clear all terminal sessions (used for database reset)
//  */
// export const clearTerminalSessionsSqlite = () => {
//   try {
//     db.prepare(`DELETE FROM ${TABLE_NAME}`).run();
//     db.prepare(`DELETE FROM sqlite_sequence WHERE name='${TABLE_NAME}'`).run();
//     console.log(`✅ ${TABLE_NAME} Cleared.`);
//   } catch (err) {
//     console.error(`❌ Clear ${TABLE_NAME} Error:`, err.message);
//   }
// };

// /**
//  * Get the last closed session for a specific terminal
//  */
// export const getLastClosedSessionSqlite = (branch_code, terminal_code) => {
//   try {
//     const bCode = String(branch_code || "")
//       .trim()
//       .toLowerCase();
//     const tCode = String(terminal_code || "")
//       .trim()
//       .toLowerCase();

//     const session = db
//       .prepare(
//         `
//       SELECT * FROM ${TABLE_NAME}
//       WHERE LOWER(TRIM(CAST(branch_code AS TEXT))) = ?
//         AND LOWER(TRIM(CAST(terminal_code AS TEXT))) = ?
//         AND LOWER(TRIM(CAST(status AS TEXT))) = 'closed'
//       ORDER BY closed_at DESC, id DESC LIMIT 1
//     `,
//       )
//       .get(bCode, tCode);
//     return formatDatesToIST(session);
//   } catch (err) {
//     console.error("❌ Get Last Closed Session Error:", err.message);
//     return null;
//   }
// };

import { db } from "../database/sqlite.js";

const TABLE_NAME = "terminal_sessions";

// ======================================================
// FORMAT DATES TO IST
// ======================================================

const formatDatesToIST = (session) => {
  if (!session) return null;

  const toIST = (dateStr) => {
    if (!dateStr) return dateStr;

    let isoStr = dateStr;

    // SQLite datetime fix
    if (
      typeof dateStr === "string" &&
      !dateStr.includes("T") &&
      !dateStr.endsWith("Z")
    ) {
      isoStr = dateStr.replace(" ", "T") + "Z";
    }

    const d = new Date(isoStr);

    if (isNaN(d.getTime())) {
      return dateStr;
    }

    const parts = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).formatToParts(d);

    const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";

    const ampm = (
      parts.find((p) => p.type === "dayPeriod")?.value || ""
    ).toUpperCase();

    return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")}:${get("second")} ${ampm}`.trim();
  };

  return {
    ...session,

    // RAW UTC VALUES
    raw_opened_at: session.opened_at,
    raw_closed_at: session.closed_at,

    // IST DISPLAY VALUES
    created_at: toIST(session.created_at),
    updated_at: toIST(session.updated_at),
    opened_at: toIST(session.opened_at),
    closed_at: toIST(session.closed_at),
  };
};

// ======================================================
// CREATE TABLE
// ======================================================

export const createTerminalSessionTable = () => {
  try {
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_id INTEGER,
        user_id INTEGER NOT NULL,
        terminal_id INTEGER,
        branch_code TEXT NOT NULL,
        terminal_code TEXT NOT NULL,
        opening_amount REAL NOT NULL DEFAULT 0,
        closing_amount REAL,
        expected_amount REAL,
        difference REAL,
        status TEXT NOT NULL DEFAULT 'open',
        opened_at TEXT,
        closed_at TEXT,
        notes TEXT,
        sync_status INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `,
    ).run();

    // =========================================
    // SAFE MIGRATIONS
    // =========================================

    const addColumn = (column, type) => {
      try {
        db.prepare(
          `ALTER TABLE ${TABLE_NAME} ADD COLUMN ${column} ${type}`,
        ).run();
      } catch (e) {}
    };

    addColumn("shift_id", "INTEGER");
    addColumn("sync_status", "INTEGER DEFAULT 0");

    // =========================================
    // INDEXES
    // =========================================

    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_ts_user_id ON ${TABLE_NAME}(user_id)`,
    ).run();

    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_ts_terminal_id ON ${TABLE_NAME}(terminal_id)`,
    ).run();

    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_ts_status ON ${TABLE_NAME}(status)`,
    ).run();

    console.log(`✅ ${TABLE_NAME} Table Initialized`);

    // =========================================
    // DEBUG LOGS
    // =========================================

    try {
      const rowCount = db
        .prepare(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`)
        .get();

      console.log(`🧾 ${TABLE_NAME} Rows:`, rowCount?.count || 0);

      if (rowCount?.count > 0) {
        const sample = db
          .prepare(`SELECT * FROM ${TABLE_NAME} ORDER BY id DESC LIMIT 2`)
          .all();

        console.log(`📄 Sample ${TABLE_NAME}:`, sample.map(formatDatesToIST));
      }
    } catch (e) {}
  } catch (err) {
    console.error(`❌ Create ${TABLE_NAME} Table Error:`, err.message);
  }
};

// ======================================================
// INIT TABLE
// ======================================================

createTerminalSessionTable();

// ======================================================
// OPEN SESSION
// ======================================================

export const openTerminalSessionSqlite = (data) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO ${TABLE_NAME} (
        shift_id,
        user_id,
        terminal_id,
        branch_code,
        terminal_code,
        opening_amount,
        status,
        opened_at,
        notes,
        sync_status,
        created_at,
        updated_at
      )
      VALUES (
        @shift_id,
        @user_id,
        @terminal_id,
        @branch_code,
        @terminal_code,
        @opening_amount,
        @status,
        @opened_at,
        @notes,
        @sync_status,
        @created_at,
        @updated_at
      )
    `);

    const now = new Date().toISOString();

    const payload = {
      shift_id: data.shift_id || data.id || null,
      user_id: data.user_id,
      terminal_id: data.terminal_id || null,
      branch_code: String(data.branch_code || "").trim(),
      terminal_code: String(data.terminal_code || "").trim(),
      opening_amount: Number(data.opening_amount || 0),
      status: data.status || "open",
      opened_at: data.opened_at || now,
      notes: data.notes || null,
      sync_status: data.sync_status !== undefined ? data.sync_status : 0,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    };

    console.log("💾 Inserting Session:", payload);

    const info = stmt.run(payload);

    return info.lastInsertRowid;
  } catch (err) {
    console.error("❌ Open Terminal Session Error:", err.message);

    throw err;
  }
};

// ======================================================
// GET PENDING SESSIONS
// ======================================================

export const getPendingTerminalSessions = () => {
  try {
    return db
      .prepare(
        `
        SELECT *
        FROM ${TABLE_NAME}
        WHERE sync_status IN (0, 2)
        ORDER BY id ASC
      `,
      )
      .all();
  } catch (err) {
    console.error("❌ getPendingTerminalSessions Error:", err.message);

    return [];
  }
};

// ======================================================
// MARK SESSION SYNCED
// ======================================================

export const markTerminalSessionSynced = (id, serverShift) => {
  if (!serverShift || !serverShift.id) {
    return;
  }

  try {
    db.prepare(
      `
      UPDATE ${TABLE_NAME}
      SET
        sync_status = CASE
          WHEN status = 'closed' THEN 2
          ELSE 1
        END,
        shift_id = ?,
        terminal_id = COALESCE(?, terminal_id),
        updated_at = ?
      WHERE id = ?
    `,
    ).run(
      serverShift.id,
      serverShift.terminal_id || null,
      new Date().toISOString(),
      id,
    );

    console.log("✅ Terminal Session Synced:", id);
  } catch (err) {
    console.error("❌ markTerminalSessionSynced Error:", err.message);
  }
};

// ======================================================
// FULLY SYNCED
// ======================================================

export const markTerminalSessionFullySynced = (id) => {
  try {
    db.prepare(
      `
      UPDATE ${TABLE_NAME}
      SET
        sync_status = 1,
        updated_at = ?
      WHERE id = ?
    `,
    ).run(new Date().toISOString(), id);

    console.log("✅ Terminal Session Fully Synced:", id);
  } catch (err) {
    console.error("❌ markTerminalSessionFullySynced Error:", err.message);
  }
};

// ======================================================
// CLOSE SESSION
// ======================================================

export const closeTerminalSessionSqlite = (id, data) => {
  try {
    const stmt = db.prepare(`
      UPDATE ${TABLE_NAME}
      SET
        closing_amount = @closing_amount,
        expected_amount = @expected_amount,
        difference = @difference,
        notes = COALESCE(@notes, notes),
        status = 'closed',
        closed_at = @closed_at,
        updated_at = @updated_at,
        sync_status = CASE
          WHEN sync_status = 0 THEN 0
          ELSE @sync_status
        END
      WHERE id = @id
    `);

    stmt.run({
      id,
      closing_amount: Number(data.closing_amount || 0),
      expected_amount: Number(data.expected_amount || 0),
      difference: Number(data.difference || 0),
      notes: data.notes || null,
      sync_status: data.sync_status !== undefined ? data.sync_status : 2,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    console.log("✅ Terminal Session Closed:", id);

    return true;
  } catch (err) {
    console.error("❌ Close Terminal Session Error:", err.message);

    return false;
  }
};

// ======================================================
// GET ACTIVE SESSION
// ======================================================

export const getActiveTerminalSessionSqlite = (branch_code, terminal_code) => {
  try {
    const bCode = String(branch_code || "")
      .trim()
      .toLowerCase();

    const tCode = String(terminal_code || "")
      .trim()
      .toLowerCase();

    const session = db
      .prepare(
        `
        SELECT *
        FROM ${TABLE_NAME}
        WHERE LOWER(TRIM(CAST(branch_code AS TEXT))) = ?
          AND LOWER(TRIM(CAST(terminal_code AS TEXT))) = ?
          AND LOWER(TRIM(CAST(status AS TEXT))) = 'open'
        ORDER BY id DESC
        LIMIT 1
      `,
      )
      .get(bCode, tCode);

    console.log(
      `🔍 Active Session [${branch_code}/${terminal_code}]:`,
      session ? "FOUND" : "NOT FOUND",
    );

    if (!session) {
      return null;
    }

    // ==========================================
    // PREVIOUS DAY CHECK
    // ==========================================

    let openedDate = new Date(session.opened_at);

    if (
      typeof session.opened_at === "string" &&
      !session.opened_at.includes("T")
    ) {
      openedDate = new Date(session.opened_at.replace(" ", "T") + "Z");
    }

    const now = new Date();

    const openedDay = new Date(
      openedDate.getFullYear(),
      openedDate.getMonth(),
      openedDate.getDate(),
    ).getTime();

    const todayDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();

    const isPreviousDay = openedDay < todayDay;

    console.log("🕒 Previous Day Check:", {
      opened_at: session.opened_at,
      isPreviousDay,
    });

    return formatDatesToIST({
      ...session,
      isPreviousDay,
    });
  } catch (err) {
    console.error("❌ Get Active Terminal Session Error:", err.message);

    return null;
  }
};

// ======================================================
// CLEAR TABLE
// ======================================================

export const clearTerminalSessionsSqlite = () => {
  try {
    db.prepare(`DELETE FROM ${TABLE_NAME}`).run();

    db.prepare(`DELETE FROM sqlite_sequence WHERE name='${TABLE_NAME}'`).run();

    console.log(`✅ ${TABLE_NAME} Cleared`);
  } catch (err) {
    console.error(`❌ Clear ${TABLE_NAME} Error:`, err.message);
  }
};

// ======================================================
// LAST CLOSED SESSION
// ======================================================

export const getLastClosedSessionSqlite = (branch_code, terminal_code) => {
  try {
    const bCode = String(branch_code || "")
      .trim()
      .toLowerCase();

    const tCode = String(terminal_code || "")
      .trim()
      .toLowerCase();

    const session = db
      .prepare(
        `
        SELECT *
        FROM ${TABLE_NAME}
        WHERE LOWER(TRIM(CAST(branch_code AS TEXT))) = ?
          AND LOWER(TRIM(CAST(terminal_code AS TEXT))) = ?
          AND LOWER(TRIM(CAST(status AS TEXT))) = 'closed'
        ORDER BY closed_at DESC, id DESC
        LIMIT 1
      `,
      )
      .get(bCode, tCode);

    return formatDatesToIST(session);
  } catch (err) {
    console.error("❌ Get Last Closed Session Error:", err.message);

    return null;
  }
};
