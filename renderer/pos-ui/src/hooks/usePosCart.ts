import { useState, useCallback, useEffect, useMemo } from "react";
import {
  type CartItem,
  isPPScheme,
  recalculateCart,
  createNewItem,
  validateStock,
  isSchemeBranchApplicable,
} from "../utils/posUtils";
import toast from "react-hot-toast";

export function usePosCart(
  scanInputRef: React.RefObject<HTMLInputElement | null>,
  userDetails?: any,
) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tableFocusTrigger, setTableFocusTrigger] = useState(0);
  const [qtyFocusTrigger, setQtyFocusTrigger] = useState(0);

  // Clamp selectedIndex when cart changes
  useEffect(() => {
    if (cart.length > 0) {
      setSelectedIndex((prev) => Math.min(prev, cart.length - 1));
    } else {
      setSelectedIndex(0);
    }
  }, [cart.length]);

  const addToCart = useCallback(
    (product: any) => {
      const productMrp = Number(product.Lot_MRP);

      setCart((prev) => {
        const existingInState = prev.find(
          (item) =>
            item.itemCode === product.itemCode && item.price === productMrp,
        );

        if (existingInState) {
          const newQty = existingInState.qty + 1;
          if (!validateStock(existingInState.stock, newQty)) return prev;

          const updated = prev.map((item) =>
            item.id === existingInState.id ? { ...item, qty: newQty } : item,
          );
          return recalculateCart(updated, userDetails?.branchCode);
        }

        const stock = Number(product.Stock_Qty) || 0;
        if (stock < 1) {
          toast.error("Out of stock!");
          setTimeout(() => scanInputRef.current?.focus(), 100);
          return prev;
        }

        const newItem = createNewItem(product);
        newItem.hsn_code = product.hsn_code || ""; // Explicitly retain hsn_code

        // If the scheme is restricted to another branch, remove it from the cart item completely
        if (
          !isSchemeBranchApplicable(
            newItem.scheme_branch_code,
            userDetails?.branchCode,
          )
        ) {
          newItem.schm_type = undefined;
          newItem.schm_camp_grp = undefined;
          newItem.group_name = undefined;
          newItem.scheme_branch_code = undefined;
        }

        return recalculateCart([...prev, newItem], userDetails?.branchCode);
      });
    },
    [scanInputRef, userDetails],
  );

  const removeFromCart = useCallback(
    (id: string) => {
      const itemToDelete = cart.find((item) => item.id === id);

      if (itemToDelete) {
        const logData = {
          ...itemToDelete,
          branchCode: userDetails?.branchCode,
          terminalCode: userDetails?.terminalCode,
          cashierId: userDetails?.userId,
        };

        if ((window as any).posApi?.logDeletedItem) {
          (window as any).posApi.logDeletedItem(logData).catch(console.error);
        }
      }

      setCart((prev) =>
        recalculateCart(
          prev.filter((item) => item.id !== id),
          userDetails?.branchCode,
        ),
      );
      setTimeout(() => scanInputRef.current?.focus(), 0);
    },
    [cart, scanInputRef, userDetails],
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setTimeout(() => scanInputRef.current?.focus(), 0);
  }, [scanInputRef]);

  const updateQty = useCallback(
    (id: string, delta: number) => {
      setCart((prev) => {
        const itemInState = prev.find((i) => i.id === id);
        if (!itemInState) return prev;

        const newQty = itemInState.qty + delta;
        if (!validateStock(itemInState.stock, newQty)) return prev;

        const finalQty = Math.max(1, newQty);

        const updated = prev.map((item) =>
          item.id === id ? { ...item, qty: finalQty } : item,
        );
        return recalculateCart(updated, userDetails?.branchCode);
      });
    },
    [userDetails],
  );

  const handleQtyChange = useCallback(
    (id: string, val: string) => {
      const newQty = parseInt(val);
      setCart((prev) => {
        const itemInState = prev.find((i) => i.id === id);
        if (!itemInState) return prev;
        if (!validateStock(itemInState.stock, newQty)) return prev;

        const finalQty = isNaN(newQty) ? 0 : newQty;
        const updated = prev.map((item) =>
          item.id === id ? { ...item, qty: finalQty } : item,
        );
        return recalculateCart(updated, userDetails?.branchCode);
      });
    },
    [userDetails],
  );

  const handleQtyBlur = useCallback(
    (id: string, qty: number) => {
      if (qty <= 0) {
        setCart((prev) => {
          const updated = prev.map((item) =>
            item.id === id ? { ...item, qty: 1 } : item,
          );
          return recalculateCart(updated, userDetails?.branchCode);
        });
      }
    },
    [userDetails],
  );

  const totals = useMemo(() => {
    const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);
    const grossAmount = cart.reduce(
      (acc, item) => acc + item.price * item.qty,
      0,
    );
    const totalDiscount = cart.reduce(
      (acc, item) => acc + item.discount * item.qty,
      0,
    );
    const grandTotal = grossAmount - totalDiscount;
    const totalTax = cart.reduce((acc, item) => {
      const lineTotal = (item.price - item.discount) * item.qty;
      const rate = item.tax || 0;
      const taxable = lineTotal / (1 + rate / 100);
      const tax = lineTotal - taxable;
      return acc + tax;
    }, 0);
    const taxableValue = grandTotal - totalTax;
    const roundedGrandTotal = Math.round(grandTotal);
    const roundOff = roundedGrandTotal - grandTotal;
    const totalPPAmount = cart.reduce(
      (acc, item) =>
        isPPScheme(item.schm_type, item.schm_camp_grp, item.group_name)
          ? acc + item.price * item.qty
          : acc,
      0,
    );

    return {
      totalQty,
      grossAmount,
      totalDiscount,
      taxableValue,
      totalTax,
      grandTotal,
      roundedGrandTotal,
      roundOff,
      totalPPAmount,
    };
  }, [cart]);

  return {
    cart,
    setCart,
    selectedIndex,
    setSelectedIndex,
    addToCart,
    removeFromCart,
    clearCart,
    updateQty,
    handleQtyChange,
    handleQtyBlur,
    totals,
    tableFocusTrigger,
    setTableFocusTrigger,
    qtyFocusTrigger,
    setQtyFocusTrigger,
  };
}
