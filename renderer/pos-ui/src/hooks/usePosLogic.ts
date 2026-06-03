import { useState, useEffect, useRef, useCallback } from "react";
import { usePosCart } from "./usePosCart";
import { type CartItem } from "../utils/posUtils";
import { usePosSearch } from "./usePosSearch";
import { usePosBilling } from "./usePosBilling";
import { usePosKeyboard } from "./usePosKeyboard";
import { useUserDetails } from "./useUserDetails";
import { useSystemState } from "./useSystemState";
import { useCustomerDisplay } from "./useCustomerDisplay";
import { useAuth } from "../context/AuthContext";
import { showDialog } from "../components/common/GlobalAlert";

interface PosLogicOptions {
  isB2B?: boolean;
}

export function usePosLogic(onLogout?: () => void, options?: PosLogicOptions) {
  const isB2B = options?.isB2B || false;

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [transactionMode, setTransactionMode] = useState<string | undefined>();
  const [itemToDelete, setItemToDelete] = useState<CartItem | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerKeyword, setCustomerKeyword] = useState("");

  const { userDetails, branchInfo } = useUserDetails();
  const { customerWindow, openCustomerDisplay } = useCustomerDisplay();
  const { isServerOnline, isNetworkOnline } = useAuth();
  const {
    theme,
    toggleTheme,
    syncStatus,
    syncMetrics,
    manualMode,
    setManualMode,
    currentTime,
    handleLogout,
    handleSyncTransaction,
  } = useSystemState(userDetails.fyCode, onLogout);

  const isOnline = isServerOnline;

  const {
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
  } = usePosCart(scanInputRef, userDetails);

  const lastAddedItemCode = useRef<string | null>(null);

  const {
    searchTerm,
    setSearchTerm,
    searchResults,
    setSearchResults,
    loading,
    searchProduct,
    handleScan,
    handleProductSelect,
    handleCloseSearchResults,
  } = usePosSearch((product) => {
    lastAddedItemCode.current = product.itemCode;
    addToCart(product);
  }, scanInputRef);

  const {
    handleSaveBill,
    handleHoldSale,
    handleNewSale,
    handleFetchHeldSales,
    handleResumeHeldSale,
    handlePrintReceipt,
    handleShowTransactions: baseShowTransactions,
    handleReprint,
    handleReprintBill,
    generateInvoiceNumber,
    transactions,
    showTransactions,
    setShowTransactions,
    heldSales,
    showHeldSales,
    setShowHeldSales,
    showHoldNoteModal,
    setShowHoldNoteModal,
    invoiceCounter,
    lastBill,
    printBillData,
    isInvoiceLoading,
    showReprintModal,
    setShowReprintModal,
    reprintTransactions,
    handleShowHeldSales,
  } = usePosBilling(
    cart,
    totals,
    userDetails,
    branchInfo,
    clearCart,
    setSearchTerm,
    setCart,
    scanInputRef,
    selectedCustomer,
    setSelectedCustomer,
    setCustomerKeyword,
    isB2B,
    customerKeyword,
  );

  const handleShowTransactions = useCallback(
    (filter?: string) => {
      setTransactionMode(filter);
      baseShowTransactions(filter);
    },
    [baseShowTransactions],
  );

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (lastAddedItemCode.current) {
      const newIndex = cart.findIndex(
        (item) => item.itemCode === lastAddedItemCode.current,
      );
      if (newIndex > -1) {
        setSelectedIndex(newIndex);
      }
      lastAddedItemCode.current = null;
    }
  }, [cart, setSelectedIndex]);

  const handleCloseShortcuts = useCallback(() => setShowShortcuts(false), []);
  const handleCloseCalculator = useCallback(() => setShowCalculator(false), []);
  const handleOpenPayment = useCallback(() => {
    window.dispatchEvent(new CustomEvent("openPaymentModal"));
  }, []);

  // --- Keyboard Shortcuts ---

  usePosKeyboard({
    cart,
    selectedIndex,
    setSelectedIndex,
    updateQty,
    removeFromCart,
    clearCart,
    totals,
    handleSaveBill,
    selectedCustomer,
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
  });

  // Automatically trigger the Global Alert confirmation when an item is targeted for deletion
  useEffect(() => {
    if (itemToDelete) {
      showDialog(
        `Are you sure you want to remove "${itemToDelete.itemName}" from the cart?`,
        "warning",
        "Confirm Deletion",
        () => setItemToDelete(null), // Triggers on Cancel or Escape
        () => {
          removeFromCart(itemToDelete.id);
          setItemToDelete(null);
        }, // Triggers on Confirm or Enter
        "Delete Item",
        "Cancel",
      );
    }
  }, [itemToDelete, removeFromCart]);

  return {
    searchTerm,
    setSearchTerm,
    cart,
    searchResults,
    setSearchResults,
    theme,
    showShortcuts,
    setShowShortcuts,
    showCalculator,
    setShowCalculator,
    loading,
    scanInputRef,
    userDetails,
    currentTime,
    toggleTheme,
    addToCart,
    removeFromCart,
    clearCart,
    updateQty,
    handleQtyChange,
    handleQtyBlur,
    searchProduct,
    handleScan,
    selectedIndex,
    setSelectedIndex,
    tableFocusTrigger,
    qtyFocusTrigger,
    isOnline,
    isServerOnline,
    isNetworkOnline,
    syncStatus,
    syncMetrics,
    netOffline: !isOnline,
    manualMode,
    setManualMode,
    customerWindow,
    showReprintModal,
    setShowReprintModal,
    receiptRef,
    branchInfo,
    invoiceCounter,
    lastBill,
    handleProductSelect,
    handleCloseSearchResults,
    handleCloseShortcuts,
    handleCloseCalculator,
    openCustomerDisplay,
    handleReprint,
    handleReprintBill,
    reprintTransactions,
    handlePrintReceipt,
    showTransactions,
    setShowTransactions,
    transactions,
    handleSyncTransaction,
    handleShowTransactions,
    transactionMode,
    generateInvoiceNumber,
    isInvoiceLoading,
    handleSaveBill,
    handleHoldSale,
    handleNewSale,
    handleFetchHeldSales,
    handleResumeHeldSale,
    heldSales,
    showHeldSales,
    setShowHeldSales,
    handleShowHeldSales,
    showHoldNoteModal,
    setShowHoldNoteModal,
    printBillData,
    selectedCustomer,
    setSelectedCustomer,
    customerKeyword,
    setCustomerKeyword,
    itemToDelete,
    setItemToDelete,
    onLogout: handleLogout,
    ...totals,
  };
}
