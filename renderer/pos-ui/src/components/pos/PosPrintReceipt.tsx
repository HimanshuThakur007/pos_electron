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
    paymentMode?: string;
    transactionRef?: string;
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
    amountReceived?: number;
    balance?: number;
  };
}

export const PosPrintReceipt = React.forwardRef<
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

  // Group items by Tax Rate
  const groupedItems = (cart || []).reduce(
    (acc, item) => {
      const rate = item.tax || 0;
      if (!acc[rate]) acc[rate] = [];
      acc[rate].push(item);
      return acc;
    },
    {} as Record<number, PrintCartItem[]>,
  );

  const sortedRates = Object.keys(groupedItems)
    .map(Number)
    .sort((a, b) => a - b);

  // GST Calculation for Summary
  const gstMap: Record<number, { taxable: number; tax: number }> = {};
  (cart || []).forEach((item) => {
    const rate = item.tax || 0;
    const lineTotal = (item.price - item.discount) * item.qty;
    const taxable = lineTotal / (1 + rate / 100);
    const taxAmt = lineTotal - taxable;

    if (!gstMap[rate]) gstMap[rate] = { taxable: 0, tax: 0 };
    gstMap[rate].taxable += taxable;
    gstMap[rate].tax += taxAmt;
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

  const formattedDate = React.useMemo(() => {
    if (!billDetails?.date) return printDateStr;
    const date = new Date(billDetails.date);
    if (isNaN(date.getTime())) {
      return billDetails.date.includes(",")
        ? billDetails.date.split(",")[0].trim()
        : billDetails.date;
    }
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [billDetails?.date, printDateStr]);

  return (
    <div
      ref={ref}
      className="w-full pr-[2mm] pl-[5mm] m-0 font-mono text-[10px] leading-[1.2] text-black box-border"
    >
      <style>{`
        @page { margin: 0; }
      `}</style>

      {/* Header */}
      <div className="text-center font-bold text-[12px]">TAX INVOICE</div>
      <div className="text-center font-bold text-[12px]">
        {storeDetails?.name}
      </div>
      <div className="text-center text-[10px]">{storeDetails?.address}</div>

      <div className="text-center text-[10px]">
        GSTIN: {storeDetails?.gstin}
      </div>
      <div className="text-center text-[10px]">
        CIN: {storeDetails?.cin || "U18204DL2008PTC175779"}
      </div>
      <div className="text-center text-[9px]">
        info@market99.com, www.market99.com
      </div>
      <div className="text-center text-[9px]">
        Regd Off: D-153, Okhla Ph-1, N.D-20 Ph.No. 011-47366100
      </div>
      <div className="text-center text-[10px]">
        Contact: {storeDetails?.phone}
      </div>
      <div className="border-t border-dashed border-black my-1"></div>

      {/* Bill Details */}
      <div className="flex justify-between">
        <span>Invoice No: {billDetails?.billNo}</span>
      </div>
      <div className="flex justify-between">
        <span>Date: {formattedDate}</span>
        <span>Time: {printTimeStr}</span>
      </div>

      <div className="border-t border-dashed border-black my-1"></div>

      {/* Table Header */}
      {/* Row 1: Description & Hsn */}
      <div className="flex font-bold text-[10px] w-full">
        <div className="w-[75%] overflow-hidden whitespace-nowrap text-ellipsis">
          Description
        </div>
        <div className="w-[25%] text-right">Hsn</div>
      </div>
      {/* Row 2: Other Details */}
      <div className="flex text-[10px] w-full font-bold border-b border-black pb-0.5 mb-0.5">
        <div className="w-[25%]">Barcode</div>
        <div className="w-[10%] text-center">Qty</div>
        {/* <div className="col-uom">UOM</div> */}
        <div className="w-[20%] text-right">Price</div>
        <div className="w-[20%] text-right">Disc</div>
        <div className="w-[25%] text-right">Amount</div>
      </div>

      {/* Items Grouped by Tax */}
      {sortedRates.map((rate) => (
        <div key={rate}>
          <div className="font-bold mt-1 text-[10px] underline">
            GST {rate}%
          </div>
          {groupedItems[rate].map((item, idx) => {
            const lineTotal = (item.price - item.discount) * item.qty;
            return (
              <div
                key={idx}
                className="mb-1 border-b border-dashed border-black pb-0.5"
              >
                {/* Item Row 1 */}
                <div className="flex font-normal text-[10px] w-full">
                  <div className="w-[75%] overflow-hidden whitespace-nowrap text-ellipsis">
                    {item.printDesc}
                  </div>
                  {/* <div className="col-hsn">{item.hsn || ""}</div> */}
                  <div className="w-[25%] text-right">610990</div>
                </div>
                {/* Item Row 2 */}
                <div className="flex text-[10px] w-full">
                  <div className="w-[25%]">{item.itemCode}</div>
                  <div className="w-[10%] text-center">{item.qty}</div>
                  {/* <div className="col-uom">EA</div> */}
                  <div className="w-[20%] text-right">
                    {item.price.toFixed(2)}
                  </div>
                  <div className="w-[20%] text-right">
                    {item.discount > 0
                      ? (item.discount * item.qty).toFixed(2)
                      : "0.00"}
                  </div>
                  <div className="w-[25%] text-right">
                    {lineTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="border-t border-dashed border-black my-1"></div>

      {/* Totals */}
      <div className="flex justify-between font-bold text-[10px]">
        <span>Items: {(cart || []).length}</span>
        <span>Qty: {totals?.totalQty}</span>
        <span>Disc: {(totals?.totalDiscount || 0).toFixed(2)}</span>
        <span>Amt: {(totals?.grandTotal || 0).toFixed(2)}</span>
      </div>
      <div className="border-t border-dashed border-black my-1"></div>

      <div className="ml-[25%]">
        <div className="flex justify-between">
          <span>Gross Sale Value</span>
          <span>{(totals?.grossAmount || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{(totals?.totalTax || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Round Off</span>
          <span>{(totals?.roundOff || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Net Payable</span>
          <span>{(totals?.grandTotal || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Received Amount</span>
          <span>{(totals?.amountReceived || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Balance Paid</span>
          <span>{(totals?.balance || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-1"></div>

      <div className="text-center font-bold my-1.5">
        {numberToWords(totals?.grandTotal || 0)}
      </div>

      <div className="border-t border-dashed border-black my-1"></div>

      {/* Payment Details */}
      <div className="text-center font-bold">Payment Details</div>
      <div className="flex text-[10px] border-b border-black">
        <div className="flex-1">Type</div>
        <div className="flex-[2] text-center">Reference No</div>
        <div className="flex-1 text-right">Amount</div>
      </div>
      <div className="flex text-[10px] mt-0.5">
        <div className="flex-1 uppercase">
          {billDetails?.paymentMode || "CASH"}
        </div>
        <div className="flex-[2] text-center">
          {billDetails?.transactionRef || "xxxxxxxxxxx"}
        </div>
        <div className="flex-1 text-right">
          {(totals?.amountReceived || totals?.grandTotal || 0).toFixed(2)}
        </div>
      </div>

      <div className="border-t border-dashed border-black my-1"></div>

      {/* Tax Summary */}
      <div className="text-center font-bold">Tax Summary</div>
      <div className="flex text-[10px] border-b border-black">
        <div className="flex-1">Rate</div>
        <div className="flex-[2] text-right">Taxable</div>
        <div className="flex-[2] text-right">CGST</div>
        <div className="flex-[2] text-right">SGST</div>
        <div className="flex-[2] text-right">Total</div>
      </div>
      {Object.keys(gstMap).map((key) => {
        const rate = Number(key);
        const { taxable, tax } = gstMap[rate];
        return (
          <div key={key} className="flex text-[10px]">
            <div className="flex-1">{rate}%</div>
            <div className="flex-[2] text-right">{taxable.toFixed(2)}</div>
            <div className="flex-[2] text-right">{(tax / 2).toFixed(2)}</div>
            <div className="flex-[2] text-right">{(tax / 2).toFixed(2)}</div>
            <div className="flex-[2] text-right">
              {(taxable + tax).toFixed(2)}
            </div>
          </div>
        );
      })}

      <div className="border-t border-dashed border-black my-1"></div>
      <div className="text-[10px] text-left">
        Any exchange will have to be made with in 30 days of Purchase in Sealed
        Original Packing.(12 TO 4 PM ONLY) NoGuarantee/Warranty on
        Electrical/Electronic Items. "Valuation of goods has been done as per
        Section 15(1) of SGST & CGST Act along with Rule 2 of Value of Supply"
      </div>
      <div className="border-t border-dashed border-black my-1"></div>
      <div className="text-center font-bold text-[10px]">
        THANK YOU FOR SHOPPING WITH US. HERE IS SOMETHING EXTRA FOR YOU! SHOP AT
        WWW.MARKET99.COM GET FLAT 10% OFF ON ORDERS OF RS.1499 AND ABOVE USE
        CODE
      </div>
      <div className="border-t border-dashed border-black my-1"></div>
      <div className="text-center font-bold">| B84292KW65 |</div>
      <div className="border-t border-dashed border-black my-1"></div>
      <div className="text-center font-bold">
        **Coupon is Valid for 30 Days **
      </div>

      <div className="text-center text-[10px]">
        Thank you for shopping with us!
      </div>
    </div>
  );
});

export default PosPrintReceipt;
