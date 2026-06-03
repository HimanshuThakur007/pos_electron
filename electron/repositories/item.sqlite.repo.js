import { db } from "../database/sqlite.js";

const TABLE_NAME = "items";
const TEMP_TABLE_NAME = "items_temp";

const COLUMNS = [
  "id",
  "itemCodePrefix",
  "itemCode",
  "itemName",
  "oldBarCode",
  "itemDesc",
  "signage_desc",
  "printDesc",
  "size",
  "packing",
  "innerPacking",
  "cartonPacking",
  "shadeName",
  "shadeCode",
  "supplierName",
  "supplierCode",
  "department",
  "category",
  "subCategory",
  "material",
  "brand",
  "subClass",
  "priceRange",
  "gstCategory",
  "taxRate",
  "powerPrice",
  "activeInactive",
  "launchMonth",
  "basicRate",
  "purchaseRate",
  "saleRate",
  "mrp",
  "expImpSur",
  "itemType",
  "hsn_code",
  "CBM",
  "STORE_FORMAT",
  "fileName",
  "newfileName",
  "created_on",
  "status",
  "status_1",
  "promo_type",
  "wms_dept",
  "buy_permission",
  "Location_Permission",
  "updatedOn",
  "updatedBy",
  "Del_Time_By_Vendor",
  "Grn_Make_Time",
  "wh_stock_days",
];

/* ======================================================
   CREATE TEMP TABLE (SQLite)
====================================================== */
export const createTempItemsTableSqlite = () => {
  try {
    db.prepare(`DROP TABLE IF EXISTS ${TEMP_TABLE_NAME}`).run();

    const sql = `
      CREATE TABLE ${TEMP_TABLE_NAME} (
        itemCode TEXT PRIMARY KEY,
        id INTEGER,
        itemCodePrefix TEXT,
        itemName TEXT,
        oldBarCode TEXT,
        itemDesc TEXT,
        signage_desc TEXT,
        printDesc TEXT,
        size TEXT,
        packing TEXT,
        innerPacking TEXT,
        cartonPacking TEXT,
        shadeName TEXT,
        shadeCode TEXT,
        supplierName TEXT,
        supplierCode TEXT,
        department TEXT,
        category TEXT,
        subCategory TEXT,
        material TEXT,
        brand TEXT,
        subClass TEXT,
        priceRange TEXT,
        gstCategory TEXT,
        taxRate REAL,
        powerPrice TEXT,
        activeInactive TEXT,
        launchMonth TEXT,
        basicRate REAL,
        purchaseRate REAL,
        saleRate REAL,
        mrp REAL,
        expImpSur TEXT,
        itemType TEXT,
        hsn_code TEXT,
        CBM TEXT,
        STORE_FORMAT TEXT,
        fileName TEXT,
        newfileName TEXT,
        created_on TEXT,
        status TEXT,
        status_1 INTEGER,
        promo_type TEXT,
        wms_dept TEXT,
        buy_permission INTEGER,
        Location_Permission INTEGER,
        updatedOn TEXT,
        updatedBy INTEGER,
        Del_Time_By_Vendor INTEGER,
        Grn_Make_Time INTEGER,
        wh_stock_days INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;
    db.prepare(sql).run();
  } catch (err) {
    console.error("❌ SQLite Create Items Table Error:", err.message);
  }
};

/* ======================================================
   UPSERT DATA (SQLite Transaction)
====================================================== */
export const insertItemsBulkSqlite = (items) => {
  if (!items || items.length === 0) return;

  console.log(
    `📥 Inserting ${items.length} items into SQLite temporary table...`,
  );

  try {
    const placeholders = COLUMNS.map(() => "?").join(", ");
    const columnNames = COLUMNS.join(", ");

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO ${TEMP_TABLE_NAME} (${columnNames}) VALUES (${placeholders})
    `);

    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        const values = COLUMNS.map((key) => {
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
    console.error("❌ SQLite Upsert Items Error:", err.message);
    throw err;
  }
};

/* ======================================================
   CREATE INDEXES (After Insert)
====================================================== */
export const createItemsIndexesSqlite = () => {
  try {
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_items_oldBarCode_temp ON ${TEMP_TABLE_NAME} (oldBarCode)`,
    ).run();
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_items_itemName_temp ON ${TEMP_TABLE_NAME} (itemName)`,
    ).run();
  } catch (err) {
    console.error("❌ SQLite Index Error:", err.message);
  }
};

/* ======================================================
   SWAP TABLES
====================================================== */
export const swapItemsTablesSqlite = () => {
  try {
    const backup = `${TABLE_NAME}_old`;

    const swapTransaction = db.transaction(() => {
      db.prepare(`DROP TABLE IF EXISTS ${backup}`).run();

      const tableExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(TABLE_NAME);
      if (tableExists) {
        db.prepare(`ALTER TABLE ${TABLE_NAME} RENAME TO ${backup}`).run();
      }

      db.prepare(
        `ALTER TABLE ${TEMP_TABLE_NAME} RENAME TO ${TABLE_NAME}`,
      ).run();
      db.prepare(`DROP TABLE IF EXISTS ${backup}`).run();
    });

    swapTransaction();
  } catch (err) {
    console.error("❌ SQLite Swap Error:", err.message);
    throw err;
  }
};

/* ======================================================
   READ DATA (Offline Support)
====================================================== */
export const getItemByCodeSqlite = (code) => {
  try {
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(TABLE_NAME);
    if (!tableExists) return null;

    return db
      .prepare(
        `SELECT * FROM ${TABLE_NAME} WHERE itemCode = ? OR oldBarCode = ?`,
      )
      .get(code, code);
  } catch (err) {
    console.error("❌ SQLite Get Item Error:", err.message);
    return null;
  }
};

/* ======================================================
   GET ALL DATA (All Items)
====================================================== */
export const getAllItemsSqlite = () => {
  try {
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(TABLE_NAME);
    if (!tableExists) return [];

    return db.prepare(`SELECT * FROM ${TABLE_NAME}`).all();
  } catch (err) {
    console.error("❌ SQLite Get All Items Error:", err.message);
    return [];
  }
};

/* ======================================================
   GET ITEM ANALYTICS
====================================================== */
export const getItemAnalyticsSqlite = () => {
  try {
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(TABLE_NAME);
    if (!tableExists) return { apiCount: 0, localDbCount: 0 };

    const result = db
      .prepare(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`)
      .get();
    const localDbCount = result ? result.count : 0;

    let apiCount = 0;
    const logTableExists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='wms_sync_logs'`,
      )
      .get();

    if (logTableExists) {
      const logRow = db
        .prepare(
          `SELECT message FROM wms_sync_logs WHERE status = 'SUCCESS_ITEMS' ORDER BY id DESC LIMIT 1`,
        )
        .get();
      if (logRow && logRow.message) {
        const match = logRow.message.match(/Synced (\d+) items/);
        if (match) {
          apiCount = parseInt(match[1], 10);
        }
      }
    }

    return {
      apiCount: apiCount || localDbCount, // Fallback to local count if no log found
      localDbCount,
    };
  } catch (err) {
    console.error("❌ Failed to get item analytics:", err.message);
    return { apiCount: 0, localDbCount: 0 };
  }
};

/* ======================================================
   GET COUNT
====================================================== */
export const getItemCountSqlite = () => {
  try {
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(TABLE_NAME);
    if (!tableExists) return 0;

    const result = db
      .prepare(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`)
      .get();
    const totalItems = result ? result.count : 0;
    console.log(`📦 Total items in SQLite database: ${totalItems}`);
    return totalItems;
  } catch (err) {
    console.error("❌ Failed to get item count:", err.message);
    return 0;
  }
};
