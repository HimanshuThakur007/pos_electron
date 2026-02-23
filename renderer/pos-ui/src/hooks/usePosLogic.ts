import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  createElement,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PosPrintReceipt from "../components/pos/PosPrintReceipt";
import {
  type CartItem,
  isPPScheme,
  recalculateCart,
  createNewItem,
  validateStock,
} from "../utils/posUtils";

export function usePosLogic(onLogout?: () => void) {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tableFocusTrigger, setTableFocusTrigger] = useState(0);
  const [qtyFocusTrigger, setQtyFocusTrigger] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState("idle");

  const scanInputRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef(false);
  const cartRef = useRef<CartItem[]>(cart);

  const [userDetails, setUserDetails] = useState({
    branchName: "MARKET NINETY NINE PVT LTD",
    branchCode: "",
    userName: "User",
    userRole: "Role",
    userId: "0",
    terminalCode: "A",
    fyCode: "",
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  // --- Billing Screen Logic ---
  const [customerWindow, setCustomerWindow] = useState<Window | null>(null);
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [heldSales, setHeldSales] = useState<any[]>([]);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [showHoldNoteModal, setShowHoldNoteModal] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [branchInfo, setBranchInfo] = useState({
    address: "",
    gstin: "",
    phoneNo: "",
  });
  // Running number state (counter)
  const [invoiceCounter, setInvoiceCounter] = useState(1);
  const [lastBill, setLastBill] = useState<any>(null);

  // --- Effects ---

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

  // Focus input on load
  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  // Keep cartRef in sync for event listeners
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // Sync theme to body
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    return () => document.body.removeAttribute("data-theme");
  }, [theme]);

  // Clamp selectedIndex when cart changes
  useEffect(() => {
    if (cart.length > 0) {
      setSelectedIndex((prev) => Math.min(prev, cart.length - 1));
    } else {
      setSelectedIndex(0);
    }
  }, [cart.length]);

  // --- Network & Sync Status ---

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
    // Listen for sync status from main process
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

  // Trigger sync when fyCode is available (e.g. after login)
  useEffect(() => {
    if (userDetails.fyCode && window.posApi) {
      window.posApi.triggerBackgroundSync(userDetails.fyCode);
    }
  }, [userDetails.fyCode]);

  // --- Actions ---

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const addToCart = useCallback((product: any) => {
    const currentCart = cartRef.current;
    const existingInState = currentCart.find(
      (item) => item.itemCode === product.itemCode,
    );

    if (existingInState) {
      const newQty = existingInState.qty + 1;
      if (!validateStock(existingInState.stock, newQty)) return;

      setCart((prev) => {
        const updated = prev.map((item) =>
          item.itemCode === product.itemCode ? { ...item, qty: newQty } : item,
        );
        return recalculateCart(updated);
      });
      return;
    }

    const stock = Number(product.Stock_Qty) || 0;
    if (stock < 1) return alert("Out of stock!");
    setCart((prev) => recalculateCart([...prev, createNewItem(product)]));
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => recalculateCart(prev.filter((item) => item.id !== id)));
    setTimeout(() => scanInputRef.current?.focus(), 0);
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setTimeout(() => scanInputRef.current?.focus(), 0);
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    const currentCart = cartRef.current;
    const itemInState = currentCart.find((i) => i.id === id);
    if (!itemInState) return;

    const newQty = itemInState.qty + delta;
    if (!validateStock(itemInState.stock, newQty)) return;

    const finalQty = Math.max(1, newQty);

    setCart((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, qty: finalQty } : item,
      );
      return recalculateCart(updated);
    });
  }, []);

  const handleQtyChange = useCallback((id: string, val: string) => {
    const newQty = parseInt(val);
    const currentCart = cartRef.current;
    const itemInState = currentCart.find((i) => i.id === id);
    if (!itemInState) return;

    if (!validateStock(itemInState.stock, newQty)) return;

    const finalQty = isNaN(newQty) ? 0 : newQty;

    setCart((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, qty: finalQty } : item,
      );
      return recalculateCart(updated);
    });
  }, []);

  const handleQtyBlur = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => {
        const updated = prev.map((item) =>
          item.id === id ? { ...item, qty: 1 } : item,
        );
        return recalculateCart(updated);
      });
    }
  }, []);

  const searchProduct = useCallback(async () => {
    if (loadingRef.current || !searchTerm.trim() || !window.posApi) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const result =
        await window.posApi.getStockByLogicUserCodeSqlite(searchTerm);

      if (result && result.length > 0) {
        const mappedData = result.map((item: any) => ({
          itemName: item.Item_Name,
          itemCode: item.itemCode,
          Lot_MRP: item.Lot_MRP,
          Stock_Qty: String(item.Stock_Qty),
          taxRate: item.taxRate,
          printDesc: item.printDesc || item.t2_printDesc,
          schm_type: item.schm_type,
          schm_camp_grp: item.schm_camp_grp,
        }));

        if (mappedData.length === 1) {
          addToCart(mappedData[0]);
          setSearchTerm("");
          setSearchResults([]);
          setTimeout(() => scanInputRef.current?.focus(), 0);
        } else {
          setSearchResults(mappedData);
        }
      } else {
        alert("Product not found!");
      }
    } catch (error) {
      console.error("Search failed:", error);
      alert("Search failed");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [searchTerm, addToCart]);

  const handleScan = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        searchProduct();
      }
    },
    [searchProduct],
  );

  // --- Computed ---

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
    const taxableValue = grossAmount - totalDiscount;
    const totalTax = cart.reduce(
      (acc, item) =>
        acc + ((item.price - item.discount) * item.qty * item.tax) / 100,
      0,
    );
    const grandTotal = taxableValue + totalTax;
    const roundedGrandTotal = Math.round(grandTotal);
    const roundOff = roundedGrandTotal - grandTotal;
    const totalPPAmount = cart.reduce(
      (acc, item) =>
        isPPScheme(item.schm_type, item.schm_camp_grp)
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

  // Refs for stable access in event listeners
  const totalsRef = useRef(totals);
  const selectedIndexRef = useRef(selectedIndex);
  const handleSaveBillRef = useRef<any>(null);

  useEffect(() => {
    totalsRef.current = totals;
    selectedIndexRef.current = selectedIndex;
  }, [totals, selectedIndex]);

  // We'll set handleSaveBillRef later after handleSaveBill is defined

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
        console.log("Last Bill==>", bill);

        const lastSynced = await window.posApi?.getLastSyncedInvoice({
          branch_code: branchCode,
          terminal_code: terminalCode,
          cashier_id: cashierId,
          fy_code: fyCode,
        });
        console.log("Last Synced==>", lastSynced);

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
          // Format: M002X26-000123
          console.log("Max Bill No==>", maxBillNo);
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

  useEffect(() => {
    const fetchBranchData = async () => {
      try {
        if (window.posApi && window.posApi.getBranches) {
          const branches = await window.posApi.getBranches();
          console.log("Branches api ==>", branches);
          const branch = branches.find(
            (b: any) =>
              String(b.branchCode) === String(userDetails.branchCode) ||
              String(b.Branch_Code) === String(userDetails.branchCode),
          );
          console.log("Branch==>", branch);
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

  const handleProductSelect = useCallback(
    (item: any) => {
      addToCart(item);
      setSearchResults([]);
      setSearchTerm("");
      setTimeout(() => scanInputRef.current?.focus(), 0);
    },
    [addToCart],
  );

  const handleCloseSearchResults = useCallback(() => {
    setSearchResults([]);
    setTimeout(() => scanInputRef.current?.focus(), 0);
  }, []);
  const handleCloseShortcuts = useCallback(() => setShowShortcuts(false), []);
  const handleCloseCalculator = useCallback(() => setShowCalculator(false), []);

  // Function to open the Customer Facing Display window
  const openCustomerDisplay = useCallback(() => {
    if (customerWindow && !customerWindow.closed) {
      customerWindow.focus();
      return;
    }

    // Calculate position for the second display (assuming extended to the right)
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
      // Copy styles from main window to child window
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

      // Set title
      win.document.title = "Customer Display - Market99";
      setCustomerWindow(win);

      // Handle window close
      win.onbeforeunload = () => {
        setCustomerWindow(null);
      };
    }
  }, [customerWindow]);

  // Close child window when parent unmounts
  useEffect(() => {
    return () => {
      if (customerWindow) {
        customerWindow.close();
      }
    };
  }, [customerWindow]);

  const handleReprint = useCallback(() => {
    setShowReprintModal(true);
  }, []);

  const handleShowTransactions = useCallback(
    async (filter?: string) => {
      try {
        if (!userDetails.branchCode) {
          console.warn("Skipping transaction fetch: No branch code available");
          return;
        }

        console.log("Fetching transactions with params:", {
          branch_code: userDetails.branchCode,
          terminal_code: userDetails.terminalCode,
          user_id: userDetails.userId,
        });

        const data =
          (await window.posApi?.getTransactions({
            branch_code: userDetails.branchCode || "",
            terminal_code: userDetails.terminalCode || "",
            user_id: userDetails.userId || "",
            fy_code: userDetails.fyCode || "",
          })) || [];

        let filteredData = data;
        console.log("Transactions fetched:", data.length, data);
        if (filter === "today") {
          const todayStr = new Date().toDateString();
          filteredData = data.filter((tx: any) => {
            // Handle SQLite UTC timestamp "YYYY-MM-DD HH:MM:SS"
            let dateObj = new Date(tx.created_at);
            if (isNaN(dateObj.getTime()) || !tx.created_at.includes("T")) {
              // Force UTC interpretation for SQLite default format
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

  const handleHoldSale = useCallback(
    async (note: string = "") => {
      if (cart.length === 0) return alert("Cart is empty!");

      const holdData = {
        branch_code: userDetails.branchCode,
        terminal_code: userDetails.terminalCode,
        cashier_id: userDetails.userId,
        customer_name: "Walk-in", // Or bind to state if you have customer selection
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
      })) || {
        status: "error",
        data: [],
      };
      console.log("Held Sales==>", res);
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
      setCart(recalculateCart(sale.cart_items));
      await window.posApi?.deleteHeldSale(sale.id);
      // Refresh list
      handleFetchHeldSales();
      setTimeout(() => scanInputRef.current?.focus(), 0);
    },
    [handleFetchHeldSales],
  );

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

  // Data for the receipt
  const printBillData = useMemo(
    () => ({
      storeDetails: {
        // name: userDetails.branchName || "Market99",
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

  const handlePrintReceipt = useCallback(() => {
    console.log("handlePrintReceipt: Triggered");
    try {
      const content = renderToStaticMarkup(
        createElement(PosPrintReceipt, {
          storeDetails: printBillData.storeDetails,
          billDetails: printBillData.billDetails,
          cart: printBillData.cart,
          totals: printBillData.totals,
        }),
      );

      const win = window.open("", "", "height=600,width=400");
      if (win) {
        win.document.write("<html><head><title>Print Receipt</title>");
        win.document.write(
          '<style>html, body { width: 70mm; margin: 0; padding: 0; font-family: "Roboto Mono", monospace; font-size: 11px; }</style>',
        );
        win.document.write("</head><body>");
        win.document.write(content);
        win.document.write("</body></html>");
        win.document.close();
        win.focus();
        setTimeout(() => {
          win.print();
          win.close();
        }, 250);
      } else {
        console.error("handlePrintReceipt: Failed to open print window");
      }
    } catch (error) {
      console.error("handlePrintReceipt: Error generating receipt", error);
    }
  }, [printBillData]);

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
        customer_name: "Walk-in", // Placeholder
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
      console.log("bill json save", billData);
      try {
        const res = (await window.posApi?.saveBill(billData)) || {
          status: "error",
          message: "API unavailable",
        };
        console.log("Save Bill Response:", res);
        if (res.status === "success") {
          console.log("Bill saved successfully, calling print...");
          handlePrintReceipt();
          clearCart();
          setInvoiceCounter((prev) => prev + 1);
          const savedBill = await window.posApi?.getLastBill({
            branch_code:
              userDetails.branchCode ||
              localStorage.getItem("branch_code") ||
              "",
            terminal_code:
              userDetails.terminalCode ||
              localStorage.getItem("terminal_code") ||
              "",
            cashier_id:
              userDetails.userId || localStorage.getItem("user_id") || "",
            fy_code:
              userDetails.fyCode || localStorage.getItem("fy_code") || "",
          });
          setLastBill(savedBill);

          // Trigger background sync immediately for better UX
          if (window.posApi) {
            window.posApi.triggerBackgroundSync(userDetails.fyCode);
          }

          return true;
        } else {
          alert("Error saving bill: " + res.message);
          return false;
        }
      } catch (e) {
        console.error(e);
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
    ],
  );

  useEffect(() => {
    handleSaveBillRef.current = handleSaveBill;
  }, [handleSaveBill]);

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

      if (e.altKey && e.code === "KeyV") {
        e.preventDefault();
        handleShowHeldSales();
        return;
      }

      // Handle Alt shortcuts using e.code to support Mac (where Alt+Key might produce special chars)
      if (e.altKey && cartRef.current.length > 0) {
        if (e.code === "KeyI") {
          e.preventDefault();
          const item = cartRef.current[selectedIndexRef.current];
          if (item) updateQty(item.id, 1);
          return;
        }
        if (e.code === "KeyD") {
          e.preventDefault();
          const item = cartRef.current[selectedIndexRef.current];
          if (item) updateQty(item.id, -1);
          return;
        }
        if (e.code === "KeyQ") {
          e.preventDefault();
          setQtyFocusTrigger((prev) => prev + 1);
          return;
        }
        if (e.code === "KeyP") {
          e.preventDefault();
          if (handleSaveBillRef.current) {
            handleSaveBillRef.current(
              "cash",
              totalsRef.current.roundedGrandTotal,
            );
          }
          return;
        }
        if (e.code === "KeyH") {
          e.preventDefault();
          setShowHoldNoteModal(true);
          return;
        }
      }

      switch (e.key) {
        case "F2":
          e.preventDefault();
          if (cartRef.current.length > 0) {
            setQtyFocusTrigger((prev) => prev + 1);
          }
          break;
        case "F4":
          e.preventDefault();
          const currentCart = cartRef.current;
          if (currentCart.length > 0) {
            const lastItem = currentCart[currentCart.length - 1];
            removeFromCart(lastItem.id);
            scanInputRef.current?.focus();
          }
          break;
        case "F6":
          e.preventDefault();
          setShowCalculator((prev) => !prev);
          break;
        case "F3":
          e.preventDefault();
          setCart([]);
          break;
        case "F10":
          e.preventDefault();
          onLogout?.();
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
        case "F8":
          e.preventDefault();
          if (cartRef.current.length > 0) {
            setTableFocusTrigger((prev) => prev + 1);
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
      onLogout,
      // Removed cart, selectedIndex, handleSaveBill, totals to prevent re-binding
      updateQty,
      handleShowHeldSales,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
    // New exports
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
    handlePrintReceipt,
    showTransactions,
    setShowTransactions,
    transactions,
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
    ...totals,
  };
}
