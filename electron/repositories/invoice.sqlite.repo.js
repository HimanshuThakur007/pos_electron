import { db } from "../database/sqlite.js";

const TABLE_NAME = "invoice_series";

/**
 * Create invoices table
 */
export const createInvoiceTable = () => {
  // Drop old tables to migrate to new schema
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(${TABLE_NAME})`).all();
    const hasDocType = tableInfo.some((col) => col.name === "doc_type");
    if (!hasDocType) {
      db.prepare(`DROP TABLE IF EXISTS ${TABLE_NAME}`).run();
      db.prepare(`DROP TABLE IF EXISTS invoice_sync_queue`).run();
    } else {
      const hasSyncStatus = tableInfo.some((col) => col.name === "sync_status");
      if (!hasSyncStatus) {
        db.prepare(
          `ALTER TABLE ${TABLE_NAME} ADD COLUMN sync_status INTEGER DEFAULT 0`,
        ).run();
      }
    }
  } catch (e) {}

  const sql = `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_code TEXT NOT NULL,
      terminal_code TEXT NOT NULL,
      fy_code TEXT,
      user_id INTEGER,
      current_number INTEGER DEFAULT 0,
      doc_type INTEGER DEFAULT 1,
      sync_status INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(branch_code, terminal_code, fy_code, user_id, doc_type)
    )
  `;

  db.prepare(sql).run();

  // Enforce unique index explicitly in case table was created earlier without it
  try {
    db.prepare(`DROP INDEX IF EXISTS idx_invoice_series_unique`).run();
    db.prepare(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_series_unique ON ${TABLE_NAME}(branch_code, terminal_code, fy_code, user_id, doc_type)`,
    ).run();
  } catch (e) {}

  // Cleanup: Delete accidental short fy_codes to force a fresh API fetch
  try {
    db.prepare(`DELETE FROM ${TABLE_NAME} WHERE LENGTH(fy_code) = 2`).run();
    db.prepare(`DELETE FROM ${TABLE_NAME} WHERE fy_code LIKE '%-%'`).run();
  } catch (e) {}

  // Auto-populate from historical transaction tables if empty
  try {
    const rowCount = db
      .prepare(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`)
      .get();
    if (rowCount && rowCount.count === 0) {
      const headTables = db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sl_head%'`,
        )
        .all();

      for (const t of headTables) {
        const rows = db
          .prepare(
            `
          SELECT 
            branch_code, 
            terminal_code, 
            fin_year as fy_code, 
            cashier_id as user_id, 
            CASE WHEN bill_no LIKE 'B%' THEN 3 ELSE 1 END as doc_type,
            MAX(
              CASE 
                WHEN bill_no LIKE '%-%' THEN CAST(SUBSTR(bill_no, INSTR(bill_no, '-') + 1) AS INTEGER)
                ELSE CAST(SUBSTR(bill_no, -6) AS INTEGER)
              END
            ) as max_num
          FROM ${t.name}
          GROUP BY branch_code, terminal_code, fin_year, cashier_id, CASE WHEN bill_no LIKE 'B%' THEN 3 ELSE 1 END
        `,
          )
          .all();

        for (const r of rows) {
          if (r.max_num > 0) {
            db.prepare(
              `
              INSERT INTO ${TABLE_NAME} 
          (branch_code, terminal_code, fy_code, user_id, current_number, doc_type, sync_status, updated_at)
          VALUES (@branch_code, @terminal_code, @fy_code, @user_id, @current_number, @doc_type, 1, CURRENT_TIMESTAMP)
            `,
            ).run({
              branch_code: String(r.branch_code || ""),
              terminal_code: String(r.terminal_code || ""),
              fy_code: String(r.fy_code || t.name.replace("sl_head", "")),
              user_id: Number(r.user_id || 0),
              current_number: Number(r.max_num),
              doc_type: Number(r.doc_type || 1),
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("❌ Auto-populate invoice_series Error:", e.message);
  }

  // Log row count and sample data
  try {
    const finalCount = db
      .prepare(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`)
      .get();
    console.log(`🧾 ${TABLE_NAME} Rows: ${finalCount ? finalCount.count : 0}`);
    // if (finalCount && finalCount.count > 0) {
    //   const sample = db.prepare(`SELECT * FROM ${TABLE_NAME} LIMIT 5`).all();
    //   console.log(`📄 Sample Data (${TABLE_NAME}):`, sample);
    // }
  } catch (err) {}
};

// Initialize table
createInvoiceTable();

/**
 * Update the running number on current_number
 */
export const updateInvoiceRunningNumber = (data) => {
  // console.log("updateInvoiceRunningNumber data:", data);
  try {
    const stmt = db.prepare(`
      INSERT INTO ${TABLE_NAME} 
      (branch_code, terminal_code, fy_code, user_id, current_number, doc_type, sync_status, updated_at)
      VALUES (@branch_code, @terminal_code, @fy_code, @user_id, @current_number, @doc_type, @sync_status, CURRENT_TIMESTAMP)
      ON CONFLICT(branch_code, terminal_code, fy_code, user_id, doc_type) 
      DO UPDATE SET 
        current_number = MAX(invoice_series.current_number, excluded.current_number),
        sync_status = CASE 
          WHEN excluded.current_number >= invoice_series.current_number THEN excluded.sync_status
          ELSE invoice_series.sync_status 
        END,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run({
      branch_code: String(data.branch_code || ""),
      terminal_code: String(data.terminal_code || ""),
      fy_code: String(data.fy_code || ""),
      user_id: Number(data.user_id || 0),
      current_number: Number(data.current_number || 0),
      doc_type: Number(data.doc_type || 1),
      sync_status:
        data.sync_status !== undefined ? Number(data.sync_status) : 0,
    });
    return true;
  } catch (err) {
    console.error("❌ Update Invoice Running Number Error:", err.message);
    return false;
  }
};

/**
 * Get the current running number
 */
export const getCurrentInvoiceNumber = (filters = {}) => {
  try {
    const { branch_code, terminal_code, fy_code, user_id, isB2B, doc_type } =
      filters;
    const filterDocType = doc_type || (isB2B ? 2 : 1);

    let query = `SELECT current_number FROM ${TABLE_NAME} WHERE doc_type = ?`;
    const params = [filterDocType];

    if (branch_code) {
      query += ` AND branch_code = ?`;
      params.push(branch_code);
    }
    if (terminal_code) {
      query += ` AND terminal_code = ?`;
      params.push(terminal_code);
    }
    if (fy_code) {
      query += ` AND fy_code = ?`;
      params.push(fy_code);
    }
    if (user_id !== undefined && user_id !== null && user_id !== "") {
      query += ` AND user_id = ?`;
      params.push(Number(user_id));
    }

    const row = db.prepare(query).get(...params);
    return row ? row.current_number : 0;
  } catch (err) {
    console.error("❌ Get Current Invoice Number Error:", err.message);
    return 0;
  }
};

/**
 * Get all invoice series for a financial year
 */
export const getAllInvoiceSeries = (fy_code) => {
  try {
    let query = `SELECT * FROM ${TABLE_NAME}`;
    const params = [];
    if (fy_code) {
      query += ` WHERE fy_code = ?`;
      params.push(String(fy_code));
    }
    return db.prepare(query).all(...params);
  } catch (err) {
    console.error("❌ Get All Invoice Series Error:", err.message);
    return [];
  }
};

/**
 * For frontend compatibility: use the current_number to return a mock invoice object
 */
export const getLastSyncedInvoiceSqlite = (filters = {}) => {
  try {
    const user_id = filters.user_id || filters.cashier_id;
    const filterDocType = filters.doc_type || (filters.isB2B ? 2 : 1);

    let query = `SELECT current_number FROM ${TABLE_NAME} WHERE doc_type = ? AND sync_status = 1`;
    const params = [filterDocType];

    if (filters.branch_code) {
      query += ` AND branch_code = ?`;
      params.push(filters.branch_code);
    }
    if (filters.terminal_code) {
      query += ` AND terminal_code = ?`;
      params.push(filters.terminal_code);
    }
    if (filters.fy_code) {
      query += ` AND fy_code = ?`;
      params.push(filters.fy_code);
    }
    if (user_id !== undefined && user_id !== null && user_id !== "") {
      query += ` AND user_id = ?`;
      params.push(Number(user_id));
    }

    const row = db.prepare(query).get(...params);

    if (row && row.current_number > 0) {
      return {
        bill_no: `SYNC-${String(row.current_number).padStart(6, "0")}`,
        current_number: row.current_number,
      };
    }
    return null;
  } catch (err) {
    console.error("❌ Get Last Synced Invoice Error:", err.message);
    return null;
  }
};

export const clearInvoicesSqlite = () => {
  try {
    db.prepare(`DELETE FROM ${TABLE_NAME}`).run();
  } catch (err) {
    console.error("❌ Clear Invoices Error:", err.message);
  }
};

// --- STUBS FOR LEGACY COMPATIBILITY ---
// Kept to prevent crashes if other legacy sync files still import them
export const insertInvoiceSqlite = (invoice) => {
  try {
    let current_number = invoice.current_number || 0;
    if (!current_number && invoice.bill_no) {
      if (invoice.bill_no.includes("-")) {
        current_number = parseInt(invoice.bill_no.split("-")[1], 10);
      } else if (invoice.bill_no.length >= 6) {
        current_number = parseInt(invoice.bill_no.slice(-6), 10);
      }
    }
    if (current_number > 0) {
      const isB2B = invoice.bill_no?.startsWith("B");
      updateInvoiceRunningNumber({
        branch_code: invoice.branch_code,
        terminal_code: invoice.terminal_code,
        fy_code: invoice.fy_code || invoice.financial_year || "",
        user_id: invoice.cashier_id || invoice.user_id,
        current_number,
        doc_type: invoice.doc_type || (isB2B ? 2 : 1),
        sync_status: 0, // Unsynced local invoice start as pending
      });
    }
    return true;
  } catch (err) {
    return false;
  }
};

export const insertSyncedInvoiceSqlite = (invoice) => {
  try {
    let current_number = invoice.current_number || 0;
    if (!current_number && invoice.bill_no) {
      if (invoice.bill_no.includes("-")) {
        current_number = parseInt(invoice.bill_no.split("-")[1], 10);
      } else if (invoice.bill_no.length >= 6) {
        current_number = parseInt(invoice.bill_no.slice(-6), 10);
      }
    }
    if (current_number >= 0) {
      const isB2B = invoice.bill_no?.startsWith("B");
      updateInvoiceRunningNumber({
        branch_code: invoice.branch_code,
        terminal_code: invoice.terminal_code,
        fy_code: invoice.fy_code || invoice.financial_year || "",
        user_id: invoice.cashier_id || invoice.user_id,
        current_number,
        doc_type: invoice.doc_type || (isB2B ? 2 : 1),
        sync_status:
          invoice.sync_status !== undefined ? invoice.sync_status : 1,
      });
    }
    return true;
  } catch (err) {
    return false;
  }
};
export const getPendingInvoices = (limit = 50) => {
  try {
    return db
      .prepare(`SELECT * FROM ${TABLE_NAME} WHERE sync_status = 0 LIMIT ?`)
      .all(limit);
  } catch (err) {
    return [];
  }
};
export const markInvoiceSynced = (id) => {
  try {
    db.prepare(
      `UPDATE ${TABLE_NAME} SET sync_status = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ).run(id);
  } catch (err) {}
};
export const incrementInvoiceSyncAttempts = () => {};
export const getInvoiceCountSqlite = (doc_type = 1) => {
  try {
    const result = db
      .prepare(`SELECT COUNT(*) as count FROM ${TABLE_NAME} WHERE doc_type = ?`)
      .get(doc_type);
    return result ? result.count : 0;
  } catch (err) {
    return 0;
  }
};
export const resetFailedInvoices = () => {};

// import { db } from "../database/sqlite.js";

// const TABLE_NAME = "invoices";

// /**
//  * Create invoices table
//  */
// export const createInvoiceTable = () => {
//   const sql = `
//     CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
//       bill_no TEXT PRIMARY KEY,
//       branch_code TEXT NOT NULL,
//       terminal_code TEXT NOT NULL,
//       cashier_id INTEGER,
//       time TEXT,
//       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//       sync_status INTEGER DEFAULT 0,
//       sync_attempts INTEGER DEFAULT 0,
//       synced_at DATETIME
//     )
//   `;

//   db.prepare(sql).run();

//   // performance indexes
//   db.prepare(`CREATE INDEX IF NOT EXISTS idx_sync_status ON ${TABLE_NAME}(sync_status)`).run();
//   db.prepare(`CREATE INDEX IF NOT EXISTS idx_created_at ON ${TABLE_NAME}(created_at)`).run();
//   db.prepare(`CREATE INDEX IF NOT EXISTS idx_branch_terminal ON ${TABLE_NAME}(branch_code, terminal_code)`).run();
// };

// /**
//  * Insert invoice safely (duplicate safe)
//  */
// const insertInvoiceStmt = db.prepare(`
//   INSERT OR IGNORE INTO ${TABLE_NAME}
//   (bill_no, branch_code, terminal_code, cashier_id, time)
//   VALUES (@bill_no, @branch_code, @terminal_code, @cashier_id, @time)
// `);

// export const insertInvoiceSqlite = (invoice) => {
//   try {
//     insertInvoiceStmt.run(invoice);
//     return true;
//   } catch (err) {
//     console.error("❌ Insert Invoice Error:", err.message);
//     return false;
//   }
// };

// const insertSyncedInvoiceStmt = db.prepare(`
//   INSERT OR REPLACE INTO ${TABLE_NAME}
//   (bill_no, branch_code, terminal_code, cashier_id, time, created_at, sync_status, synced_at)
//   VALUES (@bill_no, @branch_code, @terminal_code, @cashier_id, @time, @created_at, 1, CURRENT_TIMESTAMP)
// `);

// export const insertSyncedInvoiceSqlite = (invoice) => {
//   try {
//     insertSyncedInvoiceStmt.run({
//       ...invoice,
//       created_at: invoice.created_at || new Date().toISOString()
//     });
//     return true;
//   } catch (err) {
//     console.error("❌ Insert Synced Invoice Error:", err.message);
//     return false;
//   }
// };

// /**
//  * Get pending invoices for sync
//  * ✔ retry limit protection
//  * ✔ oldest first
//  * ✔ optional branch filtering
//  */
// export const getPendingInvoices = (
//   limit = 50,
//   branchCode = null,
//   terminalCode = null
// ) => {
//   let query = `
//     SELECT *
//     FROM ${TABLE_NAME}
//     WHERE sync_status = 0
//     AND sync_attempts < 5
//   `;

//   const params = [];

//   if (branchCode) {
//     query += " AND branch_code = ?";
//     params.push(branchCode);
//   }

//   if (terminalCode) {
//     query += " AND terminal_code = ?";
//     params.push(terminalCode);
//   }

//   query += " ORDER BY created_at ASC LIMIT ?";
//   params.push(limit);

//   return db.prepare(query).all(...params);
// };

// /**
//  * Mark invoice as synced
//  */
// const markSyncedStmt = db.prepare(`
//   UPDATE ${TABLE_NAME}
//   SET sync_status = 1,
//       synced_at = CURRENT_TIMESTAMP
//   WHERE bill_no = ?
// `);
// export const markInvoiceSynced = (bill_no) => {
//   markSyncedStmt.run(bill_no);
// };

// /**
//  * Increment retry attempts
//  */
// const incAttemptsStmt = db.prepare(`
//   UPDATE ${TABLE_NAME}
//   SET sync_attempts = sync_attempts + 1
//   WHERE bill_no = ?
// `);
// export const incrementInvoiceSyncAttempts = (bill_no) => {
//   incAttemptsStmt.run(bill_no);
// };

// const getCountStmt = db.prepare(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`);
// export const getInvoiceCountSqlite = () => {
//   const result = getCountStmt.get();
//   return result ? result.count : 0;
// };

// export const getLastSyncedInvoiceSqlite = (filters = {}) => {
//   try {
//     let query = `SELECT * FROM ${TABLE_NAME} WHERE sync_status = 1`;
//     const conditions = [];
//     const params = [];

//     const searchFilters = filters || {};

//     if (searchFilters.branch_code) {
//       conditions.push("branch_code = ?");
//       params.push(searchFilters.branch_code);
//     }
//     if (searchFilters.terminal_code) {
//       conditions.push("terminal_code = ?");
//       params.push(searchFilters.terminal_code);
//     }
//     if (searchFilters.user_id !== undefined && searchFilters.user_id !== null && searchFilters.user_id !== "") {
//       conditions.push("cashier_id = ?");
//       params.push(searchFilters.user_id);
//     } else if (searchFilters.cashier_id !== undefined && searchFilters.cashier_id !== null && searchFilters.cashier_id !== "") {
//       conditions.push("cashier_id = ?");
//       params.push(searchFilters.cashier_id);
//     }

//     if (conditions.length > 0) {
//       query += ` AND ${conditions.join(" AND ")}`;
//     }

//     query += " ORDER BY bill_no DESC LIMIT 1";

//     return db.prepare(query).get(...params);
//   } catch (err) {
//     console.error("❌ Get Last Synced Invoice Error:", err.message);
//     return null;
//   }
// };

// /**
//  * Reset stuck invoices (optional maintenance)
//  */
// const resetFailedStmt = db.prepare(`
//   UPDATE ${TABLE_NAME}
//   SET sync_attempts = 0
//   WHERE sync_attempts >= 5
// `);
// export const resetFailedInvoices = () => {
//   resetFailedStmt.run();
// };

// const clearInvoicesStmt = db.prepare(`DELETE FROM ${TABLE_NAME}`);
// export const clearInvoicesSqlite = () => {
//   try {
//     clearInvoicesStmt.run();
//   } catch (err) {
//     console.error("❌ Clear Invoices Error:", err.message);
//   }
// };

// // Initialize table
// createInvoiceTable();

// const clearInvoicesStmt = db.prepare(`DELETE FROM ${TABLE_NAME}`);
// export const clearInvoicesSqlite = () => {
//   try {
//     clearInvoicesStmt.run();
//   } catch (err) {
//     console.error("❌ Clear Invoices Error:", err.message);
//   }
// };

// // Initialize table
// createInvoiceTable();
