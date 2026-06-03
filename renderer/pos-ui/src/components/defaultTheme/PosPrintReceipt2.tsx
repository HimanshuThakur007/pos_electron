import React from "react";

export interface PrintCartItem {
  id: string;
  itemCode: string;
  itemName: string;
  printDesc?: string;
  qty: number;
  price: number;
  discount: number;
  tax: number;
  hsn?: string;
}

export interface PosPrintReceiptProps {
  storeDetails: {
    name: string;
    address: string;
    phone: string;
    gstin: string;
    cin?: string;
  };
  billDetails: {
    billNo: string;
    date: string;
    cashier: string;
    customerName?: string;
    customerMobile?: string;
  };
  cart: PrintCartItem[];
  totals: {
    totalQty: number;
    grossAmount: number;
    totalDiscount: number;
    taxableValue: number;
    totalTax: number;
    roundOff: number;
    grandTotal: number;
  };
}

export const PosPrintReceipt2 = React.forwardRef<
  HTMLDivElement,
  PosPrintReceiptProps
>(({ storeDetails, billDetails, cart, totals }, ref) => {
  // Helper: Number to Words
  const numberToWords = (num: number) => {
    const a = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const b = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const inWords = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + " " + a[n % 10];
      if (n < 1000)
        return a[Math.floor(n / 100)] + " Hundred " + inWords(n % 100);
      if (n < 100000)
        return inWords(Math.floor(n / 1000)) + " Thousand " + inWords(n % 1000);
      if (n < 10000000)
        return inWords(Math.floor(n / 100000)) + " Lakh " + inWords(n % 100000);
      return (
        inWords(Math.floor(n / 10000000)) + " Crore " + inWords(n % 10000000)
      );
    };

    return inWords(Math.floor(num)) + " Only";
  };

  // GST Calculation
  const gstMap: Record<number, { taxable: number; tax: number }> = {};
  let grandTaxable = 0;
  let grandSGST = 0;
  let grandCGST = 0;
  let grandTotalGST = 0;

  cart.forEach((item) => {
    const rate = item.tax || 0;
    // Assuming price is exclusive of tax for calculation purposes in this context,
    // or we are deriving it. Using the logic from the provided snippet:
    const lineTotal = (item.price - item.discount) * item.qty;
    const taxable = lineTotal; // Simplified based on typical POS logic where lineTotal is taxable
    const taxAmt = (taxable * rate) / 100;

    if (!gstMap[rate]) {
      gstMap[rate] = { taxable: 0, tax: 0 };
    }
    gstMap[rate].taxable += taxable;
    gstMap[rate].tax += taxAmt;
  });

  // Re-sum for summary table
  Object.keys(gstMap).forEach((key) => {
    const rate = Number(key);
    const t = gstMap[rate];
    grandTaxable += t.taxable;
    grandSGST += t.tax / 2;
    grandCGST += t.tax / 2;
    grandTotalGST += t.taxable + t.tax;
  });

  const printNow = new Date();
  const printDateStr = printNow.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const printTimeStr = printNow.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div
      ref={ref}
      style={{
        width: "70mm",
        padding: "0",
        margin: "0 auto",
        fontFamily: "monospace",
        fontSize: "11px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
.center { text-align: center; }
.right { text-align: right; }
.left { text-align: left; }
.bold { font-weight: 700; }

.hr {
  border-top: 1px dashed #000;
  margin: 5px 0;
}

/* ===== MAIN ITEM TABLE ===== */
table.items {
  width: 100%;
  border-collapse: collapse;
  margin-top: 2px;
  border: 1px solid #000;
}

table.items thead th {
  border-bottom: 1px solid #000;
  border-right: 1px solid #000;
  padding: 2px 1px;
  font-size: 9px;
  font-weight: 700;
}

table.items thead th:last-child {
  border-right: 0;
}

table.items tbody td {
  border-right: 1px solid #000;
  padding: 2px 1px;
  font-size: 9px;
  font-weight: 700;
}

table.items tbody td:last-child {
  border-right: 0;
}

/* Light separator line (prevents black blocks) */
table.items tbody tr {
  border-bottom: 1px dashed #000;
}

table.items tbody tr:last-child {
  border-bottom: 1px solid #000;
}

/* Column widths optimized for 70mm */
.col-desc { width: 28%; }
.col-barcode { width: 18%; }
.col-qty { width: 8%; }
.col-rate { width: 14%; }
.col-disc { width: 10%; }
.col-gst { width: 8%; }
.col-amt { width: 14%; }

/* prevent overflow */
td, th {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== TOTALS TABLE ===== */
.col-gross { width: 30%; }
.col-gross-amt { width: 15%; }
.col-gross-qty { width: 10%; }
.col-gross-rate { width: 5%; }
.col-gross-disc { width: 10%; }
.col-gross-gst { width: 5%; }
.col-gross-net { width: 25%; }

/* ===== GST TABLE ===== */
table.gst-table {
  width: 65%;
  margin-left: auto;
  border-collapse: collapse;
}

table.gst-table td {
  padding: 1px 0;
  font-size: 9px;
}

/* ===== SUMMARY TABLE ===== */
table.summary-table {
  width: 100%;
  border-collapse: collapse;
}

table.summary-table td {
  padding: 1px;
  font-size: 9px;
}

/* ===== GROSS ROW (matches printed bill) ===== */
table.gross-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}

table.gross-table td {
  padding: 2px 0;
}
`}</style>

      <div className="center bold">TAX INVOICE</div>
      <div className="center bold">{storeDetails.name}</div>
      <div className="center">{storeDetails.address}</div>
      <div className="left" style={{ fontSize: "10px" }}>
        GSTIN: {storeDetails.gstin}, CIN:{" "}
        {storeDetails.cin || "U18204DL2008PTC175779"}
      </div>
      <div className="left" style={{ fontSize: "9px" }}>
        info@market99.com, www.market99.com,{" "}
        <span className="bold">Ph.{storeDetails.phone}</span>
      </div>
      <div className="left" style={{ fontSize: "9px" }}>
        Regd Off: D-153, Okhla Ph-1,N.D-20 Ph.No.011-47366100
      </div>

      <div className="hr"></div>

      <div>Invoice No: {billDetails.billNo}</div>
      <div>
        Date: {billDetails.date || printDateStr} Time: {printTimeStr}
      </div>

      <div className="hr"></div>

      <table className="items">
        <thead className="heading">
          <tr className="heading">
            <th className="col-desc" style={{ textAlign: "left" }}>
              DESCRIPTION
            </th>
            <th className="col-barcode" style={{ textAlign: "left" }}>
              BARCODE
            </th>
            <th className="col-qty right item-list">QTY</th>
            <th className="col-rate right item-list">RATE</th>
            <th className="col-disc right item-list">DISC</th>
            <th className="col-gst right item-list">GST%</th>
            <th className="col-amt right item-list">AMT</th>
          </tr>
        </thead>
        <tbody className="item-list">
          {cart.map((item, index) => {
            const lineTotal = (item.price - item.discount) * item.qty;
            return (
              <tr key={index}>
                <td className="col-desc item-list" style={{ fontSize: "8px" }}>
                  {(item.printDesc || item.itemName).substring(0, 14)}
                </td>
                <td className="col-desc item-list">{item.itemCode}</td>
                <td className="col-qty right item-list">{item.qty}</td>
                <td className="col-rate right item-list">
                  {item.price.toFixed(2)}
                </td>
                <td className="col-disc right item-list">
                  {(item.discount * item.qty).toFixed(2)}
                </td>
                <td className="col-gst right item-list" style={{ width: "9%" }}>
                  {item.tax}
                </td>
                <td
                  className="col-amt right item-list"
                  style={{ width: "18%" }}
                >
                  {lineTotal.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="hr"></div>

      <table className="gross-table">
        <tbody>
          <tr>
            <td className="col-desc bold">Gross Amt:</td>
            <td className="col-barcode"></td>
            <td className="col-qty right">{totals.totalQty}</td>
            <td className="col-rate right">{totals.grossAmount.toFixed(2)}</td>
            <td className="col-disc right">
              {totals.totalDiscount.toFixed(2)}
            </td>
            <td className="col-gst right"></td>
            <td className="col-amt right bold">
              {totals.taxableValue.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="hr"></div>

      <table className="gst-table">
        <tbody>
          <tr>
            <td>Taxable Amount</td>
            <td className="right">{totals.taxableValue.toFixed(2)}</td>
          </tr>
          <tr>
            <td>SGST</td>
            <td className="right">{(totals.totalTax / 2).toFixed(2)}</td>
          </tr>
          <tr>
            <td>CGST</td>
            <td className="right">{(totals.totalTax / 2).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Total Discount</td>
            <td className="right">{totals.totalDiscount.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Round Off</td>
            <td className="right">{totals.roundOff.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Net Bill Amount</td>
            <td className="right bold">{totals.grandTotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Pending Amount</td>
            <td className="right bold">{totals.grandTotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div className="hr"></div>
      <div style={{ fontWeight: "bold", fontSize: "11px" }}>
        Rs. {numberToWords(totals.grandTotal)}
      </div>
      <div className="hr"></div>
      <div style={{ fontWeight: "bold", fontSize: "11px" }}>
        Amount Paid: {totals.grandTotal.toFixed(2)}
      </div>
      <div style={{ fontWeight: "bold", fontSize: "11px" }}>
        Amount Refunded: 0.00
      </div>
      <div className="hr"></div>

      <table className="summary-table">
        <tbody>
          <tr>
            <td className="left">GST Details</td>
            <td className="right">Taxable</td>
            <td className="right">SGST</td>
            <td className="right">CGST</td>
            <td className="right">Total</td>
          </tr>
          {Object.keys(gstMap)
            .sort((a, b) => Number(a) - Number(b))
            .map((rate) => {
              const r = Number(rate);
              const t = gstMap[r];
              const sgst = t.tax / 2;
              const cgst = t.tax / 2;
              const total = t.taxable + t.tax;
              return (
                <tr key={rate}>
                  <td className="left">Sale @ GST {rate}%</td>
                  <td className="right">{t.taxable.toFixed(2)}</td>
                  <td className="right">{sgst.toFixed(2)}</td>
                  <td className="right">{cgst.toFixed(2)}</td>
                  <td className="right">{total.toFixed(2)}</td>
                </tr>
              );
            })}
          <tr style={{ borderTop: "1px dashed #000" }}>
            <td className="left bold">TOTAL</td>
            <td className="right bold">{grandTaxable.toFixed(2)}</td>
            <td className="right bold">{grandSGST.toFixed(2)}</td>
            <td className="right bold">{grandCGST.toFixed(2)}</td>
            <td className="right bold">{grandTotalGST.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div className="hr"></div>
      <div
        style={{
          fontWeight: "bold",
          fontSize: "11px",
          borderBottom: "1px solid black",
          width: "26%",
        }}
      >
        Tender Mode
      </div>
      {/* Mocking Tender Mode as we don't have it in props yet */}
      <table style={{ width: "100%" }}>
        <tbody>
          <tr>
            <td style={{ fontWeight: "bold", fontSize: "11px" }}>
              Cash/Card:{" "}
            </td>
            <td
              className="right"
              style={{ fontWeight: "bold", fontSize: "11px" }}
            >
              {totals.grandTotal.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="hr"></div>
      <div className="left" style={{ fontSize: "10px" }}>
        Any exchange will have to be made with in 30 days of Purchase in Sealed
        Original Packing.(12 TO 4 PM ONLY) NoGuarantee/Warranty on
        Electrical/Electronic Items. "Valuation of goods has been done as per
        Section 15(1) of SGST & CGST Act along with Rule 2 of Value of Supply"
      </div>
      <div className="hr"></div>
      <div className="center bold" style={{ fontSize: "11px" }}>
        THANK YOU FOR SHOPPING WITH US. HERE IS SOMETHING EXTRA FOR YOU! SHOP AT
        WWW.MARKET99.COM GET FLAT 10% OFF ON ORDERS OF RS.1499 AND ABOVE USE
        CODE
      </div>
      <div className="hr"></div>
      <div className="center bold">| B84292KW65 |</div>
      <div className="hr"></div>
      <div className="center bold">**Coupon is Valid for 30 Days **</div>
    </div>
  );
});

export default PosPrintReceipt2;
