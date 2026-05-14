import { useState, useEffect, useCallback } from "react";

export function useInvoiceNumber(userDetails: any, isB2B: boolean) {
  const [invoiceCounter, setInvoiceCounter] = useState(1);
  const [lastBill, setLastBill] = useState<any>(null);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(true);

  useEffect(() => {
    const initCounter = async () => {
      setIsInvoiceLoading(true);
      try {
        const branchCode = localStorage.getItem("branch_code") || "";
        const terminalCode = localStorage.getItem("terminal_code") || "";
        const cashierId = localStorage.getItem("user_id") || "";
        const fyCode = localStorage.getItem("fy_code") || "";

        let bill = await (window as any).posApi?.getLastBill({
          branch_code: branchCode,
          terminal_code: terminalCode,
          cashier_id: cashierId,
          fy_code: fyCode,
          isB2B: isB2B,
          doc_type: isB2B ? 2 : 1,
        });

        const lastSynced = await (window as any).posApi?.getLastSyncedInvoice({
          branch_code: branchCode,
          terminal_code: terminalCode,
          cashier_id: cashierId,
          fy_code: fyCode,
          isB2B: isB2B,
          doc_type: isB2B ? 2 : 1,
        });

        const currentFy = fyCode.length >= 2 ? fyCode.slice(-2) : "26";
        let localNum = 0;
        let syncedNum = 0;

        if (bill && bill.bill_no) {
          const isBillB2B = bill.bill_no.startsWith("B");
          if (isB2B !== isBillB2B) {
            const allTxns =
              (await (window as any).posApi?.getTransactions({
                branch_code: branchCode,
                terminal_code: terminalCode,
                user_id: cashierId,
                fy_code: fyCode,
                isB2B: isB2B,
                doc_type: isB2B ? 2 : 1,
              })) || [];
            bill =
              allTxns.find((t: any) =>
                isB2B ? t.bill_no.startsWith("B") : !t.bill_no.startsWith("B"),
              ) || null;
          }
        }

        if (bill && bill.bill_no) {
          setLastBill(bill);
          let parsedNum = 0,
            parsedFy = "";
          if (bill.bill_no.includes("-")) {
            const parts = bill.bill_no.split("-");
            parsedFy = parts[0].slice(-2);
            parsedNum = parseInt(parts[1], 10) || 0;
          } else if (bill.bill_no.length >= 6) {
            parsedFy = bill.bill_no.slice(0, -6).slice(-2);
            parsedNum = parseInt(bill.bill_no.slice(-6), 10) || 0;
          }
          if (parsedFy === currentFy) localNum = parsedNum;
        } else {
          setLastBill(null);
        }

        if (lastSynced) {
          if (lastSynced.current_number !== undefined)
            syncedNum = parseInt(lastSynced.current_number, 10) || 0;
          else if (lastSynced.bill_no) {
            if (lastSynced.bill_no.includes("-"))
              syncedNum = parseInt(lastSynced.bill_no.split("-")[1], 10) || 0;
            else if (lastSynced.bill_no.length >= 6)
              syncedNum = parseInt(lastSynced.bill_no.slice(-6), 10) || 0;
          }
        }

        setInvoiceCounter((prev) =>
          Math.max(prev, Math.max(localNum, syncedNum) + 1),
        );
      } catch (err) {
        console.error("Failed to fetch last bill:", err);
      } finally {
        setIsInvoiceLoading(false);
      }
    };
    initCounter();
  }, [isB2B]);

  const generateInvoiceNumber = useCallback(() => {
    const branch = String(
      userDetails.branchCode || localStorage.getItem("branch_code") || "",
    );
    const fBranch = branch.length > 0 ? "J" + branch.slice(1) : "";
    const fy = (
      userDetails.fyCode ||
      localStorage.getItem("fy_code") ||
      ""
    ).slice(-2);
    const terminal = String(
      userDetails.terminalCode || localStorage.getItem("terminal_code") || "",
    );
    const no = String(invoiceCounter).padStart(6, "0");
    return `${isB2B ? "B" + (fBranch ? fBranch.slice(1) : "") : fBranch}${terminal}${fy}${no}`;
  }, [
    userDetails.branchCode,
    userDetails.terminalCode,
    userDetails.fyCode,
    invoiceCounter,
    isB2B,
  ]);

  return {
    invoiceCounter,
    setInvoiceCounter,
    lastBill,
    setLastBill,
    generateInvoiceNumber,
    isInvoiceLoading,
  };
}
