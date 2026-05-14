import { useMemo, useCallback, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PosPrintReceipt from "../components/pos/PosPrintReceipt";
import toast from "react-hot-toast";

export function usePosPrinting(
  branchInfo: any,
  userDetails: any,
  cart: any[],
  totals: any,
  selectedCustomer: any,
  customerKeyword: string,
  isB2B: boolean,
  generateInvoiceNumber: () => string,
) {
  const printBillData = useMemo(
    () => ({
      storeDetails: {
        name: "MARKET NINETY NINE PVT LTD.",
        address: branchInfo.address || "Pacific Mall, Jasola, New Delhi",
        phone: branchInfo.phoneNo || "1234567890",
        gstin: branchInfo.gstin || "07AAACA1234A1Z5",
        cin: "U52100DL2018PTC334668",
      },
      billDetails: {
        billNo: generateInvoiceNumber(),
        date: new Date().toLocaleString(),
        cashier: userDetails.userName,
        customerName:
          (Array.isArray(selectedCustomer)
            ? selectedCustomer[0]?.name
            : selectedCustomer?.name) ||
          selectedCustomer?.company_name ||
          "Walk-in",
        customerMobile:
          (Array.isArray(selectedCustomer)
            ? selectedCustomer[0]?.mobile
            : selectedCustomer?.mobile) || "",
        customerGstin: isB2B
          ? (Array.isArray(selectedCustomer)
              ? selectedCustomer[0]?.gstin
              : selectedCustomer?.gstin) ||
            customerKeyword ||
            ""
          : "",
      },
      cart: cart.map((item) => ({
        ...item,
        printDesc: item.printDesc || "",
        schm_type: item.schm_type || "",
        schm_camp_grp: item.schm_camp_grp || "",
        hsn_code: item.hsn_code ? String(item.hsn_code).split(".")[0] : "",
      })),
      totals: {
        totalQty: totals.totalQty,
        grossAmount: totals.grossAmount,
        totalDiscount: totals.totalDiscount,
        taxableValue: totals.taxableValue,
        totalTax: totals.totalTax,
        roundOff: totals.roundOff,
        grandTotal: totals.roundedGrandTotal,
      },
    }),
    [
      branchInfo,
      generateInvoiceNumber,
      userDetails.userName,
      cart,
      totals,
      selectedCustomer,
      customerKeyword,
      isB2B,
    ],
  );

  const handlePrintReceipt = useCallback(
    async (data?: any) => {
      const receiptData = data ? { ...data } : { ...printBillData };

      // Format hsn_code for all items to remove decimal places (e.g. "121190.0" -> "121190")
      if (receiptData.cart && Array.isArray(receiptData.cart)) {
        receiptData.cart = receiptData.cart.map((item: any) => ({
          ...item,
          hsn_code: item.hsn_code ? String(item.hsn_code).split(".")[0] : "",
        }));
      }

      console.log("Preparing to print receipt with data:", receiptData);
      try {
        if (
          (window as any).posApi &&
          (window as any).posApi.printEscposReceipt
        ) {
          try {
            const escResult = await (window as any).posApi.printEscposReceipt(
              receiptData,
            );
            if (escResult?.status === "success") return;
          } catch (escError) {
            console.error(
              "ESC/POS error, falling back to HTML print:",
              escError,
            );
          }
        }

        const content = renderToStaticMarkup(
          createElement(PosPrintReceipt as any, {
            storeDetails: receiptData.storeDetails,
            billDetails: receiptData.billDetails,
            cart: receiptData.cart,
            totals: receiptData.totals,
          }),
        );

        const htmlContent = `
      <html>
        <head><style>@page { margin: 0mm; } html, body { width: 72mm; margin: 0; padding: 0; font-family: "Roboto Mono", monospace; font-size: 10px; }</style></head>
        <body>${content}</body>
      </html>`;

        if ((window as any).posApi && (window as any).posApi.printReceipt) {
          const result = await (window as any).posApi.printReceipt(htmlContent);
          if (result?.status !== "success")
            toast.error("Printing failed: " + result?.message);
        }
      } catch (error) {
        console.error("❌ Error generating receipt:", error);
      }
    },
    [printBillData],
  );

  return { printBillData, handlePrintReceipt };
}
