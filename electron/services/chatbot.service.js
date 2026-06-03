import { db } from "../database/sqlite.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- Fuzzy Search Utilities ---
function getLevenshteinDistance(a, b) {
  const matrix = Array(a.length + 1)
    .fill(null)
    .map(() => Array(b.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }
  return matrix[a.length][b.length];
}

function fuzzyIncludes(text, phrase, tolerance = 2) {
  if (text.includes(phrase)) return true;
  const phraseWords = phrase.split(/\s+/);
  const textWords = text.split(/\W+/).filter(Boolean); // split by non-word chars

  if (phraseWords.length === 1) {
    return textWords.some((word) => {
      // Don't apply fuzzy match on very short words unless tolerance is adjusted
      const currentTolerance = word.length <= 4 ? 1 : tolerance;
      return (
        Math.abs(word.length - phrase.length) <= currentTolerance &&
        getLevenshteinDistance(word, phrase) <= currentTolerance
      );
    });
  } else {
    // Check sliding window for multi-word phrases
    for (let i = 0; i <= textWords.length - phraseWords.length; i++) {
      const window = textWords.slice(i, i + phraseWords.length).join(" ");
      const currentTolerance =
        window.length <= 6 ? 1 : tolerance + phraseWords.length - 1;
      if (getLevenshteinDistance(window, phrase) <= currentTolerance) {
        return true;
      }
    }
  }
  return false;
}

// --- Knowledge Base ---
const featureKnowledgeBase = [
  {
    keywords: ["shortcut", "key", "hotkey", "keyboard"],
    response:
      "Here are the supported keyboard shortcuts:\n- F2: Focus Quantity Input\n- F3: Clear Cart\n- F4: Remove Last Item\n- F6: New Sale (Clear Cart)\n- F8: Focus Cart Table\n- F10: Logout\n- Alt+P: Pay / Save Bill\n- Alt+H: Hold Sale\n- Alt+V: View Held Sales\n- Shift+D: Delete Selected Row\n- Esc: Clear Search / Close Modals",
  },
  {
    keywords: ["hold", "held", "resume", "pause"],
    response:
      "You can Hold a sale by pressing 'Alt+H' during billing. To view and resume held sales later, press 'Alt+V'.",
  },
  {
    keywords: ["sync", "offline", "background", "internet", "online"],
    response:
      "The POS is offline-first! Bills are saved locally and automatically sync in the background when the internet is back. You can also manually trigger syncs for Items, Stock, Schemes, and Branches from the Sync Dashboard.",
  },
  {
    keywords: ["export", "backup", "download", "csv", "excel", "secure"],
    response:
      "You can export a secure, encrypted backup of your data from the Sync Dashboard using the 'Secure Backup' button. You can also export Stocks and Schemes to CSV.",
  },
  {
    keywords: ["shift", "terminal", "session", "open", "close", "cash"],
    response:
      "Shift management lets you open a terminal session with an 'opening amount' and close it with a 'closing amount'. This syncs automatically with the server.",
  },
  {
    keywords: ["print", "receipt", "printer", "thermal", "reprint"],
    response:
      "The POS supports high-speed ESC/POS thermal printing. Receipts print automatically when you save a bill. To reprint a bill, go to the Sync Dashboard, select the bill, and click the Reprint icon.",
    image: "print_bill.png",
  },
  {
    keywords: ["b2b", "wholesale", "gst", "company"],
    response:
      "You can create B2B (wholesale) bills by entering the customer's GSTIN and Company Name during checkout. The system automatically handles IGST or CGST/SGST based on the tax region.",
  },
  {
    keywords: ["stock", "inventory", "item master"],
    response:
      "Stock, Items, and Schemes are downloaded automatically from the server. You can view your current stock in the Sync Dashboard under the 'Stocks' tab.",
  },
  {
    keywords: ["login", "offline login", "cache"],
    response:
      "Once you log in while online, your credentials are securely cached. You can log in later even if there is no internet connection.",
  },
  {
    keywords: ["power", "battery", "sleep", "protection"],
    response:
      "The POS has built-in Power Protection to prevent the system from sleeping during active billing or syncing. You can manage this from the system tray icon.",
  },
  {
    keywords: ["clear", "reset", "wipe", "delete data"],
    response:
      "You can reset the local database (wiping transactions and logs) from the Login screen footer, or by asking your admin to trigger a Secure Export before resetting.",
  },
];

// --- Intent Handlers ---

function handleGreetings(text) {
  const textWords = text.split(/\W+/).filter(Boolean);

  // Greetings & Help
  if (
    text === "hi" ||
    text === "hello" ||
    text === "hey" ||
    textWords.some((w) => ["hi", "hello", "hey", "help"].includes(w))
  ) {
    return "Hi there! 👋 I am your M99 POS Assistant. Ask me things like:\n- What are today's sales?\n- Price of [Item Code]\n- Stock of [Item Code]\n- Details of bill [Bill No]\n- Payment breakdown\n- What is my sync summary?\n- Scheme analytics\n- Offers on [Item Code]";
  }

  // Guide for placeholders
  if (text.includes("[item code]")) {
    return "To check an item's details, replace [Item Code] with your actual item code.\n\nFor example:\n- Price of MM10\n- Offers on 8901234567\n- Stock of MM10";
  }
  if (text.includes("[bill no]")) {
    return "To check a specific bill, replace [Bill No] with your actual bill number.\n\nFor example: 'Details of bill B-101'";
  }

  return null;
}

function handleSales(text, fyCode) {
  // Sales (Today / Yesterday)
  if (
    (fuzzyIncludes(text, "today") || fuzzyIncludes(text, "yesterday")) &&
    (fuzzyIncludes(text, "sale") ||
      fuzzyIncludes(text, "sales") ||
      fuzzyIncludes(text, "revenue") ||
      fuzzyIncludes(text, "number"))
  ) {
    if (!fyCode) return "Please log in first to view your offline sales data.";

    let tableName = `sl_head${fyCode}`;
    let tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName);

    if (!tableExists) {
      tableName = `sl_transaction${fyCode}`;
      tableExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(tableName);
    }

    if (!tableExists)
      return "No sales data found for the current financial year.";

    const columns = db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all()
      .map((c) => c.name.toLowerCase());
    const timeCol = columns.includes("time")
      ? "time"
      : columns.includes("created_at")
        ? "created_at"
        : null;
    if (!timeCol) return "Time data is not available offline.";
    const grandTotalCol = columns.includes("grand_total")
      ? "grand_total"
      : columns.includes("net_amount")
        ? "net_amount"
        : columns.includes("total_amount")
          ? "total_amount"
          : "0";

    const isYesterday = fuzzyIncludes(text, "yesterday");
    const dateFilter = isYesterday
      ? `date(${timeCol}) = date('now', '-1 day', 'localtime')`
      : `date(${timeCol}) = date('now', 'localtime')`;
    const dayLabel = isYesterday ? "Yesterday's" : "Today's";

    const result = db
      .prepare(
        `SELECT SUM(${grandTotalCol}) as total, COUNT(*) as count FROM ${tableName} WHERE ${dateFilter}`,
      )
      .get();
    return `${dayLabel} total sale is ₹${(result?.total || 0).toFixed(2)} across ${result?.count || 0} bills.`;
  }

  // Payment Mode Breakdown
  if (
    fuzzyIncludes(text, "payment breakdown") ||
    fuzzyIncludes(text, "payment method") ||
    fuzzyIncludes(text, "payment analytic") ||
    (fuzzyIncludes(text, "sale") && fuzzyIncludes(text, "mode"))
  ) {
    if (!fyCode) return "Please log in first to view your offline sales data.";

    let tableName = `sl_head${fyCode}`;
    let tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName);
    if (!tableExists) {
      tableName = `sl_transaction${fyCode}`;
      tableExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(tableName);
    }
    if (!tableExists)
      return "No sales data found for the current financial year.";

    const columns = db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all()
      .map((c) => c.name.toLowerCase());
    const timeCol = columns.includes("time")
      ? "time"
      : columns.includes("created_at")
        ? "created_at"
        : null;
    const hasPaymentMode =
      columns.includes("payment_mode") || columns.includes("mode");
    if (!timeCol || !hasPaymentMode)
      return "Payment mode data is not available offline.";

    const paymentCol = columns.includes("payment_mode")
      ? "payment_mode"
      : "mode";
    const grandTotalCol = columns.includes("grand_total")
      ? "grand_total"
      : columns.includes("net_amount")
        ? "net_amount"
        : columns.includes("total_amount")
          ? "total_amount"
          : "0";

    const rows = db
      .prepare(
        `SELECT ${paymentCol} as payment_mode, SUM(${grandTotalCol}) as total, COUNT(*) as count FROM ${tableName} WHERE date(${timeCol}) = date('now', 'localtime') GROUP BY ${paymentCol} ORDER BY total DESC`,
      )
      .all();

    if (!rows || rows.length === 0) return "No sales recorded yet for today.";

    let response = `💳 Today's Payment Breakdown:\n`;
    rows.forEach((row) => {
      const mode = row.payment_mode
        ? row.payment_mode.toUpperCase()
        : "UNKNOWN";
      response += `- ${mode}: ₹${(row.total || 0).toFixed(2)} (${row.count} bills)\n`;
    });
    return response;
  }

  // Top Products
  if (
    fuzzyIncludes(text, "top product") ||
    fuzzyIncludes(text, "best seller")
  ) {
    if (!fyCode) return "Please log in first to view top products.";

    let tableName = `sl_head${fyCode}`;
    let tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName);
    if (!tableExists) {
      tableName = `sl_transaction${fyCode}`;
      tableExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(tableName);
    }
    if (!tableExists)
      return "No sales data found for the current financial year.";

    const columns = db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all()
      .map((c) => c.name.toLowerCase());
    const timeCol = columns.includes("time")
      ? "time"
      : columns.includes("created_at")
        ? "created_at"
        : null;
    const cartCol = columns.includes("cart_items") ? "cart_items" : null;

    if (!timeCol || !cartCol)
      return "Required sales data is not available offline.";

    const rows = db
      .prepare(
        `SELECT ${cartCol} as cart_items FROM ${tableName} WHERE date(${timeCol}) = date('now', 'localtime')`,
      )
      .all();

    if (!rows || rows.length === 0)
      return "No sales recorded yet for today to determine top products.";

    const productCounts = {};
    rows.forEach((row) => {
      try {
        const items =
          typeof row.cart_items === "string"
            ? JSON.parse(row.cart_items)
            : row.cart_items;
        if (Array.isArray(items)) {
          items.forEach((item) => {
            const name = item.item_name || item.itemName || "Unknown Item";
            const qty = Number(item.qty || 1);
            productCounts[name] = (productCounts[name] || 0) + qty;
          });
        }
      } catch (e) {}
    });

    const sorted = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (sorted.length === 0) return "No item details found in today's sales.";

    let response = "📈 Today's Top Products:\n";
    sorted.forEach(([name, qty]) => {
      response += `- ${name}: ${qty} sold\n`;
    });
    return response;
  }

  return null;
}

function handleBills(text, fyCode) {
  // Last Bill Details
  if (
    fuzzyIncludes(text, "last bill") ||
    fuzzyIncludes(text, "recent bill") ||
    fuzzyIncludes(text, "last sale")
  ) {
    if (!fyCode) return "Please log in first.";

    const tablesToCheck = [`sl_head${fyCode}`, `sl_transaction${fyCode}`];
    let lastBill = null;
    let timeStr = "";

    for (const tName of tablesToCheck) {
      const tExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(tName);
      if (tExists) {
        const columns = db
          .prepare(`PRAGMA table_info(${tName})`)
          .all()
          .map((c) => c.name.toLowerCase());
        let billCol = null;
        if (columns.includes("bill_no")) billCol = "bill_no";
        else if (columns.includes("invoice_no")) billCol = "invoice_no";
        else if (columns.includes("billno")) billCol = "billno";
        else if (columns.includes("invoiceno")) billCol = "invoiceno";

        const timeCol = columns.includes("time")
          ? "time"
          : columns.includes("created_at")
            ? "created_at"
            : null;

        if (billCol && timeCol) {
          const paymentCol = columns.includes("payment_mode")
            ? "payment_mode"
            : columns.includes("mode")
              ? "mode"
              : "''";
          const grandTotalCol = columns.includes("grand_total")
            ? "grand_total"
            : columns.includes("net_amount")
              ? "net_amount"
              : columns.includes("total_amount")
                ? "total_amount"
                : "0";

          const bill = db
            .prepare(
              `SELECT ${billCol} as bill_no, ${grandTotalCol} as grand_total, ${paymentCol} as payment_mode, ${timeCol} as time FROM ${tName} ORDER BY ${timeCol} DESC LIMIT 1`,
            )
            .get();

          if (bill) {
            lastBill = bill;
            timeStr = new Date(bill.time).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            });
            break;
          }
        }
      }
    }

    if (!lastBill) return "No bills generated yet.";
    return `🧾 Last Bill Details:\n- Bill No: ${lastBill.bill_no}\n- Amount: ₹${Number(lastBill.grand_total).toFixed(2)}\n- Mode: ${lastBill.payment_mode?.toUpperCase() || "N/A"}\n- Time: ${timeStr}`;
  }

  // Specific Bill Query
  const billMatch = text.match(
    /(?:detail|info|show|find|search)?\s*(?:of\s+)?(?:bill|invoice|receipt)\s+([a-z0-9-]+)/i,
  );
  if (billMatch && billMatch[1]) {
    const billNo = billMatch[1].trim();
    if (!fyCode) return "Please log in first.";

    const tablesToCheck = [`sl_head${fyCode}`, `sl_transaction${fyCode}`];
    let foundBill = null;

    for (const tName of tablesToCheck) {
      const tExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(tName);
      if (tExists) {
        const columns = db
          .prepare(`PRAGMA table_info(${tName})`)
          .all()
          .map((c) => c.name.toLowerCase());
        let billCol = null;
        if (columns.includes("bill_no")) billCol = "bill_no";
        else if (columns.includes("invoice_no")) billCol = "invoice_no";
        else if (columns.includes("billno")) billCol = "billno";
        else if (columns.includes("invoiceno")) billCol = "invoiceno";

        if (billCol) {
          const bill = db
            .prepare(
              `SELECT * FROM ${tName} WHERE LOWER(${billCol}) = LOWER(?)`,
            )
            .get(billNo);
          if (bill) {
            foundBill = bill;
            break;
          }
        }
      }
    }

    if (!foundBill) return `Bill '${billNo.toUpperCase()}' not found locally.`;

    const timeStr = new Date(
      foundBill.time || foundBill.created_at || new Date(),
    ).toLocaleString("en-IN");
    const amount =
      foundBill.grand_total ||
      foundBill.net_amount ||
      foundBill.total_amount ||
      0;
    const qty = foundBill.total_qty || 0;
    const mode = foundBill.payment_mode || foundBill.mode || "N/A";
    const returnedBillNo =
      foundBill.bill_no ||
      foundBill.invoice_no ||
      foundBill.billno ||
      foundBill.invoiceno ||
      billNo;

    return `🧾 Bill ${returnedBillNo.toUpperCase()}:\n- Amount: ₹${Number(amount).toFixed(2)}\n- Items Qty: ${qty}\n- Mode: ${mode.toUpperCase()}\n- Date: ${timeStr}`;
  }

  return null;
}

function handleSync(text, fyCode) {
  // Pending Sync
  if (
    (fuzzyIncludes(text, "sync") ||
      fuzzyIncludes(text, "pending") ||
      fuzzyIncludes(text, "unsynced")) &&
    (fuzzyIncludes(text, "bill") ||
      fuzzyIncludes(text, "transaction") ||
      fuzzyIncludes(text, "how many") ||
      fuzzyIncludes(text, "status"))
  ) {
    if (!fyCode) return "Please log in to check sync status.";

    let tableName = `sl_transaction${fyCode}`;
    let tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName);

    if (!tableExists) {
      tableName = `sl_head${fyCode}`;
      tableExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(tableName);
    }

    if (tableExists) {
      let count = 0;
      try {
        count =
          db
            .prepare(
              `SELECT COUNT(*) as count FROM ${tableName} WHERE sync_status = 0`,
            )
            .get()?.count || 0;
      } catch (e) {
        try {
          count =
            db
              .prepare(
                `SELECT COUNT(*) as count FROM ${tableName} WHERE synced = 0`,
              )
              .get()?.count || 0;
        } catch (e2) {
          count = 0;
        }
      }
      return `You have ${count} transactions waiting in the offline queue to sync with the server.`;
    }
    return "You have 0 transactions waiting in the offline queue to sync with the server.";
  }

  // Sync Dashboard Summary (All Data)
  if (
    fuzzyIncludes(text, "sync summary") ||
    fuzzyIncludes(text, "all sync") ||
    fuzzyIncludes(text, "dashboard stats") ||
    fuzzyIncludes(text, "master data") ||
    (fuzzyIncludes(text, "sync") && fuzzyIncludes(text, "data"))
  ) {
    const getCount = (table) => {
      try {
        const exists = db
          .prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          )
          .get(table);
        return exists
          ? db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get()?.count ||
              0
          : 0;
      } catch (e) {
        return 0;
      }
    };

    const items = getCount("items");
    const branches = getCount("branches");
    const schemes = getCount("m99_reg_offer");
    const stock = getCount("wms_stock_in_hand");

    let pending = 0;
    if (fyCode) {
      let txTable = `sl_transaction${fyCode}`;
      let txExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(txTable);

      if (!txExists) {
        txTable = `sl_head${fyCode}`;
        txExists = db
          .prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          )
          .get(txTable);
      }

      if (txExists) {
        try {
          pending =
            db
              .prepare(
                `SELECT COUNT(*) as count FROM ${txTable} WHERE sync_status = 0`,
              )
              .get()?.count || 0;
        } catch (e) {
          try {
            pending =
              db
                .prepare(
                  `SELECT COUNT(*) as count FROM ${txTable} WHERE synced = 0`,
                )
                .get()?.count || 0;
          } catch (e2) {
            pending = 0;
          }
        }
      }
    }

    return `📊 Here is your Offline Sync Summary:\n- 📦 Items: ${items}\n- 🏢 Branches: ${branches}\n- 🏷️ Schemes: ${schemes}\n- 🗄️ Stock Records: ${stock}\n- ⏳ Pending Bills to Sync: ${pending}`;
  }

  return null;
}

function handleStockAndItems(text) {
  // Low Stock
  if (
    fuzzyIncludes(text, "low stock") ||
    fuzzyIncludes(text, "low inventory") ||
    fuzzyIncludes(text, "stock alert")
  ) {
    const exists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='wms_stock_in_hand'`,
      )
      .get();
    if (!exists) return "Stock data is not available offline yet.";

    const rows = db
      .prepare(
        `SELECT Item_Name as item_name, SUM(Stock_Qty) as total_qty FROM wms_stock_in_hand GROUP BY Item_Name HAVING SUM(Stock_Qty) > 0 AND SUM(Stock_Qty) <= 5 ORDER BY total_qty ASC LIMIT 5`,
      )
      .all();

    if (!rows || rows.length === 0)
      return "Great news! You don't have any items with critically low stock.";

    let response =
      "⚠️ Items with Low Stock (5 or fewer units):\n" +
      rows.map((r) => `- ${r.item_name}: ${r.total_qty} units left`).join("\n");
    return response;
  }

  // Out of Stock
  if (
    fuzzyIncludes(text, "out of stock") ||
    fuzzyIncludes(text, "zero stock") ||
    fuzzyIncludes(text, "empty stock")
  ) {
    const exists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='wms_stock_in_hand'`,
      )
      .get();
    if (!exists) return "Stock data is not available offline yet.";

    const rows = db
      .prepare(
        `SELECT Item_Name as item_name, SUM(Stock_Qty) as total_qty FROM wms_stock_in_hand GROUP BY Item_Name HAVING SUM(Stock_Qty) <= 0 ORDER BY total_qty ASC LIMIT 10`,
      )
      .all();

    if (!rows || rows.length === 0)
      return "Great news! You don't have any items completely out of stock.";

    return (
      "🚨 Out of Stock Alerts (0 units or less):\n" +
      rows.map((r) => `- ${r.item_name} (${r.total_qty} units)`).join("\n")
    );
  }

  // Total Stock Inventory
  if (
    fuzzyIncludes(text, "total stock") ||
    fuzzyIncludes(text, "how much stock")
  ) {
    const result = db
      .prepare(`SELECT SUM(Stock_Qty) as total FROM wms_stock_in_hand`)
      .get();
    return `You currently have ${result?.total || 0} units of stock available in your local database.`;
  }

  // Specific Item Stock
  const specificStockMatch = text.match(
    /(?:total\s+)?stock\s+(?:in|of|for)?\s*([a-z0-9_-]+)/i,
  );
  if (specificStockMatch && specificStockMatch[1]) {
    const itemCode = specificStockMatch[1].trim();
    const exists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='wms_stock_in_hand'`,
      )
      .get();
    if (!exists) return "Stock data is not available offline yet.";

    const columns = db
      .prepare(`PRAGMA table_info(wms_stock_in_hand)`)
      .all()
      .map((c) => c.name.toLowerCase());
    let whereClauses = [];
    let params = [];

    if (columns.includes("logicusercode")) {
      whereClauses.push("LOWER(LogicUserCode) = LOWER(?)");
      params.push(itemCode);
    }
    if (columns.includes("addlitemcode")) {
      whereClauses.push("LOWER(AddlItemCode) = LOWER(?)");
      params.push(itemCode);
    }

    if (whereClauses.length === 0)
      return "Item code columns not found in stock database.";

    const rows = db
      .prepare(
        `SELECT Lot_MRP, SUM(Stock_Qty) as total_qty, MAX(Item_Name) as item_name FROM wms_stock_in_hand WHERE ${whereClauses.join(" OR ")} GROUP BY Lot_MRP`,
      )
      .all(...params);

    if (!rows || rows.length === 0)
      return `No stock found for item '${itemCode}' in your local database.`;

    const itemName = rows[0].item_name || itemCode;
    let response = `📦 Stock for ${itemName} (${itemCode.toUpperCase()}):\n`;
    let grandTotal = 0;

    rows.forEach((row) => {
      response += `- MRP ₹${row.Lot_MRP}: ${row.total_qty} units\n`;
      grandTotal += row.total_qty;
    });

    if (rows.length > 1) {
      response += `\nTotal across all MRPs: ${grandTotal} units.`;
    }
    return response;
  }

  // Item Details (Price / MRP)
  const itemDetailsMatch = text.match(
    /(?:price|mrp|cost|detail|info)s?\s+(?:of|for|on)?\s*([a-z0-9_-]+)/i,
  );
  if (itemDetailsMatch && itemDetailsMatch[1]) {
    const itemCode = itemDetailsMatch[1].trim();
    const exists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='items'`,
      )
      .get();
    if (!exists) return "Item data is not available offline yet.";

    const columns = db
      .prepare(`PRAGMA table_info(items)`)
      .all()
      .map((c) => c.name.toLowerCase());
    let whereClauses = [];
    let params = [];

    if (columns.includes("itemcode")) {
      whereClauses.push("LOWER(itemCode) = LOWER(?)");
      params.push(itemCode);
    }
    if (columns.includes("item_code")) {
      whereClauses.push("LOWER(Item_Code) = LOWER(?)");
      params.push(itemCode);
    }

    if (whereClauses.length === 0)
      return "Item code column not found in database.";

    const rows = db
      .prepare(`SELECT * FROM items WHERE ${whereClauses.join(" OR ")}`)
      .all(...params);

    if (rows && rows.length > 0) {
      const item = rows[0];
      const itemName =
        item.itemName || item.Item_Name || item.item_name || "Unknown";
      const mrp = item.mrp || item.MRP || item.Mrp || 0;
      const price =
        item.price || item.sale_price || item.Sale_Price || item.Rate || 0;

      const imageUrl = item.image_url || item.imageUrl || null;
      const imgResponse = imageUrl ? `\n[IMAGE:${imageUrl}]` : "";

      return `🏷️ Item Details for ${itemCode.toUpperCase()}:\n- Name: ${itemName}\n- MRP: ₹${Number(mrp).toFixed(2)}\n- Sale Price: ₹${Number(price).toFixed(2)}${imgResponse}`;
    }
    return `No item found for code '${itemCode.toUpperCase()}' in the local database.`;
  }

  return null;
}

function handleMasterData(text) {
  // Specific Master Data Queries
  if (
    fuzzyIncludes(text, "item") &&
    (fuzzyIncludes(text, "total") ||
      fuzzyIncludes(text, "how many") ||
      fuzzyIncludes(text, "count"))
  ) {
    const exists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='items'`,
      )
      .get();
    const count = exists
      ? db.prepare(`SELECT COUNT(*) as count FROM items`).get()?.count
      : 0;
    return `You have ${count} items synced in your local database.`;
  }

  if (
    fuzzyIncludes(text, "branch") &&
    (fuzzyIncludes(text, "total") ||
      fuzzyIncludes(text, "how many") ||
      fuzzyIncludes(text, "count"))
  ) {
    const exists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='branches'`,
      )
      .get();
    const count = exists
      ? db.prepare(`SELECT COUNT(*) as count FROM branches`).get()?.count
      : 0;
    return `You have ${count} branches available in your local database.`;
  }

  if (
    (fuzzyIncludes(text, "scheme") || fuzzyIncludes(text, "offer")) &&
    (fuzzyIncludes(text, "total") ||
      fuzzyIncludes(text, "how many") ||
      fuzzyIncludes(text, "count"))
  ) {
    const exists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='m99_reg_offer'`,
      )
      .get();
    const count = exists
      ? db.prepare(`SELECT COUNT(*) as count FROM m99_reg_offer`).get()?.count
      : 0;
    return `You have ${count} active schemes/offers synced locally.`;
  }

  return null;
}

function handleSchemes(text) {
  // Scheme Analytics
  if (
    fuzzyIncludes(text, "scheme analytic") ||
    fuzzyIncludes(text, "offer analytic") ||
    fuzzyIncludes(text, "scheme stat") ||
    fuzzyIncludes(text, "scheme summary") ||
    fuzzyIncludes(text, "scheme insight") ||
    fuzzyIncludes(text, "offer insight")
  ) {
    const exists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='m99_reg_offer'`,
      )
      .get();
    if (!exists) return "Scheme data is not available offline yet.";

    const total =
      db.prepare(`SELECT COUNT(*) as count FROM m99_reg_offer`).get()?.count ||
      0;
    const columns = db
      .prepare(`PRAGMA table_info(m99_reg_offer)`)
      .all()
      .map((c) => c.name.toLowerCase());

    let activeCount = total;
    if (columns.includes("end_date")) {
      activeCount =
        db
          .prepare(
            `SELECT COUNT(*) as count FROM m99_reg_offer WHERE date(end_date) >= date('now')`,
          )
          .get()?.count || total;
    }

    let typeBreakdown;
    if (columns.includes("end_date")) {
      typeBreakdown = db
        .prepare(
          `SELECT schm_type, COUNT(*) as count, SUM(CASE WHEN date(end_date) >= date('now') THEN 1 ELSE 0 END) as active_count FROM m99_reg_offer GROUP BY schm_type ORDER BY count DESC`,
        )
        .all();
    } else {
      typeBreakdown = db
        .prepare(
          `SELECT schm_type, COUNT(*) as count FROM m99_reg_offer GROUP BY schm_type ORDER BY count DESC`,
        )
        .all();
    }

    let response = `📈 Scheme Analytics:\n- Total Schemes Synced: ${total}\n`;
    if (columns.includes("end_date")) {
      response += `- Active Schemes: ${activeCount}\n`;
      response += `- Expired Schemes: ${total - activeCount}\n`;
    }

    response += `\n📊 Breakdown by Type:\n`;
    const typeNames = {
      1: "Flat Amount Off (Type 1)",
      2: "Percentage Off (%) (Type 2)",
      3: "Promo Price / PP (Type 3)",
      4: "BOGO / Buy X Get Y (Type 4)",
      5: "Combo / X IN Y (Type 5)",
      6: "Fixed Price Markdown (Type 6)",
    };

    typeBreakdown.forEach((row) => {
      const typeName = typeNames[row.schm_type] || `Type ${row.schm_type}`;
      if (columns.includes("end_date")) {
        response += `- ${typeName}: ${row.count} items (Active: ${row.active_count || 0})\n`;
      } else {
        response += `- ${typeName}: ${row.count} items\n`;
      }
    });

    return response;
  }

  // Specific Item Schemes
  const itemSchemeMatch = text.match(
    /(?:what is the\s+)?(?:which\s+)?(?:scheme|offer)s?(?:\s+is)?(?:\s+applied)?\s+(?:(?:for|on|in|to)\s+)?([a-z0-9_-]+)/i,
  );
  if (itemSchemeMatch && itemSchemeMatch[1]) {
    const itemCode = itemSchemeMatch[1].trim();
    const exists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='m99_reg_offer'`,
      )
      .get();
    if (!exists) return "Scheme data is not available offline yet.";

    const columns = db
      .prepare(`PRAGMA table_info(m99_reg_offer)`)
      .all()
      .map((c) => c.name.toLowerCase());
    let codeCol = null;
    if (columns.includes("itm_code")) codeCol = "itm_code";
    else if (columns.includes("item_code")) codeCol = "item_code";
    if (!codeCol) return "Item code column not found in scheme database.";

    const rows = db
      .prepare(
        `SELECT schm_camp_grp, schm_type, group_name FROM m99_reg_offer WHERE LOWER(${codeCol}) = LOWER(?)`,
      )
      .all(itemCode);

    if (!rows || rows.length === 0) {
      return `No active schemes found for item '${itemCode.toUpperCase()}'.`;
    }

    let response = `🏷️ Offers for ${itemCode.toUpperCase()}:\n`;
    const typeNames = {
      1: "Flat Discount",
      2: "Percentage Discount",
      3: "Promo Price (PP)",
      4: "Buy X Get Y",
      5: "Combo Offer",
      6: "Fixed Markdown",
    };

    rows.forEach((row) => {
      const schemeName =
        row.group_name || row.schm_camp_grp || "Unnamed Scheme";
      const typeName = typeNames[row.schm_type] || `Type ${row.schm_type}`;
      response += `- ${schemeName} (${typeName})\n`;
    });

    return response;
  }

  return null;
}

function handleInsights(text, fyCode) {
  // Peak Hour Detection
  if (
    fuzzyIncludes(text, "peak hour") ||
    fuzzyIncludes(text, "busiest time") ||
    fuzzyIncludes(text, "rush hour")
  ) {
    if (!fyCode) return "Please log in first to view insights.";

    let tableName = `sl_head${fyCode}`;
    let tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName);
    if (!tableExists) tableName = `sl_transaction${fyCode}`;
    tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName);
    if (!tableExists)
      return "No sales data found for the current financial year.";

    const columns = db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all()
      .map((c) => c.name.toLowerCase());
    const timeCol = columns.includes("time")
      ? "time"
      : columns.includes("created_at")
        ? "created_at"
        : null;
    const grandTotalCol = columns.includes("grand_total")
      ? "grand_total"
      : columns.includes("net_amount")
        ? "net_amount"
        : "0";
    const hourCol = columns.includes("hour_range") ? "hour_range" : null;

    if (!timeCol || !hourCol) return "Hour tracking is not available offline.";

    const result = db
      .prepare(
        `SELECT ${hourCol} as hour_range, SUM(${grandTotalCol}) as total, COUNT(*) as count FROM ${tableName} WHERE date(${timeCol}) = date('now', 'localtime') GROUP BY ${hourCol} ORDER BY total DESC LIMIT 1`,
      )
      .get();

    if (!result) return "Not enough sales data today to determine a peak hour.";

    return `⏱️ Today's Peak Hour is **${result.hour_range}**!\n- Revenue: ₹${(result.total || 0).toFixed(2)}\n- Bills Generated: ${result.count}\n\n💡 Pro Tip: Make sure your counters are fully staffed during this time!`;
  }

  // Sales Trend (Growth/Decline) vs Yesterday
  if (
    fuzzyIncludes(text, "sales trend") ||
    fuzzyIncludes(text, "compare yesterday") ||
    fuzzyIncludes(text, "doing better") ||
    fuzzyIncludes(text, "growth")
  ) {
    if (!fyCode) return "Please log in first to view insights.";

    let tableName = `sl_head${fyCode}`;
    let tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName);
    if (!tableExists) tableName = `sl_transaction${fyCode}`;
    tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName);
    if (!tableExists)
      return "No sales data found for the current financial year.";

    const columns = db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all()
      .map((c) => c.name.toLowerCase());
    const timeCol = columns.includes("time")
      ? "time"
      : columns.includes("created_at")
        ? "created_at"
        : null;
    const grandTotalCol = columns.includes("grand_total")
      ? "grand_total"
      : columns.includes("net_amount")
        ? "net_amount"
        : "0";

    const todayResult = db
      .prepare(
        `SELECT SUM(${grandTotalCol}) as total FROM ${tableName} WHERE date(${timeCol}) = date('now', 'localtime')`,
      )
      .get();
    const yesterdayResult = db
      .prepare(
        `SELECT SUM(${grandTotalCol}) as total FROM ${tableName} WHERE date(${timeCol}) = date('now', '-1 day', 'localtime')`,
      )
      .get();

    const today = todayResult?.total || 0;
    const yesterday = yesterdayResult?.total || 0;

    if (yesterday === 0) {
      return `Yesterday's sales were ₹0. Today you are at ₹${today.toFixed(2)}. You're already doing infinitely better! 🚀`;
    }

    const diff = today - yesterday;
    const percent = (Math.abs(diff) / yesterday) * 100;

    if (diff > 0) {
      return `📈 **Sales are UP!**\nToday's sales (₹${today.toFixed(2)}) are **${percent.toFixed(1)}% higher** than yesterday (₹${yesterday.toFixed(2)}). Great job! 🚀`;
    } else if (diff < 0) {
      return `📉 **Sales are Down**\nToday's sales (₹${today.toFixed(2)}) are currently **${percent.toFixed(1)}% lower** than yesterday (₹${yesterday.toFixed(2)}).`;
    } else {
      return `⚖️ **Sales are Identical**\nToday's sales are exactly the same as yesterday: ₹${today.toFixed(2)}.`;
    }
  }
  return null;
}

function handleKnowledgeBase(text) {
  for (const feature of featureKnowledgeBase) {
    if (feature.keywords.some((keyword) => fuzzyIncludes(text, keyword, 1))) {
      if (feature.image) {
        try {
          // The service file is in electron/services, image is in electron/botImages
          const imagePath = path.join(
            __dirname,
            "..",
            "botImages",
            feature.image,
          );
          if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = imageBuffer.toString("base64");
            const mimeType = path.extname(feature.image).slice(1); // 'png'
            const dataUri = `data:image/${mimeType};base64,${base64Image}`;
            return `${feature.response}\n[IMAGE:${dataUri}]`;
          }
        } catch (e) {
          console.error("Chatbot: Error reading image for knowledge base:", e);
        }
      }
      return feature.response;
    }
  }
  return null;
}

export function processChatbotQuery(query, fyCode) {
  const text = query.toLowerCase();

  return (
    handleGreetings(text) ||
    handleSales(text, fyCode) ||
    handleBills(text, fyCode) ||
    handleSync(text, fyCode) ||
    handleStockAndItems(text) ||
    handleMasterData(text) ||
    handleSchemes(text) ||
    handleInsights(text, fyCode) ||
    handleKnowledgeBase(text) ||
    "I'm sorry, I didn't quite understand that.\n\nI am your M99 POS Assistant! Ask me things like:\n- What are today's sales?\n- Price of [Item Code]\n- Stock of [Item Code]\n- Details of bill [Bill No]\n- Payment breakdown\n- What is my sync summary?\n- Scheme analytics\n- Offers on [Item Code]"
  );
}
