import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  createElement,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PosPrintReceipt from "../components/pos/PosPrintReceipt";
import { type CartItem } from "../utils/posUtils";

export function usePosBilling(
  cart: CartItem[],
  totals: any,
  userDetails: any,
  branchInfo: any,
  clearCart: () => void,
  setSearchTerm: (term: string) => void,
  setCart: (cart: CartItem[]) => void,
  scanInputRef: React.RefObject<HTMLInputElement | null>,
) {
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [heldSales, setHeldSales] = useState<any[]>([]);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [showHoldNoteModal, setShowHoldNoteModal] = useState(false);
  const [invoiceCounter, setInvoiceCounter] = useState(1);
  const [lastBill, setLastBill] = useState<any>(null);
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [reprintTransactions, setReprintTransactions] = useState<any[]>([]);

  // Initialize Invoice Counter
  useEffect(() => {
    const initCounter = async () => {
      try {
        const branchCode = localStorage.getItem("branch_code") || "";
        const terminalCode = localStorage.getItem("terminal_code") || "";
        const cashierId = localStorage.getItem("user_id") || "";
        const fyCode = localStorage.getItem("fy_code") || "";

        const bill = await window.posApi?.getLastBill({
          branch_code: branchCode,
          terminal_code: terminalCode,
          cashier_id: cashierId,
          fy_code: fyCode,
        });

        const lastSynced = await window.posApi?.getLastSyncedInvoice({
          branch_code: branchCode,
          terminal_code: terminalCode,
          cashier_id: cashierId,
          fy_code: fyCode,
        });

        let maxBillNo = "";

        if (bill && bill.bill_no) {
          setLastBill(bill);
          maxBillNo = bill.bill_no;
        }

        if (lastSynced && lastSynced.bill_no) {
          const currentNum = parseInt(maxBillNo.split("-")[1] || "0", 10);
          const syncedNum = parseInt(
            lastSynced.bill_no.split("-")[1] || "0",
            10,
          );
          if (syncedNum > currentNum) {
            maxBillNo = lastSynced.bill_no;
          }
        }

        if (maxBillNo) {
          const parts = maxBillNo.split("-");
          if (parts.length === 2) {
            const prefix = parts[0];
            const billFy = prefix.slice(-2);
            const currentFy = fyCode.length >= 2 ? fyCode.slice(-2) : "26";
            if (billFy === currentFy) {
              const lastNum = parseInt(parts[1], 10);
              if (!isNaN(lastNum)) {
                setInvoiceCounter(lastNum + 1);
              }
            } else {
              setInvoiceCounter(1);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch last bill:", err);
      }
    };
    initCounter();
  }, []);

  const generateInvoiceNumber = useCallback(() => {
    const rawBranchCode = String(userDetails.branchCode || "5002");
    const formattedBranch =
      rawBranchCode.length > 0 ? "M" + rawBranchCode.slice(1) : "M002";

    const counterCode = userDetails.terminalCode || "X";
    const fyCode = userDetails.fyCode || localStorage.getItem("fy_code") || "";
    const fy = fyCode.length >= 2 ? fyCode.slice(-2) : "26";

    const runningNo = String(invoiceCounter).padStart(6, "0");
    return `${formattedBranch}${counterCode}${fy}-${runningNo}`;
  }, [
    userDetails.branchCode,
    userDetails.terminalCode,
    userDetails.fyCode,
    invoiceCounter,
  ]);

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
        customerName: "Walk-in",
      },
      cart: cart.map((item) => ({
        ...item,
        printDesc: item.printDesc || "",
        schm_type: item.schm_type || "",
        schm_camp_grp: item.schm_camp_grp || "",
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
    [branchInfo, generateInvoiceNumber, userDetails.userName, cart, totals],
  );

  const handlePrintReceipt = useCallback(
    async (data?: any) => {
      const receiptData = data || printBillData;

      try {
        // 🚀 Attempt ultra-fast ESC/POS printing first
        if (window.posApi && (window.posApi as any).printEscposReceipt) {
          try {
            const escResult = await (window.posApi as any).printEscposReceipt(
              receiptData,
            );
            if (escResult?.status === "success") {
              return; // Printed successfully via ESC/POS
            } else {
              console.warn(
                "ESC/POS failed, falling back to HTML print:",
                escResult?.message,
              );
            }
          } catch (escError) {
            console.error(
              "ESC/POS error, falling back to HTML print:",
              escError,
            );
          }
        }

        // 🔄 Fallback: Generate HTML for standard Electron printing
        const content = renderToStaticMarkup(
          createElement(PosPrintReceipt, {
            storeDetails: receiptData.storeDetails,
            billDetails: receiptData.billDetails,
            cart: receiptData.cart,
            totals: receiptData.totals,
          }),
        );

        const htmlContent = `
        <html>
          <head>
            <title>Print Receipt</title>
            <style>
              @page { margin: 0mm; }
              html, body {
                width: 72mm;
                margin: 0;
                padding: 0;
                font-family: "Roboto Mono", monospace;
                font-size: 10px;
              }
            </style>
          </head>
          <body>${content}</body>
        </html>`;

        if (window.posApi && window.posApi.printReceipt) {
          const result = await window.posApi.printReceipt(htmlContent);
          if (result?.status !== "success") {
            alert("Printing failed: " + result?.message);
          }
        }
      } catch (error) {
        console.error("❌ Error generating receipt:", error);
      }
    },
    [printBillData],
  );

  const handleSaveBill = useCallback(
    async (
      paymentMode: string,
      amountReceived: number,
      transactionRef: string = "",
    ) => {
      if (cart.length === 0) {
        alert("Cannot save empty bill!");
        return false;
      }

      const dateObj = new Date();
      const month_range = `${dateObj.getFullYear()}_${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      const hour = dateObj.getHours();
      const hour_range = `${hour}-${hour + 1}`;
      const fin_year = userDetails.fyCode || "";
      const financial_year = fin_year.length >= 2 ? fin_year.slice(-2) : "";

      const billData = {
        bill_no: generateInvoiceNumber(),
        branch_code: userDetails.branchCode,
        terminal_code: userDetails.terminalCode,
        cashier_id: parseInt(userDetails.userId) || 0,
        fy_code: userDetails.fyCode,
        customer_name: "Walk-in",
        customer_mobile: "",
        total_qty: totals.totalQty,
        gross_amount: totals.grossAmount,
        total_discount: totals.totalDiscount,
        taxable_value: totals.taxableValue,
        total_tax: totals.totalTax,
        round_off: totals.roundOff,
        grand_total: totals.roundedGrandTotal,
        payment_mode: paymentMode,
        amount_received: amountReceived,
        transaction_ref: transactionRef,
        cart_items: cart,
        time: dateObj.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
        month_range,
        hour_range,
        fin_year,
        financial_year,
      };

      try {
        const res = (await window.posApi?.saveBill(billData)) || {
          status: "error",
          message: "API unavailable",
        };
        if (res.status === "success") {
          handlePrintReceipt();
          clearCart();
          setSearchTerm("");
          setInvoiceCounter((prev) => prev + 1);
          setLastBill(billData); // Optimistic update

          if (window.posApi) {
            window.posApi.triggerBackgroundSync(userDetails.fyCode);
          }
          return true;
        } else {
          alert("Error saving bill: " + res.message);
          return false;
        }
      } catch (e) {
        alert("Error saving bill");
        return false;
      }
    },
    [
      generateInvoiceNumber,
      userDetails,
      totals,
      cart,
      handlePrintReceipt,
      clearCart,
      setSearchTerm,
    ],
  );

  const handleHoldSale = useCallback(
    async (note: string = "") => {
      if (cart.length === 0) return alert("Cart is empty!");

      const holdData = {
        branch_code: userDetails.branchCode,
        terminal_code: userDetails.terminalCode,
        cashier_id: userDetails.userId,
        customer_name: "Walk-in",
        customer_mobile: "",
        cart_items: cart,
        total_qty: totals.totalQty,
        grand_total: totals.roundedGrandTotal,
        note: note,
      };

      try {
        const res = (await window.posApi?.holdSale(holdData)) || {
          status: "error",
        };
        if (res.status === "success") {
          clearCart();
          alert("Sale hold successfully!");
        } else {
          alert("Failed to hold sale");
        }
      } catch (e) {
        console.error("Hold sale error:", e);
      }
    },
    [cart, totals, clearCart, userDetails],
  );

  const handleFetchHeldSales = useCallback(async () => {
    try {
      const res = (await window.posApi?.getHoldSales({
        branch_code: userDetails.branchCode,
        terminal_code: userDetails.terminalCode,
        user_id: userDetails.userId,
      })) || { status: "error", data: [] };
      if (res.status === "success") {
        setHeldSales(res.data);
      }
    } catch (e) {
      console.error("Fetch held sales error:", e);
    }
  }, [userDetails]);

  const handleShowHeldSales = useCallback(() => {
    handleFetchHeldSales();
    setShowHeldSales(true);
  }, [handleFetchHeldSales]);

  const handleResumeHeldSale = useCallback(
    async (sale: any) => {
      setCart(sale.cart_items);
      await window.posApi?.deleteHeldSale(sale.id);
      handleFetchHeldSales();
      setTimeout(() => scanInputRef.current?.focus(), 0);
    },
    [handleFetchHeldSales, setCart, scanInputRef],
  );

  const handleShowTransactions = useCallback(
    async (filter?: string) => {
      try {
        if (!userDetails.branchCode) return;
        const data =
          (await window.posApi?.getTransactions({
            branch_code: userDetails.branchCode || "",
            terminal_code: userDetails.terminalCode || "",
            user_id: userDetails.userId || "",
            fy_code: userDetails.fyCode || "",
          })) || [];

        let filteredData = data;
        if (filter === "today") {
          const todayStr = new Date().toDateString();
          filteredData = data.filter((tx: any) => {
            let dateObj = new Date(tx.created_at);
            if (isNaN(dateObj.getTime()) || !tx.created_at.includes("T")) {
              dateObj = new Date(tx.created_at.replace(" ", "T") + "Z");
            }
            return dateObj.toDateString() === todayStr;
          });
        }
        setTransactions(filteredData);
        setShowTransactions(true);
      } catch (error) {
        console.error("Failed to fetch transactions", error);
      }
    },
    [userDetails],
  );

  const handleReprint = useCallback(async () => {
    try {
      const data =
        (await window.posApi?.getTransactions({
          branch_code: userDetails.branchCode || "",
          terminal_code: userDetails.terminalCode || "",
          user_id: userDetails.userId || "",
          fy_code: userDetails.fyCode || "",
        })) || [];
      const last5 = data.slice(0, 5);
      setReprintTransactions(last5);
      setShowReprintModal(true);
    } catch (error) {
      alert("Failed to fetch transactions.");
    }
  }, [userDetails]);

  const handleReprintBill = useCallback(
    async (bill: any) => {
      try {
        let cartItems = bill.cart_items;
        if (typeof cartItems === "string") {
          try {
            cartItems = JSON.parse(cartItems);
          } catch (e) {
            cartItems = [];
          }
        }

        const reprintData = {
          storeDetails: printBillData.storeDetails,
          billDetails: {
            billNo: bill.bill_no,
            date: bill.created_at || new Date().toLocaleString(),
            cashier: userDetails.userName,
            customerName: bill.customer_name || "Walk-in",
            customerMobile: bill.customer_mobile,
            paymentMode: bill.payment_mode,
            transactionRef: bill.transaction_ref,
          },
          cart: Array.isArray(cartItems) ? cartItems : [],
          totals: {
            totalQty: bill.total_qty,
            grossAmount: bill.gross_amount,
            totalDiscount: bill.total_discount,
            taxableValue: bill.taxable_value,
            totalTax: bill.total_tax,
            roundOff: bill.round_off,
            grandTotal: bill.grand_total,
            amountReceived: bill.amount_received,
            balance: (bill.amount_received || 0) - (bill.grand_total || 0),
          },
        };
        await handlePrintReceipt(reprintData);
      } catch (error) {
        alert("Failed to reprint bill.");
      }
    },
    [handlePrintReceipt, printBillData],
  );

  return {
    handleSaveBill,
    handleHoldSale,
    handleFetchHeldSales,
    handleResumeHeldSale,
    handlePrintReceipt,
    handleShowTransactions,
    handleReprint,
    handleReprintBill,
    generateInvoiceNumber,
    transactions,
    setTransactions,
    showTransactions,
    setShowTransactions,
    heldSales,
    showHeldSales,
    setShowHeldSales,
    showHoldNoteModal,
    setShowHoldNoteModal,
    invoiceCounter,
    setInvoiceCounter,
    lastBill,
    printBillData,
    showReprintModal,
    setShowReprintModal,
    reprintTransactions,
    handleShowHeldSales,
  };
}
