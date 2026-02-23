import { db } from "../database/sqlite.js";

const TABLE_NAME = "invoice_series";

/**
 * Create invoices table
 */
export const createInvoiceTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      bill_no TEXT PRIMARY KEY,
      branch_code TEXT NOT NULL,
      terminal_code TEXT NOT NULL,
      cashier_id INTEGER,
      time TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status INTEGER DEFAULT 0,
      sync_attempts INTEGER DEFAULT 0,
      synced_at DATETIME
    )
  `;

  db.prepare(sql).run();

  // performance indexes
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_sync_status ON ${TABLE_NAME}(sync_status)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_created_at ON ${TABLE_NAME}(created_at)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_branch_terminal ON ${TABLE_NAME}(branch_code, terminal_code)`).run();
};

// Initialize table
createInvoiceTable();

/**
 * Insert invoice safely (duplicate safe)
 */
const insertInvoiceStmt = db.prepare(`
  INSERT OR IGNORE INTO ${TABLE_NAME}
  (bill_no, branch_code, terminal_code, cashier_id, time)
  VALUES (@bill_no, @branch_code, @terminal_code, @cashier_id, @time)
`);

export const insertInvoiceSqlite = (invoice) => {
  try {
    insertInvoiceStmt.run(invoice);
    return true;
  } catch (err) {
    console.error("❌ Insert Invoice Error:", err.message);
    return false;
  }
};

const insertSyncedInvoiceStmt = db.prepare(`
  INSERT OR REPLACE INTO ${TABLE_NAME}
  (bill_no, branch_code, terminal_code, cashier_id, time, created_at, sync_status, synced_at)
  VALUES (@bill_no, @branch_code, @terminal_code, @cashier_id, @time, @created_at, 1, CURRENT_TIMESTAMP)
`);

export const insertSyncedInvoiceSqlite = (invoice) => {
  try {
    insertSyncedInvoiceStmt.run({
      ...invoice,
      created_at: invoice.created_at || new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error("❌ Insert Synced Invoice Error:", err.message);
    return false;
  }
};

/**
 * Get pending invoices for sync
 * ✔ retry limit protection
 * ✔ oldest first
 * ✔ optional branch filtering
 */
export const getPendingInvoices = (
  limit = 50,
  branchCode = null,
  terminalCode = null
) => {
  let query = `
    SELECT *
    FROM ${TABLE_NAME}
    WHERE sync_status = 0
    AND sync_attempts < 5
  `;

  const params = [];

  if (branchCode) {
    query += " AND branch_code = ?";
    params.push(branchCode);
  }

  if (terminalCode) {
    query += " AND terminal_code = ?";
    params.push(terminalCode);
  }

  query += " ORDER BY created_at ASC LIMIT ?";
  params.push(limit);

  return db.prepare(query).all(...params);
};

/**
 * Mark invoice as synced
 */
const markSyncedStmt = db.prepare(`
  UPDATE ${TABLE_NAME}
  SET sync_status = 1,
      synced_at = CURRENT_TIMESTAMP
  WHERE bill_no = ?
`);
export const markInvoiceSynced = (bill_no) => {
  markSyncedStmt.run(bill_no);
};

/**
 * Increment retry attempts
 */
const incAttemptsStmt = db.prepare(`
  UPDATE ${TABLE_NAME}
  SET sync_attempts = sync_attempts + 1
  WHERE bill_no = ?
`);
export const incrementInvoiceSyncAttempts = (bill_no) => {
  incAttemptsStmt.run(bill_no);
};

const getCountStmt = db.prepare(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`);
export const getInvoiceCountSqlite = () => {
  const result = getCountStmt.get();
  return result ? result.count : 0;
};

export const getLastSyncedInvoiceSqlite = (filters = {}) => {
  try {
    let query = `SELECT * FROM ${TABLE_NAME} WHERE sync_status = 1`;
    const conditions = [];
    const params = [];

    const searchFilters = filters || {};

    if (searchFilters.branch_code) {
      conditions.push("branch_code = ?");
      params.push(searchFilters.branch_code);
    }
    if (searchFilters.terminal_code) {
      conditions.push("terminal_code = ?");
      params.push(searchFilters.terminal_code);
    }
    if (searchFilters.user_id !== undefined && searchFilters.user_id !== null && searchFilters.user_id !== "") {
      conditions.push("cashier_id = ?");
      params.push(searchFilters.user_id);
    } else if (searchFilters.cashier_id !== undefined && searchFilters.cashier_id !== null && searchFilters.cashier_id !== "") {
      conditions.push("cashier_id = ?");
      params.push(searchFilters.cashier_id);
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(" AND ")}`;
    }

    query += " ORDER BY bill_no DESC LIMIT 1";

    return db.prepare(query).get(...params);
  } catch (err) {
    console.error("❌ Get Last Synced Invoice Error:", err.message);
    return null;
  }
};

/**
 * Reset stuck invoices (optional maintenance)
 */
const resetFailedStmt = db.prepare(`
  UPDATE ${TABLE_NAME}
  SET sync_attempts = 0
  WHERE sync_attempts >= 5
`);
export const resetFailedInvoices = () => {
  resetFailedStmt.run();
};

const clearInvoicesStmt = db.prepare(`DELETE FROM ${TABLE_NAME}`);
export const clearInvoicesSqlite = () => {
  try {
    clearInvoicesStmt.run();
  } catch (err) {
    console.error("❌ Clear Invoices Error:", err.message);
  }
};


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
