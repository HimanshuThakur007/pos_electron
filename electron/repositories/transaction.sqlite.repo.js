import { db } from "../database/sqlite.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { updateInvoiceRunningNumber } from "./invoice.sqlite.repo.js";
import { triggerInvoiceSync } from "../services/invoiceSync.js";

const getTableName = (fy_code) => `sl_head${fy_code}`;
const getItemsTableName = (fy_code) => `sl_transaction${fy_code}`;
const getMpmTableName = (fy_code) => `sl_mpm${fy_code}`;

const stmtCache = {};
const initializedFyCodes = new Set();

/* -------------------------------------------------------
   CREATE TABLES
------------------------------------------------------- */
export const initSyncQueue = () => {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fy_code TEXT,
        transaction_id INTEGER,
        sync_attempts INTEGER DEFAULT 0,
        status INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(fy_code, transaction_id)
      );
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, sync_attempts);
    `);
  } catch (err) {}
};

initSyncQueue();

export const initTransactionTables = (fy_code) => {
  if (!fy_code) return;
  if (initializedFyCodes.has(fy_code)) return;

  const TABLE = getTableName(fy_code);
  const ITEMS = getItemsTableName(fy_code);
  const MPM = getMpmTableName(fy_code);

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_no TEXT,
        branch_code TEXT,
        terminal_code TEXT,
        cashier_id INTEGER,
        customer_id INTEGER,
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
        doc_type INTEGER DEFAULT 1,
        tax_region TEXT,
        gst_number TEXT,
        gst_address TEXT,
        company_name TEXT,

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
        hsn_code TEXT,
        month_range TEXT,
        hour_range TEXT,
        fin_year TEXT,
        financial_year TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS ${MPM} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_no TEXT,
        customer_id INTEGER,
        branch_code TEXT,
        counter_code TEXT,
        financial_year TEXT,
        fin_year TEXT,
        fy_code TEXT,
        month_range TEXT,
        hour_range TEXT,
        mode TEXT,
        amount REAL,
        edc_terminal_id TEXT,
        edc_tid TEXT,
        edc_mid TEXT,
        upi_vpa TEXT,
        paytm_merchant_txn_id TEXT,
        paytm_order_id TEXT,
        paytm_rrn TEXT,
        paytm_response_code TEXT,
        paytm_response_msg TEXT,
        issuer_masked_card_no TEXT,
        issuing_bank_name TEXT,
        pay_method TEXT,
        rrn TEXT,
        auth_code TEXT,
        card_last4 TEXT,
        status TEXT DEFAULT 'success',
        synced INTEGER DEFAULT 0,
        pos_created_at TEXT,
        pos_bill_saved_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
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

      CREATE INDEX IF NOT EXISTS idx_mpm_invoice_no
      ON ${MPM}(invoice_no);

      CREATE INDEX IF NOT EXISTS idx_mpm_branch_code
      ON ${MPM}(branch_code);

      CREATE INDEX IF NOT EXISTS idx_mpm_counter_code
      ON ${MPM}(counter_code);
    `);

    // Fix: Reset auto-increment counter if table is empty
    try {
      const rowCount = db
        .prepare(`SELECT COUNT(*) as count FROM ${TABLE}`)
        .get();
      if (rowCount.count === 0) {
        db.prepare(`DELETE FROM sqlite_sequence WHERE name='${TABLE}'`).run();
      }
    } catch (e) {}

    // Migration: Add new columns if they don't exist
    const addCol = (tbl, col, type) => {
      try {
        db.prepare(`ALTER TABLE ${tbl} ADD COLUMN ${col} ${type}`).run();
      } catch (e) {}
    };
    addCol(ITEMS, "print_desc", "TEXT");
    addCol(ITEMS, "schm_type", "TEXT");
    addCol(ITEMS, "schm_camp_grp", "TEXT");
    addCol(ITEMS, "hsn_code", "TEXT");
    addCol(ITEMS, "month_range", "TEXT");
    addCol(ITEMS, "hour_range", "TEXT");
    addCol(ITEMS, "fin_year", "TEXT");
    addCol(ITEMS, "financial_year", "TEXT");
    addCol(TABLE, "month_range", "TEXT");
    addCol(TABLE, "hour_range", "TEXT");
    addCol(TABLE, "fin_year", "TEXT");
    addCol(TABLE, "financial_year", "TEXT");
    addCol(TABLE, "doc_type", "INTEGER DEFAULT 1");
    addCol(TABLE, "tax_region", "TEXT");
    addCol(TABLE, "gst_number", "TEXT");
    addCol(TABLE, "gst_address", "TEXT");
    addCol(TABLE, "company_name", "TEXT");
    addCol(TABLE, "customer_id", "INTEGER");
    addCol(MPM, "issuer_masked_card_no", "TEXT");
    addCol(MPM, "issuing_bank_name", "TEXT");
    addCol(MPM, "pay_method", "TEXT");

    // Migration: Push any unsynced transactions to the new queue system
    db.prepare(
      `
      INSERT OR IGNORE INTO sync_queue (fy_code, transaction_id, sync_attempts, status)
      SELECT ?, id, sync_attempts, CASE WHEN sync_status = 2 THEN 0 ELSE sync_status END
      FROM ${TABLE}
      WHERE sync_status IN (0, 2)
    `,
    ).run(fy_code);

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
  if (!fy_code)
    throw new Error("fy_code is required for transaction insertion");

  initTransactionTables(fy_code);

  const TABLE = getTableName(fy_code);
  const ITEMS = getItemsTableName(fy_code);
  const MPM = getMpmTableName(fy_code);

  const dateObj = new Date();
  const month_range = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
  const hour = dateObj.getHours();
  const hour_range = `${String(hour).padStart(2, "0")}-${String(hour + 1).padStart(2, "0")}`;
  const fin_year = data.fin_year || String(fy_code);
  const financial_year = data.financial_year || String(fy_code).slice(-2);

  const insertTxnKey = `insertTxn_${fy_code}`;
  if (!stmtCache[insertTxnKey]) {
    stmtCache[insertTxnKey] = db.prepare(`
      INSERT INTO ${TABLE} (
          bill_no, branch_code, terminal_code, cashier_id,
          customer_id, customer_name, customer_mobile,
          total_qty, gross_amount, total_discount,
          taxable_value, total_tax, round_off, grand_total,
          payment_mode, amount_received, transaction_ref,
          cart_items, time, integrity_hash,
          month_range, hour_range, fin_year, financial_year, doc_type,
          tax_region, gst_number, gst_address, company_name
        )
        VALUES (
          @bill_no, @branch_code, @terminal_code, @cashier_id,
          @customer_id, @customer_name, @customer_mobile,
          @total_qty, @gross_amount, @total_discount,
          @taxable_value, @total_tax, @round_off, @grand_total,
          @payment_mode, @amount_received, @transaction_ref,
          @cart_items, @time, @integrity_hash,
          @month_range, @hour_range, @fin_year, @financial_year, @doc_type,
          @tax_region, @gst_number, @gst_address, @company_name
        )
    `);
  }

  const insertItemKey = `insertItem_${fy_code}`;
  if (!stmtCache[insertItemKey]) {
    stmtCache[insertItemKey] = db.prepare(`
      INSERT INTO ${ITEMS} (
          transaction_id, item_code, item_name,
          qty, mrp, rate, discount, tax, total,
          print_desc, schm_type, schm_camp_grp, hsn_code,
          month_range, hour_range, fin_year, financial_year
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  const insertMpmKey = `insertMpm_${fy_code}`;
  if (!stmtCache[insertMpmKey]) {
    stmtCache[insertMpmKey] = db.prepare(`
      INSERT INTO ${MPM} (
        invoice_no, customer_id, branch_code, counter_code,
        financial_year, fin_year, fy_code, month_range, hour_range,
        mode, amount, edc_terminal_id, edc_tid, edc_mid, upi_vpa,
        paytm_merchant_txn_id, paytm_order_id, paytm_rrn, paytm_response_code, paytm_response_msg,
        issuer_masked_card_no, issuing_bank_name, pay_method,
        rrn, auth_code, card_last4, status, synced, pos_created_at, pos_bill_saved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  const payload = {
    ...data,
    customer_id: data.customer_id || null,
    tax_region: data.tax_region || null,
    gst_number: data.gst_number || null,
    gst_address: data.gst_address || null,
    company_name: data.company_name || null,
    cart_items: JSON.stringify(data.cart_items || []),
    time: data.time || dateObj.toISOString(),
    month_range,
    hour_range,
    fin_year,
    financial_year,
    doc_type:
      data.doc_type || (data.bill_no && data.bill_no.startsWith("B") ? 2 : 1),
  };

  const hashData = {
    bill_no: payload.bill_no,
    branch_code: payload.branch_code,
    total_qty: payload.total_qty,
    grand_total: payload.grand_total,
    payment_mode: payload.payment_mode,
    cart_items: payload.cart_items,
    time: payload.time,
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
        item.hsn_code || null,
        month_range,
        hour_range,
        fin_year,
        financial_year,
      );
    }

    const payments =
      data.payments && data.payments.length > 0
        ? data.payments
        : [
            {
              mode: payload.payment_mode || "cash",
              amount: payload.amount_received || payload.grand_total || 0,
            },
          ];

    for (const p of payments) {
      stmtCache[insertMpmKey].run(
        payload.bill_no,
        payload.customer_id,
        payload.branch_code,
        payload.terminal_code,
        payload.financial_year,
        payload.fin_year,
        fy_code,
        payload.month_range,
        payload.hour_range,
        p.mode || "cash",
        p.amount || 0,
        p.edc_terminal_id || null,
        p.edc_tid || null,
        p.edc_mid || null,
        p.upi_vpa || null,
        p.paytm_merchant_txn_id || null,
        p.paytm_order_id || null,
        p.paytm_rrn || null,
        p.paytm_response_code || null,
        p.paytm_response_msg || null,
        p.issuer_masked_card_no || null,
        p.issuing_bank_name || null,
        p.pay_method || null,
        p.rrn || null,
        p.auth_code || null,
        p.card_last4 || null,
        p.status || "success",
        0, // synced status (0 = pending)
        p.created_at || payload.time,
        payload.time,
      );
    }

    // 🚀 Add to Enterprise Queue System
    db.prepare(
      `INSERT INTO sync_queue (fy_code, transaction_id) VALUES (?, ?)`,
    ).run(fy_code, txnId);

    return txnId;
  });

  try {
    const txnId = trx();

    // 🚀 Keep sequence updated for local transactions
    if (txnId) {
      let current_number = payload.current_number || 0;
      if (!current_number && payload.bill_no) {
        if (payload.bill_no.includes("-")) {
          current_number = parseInt(payload.bill_no.split("-")[1], 10);
        } else if (payload.bill_no.length >= 6) {
          current_number = parseInt(payload.bill_no.slice(-6), 10);
        }
      }

      if (!isNaN(current_number) && current_number > 0) {
        const isB2B = payload.bill_no.startsWith("B");
        updateInvoiceRunningNumber({
          branch_code: payload.branch_code,
          terminal_code: payload.terminal_code,
          fy_code: fy_code || "",
          user_id: payload.cashier_id,
          current_number: current_number,
          doc_type: payload.doc_type || (isB2B ? 2 : 1),
          sync_status: 0,
        });
        triggerInvoiceSync(fy_code || "");
      }
    }
    return txnId;
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
  const MPM = getMpmTableName(fy_code);

  const dateObj = data.time ? new Date(data.time) : new Date();
  const month_range = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
  const hour = dateObj.getHours();
  const hour_range = `${String(hour).padStart(2, "0")}-${String(hour + 1).padStart(2, "0")}`;
  const fin_year = data.fin_year || String(fy_code);
  const financial_year = data.financial_year || String(fy_code).slice(-2);

  const insertSyncedTxnKey = `insertSyncedTxn_${fy_code}`;
  if (!stmtCache[insertSyncedTxnKey]) {
    stmtCache[insertSyncedTxnKey] = db.prepare(`
      INSERT INTO ${TABLE} (
          bill_no, branch_code, terminal_code, cashier_id,
          customer_id, customer_name, customer_mobile,
          total_qty, gross_amount, total_discount,
          taxable_value, total_tax, round_off, grand_total,
          payment_mode, amount_received, transaction_ref,
          cart_items, time, integrity_hash, 
          month_range, hour_range, fin_year, financial_year, doc_type,
          tax_region, gst_number, gst_address, company_name,
          sync_status, synced_at
        )
        VALUES (
          @bill_no, @branch_code, @terminal_code, @cashier_id,
          @customer_id, @customer_name, @customer_mobile,
          @total_qty, @gross_amount, @total_discount,
          @taxable_value, @total_tax, @round_off, @grand_total,
          @payment_mode, @amount_received, @transaction_ref,
          @cart_items, @time, @integrity_hash,
          @month_range, @hour_range, @fin_year, @financial_year, @doc_type,
          @tax_region, @gst_number, @gst_address, @company_name,
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
          print_desc, schm_type, schm_camp_grp, hsn_code,
          month_range, hour_range, fin_year, financial_year
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  const insertMpmKey = `insertMpm_${fy_code}`;
  if (!stmtCache[insertMpmKey]) {
    stmtCache[insertMpmKey] = db.prepare(`
      INSERT INTO ${MPM} (
        invoice_no, customer_id, branch_code, counter_code,
        financial_year, fin_year, fy_code, month_range, hour_range,
        mode, amount, edc_terminal_id, edc_tid, edc_mid, upi_vpa,
        paytm_merchant_txn_id, paytm_order_id, paytm_rrn, paytm_response_code, paytm_response_msg,
        issuer_masked_card_no, issuing_bank_name, pay_method,
        rrn, auth_code, card_last4, status, synced, pos_created_at, pos_bill_saved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  const payload = {
    ...data,
    customer_id: data.customer_id || null,
    tax_region: data.tax_region || null,
    gst_number: data.gst_number || null,
    gst_address: data.gst_address || null,
    company_name: data.company_name || null,
    cart_items:
      typeof data.cart_items === "string"
        ? data.cart_items
        : JSON.stringify(data.cart_items || []),
    time: data.time || dateObj.toISOString(),
    month_range,
    hour_range,
    fin_year,
    financial_year,
    doc_type:
      data.doc_type || (data.bill_no && data.bill_no.startsWith("B") ? 3 : 1),
  };

  const hashData = {
    bill_no: payload.bill_no,
    branch_code: payload.branch_code,
    total_qty: payload.total_qty,
    grand_total: payload.grand_total,
    payment_mode: payload.payment_mode,
    cart_items: payload.cart_items,
    time: payload.time,
  };

  if (!payload.integrity_hash) {
    payload.integrity_hash = generateHash(hashData);
  }

  const trx = db.transaction(() => {
    const result = stmtCache[insertSyncedTxnKey].run(payload);
    const txnId = result.lastInsertRowid;

    const items =
      typeof data.cart_items === "string"
        ? JSON.parse(data.cart_items)
        : data.cart_items || [];

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
        item.hsn_code || null,
        month_range,
        hour_range,
        fin_year,
        financial_year,
      );
    }

    const payments =
      data.payments && data.payments.length > 0
        ? data.payments
        : [
            {
              mode: payload.payment_mode || "cash",
              amount: payload.amount_received || payload.grand_total || 0,
            },
          ];

    for (const p of payments) {
      stmtCache[insertMpmKey].run(
        payload.bill_no,
        payload.customer_id,
        payload.branch_code,
        payload.terminal_code,
        payload.financial_year,
        payload.fin_year,
        fy_code,
        payload.month_range,
        payload.hour_range,
        p.mode || "cash",
        p.amount || 0,
        p.edc_terminal_id || null,
        p.edc_tid || null,
        p.edc_mid || null,
        p.upi_vpa || null,
        p.paytm_merchant_txn_id || null,
        p.paytm_order_id || null,
        p.paytm_rrn || null,
        p.paytm_response_code || null,
        p.paytm_response_msg || null,
        p.issuer_masked_card_no || null,
        p.issuing_bank_name || null,
        p.pay_method || null,
        p.rrn || null,
        p.auth_code || null,
        p.card_last4 || null,
        p.status || "success",
        1, // synced status (1 = already synced from API)
        p.created_at || payload.time,
        payload.time,
      );
    }

    return txnId;
  });

  try {
    const txnId = trx();

    // 🚀 Keep sequence updated for synced transactions
    if (txnId) {
      let current_number = payload.current_number || 0;
      if (!current_number && payload.bill_no) {
        if (payload.bill_no.includes("-")) {
          current_number = parseInt(payload.bill_no.split("-")[1], 10);
        } else if (payload.bill_no.length >= 6) {
          current_number = parseInt(payload.bill_no.slice(-6), 10);
        }
      }

      if (!isNaN(current_number) && current_number > 0) {
        const isB2B = payload.bill_no.startsWith("B");
        updateInvoiceRunningNumber({
          branch_code: payload.branch_code,
          terminal_code: payload.terminal_code,
          fy_code: fy_code || "",
          user_id: payload.cashier_id,
          current_number: current_number,
          doc_type: payload.doc_type || (isB2B ? 2 : 1),
          sync_status: 1,
        });
        triggerInvoiceSync(fy_code || "");
      }
    }
    return txnId;
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
    row.cart_items =
      typeof row.cart_items === "string"
        ? JSON.parse(row.cart_items)
        : row.cart_items;
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
  // Exception: Allow if bill_no is provided (specific lookup)
  if (!searchFilters.branch_code && !searchFilters.bill_no) {
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

  if (searchFilters.isB2B !== undefined) {
    if (searchFilters.isB2B === true || searchFilters.isB2B === "true") {
      conditions.push("bill_no LIKE 'B%'");
    } else {
      conditions.push("bill_no NOT LIKE 'B%'");
    }
  }

  // Handle user_id (frontend) mapping to cashier_id (database)
  if (
    searchFilters.user_id !== undefined &&
    searchFilters.user_id !== null &&
    searchFilters.user_id !== ""
  ) {
    conditions.push("cashier_id = ?");
    params.push(searchFilters.user_id);
  } else if (
    searchFilters.cashier_id !== undefined &&
    searchFilters.cashier_id !== null &&
    searchFilters.cashier_id !== ""
  ) {
    conditions.push("cashier_id = ?");
    params.push(searchFilters.cashier_id);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += " ORDER BY id DESC LIMIT 1";

  const row = db.prepare(query).get(...params);
  const parsed = parseTransaction(row);
  if (parsed) {
    try {
      const MPM = getMpmTableName(fy_code);
      parsed.payments = db
        .prepare(`SELECT * FROM ${MPM} WHERE invoice_no = ?`)
        .all(parsed.bill_no);
    } catch (e) {
      parsed.payments = [];
    }
  }
  return parsed;
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
  // Exception: Allow if bill_no is provided (specific lookup)
  if (!searchFilters.branch_code && !searchFilters.bill_no) {
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

  if (searchFilters.isB2B !== undefined) {
    if (searchFilters.isB2B === true || searchFilters.isB2B === "true") {
      conditions.push("bill_no LIKE 'B%'");
    } else {
      conditions.push("bill_no NOT LIKE 'B%'");
    }
  }

  // Handle user_id (frontend) mapping to cashier_id (database)
  if (
    searchFilters.user_id !== undefined &&
    searchFilters.user_id !== null &&
    searchFilters.user_id !== ""
  ) {
    conditions.push("cashier_id = ?");
    params.push(searchFilters.user_id);
  } else if (
    searchFilters.cashier_id !== undefined &&
    searchFilters.cashier_id !== null &&
    searchFilters.cashier_id !== ""
  ) {
    conditions.push("cashier_id = ?");
    params.push(searchFilters.cashier_id);
  }

  if (searchFilters.bill_no) {
    conditions.push("bill_no = ?");
    params.push(searchFilters.bill_no);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += " ORDER BY id DESC";

  const rows = db.prepare(query).all(...params);

  const MPM = getMpmTableName(fy_code);
  let mpmStmt;
  try {
    mpmStmt = db.prepare(`SELECT * FROM ${MPM} WHERE invoice_no = ?`);
  } catch (e) {}

  return rows.map((row) => {
    const parsed = parseTransaction(row);
    if (mpmStmt) {
      try {
        parsed.payments = mpmStmt.all(parsed.bill_no);
      } catch (e) {
        parsed.payments = [];
      }
    }
    return parsed;
  });
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

export const getPendingQueueCount = (fy_code) => {
  if (!fy_code) return 0;
  const result = db
    .prepare(
      `SELECT COUNT(*) as count FROM sync_queue WHERE fy_code = ? AND status = 0 AND sync_attempts < 5`,
    )
    .get(fy_code);
  return result ? result.count : 0;
};

export const getPendingTransactions = (
  limit = 50,
  fy_code,
  forLogout = false,
) => {
  if (!fy_code) return [];
  initTransactionTables(fy_code);
  const TABLE = getTableName(fy_code);

  const attemptsCondition = forLogout
    ? "AND sync_attempts = 0"
    : "AND sync_attempts < 5";

  // Fetch from the optimized sync_queue instead of scanning the full JSON-heavy table
  const queueItems = db
    .prepare(
      `
    SELECT transaction_id, sync_attempts FROM sync_queue
    WHERE fy_code = ? AND status = 0 ${attemptsCondition}
    ORDER BY sync_attempts ASC, id DESC LIMIT ?
  `,
    )
    .all(fy_code, limit);

  if (!queueItems.length) return [];

  const ids = queueItems.map((q) => q.transaction_id);
  const placeholders = ids.map(() => "?").join(",");

  const rows = db
    .prepare(`SELECT * FROM ${TABLE} WHERE id IN (${placeholders})`)
    .all(...ids);

  const MPM = getMpmTableName(fy_code);
  let mpmStmt;
  try {
    mpmStmt = db.prepare(`SELECT * FROM ${MPM} WHERE invoice_no = ?`);
  } catch (e) {}

  return rows.map((row) => {
    const parsed = parseTransaction(row);
    const qItem = queueItems.find((q) => q.transaction_id === row.id);
    if (qItem) parsed.sync_attempts = qItem.sync_attempts; // Keep queue attempts as source of truth

    if (mpmStmt) {
      try {
        parsed.payments = mpmStmt.all(parsed.bill_no);
      } catch (e) {
        parsed.payments = [];
      }
    }

    return parsed;
  });
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

  // Remove from queue completely upon success
  db.prepare(
    `DELETE FROM sync_queue WHERE fy_code = ? AND transaction_id = ?`,
  ).run(fy_code, id);
};

export const markTransactionFailed = (id, fy_code) => {
  if (!fy_code) return;
  const TABLE = getTableName(fy_code);
  const key = `markFailed_${fy_code}`;
  if (!stmtCache[key]) {
    stmtCache[key] = db.prepare(`
      UPDATE ${TABLE}
      SET sync_status = -1
      WHERE id = ?
    `);
  }
  stmtCache[key].run(id);

  // Remove from queue completely upon failure so it stops retrying
  db.prepare(
    `DELETE FROM sync_queue WHERE fy_code = ? AND transaction_id = ?`,
  ).run(fy_code, id);
};

export const lockTransactionsSqlite = (ids, fy_code) => {
  if (!fy_code || !ids || !ids.length) return;
  const TABLE = getTableName(fy_code);
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(
    `
    UPDATE ${TABLE}
    SET sync_status = 2
    WHERE id IN (${placeholders})
  `,
  ).run(...ids);

  // Lock in queue as well
  db.prepare(
    `
    UPDATE sync_queue SET status = 2
    WHERE fy_code = ? AND transaction_id IN (${placeholders})
  `,
  ).run(fy_code, ...ids);
};

export const unlockTransactionsSqlite = (ids, fy_code) => {
  if (!fy_code || !ids || !ids.length) return;
  const TABLE = getTableName(fy_code);
  const placeholders = ids.map(() => "?").join(",");
  try {
    db.prepare(
      `
      UPDATE ${TABLE}
      SET sync_status = 0
      WHERE id IN (${placeholders}) AND sync_status = 2
    `,
    ).run(...ids);

    db.prepare(
      `
      UPDATE sync_queue SET status = 0
      WHERE fy_code = ? AND transaction_id IN (${placeholders}) AND status = 2
    `,
    ).run(fy_code, ...ids);
  } catch (err) {
    console.error("❌ Unlock Transactions Error:", err.message);
  }
};

export const resetStuckTransactionsSqlite = (fy_code) => {
  if (!fy_code) return;
  const TABLE = getTableName(fy_code);
  try {
    db.prepare(
      `UPDATE ${TABLE} SET sync_status = 0 WHERE sync_status = 2`,
    ).run();

    // Reset queue status
    db.prepare(
      `UPDATE sync_queue SET status = 0 WHERE status = 2 AND fy_code = ?`,
    ).run(fy_code);
  } catch (err) {
    // Ignore if table does not exist yet (first launch)
  }
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

  // Update queue failure count and release lock
  db.prepare(
    `
    UPDATE sync_queue SET sync_attempts = sync_attempts + 1, status = 0
    WHERE fy_code = ? AND transaction_id = ?
  `,
  ).run(fy_code, id);
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
    time: txn.time,
  };

  return generateHash(hashData) === txn.integrity_hash;
};

/* -------------------------------------------------------
   ARCHIVE OLD SYNCED DATA
------------------------------------------------------- */
export const archiveOldTransactions = (fy_code) => {
  if (!fy_code) return;
  const TABLE = getTableName(fy_code);
  db.prepare(
    `
    DELETE FROM ${TABLE}
    WHERE sync_status = 1
    AND created_at < datetime('now','-30 day')
  `,
  ).run();
};

/* -------------------------------------------------------
   BACKUP DATABASE (ROTATES LAST 7)
------------------------------------------------------- */
export const backupDatabase = (dbPath) => {
  const backupDir = path.join(path.dirname(dbPath), "backup");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

  const file = path.join(
    backupDir,
    `backup-${new Date().toISOString().slice(0, 10)}.db`,
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
  const MPM = getMpmTableName(fy_code);
  try {
    db.transaction(() => {
      db.prepare(`DELETE FROM ${ITEMS}`).run();
      db.prepare(`DELETE FROM ${TABLE}`).run();
      db.prepare(`DELETE FROM ${MPM}`).run();
      db.prepare(`DELETE FROM sqlite_sequence WHERE name='${ITEMS}'`).run();
      db.prepare(`DELETE FROM sqlite_sequence WHERE name='${TABLE}'`).run();
      db.prepare(`DELETE FROM sqlite_sequence WHERE name='${MPM}'`).run();
      db.prepare(`DELETE FROM sync_queue WHERE fy_code = ?`).run(fy_code);
    })();
  } catch (err) {
    console.error("❌ Clear Transactions Error:", err.message);
  }
};
