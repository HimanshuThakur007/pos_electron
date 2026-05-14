import { db } from "../database/sqlite.js";

const TABLE_NAME = "m99_reg_offer";
const TEMP_TABLE_NAME = "m99_reg_offer_temp";

/* ======================================================
   CREATE TEMP TABLE (SQLite)
====================================================== */
export const createTempSchemeTableSqlite = (sampleItem) => {
  try {
    if (!sampleItem) {
      throw new Error("Sample item is null or undefined");
    }
    const keys = Object.keys(sampleItem);

    // Map types based on sample data
    const columnDefs = keys
      .filter((key) => {
        const k = key.toLowerCase();
        return k !== "id" && k !== "sync_created_at";
      })
      .map((key) => {
        const col = key.replace(/[^a-zA-Z0-9_]/g, "");
        let type = "TEXT";
        if (typeof sampleItem[key] === "number") {
          type = Number.isInteger(sampleItem[key]) ? "INTEGER" : "REAL";
        }
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
    console.error("❌ SQLite Create Scheme Table Error:", err.message);
    throw err;
  }
};

/* ======================================================
   INSERT DATA (SQLite Transaction)
====================================================== */
export const insertSchemesBulkSqlite = (items) => {
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
          if (val === undefined || val === null) return null;
          if (typeof val === "boolean") return val ? 1 : 0;
          if (typeof val === "object") return JSON.stringify(val);
          return val;
        });
        insertStmt.run(values);
      }
    });

    insertMany(items);
  } catch (err) {
    console.error("❌ SQLite Insert Schemes Error:", err.message);
    throw err;
  }
};

/* ======================================================
   SWAP TABLES (SQLite Atomic Swap)
====================================================== */
export const swapSchemeTablesSqlite = () => {
  try {
    const backup = `${TABLE_NAME}_old`;

    const swapTransaction = db.transaction(() => {
      // 1. Drop any existing backup table
      db.prepare(`DROP TABLE IF EXISTS ${backup}`).run();

      // 2. Rename current main table to backup (if it exists)
      const tableExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(TABLE_NAME);
      if (tableExists) {
        db.prepare(`ALTER TABLE ${TABLE_NAME} RENAME TO ${backup}`).run();
      }

      // 3. Rename temp table to main table
      db.prepare(
        `ALTER TABLE ${TEMP_TABLE_NAME} RENAME TO ${TABLE_NAME}`,
      ).run();

      // 4. Drop the backup table
      db.prepare(`DROP TABLE IF EXISTS ${backup}`).run();
    });

    swapTransaction();
  } catch (err) {
    console.error("❌ SQLite Swap Schemes Error:", err.message);
    throw err;
  }
};

/* ======================================================
   GET DATA
====================================================== */
export const getSchemesSqlite = () => {
  try {
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(TABLE_NAME);
    if (!tableExists) return [];

    const itemsTableExists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='items'`,
      )
      .get();

    const stockTableExists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='wms_stock_in_hand'`,
      )
      .get();

    let query = `
      SELECT 
        CASE CAST(schm_type AS TEXT)
          WHEN '1' THEN 'FLAT RS OFFER'
          WHEN '2' THEN 'PERCENT OFFER'
          WHEN '3' THEN 'POWER PRICE'
          WHEN '4' THEN 'BUY ANY GET ANY'
          WHEN '5' THEN 'BUY ANY @'
          WHEN '6' THEN 'NEW RATE OFFER'
          ELSE schm_type
        END as schm_type, 
        schm_camp_grp, group_name 
      FROM ${TABLE_NAME}`;

    if (itemsTableExists && stockTableExists) {
      query = `
        SELECT 
          t2.itemName, t2.itemCode, t2.printDesc, t2.department, t2.category, t2.subCategory,
          SUM(t3.Stock_Qty) as Stock_Qty,
          CASE CAST(t1.schm_type AS TEXT)
            WHEN '1' THEN 'FLAT RS OFFER'
            WHEN '2' THEN 'PERCENT OFFER'
            WHEN '3' THEN 'POWER PRICE'
            WHEN '4' THEN 'BUY ANY GET ANY'
            WHEN '5' THEN 'BUY ANY @'
            WHEN '6' THEN 'NEW RATE OFFER'
            ELSE t1.schm_type
          END as schm_type, 
          t1.schm_camp_grp, t1.group_name
        FROM ${TABLE_NAME} t1
        INNER JOIN items t2 ON t1.itm_code = t2.itemCode COLLATE NOCASE
        INNER JOIN wms_stock_in_hand t3 ON t1.itm_code = t3.LogicUserCode COLLATE NOCASE
        GROUP BY t1.id
      `;
    } else if (itemsTableExists) {
      query = `
        SELECT 
          t2.itemName, t2.itemCode, t2.printDesc, t2.department, t2.category, t2.subCategory,
          CASE CAST(t1.schm_type AS TEXT)
            WHEN '1' THEN 'FLAT RS OFFER'
            WHEN '2' THEN 'PERCENT OFFER'
            WHEN '3' THEN 'POWER PRICE'
            WHEN '4' THEN 'BUY ANY GET ANY'
            WHEN '5' THEN 'BUY ANY @'
            WHEN '6' THEN 'NEW RATE OFFER'
            ELSE t1.schm_type
          END as schm_type, 
          t1.schm_camp_grp, t1.group_name
        FROM ${TABLE_NAME} t1
        INNER JOIN items t2 ON t1.itm_code = t2.itemCode COLLATE NOCASE
      `;
    }

    const rows = db.prepare(query).all();
    console.log("🔗 Joined Scheme Data (first 5):", rows.slice(0, 5));
    console.log(
      `📊 Fetched Schemes Data (${rows.length} rows). Sample:`,
      rows.slice(0, 2),
    );
    return rows;
  } catch (err) {
    console.error("❌ SQLite Get Schemes Error:", err.message);
    return [];
  }
};

/* ======================================================
   GET COUNT
====================================================== */
export const getSchemesCountSqlite = () => {
  try {
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(TABLE_NAME);
    if (!tableExists) return 0;
    const result = db
      .prepare(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`)
      .get();
    return result ? result.count : 0;
  } catch (err) {
    console.error("❌ SQLite Get Schemes Count Error:", err.message);
    return 0;
  }
};
