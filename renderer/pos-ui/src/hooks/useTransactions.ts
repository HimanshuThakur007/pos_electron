import { useState, useCallback } from "react";
import toast from "react-hot-toast";

export function useTransactions(
  userDetails: any,
  isB2B: boolean,
  printBillData: any,
  handlePrintReceipt: (data?: any) => Promise<void>,
) {
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [reprintTransactions, setReprintTransactions] = useState<any[]>([]);

  const handleShowTransactions = useCallback(
    async (filter?: string) => {
      try {
        if (!userDetails.branchCode) return;
        const data =
          (await (window as any).posApi?.getTransactions({
            branch_code: userDetails.branchCode || "",
            terminal_code: userDetails.terminalCode || "",
            user_id: userDetails.userId || "",
            fy_code: userDetails.fyCode || "",
            isB2B,
            doc_type: isB2B ? 2 : 1,
          })) || [];

        let filteredData = data.filter((tx: any) =>
          isB2B ? tx.bill_no.startsWith("B") : !tx.bill_no.startsWith("B"),
        );
        if (filter === "today") {
          const todayStr = new Date().toDateString();
          filteredData = filteredData.filter((tx: any) => {
            let dateObj = new Date(tx.created_at);
            if (isNaN(dateObj.getTime()) || !tx.created_at.includes("T"))
              dateObj = new Date(tx.created_at.replace(" ", "T") + "Z");
            return dateObj.toDateString() === todayStr;
          });
        } else
          filteredData = filteredData.filter((tx: any) => tx.sync_status !== 1);
        setTransactions(filteredData);
        setShowTransactions(true);
      } catch (error) {
        console.error("Failed to fetch transactions", error);
      }
    },
    [userDetails, isB2B],
  );

  const handleReprint = useCallback(async () => {
    try {
      const data =
        (await (window as any).posApi?.getTransactions({
          branch_code: userDetails.branchCode || "",
          terminal_code: userDetails.terminalCode || "",
          user_id: userDetails.userId || "",
          fy_code: userDetails.fyCode || "",
          isB2B,
          doc_type: isB2B ? 2 : 1,
        })) || [];
      const correctTxns = data.filter((tx: any) =>
        isB2B ? tx.bill_no.startsWith("B") : !tx.bill_no.startsWith("B"),
      );
      setReprintTransactions(correctTxns.slice(0, 5));
      setShowReprintModal(true);
    } catch (error) {
      toast.error("Failed to fetch transactions.");
    }
  }, [userDetails, isB2B]);

  const handleReprintBill = useCallback(
    async (bill: any) => {
      try {
        let cartItems = bill.cart_items;
        if (typeof cartItems === "string")
          try {
            cartItems = JSON.parse(cartItems);
          } catch (e) {
            cartItems = [];
          }
        const isBillB2B = bill.bill_no.startsWith("B");
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
            customerGstin: bill.customer_gstin || bill.gst_number || "",
            isB2B: isBillB2B,
            company_name: bill.company_name,
            gst_address: bill.gst_address,
            tax_region: bill.tax_region,
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
        toast.error("Failed to reprint bill.");
      }
    },
    [handlePrintReceipt, printBillData, userDetails.userName],
  );

  return {
    transactions,
    setTransactions,
    showTransactions,
    setShowTransactions,
    showReprintModal,
    setShowReprintModal,
    reprintTransactions,
    handleShowTransactions,
    handleReprint,
    handleReprintBill,
  };
}
