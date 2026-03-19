import { useState, useEffect, useRef, useCallback } from "react";
import { usePosCart } from "./usePosCart";
import { usePosSearch } from "./usePosSearch";
import { usePosBilling } from "./usePosBilling";
import { usePosKeyboard } from "./usePosKeyboard";

export function usePosLogic(onLogout?: () => void) {
  // --- UI/System State ---
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [manualMode, setManualMode] = useState("online");
  const [currentTime, setCurrentTime] = useState(new Date());

  const scanInputRef = useRef<HTMLInputElement>(null);

  // --- User & Branch Info ---
  const [userDetails, setUserDetails] = useState({
    branchName: "MARKET NINETY NINE PVT LTD",
    branchCode: "",
    userName: "User",
    userRole: "Role",
    userId: "0",
    terminalCode: "A",
    fyCode: "",
  });

  const [branchInfo, setBranchInfo] = useState({
    address: "",
    gstin: "",
    phoneNo: "",
  });

  const [customerWindow, setCustomerWindow] = useState<Window | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // --- Initialize Hooks ---
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
  } = usePosCart(scanInputRef);

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
  } = usePosSearch(addToCart, scanInputRef);

  const {
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
    // setTransactions,
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
  );

  // --- Common Effects ---

  useEffect(() => {
    setUserDetails({
      branchName:
        localStorage.getItem("branch_name") || "MARKET NINETY NINE PVT LTD",
      branchCode: localStorage.getItem("branch_code") || "",
      userName: localStorage.getItem("user_name") || "User",
      userRole: localStorage.getItem("user_role") || "Role",
      userId: localStorage.getItem("user_id") || "0",
      terminalCode: localStorage.getItem("terminal_code") || "A",
      fyCode: localStorage.getItem("fy_code") || "",
    });

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    return () => document.body.removeAttribute("data-theme");
  }, [theme]);

  // --- Network Sync ---

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (window.posApi) {
        window.posApi.triggerBackgroundSync(localStorage.getItem("fy_code"));
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let unsubscribe = () => {};
    if (window.posApi && window.posApi.onSyncStatusChange) {
      unsubscribe = window.posApi.onSyncStatusChange((status) =>
        setSyncStatus(status),
      );
    }

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (userDetails.fyCode && window.posApi) {
      window.posApi.triggerBackgroundSync(userDetails.fyCode);
    }
  }, [userDetails.fyCode]);

  // --- Fetch Branch Info ---
  useEffect(() => {
    const fetchBranchData = async () => {
      try {
        if (window.posApi && window.posApi.getBranches) {
          const branches = await window.posApi.getBranches();
          const branch = branches.find(
            (b: any) =>
              String(b.branchCode) === String(userDetails.branchCode) ||
              String(b.Branch_Code) === String(userDetails.branchCode),
          );
          if (branch) {
            setBranchInfo({
              address: branch.Address || "",
              gstin: branch.Gst_Number || "",
              phoneNo: branch.branch_Phone_Number || "",
            });
          }
        }
      } catch (e) {
        console.error("Failed to fetch branch info", e);
      }
    };
    if (userDetails.branchCode) {
      fetchBranchData();
    }
  }, [userDetails.branchCode]);

  // --- Handlers ---

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const handleCloseShortcuts = useCallback(() => setShowShortcuts(false), []);
  const handleCloseCalculator = useCallback(() => setShowCalculator(false), []);

  const handleLogout = useCallback(async () => {
    if (window.posApi && (window.posApi as any).getPendingSyncCount) {
      try {
        const pendingCount = await (window.posApi as any).getPendingSyncCount(
          userDetails.fyCode,
        );
        if (pendingCount > 0) {
          alert(
            `Cannot log out. ${pendingCount} item(s) have not been synced.`,
          );
          return;
        }
      } catch (error) {
        console.error("Failed to check for pending transactions:", error);
      }
    }
    onLogout?.();
  }, [onLogout, userDetails.fyCode]);

  const handleSyncTransaction = useCallback(
    async (tx: any) => {
      if (window.posApi && window.posApi.syncSpecificTransaction) {
        try {
          const res = await window.posApi.syncSpecificTransaction(
            tx.bill_no,
            tx.fin_year || userDetails.fyCode,
          );
          if (res.status === "success") {
            alert("Transaction synced successfully!");
            handleShowTransactions();
          } else {
            alert("Sync failed: " + (res.message || "Unknown error"));
          }
        } catch (e: any) {
          alert("Sync failed: " + e.message);
        }
      }
    },
    [userDetails.fyCode, handleShowTransactions],
  );

  // --- Customer Display ---
  const openCustomerDisplay = useCallback(() => {
    if (customerWindow && !customerWindow.closed) {
      customerWindow.focus();
      return;
    }
    const width = 1024;
    const height = 768;
    const left = window.screen.width;
    const top = 0;

    const win = window.open(
      "",
      "CustomerDisplay",
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`,
    );

    if (win) {
      Array.from(document.styleSheets).forEach((styleSheet) => {
        try {
          if (styleSheet.href) {
            const link = win.document.createElement("link");
            link.rel = "stylesheet";
            link.href = styleSheet.href;
            win.document.head.appendChild(link);
          } else if (styleSheet.cssRules) {
            const style = win.document.createElement("style");
            Array.from(styleSheet.cssRules).forEach((rule) => {
              style.appendChild(win.document.createTextNode(rule.cssText));
            });
            win.document.head.appendChild(style);
          }
        } catch (e) {
          console.warn("Could not copy stylesheet", e);
        }
      });
      win.document.title = "Customer Display - Market99";
      setCustomerWindow(win);
      win.onbeforeunload = () => {
        setCustomerWindow(null);
      };
    }
  }, [customerWindow]);

  useEffect(() => {
    return () => {
      if (customerWindow) {
        customerWindow.close();
      }
    };
  }, [customerWindow]);

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
  });

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
    syncStatus,
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
    generateInvoiceNumber,
    handleSaveBill,
    handleHoldSale,
    handleFetchHeldSales,
    handleResumeHeldSale,
    heldSales,
    showHeldSales,
    setShowHeldSales,
    handleShowHeldSales,
    showHoldNoteModal,
    setShowHoldNoteModal,
    printBillData,
    onLogout: handleLogout,
    ...totals,
  };
}
