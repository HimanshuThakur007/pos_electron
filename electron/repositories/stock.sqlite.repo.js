import { db } from "../database/sqlite.js";

const TABLE_NAME = "wms_stock_in_hand";
const TEMP_TABLE_NAME = "wms_stock_in_hand_temp";
const LOG_TABLE_NAME = "wms_sync_logs";

/* ======================================================
   READ DATA (Offline Support)
====================================================== */
export const getStockByLogicUserCodeSqlite = (logicUserCode) => {
  try {
    const searchCode = logicUserCode.trim();
    // Ensure table exists before querying to prevent crashes on fresh install
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(TABLE_NAME);
    if (!tableExists) return [];

    // Check if items table exists to safely join
    const itemsTableExists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='items'`,
      )
      .get();
    const offersTableExists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='m99_reg_offer'`,
      )
      .get();

    let query;
    let params;

    if (itemsTableExists) {
      let selectFields = `
          t1.*, 
          t2.itemCode as t2_itemCode, 
          t2.printDesc as t2_printDesc, 
          t2.taxRate as t2_taxRate,
          t2.hsn_code as t2_hsn_code
      `;

      let joinClause = `
        LEFT JOIN items t2 ON t1.LogicUserCode = t2.itemCode
      `;

      if (offersTableExists) {
        selectFields += `, t4.schm_type, t4.schm_camp_grp, t4.itm_code, t4.group_name`;
        joinClause += ` LEFT JOIN m99_reg_offer t4 ON t1.LogicUserCode = t4.itm_code COLLATE NOCASE`;
      }

      query = `
        SELECT ${selectFields}
        FROM ${TABLE_NAME} t1
        ${joinClause}
        WHERE t1.LogicUserCode = ? COLLATE NOCASE OR t1.AddlItemCode = ? COLLATE NOCASE
      `;
      params = [searchCode, searchCode];
      // console.log("params",params)
    } else {
      query = `SELECT * FROM ${TABLE_NAME} WHERE LogicUserCode = ? COLLATE NOCASE OR AddlItemCode = ? COLLATE NOCASE`;
      params = [searchCode, searchCode];
    }

    const rows = db.prepare(query).all(...params);

    if (!rows.length) return [];

    const groupedMap = {};

    for (const row of rows) {
      // Logic adapted from snippet: COALESCE and SUBSTRING_INDEX handled in JS
      const itemCode = row.t2_itemCode || row.LogicUserCode;

      let itemDesc = row.Item_Name;
      if (row.t2_printDesc) itemDesc = row.t2_printDesc;
      if (!itemDesc) itemDesc = row.Item_Name;

      const taxRate = row.t2_taxRate || 0;
      const hsn_code = row.t2_hsn_code || null;

      // Group ONLY by Lot_MRP
      const key = row.Lot_MRP;

      if (!groupedMap[key]) {
        groupedMap[key] = {
          ...row,
          itemCode,
          itemDesc,
          taxRate,
          hsn_code,
          Stock_Qty: 0,
          // Use a Set to store unique schemes for this item variant
          schemes: row.schm_camp_grp ? new Set([row.schm_camp_grp]) : new Set(),
        };
      } else if (row.schm_camp_grp) {
        groupedMap[key].schemes.add(row.schm_camp_grp);
      }

      groupedMap[key].Stock_Qty += Number(row.Stock_Qty || 0);
    }

    return Object.values(groupedMap).map((item) => ({
      ...item,
      Stock_Qty: Number(item.Stock_Qty).toFixed(2),
      schm_type: item.schm_type || null,
      // Join unique schemes back into a string
      schm_camp_grp:
        item.schemes && item.schemes.size > 0
          ? Array.from(item.schemes).join(" ")
          : null,
      group_name: item.group_name || null,
      itm_code: item.itm_code || null,
    }));
  } catch (err) {
    console.error("❌ SQLite Read Error:", err.message);
    return [];
  }
};

/* ======================================================
   GET ALL DATA (All Stock)
====================================================== */
// export const getAllStockSqlite = () => {
//   try {
//     const tableExists = db
//       .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
//       .get(TABLE_NAME);
//     if (!tableExists) return [];

//     return db.prepare(`SELECT * FROM ${TABLE_NAME}`).all();
//   } catch (err) {
//     console.error("❌ SQLite Get All Stock Error:", err.message);
//     return [];
//   }
// };

// Inside electron/repositories/stock.sqlite.repo.js

export const getAllStockSqlite = () => {
  try {
    const query = `
      SELECT *, SUM(Stock_Qty) as Stock_Qty
      FROM wms_stock_in_hand
      GROUP BY LogicUserCode, Lot_MRP
    `;
    return db.prepare(query).all();
  } catch (err) {
    console.error("❌ Failed to get all stocks:", err);
    return [];
  }
};

/* ======================================================
   GET COUNT
====================================================== */
export const getStockCountSqlite = (branchCode) => {
  try {
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(TABLE_NAME);
    if (!tableExists) return 0;

    let query = `
      SELECT COUNT(*) as count FROM (
        SELECT 1 FROM ${TABLE_NAME}
    `;
    const params = [];
    if (branchCode) {
      query += " WHERE Branch_Code = ?";
      params.push(branchCode);
    }
    query += " GROUP BY LogicUserCode, Lot_MRP)";

    const result = db.prepare(query).get(...params);
    return result ? result.count : 0;
  } catch (err) {
    console.error("❌ SQLite Get Stock Count Error:", err.message);
    return 0;
  }
};

/* ======================================================
   CREATE TEMP TABLE (SQLite)
====================================================== */
export const createTempStockTableSqlite = (sampleItem) => {
  try {
    const keys = Object.keys(sampleItem);

    const INT_FIELDS = [
      "Branch_Code",
      "Lot_Code",
      "Godown_Code",
      "Item_Cf_1",
      "Item_Cf_2",
      "Item_Cf_3",
      "Bin_Code",
    ];

    const REAL_FIELDS = [
      "Stock_Qty",
      "Carton_Stock",
      "Lot_Sale_Rate",
      "Lot_Basic_Rate",
      "Lot_MRP",
      "Lot_SPRate2",
      "Lot_SPRate3",
      "Lot_SPRate4",
      "Item_Sale_Rate",
      "Item_MRP",
      "Lot_SPRate1",
    ];

    // Map MySQL types to SQLite types
    const columnDefs = keys
      .filter((key) => {
        const k = key.toLowerCase();
        return k !== "id" && k !== "sync_created_at";
      })
      .map((key) => {
        const col = key.replace(/[^a-zA-Z0-9_]/g, "");
        let type = "TEXT";
        if (INT_FIELDS.includes(key)) type = "INTEGER";
        else if (REAL_FIELDS.includes(key)) type = "REAL";
        return `"${col}" ${type} NULL`;
      });

    // Ensure we start with a fresh temp table (Drop if exists)
    db.prepare(`DROP TABLE IF EXISTS ${TEMP_TABLE_NAME}`).run();

    const sql = `
      CREATE TABLE ${TEMP_TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        ${columnDefs.join(", ")}
      )
    `;
    db.prepare(sql).run();
  } catch (err) {
    console.error("❌ SQLite Create Table Error:", err.message);
    throw err;
  }
};

/* ======================================================
   INSERT DATA (SQLite Transaction)
====================================================== */
export const insertStockInHandDataSqlite = (items) => {
  if (!items || items.length === 0) return;

  try {
    const keys = Object.keys(items[0]);
    const columns = keys
      .map((k) => `"${k.replace(/[^a-zA-Z0-9_]/g, "")}"`)
      .join(", ");
    const placeholders = keys.map(() => "?").join(", ");

    const insertStmt = db.prepare(`
      INSERT INTO ${TEMP_TABLE_NAME} (${columns}) VALUES (${placeholders})
    `);

    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        const values = keys.map((key) => {
          let val = row[key];
          if (val === undefined || val === null || val === "") return null;
          if (typeof val === "boolean") return val ? 1 : 0;
          if (val instanceof Date) return val.toISOString();
          if (typeof val === "object" && !Buffer.isBuffer(val))
            return JSON.stringify(val);
          return val;
        });
        insertStmt.run(values);
      }
    });

    insertMany(items);
  } catch (err) {
    console.error("❌ SQLite Insert Error:", err.message);
    throw err;
  }
};

/* ======================================================
   UPDATE STOCK (Decrease Qty)
====================================================== */
export const decreaseStockQtySqlite = (cartItems) => {
  if (!cartItems || cartItems.length === 0) return;

  try {
    // Find row by ID to ensure we only update ONE record (handling duplicates/multiple godowns)
    const findStmt = db.prepare(`
      SELECT id FROM ${TABLE_NAME} 
      WHERE (LogicUserCode = @itemCode OR AddlItemCode = @itemCode)
      AND ABS(Lot_MRP - @price) < 0.01
      LIMIT 1
    `);

    const updateStmt = db.prepare(`
      UPDATE ${TABLE_NAME}
      SET Stock_Qty = Stock_Qty - @qty
      WHERE id = @id
    `);

    const updateTransaction = db.transaction((items) => {
      for (const item of items) {
        const row = findStmt.get({
          itemCode: item.itemCode,
          price: item.price,
        });
        if (row) {
          updateStmt.run({ qty: item.qty, id: row.id });
        }
      }
    });

    updateTransaction(cartItems);
  } catch (err) {
    console.error("❌ SQLite Decrease Stock Error:", err.message);
    throw err;
  }
};

/* ======================================================
   CREATE INDEXES (After Insert for Speed)
====================================================== */
export const createStockIndexesSqlite = () => {
  try {
    // Index for LogicUserCode (SKU) - Case Insensitive
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_logic_user_code_temp ON ${TEMP_TABLE_NAME} (LogicUserCode COLLATE NOCASE)`,
    ).run();

    // Index for AddlItemCode (Barcode) - Case Insensitive
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_addl_item_code_temp ON ${TEMP_TABLE_NAME} (AddlItemCode COLLATE NOCASE)`,
    ).run();
  } catch (err) {
    console.error("❌ SQLite Index Error:", err.message);
  }
};

/* ======================================================
   SWAP TABLES (SQLite Atomic Swap)
====================================================== */
export const swapStockTablesSqlite = () => {
  try {
    const backup = `${TABLE_NAME}_old`;

    const swapTransaction = db.transaction(() => {
      // 1. Drop any existing backup table to avoid conflicts
      db.prepare(`DROP TABLE IF EXISTS ${backup}`).run();

      // 2. Rename current main table to backup (if it exists)
      const tableExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(TABLE_NAME);
      if (tableExists) {
        db.prepare(`ALTER TABLE ${TABLE_NAME} RENAME TO ${backup}`).run();
      }

      // 3. Rename temp table (containing ONLY new data) to main table
      db.prepare(
        `ALTER TABLE ${TEMP_TABLE_NAME} RENAME TO ${TABLE_NAME}`,
      ).run();

      // 4. Drop the backup table (permanently deleting old data)
      db.prepare(`DROP TABLE IF EXISTS ${backup}`).run();
    });

    swapTransaction();
  } catch (err) {
    console.error("❌ SQLite Swap Error:", err.message);
    throw err;
  }
};

/* ======================================================
   SYNC LOG (SQLite)
====================================================== */
export const insertSyncLogSqlite = (status, message) => {
  try {
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS ${LOG_TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT,
        message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `,
    ).run();
    db.prepare(
      `INSERT INTO ${LOG_TABLE_NAME} (status, message) VALUES (?, ?)`,
    ).run(status, message);
  } catch (err) {
    console.error("❌ SQLite Log Error:", err.message);
  }
};

export const getLastSyncLogSqlite = (status = null) => {
  try {
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(LOG_TABLE_NAME);
    if (!tableExists) return null;

    if (status) {
      return db
        .prepare(
          `SELECT * FROM ${LOG_TABLE_NAME} WHERE status = ? ORDER BY id DESC LIMIT 1`,
        )
        .get(status);
    }

    return db
      .prepare(`SELECT * FROM ${LOG_TABLE_NAME} ORDER BY id DESC LIMIT 1`)
      .get();
  } catch (err) {
    return null;
  }
};

export const clearStockSqlite = () => {
  try {
    db.prepare(`DELETE FROM ${TABLE_NAME}`).run();
    db.prepare(`DELETE FROM sqlite_sequence WHERE name='${TABLE_NAME}'`).run();
  } catch (err) {
    console.error("❌ SQLite Clear Stock Error:", err.message);
  }
};

export const clearSyncLogsSqlite = (onlyPreviousDays = false) => {
  try {
    if (onlyPreviousDays) {
      db.prepare(
        `DELETE FROM ${LOG_TABLE_NAME} WHERE date(created_at, 'localtime') < date('now', 'localtime')`,
      ).run();
    } else {
      db.prepare(`DELETE FROM ${LOG_TABLE_NAME}`).run();
      db.prepare(
        `DELETE FROM sqlite_sequence WHERE name='${LOG_TABLE_NAME}'`,
      ).run();
    }
  } catch (err) {
    console.error("❌ SQLite Clear Logs Error:", err.message);
  }
};
