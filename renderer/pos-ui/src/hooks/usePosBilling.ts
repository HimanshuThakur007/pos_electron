import { useCallback } from "react";
import { type CartItem } from "../utils/posUtils";
import toast from "react-hot-toast";
import { useInvoiceNumber } from "./useInvoiceNumber";
import { usePosPrinting } from "./usePosPrinting";
import { useHoldSales } from "./useHoldSales";
import { useTransactions } from "./useTransactions";

export function usePosBilling(
  cart: CartItem[],
  totals: any,
  userDetails: any,
  branchInfo: any,
  clearCart: () => void,
  setSearchTerm: (term: string) => void,
  setCart: (cart: CartItem[]) => void,
  scanInputRef: React.RefObject<HTMLInputElement | null>,
  selectedCustomer: any = null,
  setSelectedCustomer?: (customer: any) => void,
  setCustomerKeyword?: (keyword: string) => void,
  isB2B: boolean = false,
  customerKeyword: string = "",
) {
  const {
    invoiceCounter,
    setInvoiceCounter,
    lastBill,
    setLastBill,
    generateInvoiceNumber,
    isInvoiceLoading,
  } = useInvoiceNumber(userDetails, isB2B);

  const { printBillData, handlePrintReceipt } = usePosPrinting(
    branchInfo,
    userDetails,
    cart,
    totals,
    selectedCustomer,
    customerKeyword,
    isB2B,
    generateInvoiceNumber,
  );

  const {
    heldSales,
    showHeldSales,
    setShowHeldSales,
    showHoldNoteModal,
    setShowHoldNoteModal,
    handleHoldSale,
    handleFetchHeldSales,
    handleShowHeldSales,
    handleResumeHeldSale,
  } = useHoldSales(
    cart,
    totals,
    userDetails,
    selectedCustomer,
    clearCart,
    setCart,
    setSelectedCustomer,
    setCustomerKeyword,
    scanInputRef,
  );

  const {
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
  } = useTransactions(userDetails, isB2B, printBillData, handlePrintReceipt);

  const handleNewSale = useCallback(() => {
    console.log("Starting new sale...");
    clearCart();
    setSearchTerm("");
    setSelectedCustomer?.(null);
    setCustomerKeyword?.("");
    scanInputRef.current?.focus();
    toast.success("Cart cleared. Ready for new sale.");
  }, [
    clearCart,
    setSearchTerm,
    setSelectedCustomer,
    setCustomerKeyword,
    scanInputRef,
  ]);

  const handleSaveBill = useCallback(
    async (
      paymentMode: string,
      amountReceived: number,
      transactionRef: string = "",
      customer?: any,
      splitPayments?: any[],
    ) => {
      if (cart.length === 0) {
        toast.error("Cannot save empty bill!");
        return false;
      }

      const activeCustomer = customer || selectedCustomer || userDetails;
      const custObj = Array.isArray(activeCustomer)
        ? activeCustomer[0]
        : activeCustomer;
      console.log("Saving bill for customer:", custObj);
      const dateObj = new Date();
      const month_range = `${dateObj.getFullYear()}_${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      const hour = dateObj.getHours();
      const hour_range = `${String(hour).padStart(2, "0")}-${String(hour + 1).padStart(2, "0")}`;
      const fin_year = userDetails.fyCode || "";
      const financial_year = fin_year.length >= 2 ? fin_year.slice(-2) : "";

      const custGstin = isB2B ? custObj?.gstin || customerKeyword || "" : "";
      const branchGstin = branchInfo?.gstin || "";
      let taxRegion = "CGST_SGST";
      if (isB2B && custGstin && branchGstin) {
        if (custGstin.substring(0, 2) !== branchGstin.substring(0, 2)) {
          taxRegion = "IGST";
        }
      }
      let gstAddress = "";
      if (isB2B && custObj?.selected_address) {
        const addr = custObj.selected_address;
        gstAddress = [
          addr.addr1,
          addr.addr2,
          addr.street,
          addr.district,
          addr.pincode,
        ]
          .filter(Boolean)
          .join(", ");
      }

      const billData = {
        bill_no: generateInvoiceNumber(),
        branch_code: userDetails.branchCode,
        terminal_code: userDetails.terminalCode,
        cashier_id: parseInt(userDetails.userId) || 0,
        fy_code: userDetails.fyCode,
        current_number: invoiceCounter,
        customer_name: custObj?.name || custObj?.company_name || "Walk-in",
        customer_mobile: custObj?.mobile || "",
        customer_id: custObj?.id || null,
        customer_gstin: custGstin,
        tax_region: taxRegion,
        gst_number: custGstin,
        gst_address: gstAddress,
        company_name: isB2B ? custObj?.company_name || "" : "",
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
        payments:
          splitPayments && splitPayments.length > 0
            ? splitPayments.map((p) => ({
                mode: p.mode,
                amount: p.amount,
                rrn: p.rrn || null,
                paytm_rrn: p.paytm_rrn || null,
                upi_vpa: p.upi_vpa || null,
                status: "success",
              }))
            : [
                {
                  mode: paymentMode,
                  amount: amountReceived || totals.roundedGrandTotal,
                  rrn:
                    paymentMode === "card" || paymentMode === "upi"
                      ? transactionRef
                      : null,
                  paytm_rrn:
                    paymentMode === "card" || paymentMode === "upi"
                      ? transactionRef
                      : null,
                  upi_vpa: paymentMode === "upi" ? transactionRef : null,
                  status: "success",
                },
              ],
        cart_items: cart,
        time: dateObj.toISOString(),
        month_range,
        hour_range,
        fin_year: userDetails.fin_year || "",
        financial_year,
        doc_type: isB2B ? 2 : 1,
      };
      console.log("Bill data to save:", billData);
      try {
        const res = (await window.posApi?.saveBill(billData)) || {
          status: "error",
          message: "API unavailable",
        };
        if (res.status === "success") {
          const receiptDataForPrint = {
            ...printBillData,
            billDetails: {
              ...printBillData.billDetails,
              customerName: billData.customer_name,
              customerMobile: billData.customer_mobile,
              customerGstin: billData.customer_gstin,
              isB2B: isB2B,
              company_name: billData.company_name,
              gst_address: billData.gst_address,
              tax_region: billData.tax_region,
              paymentMode: billData.payment_mode,
              transactionRef: billData.transaction_ref,
            },
            totals: {
              ...printBillData.totals,
              amountReceived: billData.amount_received,
              balance: billData.amount_received - billData.grand_total,
            },
          };
          handlePrintReceipt(receiptDataForPrint);
          clearCart();
          setSearchTerm("");
          setSelectedCustomer?.(null);
          setCustomerKeyword?.("");

          let syncedNum = 0;
          try {
            const lastSynced = await window.posApi?.getLastSyncedInvoice({
              branch_code: userDetails.branchCode,
              terminal_code: userDetails.terminalCode,
              cashier_id: userDetails.userId,
              fy_code: userDetails.fyCode,
              isB2B: isB2B,
              doc_type: isB2B ? 2 : 1,
            });
            if (lastSynced) {
              if (lastSynced.current_number !== undefined) {
                syncedNum = parseInt(lastSynced.current_number, 10) || 0;
              } else if (lastSynced.bill_no) {
                if (lastSynced.bill_no.includes("-")) {
                  syncedNum =
                    parseInt(lastSynced.bill_no.split("-")[1], 10) || 0;
                } else if (lastSynced.bill_no.length >= 6) {
                  syncedNum = parseInt(lastSynced.bill_no.slice(-6), 10) || 0;
                }
              }
            }
          } catch (err) {}

          setInvoiceCounter((prev) => Math.max(prev + 1, syncedNum + 1));
          setLastBill(billData); // Optimistic update
          setSelectedCustomer?.(null);

          if (window.posApi) {
            window.posApi.triggerBackgroundSync(userDetails.fyCode);
          }
          return true;
        } else {
          toast.error("Error saving bill: " + res.message);
          return false;
        }
      } catch (e) {
        toast.error("Error saving bill");
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
      selectedCustomer,
      isB2B,
      branchInfo,
      customerKeyword,
      invoiceCounter,
      printBillData,
      setInvoiceCounter,
      setLastBill,
      setSelectedCustomer,
      setCustomerKeyword,
    ],
  );

  return {
    handleSaveBill,
    handleHoldSale,
    handleNewSale,
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
    isInvoiceLoading,
    showReprintModal,
    setShowReprintModal,
    reprintTransactions,
    handleShowHeldSales,
  };
}
