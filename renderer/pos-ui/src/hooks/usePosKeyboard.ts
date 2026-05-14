import { useEffect, useCallback, useRef } from "react";
import { type CartItem } from "../utils/posUtils";
// import toast from "react-hot-toast";

interface UsePosKeyboardProps {
  cart: CartItem[];
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  updateQty: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totals: any;
  handleSaveBill: (
    paymentMode: string,
    amountReceived: number,
    transactionRef?: string,
    customer?: any,
  ) => Promise<boolean>;
  selectedCustomer?: any;
  customerResults?: any[];
  searchResults: any[];
  setSearchResults: React.Dispatch<React.SetStateAction<any[]>>;
  scanInputRef: React.RefObject<HTMLInputElement | null>;
  showCalculator: boolean;
  setShowCalculator: React.Dispatch<React.SetStateAction<boolean>>;
  showShortcuts: boolean;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  showTransactions: boolean;
  setShowTransactions: React.Dispatch<React.SetStateAction<boolean>>;
  showHeldSales: boolean;
  setShowHeldSales: React.Dispatch<React.SetStateAction<boolean>>;
  showHoldNoteModal: boolean;
  setShowHoldNoteModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleShowHeldSales: () => void;
  handleReprint: () => void;
  handleLogout: () => void;
  setTableFocusTrigger: React.Dispatch<React.SetStateAction<number>>;
  setQtyFocusTrigger: React.Dispatch<React.SetStateAction<number>>;
  setItemToDelete: React.Dispatch<React.SetStateAction<CartItem | null>>;
  handleOpenPayment?: () => void;
}

export function usePosKeyboard({
  cart,
  selectedIndex,
  setSelectedIndex,
  updateQty,
  removeFromCart,
  clearCart,
  totals,
  handleSaveBill,
  selectedCustomer,
  customerResults,
  searchResults,
  setSearchResults,
  scanInputRef,
  showCalculator,
  setShowCalculator,
  showShortcuts,
  setShowShortcuts,
  showTransactions,
  setShowTransactions,
  showHeldSales,
  setShowHeldSales,
  showHoldNoteModal,
  setShowHoldNoteModal,
  handleShowHeldSales,
  handleReprint,
  handleLogout,
  setTableFocusTrigger,
  setQtyFocusTrigger,
  setItemToDelete,
  handleOpenPayment,
}: UsePosKeyboardProps) {
  // ✅ Refs
  const cartRef = useRef(cart);
  const selectedIndexRef = useRef(selectedIndex);
  const handleSaveBillRef = useRef(handleSaveBill);
  const totalsRef = useRef(totals);
  const selectedCustomerRef = useRef(selectedCustomer);
  const customerResultsRef = useRef(customerResults);

  useEffect(() => {
    cartRef.current = cart;
    selectedIndexRef.current = selectedIndex;
    handleSaveBillRef.current = handleSaveBill;
    totalsRef.current = totals;
    selectedCustomerRef.current = selectedCustomer;
    customerResultsRef.current = customerResults;
  }, [
    cart,
    selectedIndex,
    handleSaveBill,
    totals,
    selectedCustomer,
    customerResults,
  ]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement;

      const isScanInput = target === scanInputRef.current;

      const isQtyInput =
        target instanceof HTMLInputElement && target.type === "number";

      // ✅ ESC
      if (e.key === "Escape") {
        e.preventDefault();

        if (showCalculator) setShowCalculator(false);
        else if (showShortcuts) setShowShortcuts(false);
        else if (showTransactions) setShowTransactions(false);
        else if (showHeldSales) setShowHeldSales(false);
        else if (showHoldNoteModal) setShowHoldNoteModal(false);
        else if (searchResults.length > 0) setSearchResults([]);
        else {
          target.blur();
          scanInputRef.current?.focus();
        }
        return;
      }

      if (isQtyInput && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        target.blur();
      } else if (isInput && !isScanInput) {
        // Allow Function keys (F1-F12) and Alt shortcuts to bypass the input focus block
        if (!/^F\d+$/.test(e.key) && !e.altKey) {
          return;
        }
      }

      // ✅ ALT shortcuts (FIXED)
      if (e.altKey) {
        const knownAltKeys = ["KeyK", "KeyR", "KeyI", "KeyD", "KeyQ", "KeyP"];

        if (knownAltKeys.includes(e.code)) {
          e.preventDefault();
          scanInputRef.current?.blur();
        }

        switch (e.code) {
          case "KeyK":
            setShowCalculator(true);
            return;

          case "KeyR":
            handleReprint();
            return;

          case "KeyI":
          case "KeyD":
          case "KeyQ":
          case "KeyP": {
            if (cartRef.current.length === 0) return;

            const item = cartRef.current[selectedIndexRef.current];

            if (e.code === "KeyI" && item) updateQty(item.id, 1);
            else if (e.code === "KeyD" && item) updateQty(item.id, -1);
            else if (e.code === "KeyQ") {
              setQtyFocusTrigger((prev) => prev + 1);
            } else if (e.code === "KeyP") {
              handleSaveBillRef.current?.(
                "cash",
                totalsRef.current?.roundedGrandTotal ?? 0,
                "",
                selectedCustomerRef.current,
              );
            }
            return;
          }
        }
      }

      // ✅ SHIFT + D (delete confirm)
      if (e.shiftKey && e.code === "KeyD" && cartRef.current.length > 0) {
        e.preventDefault();

        const item = cartRef.current[selectedIndexRef.current];
        if (item) setItemToDelete(item);

        return;
      }

      // ✅ Function keys
      switch (e.key) {
        case "F1":
          e.preventDefault();
          setShowShortcuts(true);
          break;

        case "F2":
          e.preventDefault();
          setShowHoldNoteModal(true);
          break;

        case "F4":
          e.preventDefault();
          handleShowHeldSales();
          break;

        case "F6":
          e.preventDefault();
          clearCart();
          break;

        case "F9":
          e.preventDefault();
          handleOpenPayment?.();
          break;

        case "F10":
          e.preventDefault();
          handleLogout();
          break;

        case "ArrowDown":
          if (searchResults.length === 0 && cartRef.current.length > 0) {
            e.preventDefault();
            setSelectedIndex((prev) =>
              Math.min(prev + 1, cartRef.current.length - 1),
            );
          }
          break;

        case "ArrowUp":
          if (searchResults.length === 0 && cartRef.current.length > 0) {
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
          }
          break;
      }
    },
    [
      showCalculator,
      showShortcuts,
      showTransactions,
      showHeldSales,
      showHoldNoteModal,
      searchResults,
      removeFromCart,
      clearCart,
      updateQty,
      handleShowHeldSales,
      handleLogout,
      handleReprint,
      scanInputRef,
      setSelectedIndex,
      setSearchResults,
      setShowCalculator,
      setShowShortcuts,
      setShowTransactions,
      setShowHeldSales,
      setShowHoldNoteModal,
      setTableFocusTrigger,
      setQtyFocusTrigger,
      setItemToDelete,
      handleOpenPayment,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [handleKeyDown]);
}
