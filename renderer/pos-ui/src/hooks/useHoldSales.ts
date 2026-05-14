import { useState, useCallback } from "react";
import toast from "react-hot-toast";

export function useHoldSales(
  cart: any[],
  totals: any,
  userDetails: any,
  selectedCustomer: any,
  clearCart: () => void,
  setCart: (cart: any[]) => void,
  setSelectedCustomer?: (customer: any) => void,
  setCustomerKeyword?: (keyword: string) => void,
  scanInputRef?: React.RefObject<HTMLInputElement | null>,
) {
  const [heldSales, setHeldSales] = useState<any[]>([]);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [showHoldNoteModal, setShowHoldNoteModal] = useState(false);

  const handleHoldSale = useCallback(
    async (note: string = "") => {
      if (cart.length === 0) return toast.error("Cart is empty!");
      const custObj = Array.isArray(selectedCustomer)
        ? selectedCustomer[0]
        : selectedCustomer;

      try {
        const res = (await (window as any).posApi?.holdSale({
          branch_code: userDetails.branchCode,
          terminal_code: userDetails.terminalCode,
          cashier_id: userDetails.userId,
          customer_name: custObj?.name || custObj?.company_name || "Walk-in",
          customer_mobile: custObj?.mobile || "",
          cart_items: cart,
          total_qty: totals.totalQty,
          grand_total: totals.roundedGrandTotal,
          note,
        })) || { status: "error" };

        if (res.status === "success") {
          clearCart();
          setSelectedCustomer?.(null);
          setCustomerKeyword?.("");
          toast.success("Sale hold successfully!");
        } else toast.error("Failed to hold sale");
      } catch (e) {
        console.error("Hold sale error:", e);
      }
    },
    [
      cart,
      totals,
      clearCart,
      userDetails,
      selectedCustomer,
      setSelectedCustomer,
      setCustomerKeyword,
    ],
  );

  const handleFetchHeldSales = useCallback(async () => {
    try {
      const res = (await (window as any).posApi?.getHoldSales({
        branch_code: userDetails.branchCode,
        terminal_code: userDetails.terminalCode,
        user_id: userDetails.userId,
      })) || { status: "error", data: [] };
      if (res.status === "success") setHeldSales(res.data);
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
      await (window as any).posApi?.deleteHeldSale(sale.id);
      handleFetchHeldSales();
      setTimeout(() => scanInputRef?.current?.focus(), 0);
    },
    [handleFetchHeldSales, setCart, scanInputRef],
  );

  return {
    heldSales,
    showHeldSales,
    setShowHeldSales,
    showHoldNoteModal,
    setShowHoldNoteModal,
    handleHoldSale,
    handleFetchHeldSales,
    handleShowHeldSales,
    handleResumeHeldSale,
  };
}
