import { ThermalPrinter, PrinterTypes } from "node-thermal-printer";
import { BrowserWindow } from "electron";
import fs from "fs";
import os from "os";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

let cachedPrinterName = null;

// ================= CONFIG =================
const LINE_WIDTH = 48; // ✅ FULL WIDTH FIXED

// ================= ALIGNMENT HELPERS =================
function line() {
  return "-".repeat(LINE_WIDTH);
}

function center(text = "") {
  text = text.toString();
  if (text.length >= LINE_WIDTH) return text.substring(0, LINE_WIDTH);
  const space = Math.floor((LINE_WIDTH - text.length) / 2);
  return " ".repeat(space) + text;
}

function leftRight(left = "", right = "") {
  left = left.toString();
  right = right.toString();
  const space = LINE_WIDTH - left.length - right.length;
  return left + " ".repeat(Math.max(0, space)) + right;
}

function col(text, width, align = "LEFT") {
  text = (text ?? "").toString();

  if (text.length > width) text = text.substring(0, width);

  if (align === "RIGHT") return text.padStart(width);
  if (align === "CENTER") {
    const space = width - text.length;
    const left = Math.floor(space / 2);
    return " ".repeat(left) + text + " ".repeat(space - left);
  }
  return text.padEnd(width);
}

function wrapText(text, width) {
  const words = text.split(" ");
  const lines = [];
  let current = "";

  words.forEach((w) => {
    if ((current + " " + w).trim().length > width) {
      lines.push(current);
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  });

  if (current) lines.push(current);
  return lines;
}

// ================= PRINTER HELPERS =================
// (UNCHANGED - your original code)

function resolvePrinterName(printerName) {
  if (os.platform() === "darwin") {
    const printerMap = {};
    return printerMap[printerName] || printerName;
  }
  return printerName;
}

async function checkMacPrinter(printerName) {
  try {
    const { stdout } = await execAsync("lpstat -p");
    return stdout.includes(printerName);
  } catch {
    return false;
  }
}

async function getPosPrinterName() {
  if (cachedPrinterName) return cachedPrinterName;

  const win = new BrowserWindow({ show: false });

  try {
    const printers = await win.webContents.getPrintersAsync();
    if (!printers?.length) throw new Error("No printers found");

    const target =
      printers.find((p) => p.name.toLowerCase().match(/epson|pos|receipt/)) ||
      printers.find((p) => p.isDefault) ||
      printers[0];

    cachedPrinterName = target.name;
    console.log("🖨️ Printer:", cachedPrinterName);

    return cachedPrinterName;
  } finally {
    win.destroy();
  }
}

// ================= RAW PRINT =================
async function printRawBuffer(buffer, printerName) {
  const finalPrinter = resolvePrinterName(printerName);
  const tmpFile = path.join(os.tmpdir(), `receipt_${Date.now()}.bin`);
  fs.writeFileSync(tmpFile, buffer);

  try {
    if (os.platform() === "win32") {
      const psFile = path.join(os.tmpdir(), `print_${Date.now()}.ps1`);

      const psScript = `
$printerName = "${finalPrinter}"
$filePath = "${tmpFile}"
$bytes = [System.IO.File]::ReadAllBytes($filePath)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, DOCINFOA di);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] bytes, int count, out int written);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  public class DOCINFOA {
    public string pDocName;
    public string pOutputFile;
    public string pDataType;
  }

  public static bool SendBytes(string printerName, byte[] bytes) {
    IntPtr hPrinter;
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return false;

    DOCINFOA di = new DOCINFOA();
    di.pDocName = "Receipt";
    di.pDataType = "RAW";

    StartDocPrinter(hPrinter, 1, di);
    StartPagePrinter(hPrinter);

    int written;
    WritePrinter(hPrinter, bytes, bytes.Length, out written);

    EndPagePrinter(hPrinter);
    EndDocPrinter(hPrinter);
    ClosePrinter(hPrinter);

    return true;
  }
}
"@

[RawPrinterHelper]::SendBytes($printerName, $bytes)
`;

      fs.writeFileSync(psFile, psScript);
      await execAsync(`powershell -ExecutionPolicy Bypass -File "${psFile}"`);
      fs.unlinkSync(psFile);
    } else {
      if (os.platform() === "darwin") {
        const exists = await checkMacPrinter(finalPrinter);
        if (!exists) throw new Error("Printer not found");
      }

      await execAsync(`lpr -l -P "${finalPrinter}" "${tmpFile}"`);
    }
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

// ================= MAIN PRINT =================
export async function printEscPosReceipt(data) {
  const startTime = Date.now();
  console.log("🖨️ ESC/POS Print Data:", JSON.stringify(data, null, 2));

  try {
    const printerName = await getPosPrinterName();

    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: "dummy",
      characterSet: "WPC1252",
      removeSpecialCharacters: false,
    });

    // Initialize printer and forcefully remove all side margins and padding
    printer.raw(Buffer.from([0x1b, 0x40])); // ESC @: Initialize printer to default state
    printer.alignLeft();
    printer.raw(Buffer.from([0x1d, 0x4c, 0x00, 0x00])); // GS L 0 0: explicitly set left margin to 0
    printer.raw(Buffer.from([0x1d, 0x57, 0x40, 0x02])); // GS W 64 2: stretch print area width to maximum (576 dots)

    const now = new Date();
    const time = now.toLocaleTimeString("en-IN");

    // ===== HEADER =====
    printer.bold(true);
    printer.println(center("TAX INVOICE"));
    printer.println(center(data.storeDetails.name));
    printer.bold(false);

    printer.println(center(data.storeDetails.address));
    printer.println(center(`GSTIN: ${data.storeDetails.gstin}`));
    printer.println(
      center(`CIN: ${data.storeDetails.cin || "U18204DL2008PTC175779"}`),
    );
    printer.println(center("info@market99.com, www.market99.com"));
    printer.println(
      center("Regd Off: D-153, Okhla Ph-1, N.D-20 Ph.No. 011-47366100"),
    );
    printer.println(center(`Contact: ${data.storeDetails.phone}`));

    printer.println(line());

    // ===== BILL =====
    printer.println(`Invoice No: ${data.billDetails.billNo}`);
    printer.println(
      leftRight(`Date: ${data.billDetails.date}`, `Time: ${time}`),
    );

    // ===== B2B Details =====
    const isB2B =
      data.billDetails.isB2B || data.billDetails.billNo.startsWith("B");
    if (isB2B) {
      printer.println(line());
      printer.bold(true);
      printer.println(center("B2B INVOICE DETAILS"));
      printer.bold(false);
      if (data.billDetails.company_name) {
        printer.bold(true);
        printer.print("Party Name: ");
        printer.bold(false);
        printer.println(data.billDetails.company_name);
      }
      if (data.billDetails.gst_address) {
        printer.bold(true);
        printer.print("Address: ");
        printer.bold(false);
        printer.println(data.billDetails.gst_address);
      }
      if (data.billDetails.customerGstin) {
        printer.bold(true);
        printer.print("Party GST No: ");
        printer.bold(false);
        printer.println(data.billDetails.customerGstin);
      }
      if (data.billDetails.tax_region) {
        const taxType =
          data.billDetails.tax_region === "IGST" ? "IGST" : "CGST/SGST";
        printer.println(`GST Type: ${taxType}`);
      }
    }

    printer.println(line());

    // ===== TABLE HEADER (FIXED WIDTHS)
    printer.bold(true);
    printer.println(col("Description", 34) + col("Hsn", 14, "RIGHT"));
    printer.println(
      col("Barcode", 10) +
        col("Qty", 6, "CENTER") +
        col("Price", 10, "RIGHT") +
        col("Disc", 10, "RIGHT") +
        col("Amount", 12, "RIGHT"),
    );
    printer.bold(false);

    printer.println(line());

    // ===== ITEMS =====
    const grouped = {};
    data.cart.forEach((item) => {
      const rate = item.tax || 0;
      if (!grouped[rate]) grouped[rate] = [];
      grouped[rate].push(item);
    });

    const sortedRates = Object.keys(grouped).sort((a, b) => a - b);

    for (const rate of sortedRates) {
      printer.bold(true);
      printer.println(`GST ${rate}%`);
      printer.bold(false);

      grouped[rate].forEach((item) => {
        const total = (item.price - item.discount) * item.qty;
        const lineDisc = item.discount * item.qty;
        const discStr = lineDisc > 0 ? `-${lineDisc.toFixed(2)}` : "0.00";
        console.log(lineDisc, "Line Discount");
        const descLines = wrapText(item.printDesc || item.itemName, 34);

        descLines.forEach((lineText, i) => {
          printer.println(
            col(lineText, 34) +
              col(i === 0 ? item.hsn_code || "610990" : "", 14, "RIGHT"),
          );
        });

        printer.println(
          col(item.itemCode, 10) +
            col(item.qty, 6, "CENTER") +
            col(item.price.toFixed(2), 10, "RIGHT") +
            col(discStr, 10, "RIGHT") +
            col(total.toFixed(2), 12, "RIGHT"),
        );

        printer.println(line());
      });
    }

    // ===== TOTAL =====
    printer.bold(true);
    printer.println(
      col(`Items:${data.cart.length}`, 16) +
        col(`Qty:${data.totals.totalQty}`, 16) +
        col(`Disc:${data.totals.totalDiscount.toFixed(2)}`, 16),
    );
    printer.bold(false);

    printer.println(line());

    printer.println(
      leftRight("Gross Sale Value", data.totals.grossAmount.toFixed(2)),
    );
    printer.println(leftRight("Tax", data.totals.totalTax.toFixed(2)));
    printer.println(leftRight("Round Off", data.totals.roundOff.toFixed(2)));

    printer.bold(true);
    printer.println(
      leftRight("Net Payable", data.totals.grandTotal.toFixed(2)),
    );
    printer.bold(false);

    printer.println(
      leftRight(
        "Received Amount",
        (data.totals.amountReceived || 0).toFixed(2),
      ),
    );
    printer.println(
      leftRight("Balance Paid", (data.totals.balance || 0).toFixed(2)),
    );

    printer.println(line());

    // ===== PAYMENT =====
    printer.bold(true);
    printer.println(center("Payment Details"));
    printer.bold(false);

    printer.println(
      col("Type", 12) +
        col("Reference No", 20, "CENTER") +
        col("Amount", 16, "RIGHT"),
    );

    printer.println(
      col(data.billDetails.paymentMode || "CASH", 12) +
        col(data.billDetails.transactionRef || "xxxxxxxxxxx", 20, "CENTER") +
        col(
          (data.totals.amountReceived || data.totals.grandTotal).toFixed(2),
          16,
          "RIGHT",
        ),
    );

    printer.println(line());

    // ===== TAX SUMMARY (FIXED)
    printer.bold(true);
    printer.println(center("Tax Summary"));
    printer.bold(false);

    const isIGST = data.billDetails.tax_region === "IGST";

    if (isIGST) {
      printer.println(
        col("Rate", 6) +
          col("Taxable", 14, "RIGHT") +
          col("IGST", 14, "RIGHT") +
          col("Total", 14, "RIGHT"),
      );
    } else {
      printer.println(
        col("Rate", 6) +
          col("Taxable", 12, "RIGHT") +
          col("CGST", 10, "RIGHT") +
          col("SGST", 10, "RIGHT") +
          col("Total", 10, "RIGHT"),
      );
    }

    const gstMap = {};
    data.cart.forEach((item) => {
      const rate = item.tax || 0;
      const total = (item.price - item.discount) * item.qty;
      const taxable = total / (1 + rate / 100);
      const tax = total - taxable;

      if (!gstMap[rate]) gstMap[rate] = { taxable: 0, tax: 0 };
      gstMap[rate].taxable += taxable;
      gstMap[rate].tax += tax;
    });

    Object.keys(gstMap).forEach((rate) => {
      const { taxable, tax } = gstMap[rate];

      if (isIGST) {
        printer.println(
          col(rate + "%", 6) +
            col(taxable.toFixed(2), 14, "RIGHT") +
            col(tax.toFixed(2), 14, "RIGHT") +
            col((taxable + tax).toFixed(2), 14, "RIGHT"),
        );
      } else {
        printer.println(
          col(rate + "%", 6) +
            col(taxable.toFixed(2), 12, "RIGHT") +
            col((tax / 2).toFixed(2), 10, "RIGHT") +
            col((tax / 2).toFixed(2), 10, "RIGHT") +
            col((taxable + tax).toFixed(2), 10, "RIGHT"),
        );
      }
    });

    printer.println(line());

    // ===== FOOTER (UNCHANGED)
    printer.println(
      "Any exchange will have to be made with in 30 days of Purchase in Sealed Original Packing.(12 TO 4 PM ONLY) No Guarantee/Warranty on Electrical/Electronic Items.",
    );

    printer.println(line());

    printer.bold(true);
    printer.println(center("THANK YOU FOR SHOPPING WITH US."));
    printer.println(center("HERE IS SOMETHING EXTRA FOR YOU!"));
    printer.println(center("SHOP AT WWW.MARKET99.COM"));
    printer.println(center("GET FLAT 10% OFF ON ORDERS OF RS.1499"));
    printer.println(center("USE CODE"));
    printer.bold(false);

    printer.println(center("| B84292KW65 |"));
    printer.println(center("**Coupon is Valid for 30 Days **"));

    printer.println(center("Thank you for shopping with us!"));

    printer.cut();

    const buffer = printer.getBuffer();
    const bufferTime = Date.now();
    await printRawBuffer(buffer, printerName);

    const endTime = Date.now();
    console.log(
      `⏱️ Print Speed: Buffer generated in ${bufferTime - startTime}ms, Sent to spooler in ${endTime - bufferTime}ms (Total: ${endTime - startTime}ms)`,
    );

    return { status: "success" };
  } catch (err) {
    console.error("❌ PRINT ERROR:", err);
    cachedPrinterName = null;
    return { status: "error", message: err.message };
  }
}
