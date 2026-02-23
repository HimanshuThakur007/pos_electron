import { db } from "../database/sqlite.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const getTableName = (fy_code) => `sl_head${fy_code}`;
const getItemsTableName = (fy_code) => `sl_transaction${fy_code}`;

const stmtCache = {};
const initializedFyCodes = new Set();

/* -------------------------------------------------------
   CREATE TABLES
------------------------------------------------------- */
export const initTransactionTables = (fy_code) => {
  if (!fy_code) return;
  if (initializedFyCodes.has(fy_code)) return;

  const TABLE = getTableName(fy_code);
  const ITEMS = getItemsTableName(fy_code);

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_no TEXT,
        branch_code TEXT,
        terminal_code TEXT,
        cashier_id INTEGER,
        customer_name TEXT,
        customer_mobile TEXT,

        total_qty INTEGER,
        gross_amount REAL,
        total_discount REAL,
        taxable_value REAL,
        total_tax REAL,
        round_off REAL,
        grand_total REAL,

        payment_mode TEXT,
        amount_received REAL,
        transaction_ref TEXT,

        cart_items TEXT,
        time TEXT,
        integrity_hash TEXT,

        month_range TEXT,
        hour_range TEXT,
        fin_year TEXT,
        financial_year TEXT,

        sync_status INTEGER DEFAULT 0,
        sync_attempts INTEGER DEFAULT 0,
        synced_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),

        UNIQUE(bill_no, branch_code)
      );

      CREATE TABLE IF NOT EXISTS ${ITEMS} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER,
        item_code TEXT,
        item_name TEXT,
        qty REAL,
        mrp REAL,
        rate REAL,
        discount REAL,
        tax REAL,
        total REAL,
        print_desc TEXT,
        schm_type TEXT,
        schm_camp_grp TEXT,
        month_range TEXT,
        hour_range TEXT,
        fin_year TEXT,
        financial_year TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_sync_queue
      ON ${TABLE}(sync_status, id);

      CREATE INDEX IF NOT EXISTS idx_bill_lookup
      ON ${TABLE}(bill_no);

      CREATE INDEX IF NOT EXISTS idx_branch
      ON ${TABLE}(branch_code);

      CREATE INDEX IF NOT EXISTS idx_created
      ON ${TABLE}(created_at);

      CREATE INDEX IF NOT EXISTS idx_items_txn
      ON ${ITEMS}(transaction_id);
    `);

    console.log("✅ Transaction tables ready");

    // Fix: Reset auto-increment counter if table is empty
    try {
      const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${TABLE}`).get();
      if (rowCount.count === 0) {
        db.prepare(`DELETE FROM sqlite_sequence WHERE name='${TABLE}'`).run();
      }
    } catch (e) {}

    // Migration: Add new columns if they don't exist
    const addCol = (tbl, col, type) => {
      try { db.prepare(`ALTER TABLE ${tbl} ADD COLUMN ${col} ${type}`).run(); } catch (e) {}
    };
    addCol(ITEMS, "print_desc", "TEXT");
    addCol(ITEMS, "schm_type", "TEXT");
    addCol(ITEMS, "schm_camp_grp", "TEXT");
    addCol(ITEMS, "month_range", "TEXT");
    addCol(ITEMS, "hour_range", "TEXT");
    addCol(ITEMS, "fin_year", "TEXT");
    addCol(ITEMS, "financial_year", "TEXT");

    addCol(TABLE, "month_range", "TEXT");
    addCol(TABLE, "hour_range", "TEXT");
    addCol(TABLE, "fin_year", "TEXT");
    addCol(TABLE, "financial_year", "TEXT");

    initializedFyCodes.add(fy_code);
  } catch (err) {
    console.error("❌ Table creation failed:", err.message);
  }
};

/* -------------------------------------------------------
   HASH GENERATOR (TAMPER PROTECTION)
------------------------------------------------------- */
const generateHash = (data) => {
  const ordered = Object.keys(data)
    .sort()
    .reduce((obj, key) => {
      obj[key] = data[key];
      return obj;
    }, {});

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(ordered))
    .digest("hex");
};

/* -------------------------------------------------------
   INSERT TRANSACTION (ATOMIC & SAFE)
------------------------------------------------------- */
export const insertTransactionSqlite = (data) => {
  const { fy_code } = data;
  if (!fy_code) throw new Error("fy_code is required for transaction insertion");

  initTransactionTables(fy_code);

  const TABLE = getTableName(fy_code);
  const ITEMS = getItemsTableName(fy_code);

  const dateObj = new Date();
  const month_range = `${dateObj.getFullYear()}_${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
  const hour = dateObj.getHours();
  const hour_range = `${hour}-${hour + 1}`;
  const fin_year = String(fy_code);
  const financial_year = fin_year.slice(-2);

  const insertTxnKey = `insertTxn_${fy_code}`;
  if (!stmtCache[insertTxnKey]) {
    stmtCache[insertTxnKey] = db.prepare(`
      INSERT INTO ${TABLE} (
          bill_no, branch_code, terminal_code, cashier_id,
          customer_name, customer_mobile,
          total_qty, gross_amount, total_discount,
          taxable_value, total_tax, round_off, grand_total,
          payment_mode, amount_received, transaction_ref,
          cart_items, time, integrity_hash,
          month_range, hour_range, fin_year, financial_year
        )
        VALUES (
          @bill_no, @branch_code, @terminal_code, @cashier_id,
          @customer_name, @customer_mobile,
          @total_qty, @gross_amount, @total_discount,
          @taxable_value, @total_tax, @round_off, @grand_total,
          @payment_mode, @amount_received, @transaction_ref,
          @cart_items, @time, @integrity_hash,
          @month_range, @hour_range, @fin_year, @financial_year
        )
    `);
  }

  const insertItemKey = `insertItem_${fy_code}`;
  if (!stmtCache[insertItemKey]) {
    stmtCache[insertItemKey] = db.prepare(`
      INSERT INTO ${ITEMS} (
          transaction_id, item_code, item_name,
          qty, mrp, rate, discount, tax, total,
          print_desc, schm_type, schm_camp_grp,
          month_range, hour_range, fin_year, financial_year
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  const payload = {
    ...data,
    cart_items: JSON.stringify(data.cart_items || []),
    time: dateObj.toISOString(),
    month_range,
    hour_range,
    fin_year,
    financial_year
  };

  const hashData = {
    bill_no: payload.bill_no,
    branch_code: payload.branch_code,
    total_qty: payload.total_qty,
    grand_total: payload.grand_total,
    payment_mode: payload.payment_mode,
    cart_items: payload.cart_items,
    time: payload.time
  };

  payload.integrity_hash = generateHash(hashData);

  const trx = db.transaction(() => {
    const result = stmtCache[insertTxnKey].run(payload);
    const txnId = result.lastInsertRowid;

    for (const item of data.cart_items || []) {
      stmtCache[insertItemKey].run(
        txnId,
        item.itemCode,
        item.itemName,
        item.qty,
        item.mrp || 0,
        item.rate || item.price || 0,
        item.discount || 0,
        item.tax || 0,
        item.total || 0,
        item.printDesc || null,
        item.schm_type || null,
        item.schm_camp_grp || null,
        month_range,
        hour_range,
        fin_year,
        financial_year
      );
    }

    return txnId;
  });

  try {
    return trx();
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      console.warn("Duplicate bill prevented");
      return null;
    }
    throw err;
  }
};

export const insertSyncedTransactionSqlite = (data) => {
  const { fy_code } = data;
  if (!fy_code) return null; // Cannot insert without fy_code

  initTransactionTables(fy_code);

  const TABLE = getTableName(fy_code);
  const ITEMS = getItemsTableName(fy_code);

  const dateObj = data.time ? new Date(data.time) : new Date();
  const month_range = `${dateObj.getFullYear()}_${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
  const hour = dateObj.getHours();
  const hour_range = `${hour}-${hour + 1}`;
  const fin_year = String(fy_code);
  const financial_year = fin_year.slice(-2);

  const insertSyncedTxnKey = `insertSyncedTxn_${fy_code}`;
  if (!stmtCache[insertSyncedTxnKey]) {
    stmtCache[insertSyncedTxnKey] = db.prepare(`
      INSERT INTO ${TABLE} (
          bill_no, branch_code, terminal_code, cashier_id,
          customer_name, customer_mobile,
          total_qty, gross_amount, total_discount,
          taxable_value, total_tax, round_off, grand_total,
          payment_mode, amount_received, transaction_ref,
          cart_items, time, integrity_hash, 
          month_range, hour_range, fin_year, financial_year,
          sync_status, synced_at
        )
        VALUES (
          @bill_no, @branch_code, @terminal_code, @cashier_id,
          @customer_name, @customer_mobile,
          @total_qty, @gross_amount, @total_discount,
          @taxable_value, @total_tax, @round_off, @grand_total,
          @payment_mode, @amount_received, @transaction_ref,
          @cart_items, @time, @integrity_hash,
          @month_range, @hour_range, @fin_year, @financial_year,
          1, datetime('now')
        )
    `);
  }

  // Ensure item insert stmt is ready
  const insertItemKey = `insertItem_${fy_code}`;
  if (!stmtCache[insertItemKey]) {
    stmtCache[insertItemKey] = db.prepare(`
      INSERT INTO ${ITEMS} (
          transaction_id, item_code, item_name,
          qty, mrp, rate, discount, tax, total,
          print_desc, schm_type, schm_camp_grp,
          month_range, hour_range, fin_year, financial_year
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  const payload = {
    ...data,
    cart_items: typeof data.cart_items === 'string' ? data.cart_items : JSON.stringify(data.cart_items || []),
    time: data.time || dateObj.toISOString(),
    month_range,
    hour_range,
    fin_year,
    financial_year
  };

  const hashData = {
    bill_no: payload.bill_no,
    branch_code: payload.branch_code,
    total_qty: payload.total_qty,
    grand_total: payload.grand_total,
    payment_mode: payload.payment_mode,
    cart_items: payload.cart_items,
    time: payload.time
  };

  if (!payload.integrity_hash) {
    payload.integrity_hash = generateHash(hashData);
  }

  const trx = db.transaction(() => {
    const result = stmtCache[insertSyncedTxnKey].run(payload);
    const txnId = result.lastInsertRowid;

    const items = typeof data.cart_items === 'string' ? JSON.parse(data.cart_items) : (data.cart_items || []);

    for (const item of items) {
      stmtCache[insertItemKey].run(
        txnId,
        item.itemCode,
        item.itemName,
        item.qty,
        item.mrp || 0,
        item.rate || item.price || 0,
        item.discount || 0,
        item.tax || 0,
        item.total || 0,
        item.printDesc || null,
        item.schm_type || null,
        item.schm_camp_grp || null,
        month_range,
        hour_range,
        fin_year,
        financial_year
      );
    }

    return txnId;
  });

  try {
    return trx();
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return null;
    }
    console.error("❌ Insert Synced Transaction Error:", err.message);
    return null;
  }
};

/* -------------------------------------------------------
   FETCH FUNCTIONS
------------------------------------------------------- */
const parseTransaction = (row) => {
  if (!row) return null;
  try {
    row.cart_items = typeof row.cart_items === 'string' ? JSON.parse(row.cart_items) : row.cart_items;
  } catch (e) {
    row.cart_items = [];
  }
  return row;
};

export const getLastTransactionSqlite = (filters = {}) => {
  const { fy_code } = filters;
  if (!fy_code) return null;
  initTransactionTables(fy_code);
  const TABLE = getTableName(fy_code);

  let query = `SELECT * FROM ${TABLE}`;
  const conditions = [];
  const params = [];

  const searchFilters = filters || {};

  // Safety: If branch_code is missing, return null to prevent leaking other branch data
  if (!searchFilters.branch_code) {
    return null;
  }

  if (searchFilters.branch_code) {
    conditions.push("branch_code = ?");
    params.push(searchFilters.branch_code);
  }
  if (searchFilters.terminal_code) {
    conditions.push("terminal_code = ?");
    params.push(searchFilters.terminal_code);
  }
  // Handle user_id (frontend) mapping to cashier_id (database)
  if (searchFilters.user_id !== undefined && searchFilters.user_id !== null && searchFilters.user_id !== "") {
    conditions.push("cashier_id = ?");
    params.push(searchFilters.user_id);
  } else if (searchFilters.cashier_id !== undefined && searchFilters.cashier_id !== null && searchFilters.cashier_id !== "") {
    conditions.push("cashier_id = ?");
    params.push(searchFilters.cashier_id);
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += " ORDER BY id DESC LIMIT 1";

  const row = db.prepare(query).get(...params);
  return parseTransaction(row);
};

export const getTransactionsSqlite = (filters = {}) => {
  const { fy_code } = filters;
  if (!fy_code) return [];
  initTransactionTables(fy_code);
  const TABLE = getTableName(fy_code);

  let query = `SELECT * FROM ${TABLE}`;
  const conditions = [];
  const params = [];

  const searchFilters = filters || {};

  // Safety: If branch_code is missing, return empty to prevent leaking other branch data
  if (!searchFilters.branch_code) {
    return [];
  }

  if (searchFilters.branch_code) {
    conditions.push("branch_code = ?");
    params.push(searchFilters.branch_code);
  }
  if (searchFilters.terminal_code) {
    conditions.push("terminal_code = ?");
    params.push(searchFilters.terminal_code);
  }
  // Handle user_id (frontend) mapping to cashier_id (database)
  if (searchFilters.user_id !== undefined && searchFilters.user_id !== null && searchFilters.user_id !== "") {
    conditions.push("cashier_id = ?");
    params.push(searchFilters.user_id);
  } else if (searchFilters.cashier_id !== undefined && searchFilters.cashier_id !== null && searchFilters.cashier_id !== "") {
    conditions.push("cashier_id = ?");
    params.push(searchFilters.cashier_id);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += " ORDER BY id DESC";

  console.log("Executing Transaction Query:", query, params);
  const rows = db.prepare(query).all(...params);
  return rows.map(parseTransaction);
};

export const getLastSyncedTransaction = (fy_code) => {
  if (!fy_code) return null;
  initTransactionTables(fy_code);
  const TABLE = getTableName(fy_code);
  const key = `getLastSyncedTxn_${fy_code}`;
  if (!stmtCache[key]) {
    stmtCache[key] = db.prepare(`
      SELECT * FROM ${TABLE} 
      WHERE sync_status = 1 
      ORDER BY id DESC 
      LIMIT 1
    `);
  }
  return stmtCache[key].get();
};

export const getTransactionCountSqlite = (fy_code) => {
  if (!fy_code) return 0;
  initTransactionTables(fy_code);
  const TABLE = getTableName(fy_code);
  const result = db.prepare(`SELECT COUNT(*) as count FROM ${TABLE}`).get();
  return result ? result.count : 0;
};

export const getPendingTransactions = (limit = 50, fy_code) => {
  if (!fy_code) return [];
  initTransactionTables(fy_code);
  const TABLE = getTableName(fy_code);
  const key = `getPendingTxns_${fy_code}`;
  if (!stmtCache[key]) {
    stmtCache[key] = db.prepare(`
      SELECT * FROM ${TABLE}
      WHERE sync_status = 0
      ORDER BY id ASC
      LIMIT ?
    `);
  }
  return stmtCache[key].all(limit);
};

/* -------------------------------------------------------
   SYNC MANAGEMENT
------------------------------------------------------- */
export const markTransactionSynced = (id, fy_code) => {
  if (!fy_code) return;
  const TABLE = getTableName(fy_code);
  const key = `markSynced_${fy_code}`;
  if (!stmtCache[key]) {
    stmtCache[key] = db.prepare(`
      UPDATE ${TABLE}
      SET sync_status = 1,
          synced_at = datetime('now')
      WHERE id = ?
    `);
  }
  stmtCache[key].run(id);
};

export const incrementSyncAttempts = (id, fy_code) => {
  if (!fy_code) return;
  const TABLE = getTableName(fy_code);
  const key = `incSyncAttempts_${fy_code}`;
  if (!stmtCache[key]) {
    stmtCache[key] = db.prepare(`
      UPDATE ${TABLE}
      SET sync_attempts = sync_attempts + 1,
          sync_status = CASE
            WHEN sync_attempts >= 5 THEN -1
            ELSE 0
          END
      WHERE id = ?
    `);
  }
  stmtCache[key].run(id);
};

/* -------------------------------------------------------
   VERIFY DATA INTEGRITY
------------------------------------------------------- */
export const verifyIntegrity = (txn) => {
  const hashData = {
    bill_no: txn.bill_no,
    branch_code: txn.branch_code,
    total_qty: txn.total_qty,
    grand_total: txn.grand_total,
    payment_mode: txn.payment_mode,
    cart_items: txn.cart_items,
    time: txn.time
  };

  return generateHash(hashData) === txn.integrity_hash;
};

/* -------------------------------------------------------
   ARCHIVE OLD SYNCED DATA
------------------------------------------------------- */
export const archiveOldTransactions = (fy_code) => {
  if (!fy_code) return;
  const TABLE = getTableName(fy_code);
  db.prepare(`
    DELETE FROM ${TABLE}
    WHERE sync_status = 1
    AND created_at < datetime('now','-30 day')
  `).run();
};

/* -------------------------------------------------------
   BACKUP DATABASE (ROTATES LAST 7)
------------------------------------------------------- */
export const backupDatabase = (dbPath) => {
  const backupDir = path.join(path.dirname(dbPath), "backup");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

  const file = path.join(
    backupDir,
    `backup-${new Date().toISOString().slice(0,10)}.db`
  );

  fs.copyFileSync(dbPath, file);

  const files = fs.readdirSync(backupDir).sort();
  if (files.length > 7) {
    fs.unlinkSync(path.join(backupDir, files[0]));
  }
};

/* -------------------------------------------------------
   CLEAR TRANSACTIONS (RESET)
------------------------------------------------------- */
export const clearTransactionsSqlite = (fy_code) => {
  if (!fy_code) return;
  const TABLE = getTableName(fy_code);
  const ITEMS = getItemsTableName(fy_code);
  try {
    db.transaction(() => {
      db.prepare(`DELETE FROM ${ITEMS}`).run();
      db.prepare(`DELETE FROM ${TABLE}`).run();
      db.prepare(`DELETE FROM sqlite_sequence WHERE name='${ITEMS}'`).run();
      db.prepare(`DELETE FROM sqlite_sequence WHERE name='${TABLE}'`).run();
    })();
  } catch (err) {
    console.error("❌ Clear Transactions Error:", err.message);
  }
};

/* -------------------------------------------------------
   INIT
------------------------------------------------------- */
// initTransactionTables(); // Now called explicitly with fy_code


// import { db } from "../database/sqlite.js";
// import fs from "fs";
// import path from "path";
// import crypto from "crypto";

// const TABLE = "transactions";
// const ITEMS = "transaction_items";

// /* -------------------------------------------------------
//    CREATE TABLES
// ------------------------------------------------------- */
// export const initTransactionTables = () => {
//   try {
//     db.exec(`
//       CREATE TABLE IF NOT EXISTS ${TABLE} (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         bill_no TEXT,
//         branch_code TEXT,
//         terminal_code TEXT,
//         cashier_id INTEGER,
//         customer_name TEXT,
//         customer_mobile TEXT,

//         total_qty INTEGER,
//         gross_amount REAL,
//         total_discount REAL,
//         taxable_value REAL,
//         total_tax REAL,
//         round_off REAL,
//         grand_total REAL,

//         payment_mode TEXT,
//         amount_received REAL,
//         transaction_ref TEXT,

//         cart_items TEXT,
//         time TEXT,
//         integrity_hash TEXT,

//         sync_status INTEGER DEFAULT 0,
//         sync_attempts INTEGER DEFAULT 0,
//         synced_at TEXT,
//         created_at TEXT DEFAULT (datetime('now')),

//         UNIQUE(bill_no, branch_code)
//       );

//       CREATE TABLE IF NOT EXISTS ${ITEMS} (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         transaction_id INTEGER,
//         item_code TEXT,
//         item_name TEXT,
//         qty REAL,
//         mrp REAL,
//         rate REAL,
//         discount REAL,
//         tax REAL,
//         total REAL,
//         print_desc TEXT,
//         schm_type TEXT,
//         schm_camp_grp TEXT,
//         created_at TEXT DEFAULT (datetime('now'))
//       );

//       CREATE INDEX IF NOT EXISTS idx_sync_queue
//       ON ${TABLE}(sync_status, id);

//       CREATE INDEX IF NOT EXISTS idx_bill_lookup
//       ON ${TABLE}(bill_no);

//       CREATE INDEX IF NOT EXISTS idx_branch
//       ON ${TABLE}(branch_code);

//       CREATE INDEX IF NOT EXISTS idx_created
//       ON ${TABLE}(created_at);

//       CREATE INDEX IF NOT EXISTS idx_items_txn
//       ON ${ITEMS}(transaction_id);
//     `);

//     console.log("✅ Transaction tables ready");

//     // Fix: Reset auto-increment counter if table is empty
//     try {
//       const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${TABLE}`).get();
//       if (rowCount.count === 0) {
//         db.prepare(`DELETE FROM sqlite_sequence WHERE name='${TABLE}'`).run();
//       }
//     } catch (e) {}

//     // Migration: Add new columns if they don't exist
//     const addCol = (tbl, col, type) => {
//       try { db.prepare(`ALTER TABLE ${tbl} ADD COLUMN ${col} ${type}`).run(); } catch (e) {}
//     };
//     addCol(ITEMS, "print_desc", "TEXT");
//     addCol(ITEMS, "schm_type", "TEXT");
//     addCol(ITEMS, "schm_camp_grp", "TEXT");

//   } catch (err) {
//     console.error("❌ Table creation failed:", err.message);
//   }
// };

// /* -------------------------------------------------------
//    HASH GENERATOR (TAMPER PROTECTION)
// ------------------------------------------------------- */
// const generateHash = (data) => {
//   const ordered = Object.keys(data)
//     .sort()
//     .reduce((obj, key) => {
//       obj[key] = data[key];
//       return obj;
//     }, {});

//   return crypto
//     .createHash("sha256")
//     .update(JSON.stringify(ordered))
//     .digest("hex");
// };

// /* -------------------------------------------------------
//    INSERT TRANSACTION (ATOMIC & SAFE)
// ------------------------------------------------------- */
// const insertTxnStmt = db.prepare(`
//   INSERT INTO ${TABLE} (
//       bill_no, branch_code, terminal_code, cashier_id,
//       customer_name, customer_mobile,
//       total_qty, gross_amount, total_discount,
//       taxable_value, total_tax, round_off, grand_total,
//       payment_mode, amount_received, transaction_ref,
//       cart_items, time, integrity_hash
//     )
//     VALUES (
//       @bill_no, @branch_code, @terminal_code, @cashier_id,
//       @customer_name, @customer_mobile,
//       @total_qty, @gross_amount, @total_discount,
//       @taxable_value, @total_tax, @round_off, @grand_total,
//       @payment_mode, @amount_received, @transaction_ref,
//       @cart_items, @time, @integrity_hash
//     )
// `);

// const insertItemStmt = db.prepare(`
//   INSERT INTO ${ITEMS} (
//       transaction_id, item_code, item_name,
//       qty, mrp, rate, discount, tax, total,
//       print_desc, schm_type, schm_camp_grp
//     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
// `);

// export const insertTransactionSqlite = (data) => {

//   const payload = {
//     ...data,
//     cart_items: JSON.stringify(data.cart_items || []),
//     time: new Date().toISOString(),
//   };

//   const hashData = {
//     bill_no: payload.bill_no,
//     branch_code: payload.branch_code,
//     total_qty: payload.total_qty,
//     grand_total: payload.grand_total,
//     payment_mode: payload.payment_mode,
//     cart_items: payload.cart_items,
//     time: payload.time
//   };

//   payload.integrity_hash = generateHash(hashData);

//   const trx = db.transaction(() => {
//     const result = insertTxnStmt.run(payload);
//     const txnId = result.lastInsertRowid;

//     for (const item of data.cart_items || []) {
//       insertItemStmt.run(
//         txnId,
//         item.itemCode,
//         item.itemName,
//         item.qty,
//         item.mrp || 0,
//         item.rate || item.price || 0,
//         item.discount || 0,
//         item.tax || 0,
//         item.total || 0,
//         item.printDesc || null,
//         item.schm_type || null,
//         item.schm_camp_grp || null
//       );
//     }

//     return txnId;
//   });

//   try {
//     return trx();
//   } catch (err) {
//     if (err.message.includes("UNIQUE")) {
//       console.warn("Duplicate bill prevented");
//       return null;
//     }
//     throw err;
//   }
// };

// const insertSyncedTxnStmt = db.prepare(`
//   INSERT INTO ${TABLE} (
//       bill_no, branch_code, terminal_code, cashier_id,
//       customer_name, customer_mobile,
//       total_qty, gross_amount, total_discount,
//       taxable_value, total_tax, round_off, grand_total,
//       payment_mode, amount_received, transaction_ref,
//       cart_items, time, integrity_hash,
//       sync_status, synced_at
//     )
//     VALUES (
//       @bill_no, @branch_code, @terminal_code, @cashier_id,
//       @customer_name, @customer_mobile,
//       @total_qty, @gross_amount, @total_discount,
//       @taxable_value, @total_tax, @round_off, @grand_total,
//       @payment_mode, @amount_received, @transaction_ref,
//       @cart_items, @time, @integrity_hash,
//       1, datetime('now')
//     )
// `);

// export const insertSyncedTransactionSqlite = (data) => {

//   const payload = {
//     ...data,
//     cart_items: typeof data.cart_items === 'string' ? data.cart_items : JSON.stringify(data.cart_items || []),
//     time: data.time || new Date().toISOString(),
//   };

//   const hashData = {
//     bill_no: payload.bill_no,
//     branch_code: payload.branch_code,
//     total_qty: payload.total_qty,
//     grand_total: payload.grand_total,
//     payment_mode: payload.payment_mode,
//     cart_items: payload.cart_items,
//     time: payload.time
//   };

//   if (!payload.integrity_hash) {
//     payload.integrity_hash = generateHash(hashData);
//   }

//   const trx = db.transaction(() => {
//     const result = insertSyncedTxnStmt.run(payload);
//     const txnId = result.lastInsertRowid;

//     const items = typeof data.cart_items === 'string' ? JSON.parse(data.cart_items) : (data.cart_items || []);

//     for (const item of items) {
//       insertItemStmt.run(
//         txnId,
//         item.itemCode,
//         item.itemName,
//         item.qty,
//         item.mrp || 0,
//         item.rate || item.price || 0,
//         item.discount || 0,
//         item.tax || 0,
//         item.total || 0,
//         item.printDesc || null,
//         item.schm_type || null,
//         item.schm_camp_grp || null
//       );
//     }

//     return txnId;
//   });

//   try {
//     return trx();
//   } catch (err) {
//     if (err.message.includes("UNIQUE")) {
//       return null;
//     }
//     console.error("❌ Insert Synced Transaction Error:", err.message);
//     return null;
//   }
// };

// /* -------------------------------------------------------
//    FETCH FUNCTIONS
// ------------------------------------------------------- */
// const parseTransaction = (row) => {
//   if (!row) return null;
//   try {
//     row.cart_items = typeof row.cart_items === 'string' ? JSON.parse(row.cart_items) : row.cart_items;
//   } catch (e) {
//     row.cart_items = [];
//   }
//   return row;
// };

// export const getLastTransactionSqlite = (filters = {}) => {
//   let query = `SELECT * FROM ${TABLE}`;
//   const conditions = [];
//   const params = [];

//   const searchFilters = filters || {};

//   // Safety: If branch_code is missing, return null to prevent leaking other branch data
//   if (!searchFilters.branch_code) {
//     return null;
//   }

//   if (searchFilters.branch_code) {
//     conditions.push("branch_code = ?");
//     params.push(searchFilters.branch_code);
//   }
//   if (searchFilters.terminal_code) {
//     conditions.push("terminal_code = ?");
//     params.push(searchFilters.terminal_code);
//   }
//   // Handle user_id (frontend) mapping to cashier_id (database)
//   if (searchFilters.user_id !== undefined && searchFilters.user_id !== null && searchFilters.user_id !== "") {
//     conditions.push("cashier_id = ?");
//     params.push(searchFilters.user_id);
//   } else if (searchFilters.cashier_id !== undefined && searchFilters.cashier_id !== null && searchFilters.cashier_id !== "") {
//     conditions.push("cashier_id = ?");
//     params.push(searchFilters.cashier_id);
//   }
  
//   if (conditions.length > 0) {
//     query += ` WHERE ${conditions.join(" AND ")}`;
//   }

//   query += " ORDER BY id DESC LIMIT 1";

//   const row = db.prepare(query).get(...params);
//   return parseTransaction(row);
// };

// export const getTransactionsSqlite = (filters = {}) => {
//   let query = `SELECT * FROM ${TABLE}`;
//   const conditions = [];
//   const params = [];

//   const searchFilters = filters || {};

//   // Safety: If branch_code is missing, return empty to prevent leaking other branch data
//   if (!searchFilters.branch_code) {
//     return [];
//   }

//   if (searchFilters.branch_code) {
//     conditions.push("branch_code = ?");
//     params.push(searchFilters.branch_code);
//   }
//   if (searchFilters.terminal_code) {
//     conditions.push("terminal_code = ?");
//     params.push(searchFilters.terminal_code);
//   }
//   // Handle user_id (frontend) mapping to cashier_id (database)
//   if (searchFilters.user_id !== undefined && searchFilters.user_id !== null && searchFilters.user_id !== "") {
//     conditions.push("cashier_id = ?");
//     params.push(searchFilters.user_id);
//   } else if (searchFilters.cashier_id !== undefined && searchFilters.cashier_id !== null && searchFilters.cashier_id !== "") {
//     conditions.push("cashier_id = ?");
//     params.push(searchFilters.cashier_id);
//   }

//   if (conditions.length > 0) {
//     query += ` WHERE ${conditions.join(" AND ")}`;
//   }

//   query += " ORDER BY id DESC";

//   console.log("Executing Transaction Query:", query, params);
//   const rows = db.prepare(query).all(...params);
//   return rows.map(parseTransaction);
// };

// const getLastSyncedTxnStmt = db.prepare(`
//   SELECT * FROM ${TABLE} 
//   WHERE sync_status = 1 
//   ORDER BY id DESC 
//   LIMIT 1
// `);
// export const getLastSyncedTransaction = () =>
//   getLastSyncedTxnStmt.get();

// const getTxnCountStmt = db.prepare(`SELECT COUNT(*) as count FROM ${TABLE}`);
// export const getTransactionCountSqlite = () => {
//   const result = getTxnCountStmt.get();
//   return result ? result.count : 0;
// };

// const getPendingTxnsStmt = db.prepare(`
//   SELECT * FROM ${TABLE}
//   WHERE sync_status = 0
//   ORDER BY id ASC
//   LIMIT ?
// `);
// export const getPendingTransactions = (limit = 50) =>
//   getPendingTxnsStmt.all(limit);

// /* -------------------------------------------------------
//    SYNC MANAGEMENT
// ------------------------------------------------------- */
// const markSyncedStmt = db.prepare(`
//   UPDATE ${TABLE}
//   SET sync_status = 1,
//       synced_at = datetime('now')
//   WHERE id = ?
// `);
// export const markTransactionSynced = (id) => {
//   markSyncedStmt.run(id);
// };

// const incSyncAttemptsStmt = db.prepare(`
//   UPDATE ${TABLE}
//   SET sync_attempts = sync_attempts + 1,
//       sync_status = CASE
//         WHEN sync_attempts >= 5 THEN -1
//         ELSE 0
//       END
//   WHERE id = ?
// `);
// export const incrementSyncAttempts = (id) => {
//   incSyncAttemptsStmt.run(id);
// };

// /* -------------------------------------------------------
//    VERIFY DATA INTEGRITY
// ------------------------------------------------------- */
// export const verifyIntegrity = (txn) => {
//   const hashData = {
//     bill_no: txn.bill_no,
//     branch_code: txn.branch_code,
//     total_qty: txn.total_qty,
//     grand_total: txn.grand_total,
//     payment_mode: txn.payment_mode,
//     cart_items: txn.cart_items,
//     time: txn.time
//   };

//   return generateHash(hashData) === txn.integrity_hash;
// };

// /* -------------------------------------------------------
//    ARCHIVE OLD SYNCED DATA
// ------------------------------------------------------- */
// const archiveStmt = db.prepare(`
//   DELETE FROM ${TABLE}
//   WHERE sync_status = 1
//   AND created_at < datetime('now','-30 day')
// `);
// export const archiveOldTransactions = () => {
//   archiveStmt.run();
// };

// /* -------------------------------------------------------
//    BACKUP DATABASE (ROTATES LAST 7)
// ------------------------------------------------------- */
// export const backupDatabase = (dbPath) => {
//   const backupDir = path.join(path.dirname(dbPath), "backup");
//   if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

//   const file = path.join(
//     backupDir,
//     `backup-${new Date().toISOString().slice(0,10)}.db`
//   );

//   fs.copyFileSync(dbPath, file);

//   const files = fs.readdirSync(backupDir).sort();
//   if (files.length > 7) {
//     fs.unlinkSync(path.join(backupDir, files[0]));
//   }
// };

// /* -------------------------------------------------------
//    CLEAR TRANSACTIONS (RESET)
// ------------------------------------------------------- */
// export const clearTransactionsSqlite = () => {
//   try {
//     db.transaction(() => {
//       db.prepare(`DELETE FROM ${ITEMS}`).run();
//       db.prepare(`DELETE FROM ${TABLE}`).run();
//       db.prepare(`DELETE FROM sqlite_sequence WHERE name='${ITEMS}'`).run();
//       db.prepare(`DELETE FROM sqlite_sequence WHERE name='${TABLE}'`).run();
//     })();
//   } catch (err) {
//     console.error("❌ Clear Transactions Error:", err.message);
//   }
// };

// /* -------------------------------------------------------
//    INIT
// ------------------------------------------------------- */
// initTransactionTables();
