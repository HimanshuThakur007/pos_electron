import { db } from "../database/sqlite.js";

const TABLE_NAME = "cart_delete_logs";

export const initCartDeleteLogTable = () => {
  try {
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cart_item_id TEXT,
        item_code TEXT,
        item_name TEXT,
        print_desc TEXT,
        qty REAL,
        stock REAL,
        price REAL,
        discount REAL,
        tax REAL,
        manual_discount REAL,
        missing_qualifying_amount REAL,
        schm_type TEXT,
        schm_camp_grp TEXT,
        group_name TEXT,
        applied_qty REAL,
        branch_code TEXT,
        terminal_code TEXT,
        cashier_id TEXT,
        deleted_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `,
    ).run();

    // Migrations for existing table
    const addCol = (col, type) => {
      try {
        db.prepare(`ALTER TABLE ${TABLE_NAME} ADD COLUMN ${col} ${type}`).run();
      } catch (e) {}
    };
    addCol("cart_item_id", "TEXT");
    addCol("print_desc", "TEXT");
    addCol("stock", "REAL");
    addCol("discount", "REAL");
    addCol("tax", "REAL");
    addCol("manual_discount", "REAL");
    addCol("missing_qualifying_amount", "REAL");
    addCol("schm_type", "TEXT");
    addCol("schm_camp_grp", "TEXT");
    addCol("group_name", "TEXT");
    addCol("applied_qty", "REAL");

    console.log(`✅ ${TABLE_NAME} Table Initialized`);
  } catch (err) {
    console.error(`❌ Create ${TABLE_NAME} Table Error:`, err.message);
  }
};

export const logDeletedItemSqlite = (data) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO ${TABLE_NAME} (
        cart_item_id, item_code, item_name, print_desc, qty, stock, price, discount, tax,
        manual_discount, missing_qualifying_amount, schm_type, schm_camp_grp, group_name, applied_qty,
        branch_code, terminal_code, cashier_id, deleted_at
      ) VALUES (
        @cart_item_id, @item_code, @item_name, @print_desc, @qty, @stock, @price, @discount, @tax,
        @manual_discount, @missing_qualifying_amount, @schm_type, @schm_camp_grp, @group_name, @applied_qty,
        @branch_code, @terminal_code, @cashier_id, @deleted_at
      )
    `);

    stmt.run({
      cart_item_id: data.id || null,
      item_code: data.itemCode || null,
      item_name: data.itemName || null,
      print_desc: data.printDesc || null,
      qty: data.qty || 0,
      stock: data.stock || 0,
      price: data.price || 0,
      discount: data.discount || 0,
      tax: data.tax || 0,
      manual_discount: data.manualDiscount || 0,
      missing_qualifying_amount: data.missingQualifyingAmount || 0,
      schm_type: data.schm_type ? String(data.schm_type) : null,
      schm_camp_grp: data.schm_camp_grp || null,
      group_name: data.group_name || null,
      applied_qty: data.appliedQty || 0,
      branch_code: data.branchCode || null,
      terminal_code: data.terminalCode || null,
      cashier_id: data.cashierId || null,
      deleted_at: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.error("❌ Log Deleted Item Error:", err.message);
    return false;
  }
};
