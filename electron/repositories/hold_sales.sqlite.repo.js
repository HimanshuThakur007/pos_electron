import { db } from "../database/sqlite.js";

const TABLE_NAME = "hold_sales";

export const createHoldSalesTable = () => {
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_code TEXT,
        terminal_code TEXT,
        cashier_id INTEGER,
        customer_name TEXT,
        customer_mobile TEXT,
        cart_items TEXT,
        total_qty INTEGER,
        grand_total REAL,
        note TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    // Migration: Add new columns if they don't exist
    const addCol = (col, type) => {
      try { db.prepare(`ALTER TABLE ${TABLE_NAME} ADD COLUMN ${col} ${type}`).run(); } catch (e) {}
    };
    addCol("branch_code", "TEXT");
    addCol("terminal_code", "TEXT");
    addCol("cashier_id", "INTEGER");
  } catch (err) {
    console.error("❌ Create Held Sales Table Error:", err.message);
  }
};

export const insertHoldSaleSqlite = (data) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO ${TABLE_NAME} (
        branch_code, terminal_code, cashier_id,
        customer_name, customer_mobile, cart_items, total_qty, grand_total, note
      ) VALUES (
        @branch_code, @terminal_code, @cashier_id,
        @customer_name, @customer_mobile, @cart_items, @total_qty, @grand_total, @note
      )
    `);

    const payload = {
      branch_code: data.branch_code || "",
      terminal_code: data.terminal_code || "",
      cashier_id: data.cashier_id || 0,
      customer_name: data.customer_name || "Walk-in",
      customer_mobile: data.customer_mobile || "",
      cart_items: JSON.stringify(data.cart_items || []),
      total_qty: data.total_qty || 0,
      grand_total: data.grand_total || 0,
      note: data.note || ""
    };

    const info = stmt.run(payload);
    return info.lastInsertRowid;
  } catch (err) {
    console.error("❌ Insert Held Sale Error:", err.message);
    throw err;
  }
};

export const getHoldSalesSqlite = (filters = {}) => {
  try {
    let query = `SELECT * FROM ${TABLE_NAME}`;
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

    const rows = db.prepare(query).all(...params);
    return rows.map(row => ({
      ...row,
      cart_items: JSON.parse(row.cart_items || "[]")
    }));
  } catch (err) {
    console.error("❌ Get Held Sales Error:", err.message);
    return [];
  }
};

export const deleteHoldSaleSqlite = (id) => {
  try {
    db.prepare(`DELETE FROM ${TABLE_NAME} WHERE id = ?`).run(id);
    return true;
  } catch (err) {
    console.error("❌ Delete Held Sale Error:", err.message);
    return false;
  }
};

// Initialize table
createHoldSalesTable();
