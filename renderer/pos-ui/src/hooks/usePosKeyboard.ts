import { useEffect, useCallback, useRef } from "react";
import { type CartItem } from "../utils/posUtils";

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
  ) => Promise<boolean>;
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
}: UsePosKeyboardProps) {
  // Refs for stable access in event listeners
  const cartRef = useRef(cart);
  const selectedIndexRef = useRef(selectedIndex);
  const handleSaveBillRef = useRef(handleSaveBill);
  const totalsRef = useRef(totals);

  useEffect(() => {
    cartRef.current = cart;
    selectedIndexRef.current = selectedIndex;
    handleSaveBillRef.current = handleSaveBill;
    totalsRef.current = totals;
  }, [cart, selectedIndex, handleSaveBill, totals]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement;
      const isScanInput = target === scanInputRef.current;
      const isQtyInput =
        target instanceof HTMLInputElement && target.type === "number";

      // Always allow Escape to clear/focus search
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
        return;
      }

      // Handle Alt shortcuts
      if (e.altKey) {
        const knownAltKeys = ["KeyK", "KeyR", "KeyI", "KeyD", "KeyQ", "KeyP"];

        if (knownAltKeys.includes(e.code)) {
          e.preventDefault();
          scanInputRef.current?.blur();
        }

        if (e.code === "KeyK") return setShowCalculator(true);
        if (e.code === "KeyR") return handleReprint();

        // Cart Actions (Only if cart is not empty)
        if (cartRef.current.length > 0) {
          if (e.code === "KeyI") {
            const item = cartRef.current[selectedIndexRef.current];
            if (item) updateQty(item.id, 1);
          } else if (e.code === "KeyD") {
            const item = cartRef.current[selectedIndexRef.current];
            if (item) updateQty(item.id, -1);
          } else if (e.code === "KeyQ") {
            setQtyFocusTrigger((prev) => prev + 1);
          } else if (e.code === "KeyP") {
            handleSaveBillRef.current?.(
              "cash",
              totalsRef.current.roundedGrandTotal,
            );
          }
        }
      }

      if (e.shiftKey && e.code === "KeyD" && cartRef.current.length > 0) {
        e.preventDefault();
        scanInputRef.current?.blur();
        const item = cartRef.current[selectedIndexRef.current];
        if (item) {
          if (window.confirm(`Delete item: ${item.itemName}?`)) {
            removeFromCart(item.id);
          }
        }
        return;
      }

      switch (e.key) {
        case "F1":
          e.preventDefault();
          scanInputRef.current?.blur();
          setShowShortcuts(true);
          break;
        case "F2":
          e.preventDefault();
          scanInputRef.current?.blur();
          setShowHoldNoteModal(true);
          break;
        case "F4":
          e.preventDefault();
          scanInputRef.current?.blur();
          handleShowHeldSales();
          break;
        case "F6":
          e.preventDefault();
          scanInputRef.current?.blur();
          clearCart();
          break;
        case "F10":
          e.preventDefault();
          scanInputRef.current?.blur();
          handleLogout();
          break;
        case "ArrowDown":
          if (searchResults.length === 0 && cartRef.current.length > 0) {
            e.preventDefault();
            scanInputRef.current?.blur();
            setSelectedIndex((prev) =>
              Math.min(prev + 1, cartRef.current.length - 1),
            );
          }
          break;
        case "ArrowUp":
          if (searchResults.length === 0 && cartRef.current.length > 0) {
            e.preventDefault();
            scanInputRef.current?.blur();
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
      searchResults.length,
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
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);
}
