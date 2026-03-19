import {
  createTempStockTableSqlite,
  insertStockInHandDataSqlite,
  swapStockTablesSqlite,
  insertSyncLogSqlite,
  createStockIndexesSqlite,
  getLastSyncLogSqlite
} from "../repositories/stock.sqlite.repo.js";
import {
  createTempItemsTableSqlite,
  insertItemsBulkSqlite,
  createItemsIndexesSqlite,
  swapItemsTablesSqlite
} from "../repositories/item.sqlite.repo.js";
import {
  createTempSchemeTableSqlite,
  insertSchemesBulkSqlite,
  swapSchemeTablesSqlite
} from "../repositories/scheme.sqlite.repo.js";
import {
  createTempBranchTableSqlite,
  insertBranchesBulkSqlite,
  swapBranchTablesSqlite
} from "../repositories/branch.sqlite.repo.js";
// import config from "../config.cjs";

// const { API_BASE_URL, API_BASE_URL2 } = config;

export async function syncStockData(branchCode, isManual = false) {
  if (!branchCode) {
    // console.log("⚠️ No branch code provided. Skipping stock sync.");
    return;
  }

  const statusKey = `SUCCESS_STOCK_${branchCode}`;

  if (!isManual) {
    const lastLog = getLastSyncLogSqlite(statusKey);
    if (lastLog && lastLog.created_at) {
      const lastSyncDate = new Date(lastLog.created_at.replace(" ", "T") + "Z").toDateString();
      const today = new Date().toDateString();

      if (lastSyncDate === today) {
        console.log(`✅ Stock for branch ${branchCode} already synced today. Skipping auto-sync.`);
        return;
      }
    }
  }

  console.log(`🔄 Starting Stock Sync (API)... [Manual: ${isManual}]`);

  try {
    // 1. Prepare Credentials
    const username = "mWms";
    const password = "wms@123";
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');

    const payload = {
      // Branch_Codes: "",
      BranchShortNames: "",
      LogicUserCode: "",
      AddlItemCode: "",
      Godown_Name: "MAIN",
      RequestDate: "",
      Branch_Codes: branchCode,
    };
   console.log("payload",payload)
    // 2. Fetch data from external API
    const response = await fetch("https://market99.app/wmsApp/GetStockInHand", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();

    const items = Array.isArray(responseData)
      ? responseData
      : responseData?.GetData || responseData?.Data || [];

    if (!items || items.length === 0) {
      console.log("⚠️ No stock data found in API response.");
      insertSyncLogSqlite("SUCCESS", "No data found to sync.");
      return;
    }

    // 3. Write data to SQLite (Replica)
    createTempStockTableSqlite(items[0]);
    insertStockInHandDataSqlite(items);
    createStockIndexesSqlite();
    swapStockTablesSqlite();

    const msg = `Synced ${items.length} records successfully from API.`;
    console.log(`✅ ${msg}`);
    insertSyncLogSqlite(statusKey, msg);

  } catch (error) {
    console.error("❌ Sync Failed:", error.message);
    insertSyncLogSqlite("ERROR", error.message);
  }
}

// ===================================item-sync===========================================
export async function syncItemsData(isManual = false) {
  if (!isManual) {
    const lastLog = getLastSyncLogSqlite('SUCCESS_ITEMS');
    if (lastLog && lastLog.created_at) {
      const lastSyncDate = new Date(lastLog.created_at.replace(" ", "T") + "Z").toDateString();
      const today = new Date().toDateString();

      if (lastSyncDate === today) {
        console.log("✅ Items already synced today. Skipping auto-sync.");
        return;
      }
    }
  }

  console.log(`🔄 Starting Items Sync (API)... [Manual: ${isManual}]`);

  try {
    const externalApiUrl = 'https://market99.tech/api/item_master';
    const payload = {
      "access_key": "78f4d7d2-86b2-418e-b78c-482fadc4605e",
      "item_code": ""
    };

    const response = await fetch(externalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();

    // Determine if data is directly an array or inside a data property
    let itemsToSync = [];
    if (Array.isArray(responseData)) {
      itemsToSync = responseData;
    } else if (responseData && Array.isArray(responseData.data)) {
      itemsToSync = responseData.data;
    } else if (responseData && Array.isArray(responseData.items)) {
      itemsToSync = responseData.items;
    }

    if (!itemsToSync || itemsToSync.length === 0) {
      console.log("⚠️ No items found in API response.");
      insertSyncLogSqlite("SUCCESS_ITEMS", "No items found to sync.");
      return;
    }

    createTempItemsTableSqlite();

    // Process in batches
    const BATCH_SIZE = 2000;
    let totalSynced = 0;

    for (let i = 0; i < itemsToSync.length; i += BATCH_SIZE) {
      const batch = itemsToSync.slice(i, i + BATCH_SIZE);
      
      // Normalize item_code and filter invalid items
      const validBatch = batch.map(item => {
        const code = item.itemCode || item.item_code || item.Item_Code || item.ItemCode || item.ITEM_CODE || item['Item Code'];
        if (!code) return null;
        return { ...item, itemCode: code };
      }).filter(Boolean);
      
      if (validBatch.length > 0) {
        insertItemsBulkSqlite(validBatch);
        totalSynced += validBatch.length;
      }
    }

    createItemsIndexesSqlite();
    swapItemsTablesSqlite();

    const msg = `Synced ${totalSynced} items successfully from API.`;
    console.log(`✅ ${msg}`);
    insertSyncLogSqlite("SUCCESS_ITEMS", msg);

  } catch (error) {
    console.error("❌ Items Sync Failed:", error.message);
    insertSyncLogSqlite("ERROR_ITEMS", error.message);
  }
}
// ==========================================scheme-sync=============================
export async function syncSchemesData(isManual = false) {
  if (!isManual) {
    const lastLog = getLastSyncLogSqlite('SUCCESS_SCHEMES');
    if (lastLog && lastLog.created_at) {
      const lastSyncDate = new Date(lastLog.created_at.replace(" ", "T") + "Z").toDateString();
      const today = new Date().toDateString();

      if (lastSyncDate === today) {
        console.log("✅ Schemes already synced today. Skipping auto-sync.");
        return;
      }
    }
  }

  console.log(`🔄 Starting Schemes Sync (API)... [Manual: ${isManual}]`);

  try {
    const externalApiUrl = 'https://market99.tech/api/reg_offer';
    const payload = {
      "access_key": "78f4d7d2-86b2-418e-b78c-482fadc4605e"
    };

    // Note: The native fetch API does not allow a body in a GET request.
    // We use POST here to safely pass the payload body, matching your other API endpoints.
    const response = await fetch(externalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    const responseData = await response.json();

    let items = [];
    if (Array.isArray(responseData)) {
      items = responseData;
    } else if (responseData && Array.isArray(responseData.data)) {
      items = responseData.data;
    } else if (responseData && Array.isArray(responseData.items)) {
      items = responseData.items;
    }

    if (!items || items.length === 0) {
      console.log("⚠️ No schemes data found in API response.");
      insertSyncLogSqlite("SUCCESS_SCHEMES", "No data found to sync.");
      return;
    }

    createTempSchemeTableSqlite(items[0]);
    insertSchemesBulkSqlite(items);
    swapSchemeTablesSqlite();

    const msg = `Synced ${items.length} schemes successfully from API.`;
    console.log(`✅ ${msg}`);
    insertSyncLogSqlite("SUCCESS_SCHEMES", msg);

  } catch (error) {
    console.error("❌ Schemes Sync Failed:", error.message);
    insertSyncLogSqlite("ERROR_SCHEMES", error.message);
  }
}

// ==========================================branch-sync=============================
export async function syncBranchesData(isManual = false) {
  if (!isManual) {
    const lastLog = getLastSyncLogSqlite('SUCCESS_BRANCHES');
    if (lastLog && lastLog.created_at) {
      const lastSyncDate = new Date(lastLog.created_at.replace(" ", "T") + "Z").toDateString();
      const today = new Date().toDateString();

      if (lastSyncDate === today) {
        console.log("✅ Branches already synced today. Skipping auto-sync.");
        return;
      }
    }
  }

  console.log(`🔄 Starting Branches Sync (API)... [Manual: ${isManual}]`);

  try {
    const externalApiUrl = 'https://www.market99.tech/api/branchmaster';
    const payload = {
      "access_key": "8c2d7f49-3a1b-4e6c-b72a-5f1a9e2c4d8b",
      "branch_code": ""
    };

    const response = await fetch(externalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();

    let items = [];
    if (Array.isArray(responseData)) {
      items = responseData;
    } else if (responseData && Array.isArray(responseData.data)) {
      items = responseData.data;
    } else if (responseData && Array.isArray(responseData.items)) {
      items = responseData.items;
    }

    if (!items || items.length === 0) {
      console.log("⚠️ No branches data found in API response.");
      insertSyncLogSqlite("SUCCESS_BRANCHES", "No data found to sync.");
      return;
    }

    createTempBranchTableSqlite(items[0]);
    insertBranchesBulkSqlite(items);
    swapBranchTablesSqlite();

    const msg = `Synced ${items.length} branches successfully from API.`;
    console.log(`✅ ${msg}`);
    insertSyncLogSqlite("SUCCESS_BRANCHES", msg);

  } catch (error) {
    console.error("❌ Branches Sync Failed:", error.message);
    insertSyncLogSqlite("ERROR_BRANCHES", error.message);
  }
}