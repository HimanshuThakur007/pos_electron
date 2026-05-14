import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Store, Tag, Database } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import DashboardHeader from "./DashboardHeader";
import SyncCardsGrid from "./SyncCardsGrid";
import DashboardTabs from "./DashboardTabs";
import DataViewer from "./DataViewer";
import { useAuth } from "../../context/AuthContext";

const formatDateTimeIST = (
  dateStr: string | number | Date | null | undefined,
) => {
  if (!dateStr) return "—";
  let parsedDate = dateStr;
  if (
    typeof dateStr === "string" &&
    dateStr.includes(" ") &&
    !dateStr.includes("T")
  ) {
    parsedDate = dateStr.replace(" ", "T") + "Z";
  }
  const d = new Date(parsedDate);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

type TabType =
  | "retailBills"
  | "b2bBills"
  | "retailSync"
  | "b2bSync"
  | "invoiceSeries"
  | "stocks"
  | "schemes";

interface SyncDashboardProps {
  onLogout?: () => void;
}

export default function SyncDashboard({ onLogout }: SyncDashboardProps) {
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [time, setTime] = useState(new Date());
  const branchName = localStorage.getItem("branch_name") || "Market99";
  const finYear = localStorage.getItem("fin_year") || "01";
  const userName = localStorage.getItem("user_name") || "Cashier";

  const { isServerOnline, isNetworkOnline } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("retailBills");
  const [fullData, setFullData] = useState({
    branchesTotal: 0,
    schemesTotal: 0,
    itemsTotal: 0,
    stockTotal: 0,
    transactions: [] as any[],
    invoiceSeries: [] as any[],
    stocks: [] as any[],
    schemes: [] as any[],
  });
  const colSpan = useMemo(() => {
    if (activeTab === "invoiceSeries") return 8;
    if (activeTab === "stocks") {
      return fullData.stocks && fullData.stocks.length > 0
        ? Object.keys(fullData.stocks[0]).length
        : 4;
    }
    if (activeTab === "schemes") {
      return fullData.schemes && fullData.schemes.length > 0
        ? Object.keys(fullData.schemes[0]).length
        : 4;
    }
    // transactions and syncTracker (after removing attempts) have 5 columns
    return 5;
  }, [activeTab, fullData.stocks, fullData.schemes]);
  const stockKeys = useMemo(() => {
    if (
      activeTab === "stocks" &&
      fullData.stocks &&
      fullData.stocks.length > 0
    ) {
      return Object.keys(fullData.stocks[0]);
    }
    return ["Item_Name", "LogicUserCode", "Lot_MRP", "Stock_Qty"];
  }, [activeTab, fullData.stocks]);
  const schemeKeys = useMemo(() => {
    if (
      activeTab === "schemes" &&
      fullData.schemes &&
      fullData.schemes.length > 0
    ) {
      return Object.keys(fullData.schemes[0]);
    }
    return ["schm_camp_grp", "description", "start_date", "end_date"];
  }, [activeTab, fullData.schemes]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const branchCode = localStorage.getItem("branch_code") || "";
  const fyCode = localStorage.getItem("fy_code") || "";
  const [syncDates, setSyncDates] = useState({
    items: localStorage.getItem("last_items_sync") || "Never",
    stock: localStorage.getItem(`last_stock_sync_${branchCode}`) || "Never",
    schemes: localStorage.getItem("last_schemes_sync") || "Never",
    branches: localStorage.getItem("last_branches_sync") || "Never",
  });

  const [paginationState, setPaginationState] = useState<
    Record<TabType, { currentPage: number; limit: number }>
  >({
    retailBills: { currentPage: 1, limit: 15 },
    b2bBills: { currentPage: 1, limit: 15 },
    retailSync: { currentPage: 1, limit: 15 },
    b2bSync: { currentPage: 1, limit: 15 },
    invoiceSeries: { currentPage: 1, limit: 15 },
    stocks: { currentPage: 1, limit: 15 },
    schemes: { currentPage: 1, limit: 15 },
  });
  const [searchTerms, setSearchTerms] = useState<Record<TabType, string>>({
    retailBills: "",
    b2bBills: "",
    retailSync: "",
    b2bSync: "",
    invoiceSeries: "",
    stocks: "",
    schemes: "",
  });
  const [debouncedSearchTerms, setDebouncedSearchTerms] = useState(searchTerms);

  // Debounce search terms to prevent UI freezing on heavy data
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerms(searchTerms);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerms]);

  const handlePageChange = (tab: TabType, page: number) => {
    setPaginationState((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], currentPage: page },
    }));
  };

  const handleSearchChange = (tab: TabType, term: string) => {
    setSearchTerms((prev) => ({ ...prev, [tab]: term }));
    handlePageChange(tab, 1);
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F10" && onLogout) {
        e.preventDefault();
        onLogout();
      }
      if (e.key === "Escape" && !document.querySelector('[role="dialog"]')) {
        navigate("/");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!window.posApi) return;
      setIsLoadingData(true);
      try {
        const [
          branchesCount,
          schemesCount,
          itemsCount,
          stockCount,
          transactionsRes,
          invoiceSeriesRes,
        ] = await Promise.all([
          (window.posApi as any).getBranchesCount?.() || 0,
          (window.posApi as any).getSchemesCount?.() || 0,
          (window.posApi as any).getItemsCount?.() || 0,
          (window.posApi as any).getStockCount?.(branchCode) || 0,
          (window.posApi as any).getTransactions?.({
            branch_code: branchCode,
            fy_code: fyCode,
          }),
          (window.posApi as any).getAllInvoiceSeries?.(fyCode) || [],
        ]);

        const sortedTransactions = (transactionsRes || []).sort(
          (a: any, b: any) => {
            const timeA = a.created_at || a.time || "";
            const timeB = b.created_at || b.time || "";
            return timeA < timeB ? 1 : timeA > timeB ? -1 : 0;
          },
        );

        setFullData((prev) => ({
          ...prev,
          branchesTotal: branchesCount,
          schemesTotal: schemesCount,
          itemsTotal: itemsCount,
          stockTotal: stockCount,
          transactions: sortedTransactions,
          invoiceSeries: invoiceSeriesRes,
        }));
      } catch (error) {
        console.error(`Error fetching data:`, error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [branchCode, fyCode, refreshTrigger]);

  // Dynamic fetch specifically for stocks tab to prevent memory overload
  useEffect(() => {
    if (activeTab === "stocks" && fullData.stocks.length === 0) {
      const fetchStocks = async () => {
        setIsLoadingData(true);
        try {
          let res = [];
          if (window.posApi) {
            if ((window.posApi as any).getAllStock) {
              res = await (window.posApi as any).getAllStock();
            } else if ((window.posApi as any).getAllStocks) {
              res = await (window.posApi as any).getAllStocks();
            } else if ((window.posApi as any).getStockByLogicUserCodeSqlite) {
              res = await (window.posApi as any).getStockByLogicUserCodeSqlite(
                "",
              );
            }
          }
          setFullData((prev) => ({ ...prev, stocks: res || [] }));
        } catch (err) {
          console.error("Failed to fetch stocks:", err);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchStocks();
    } else if (activeTab === "schemes" && fullData.schemes.length === 0) {
      const fetchSchemes = async () => {
        setIsLoadingData(true);
        try {
          let res = [];
          if (window.posApi) {
            if ((window.posApi as any).getAllSchemes) {
              res = await (window.posApi as any).getAllSchemes();
            } else if ((window.posApi as any).getSchemes) {
              res = await (window.posApi as any).getSchemes();
            }
          }
          setFullData((prev) => ({ ...prev, schemes: res || [] }));
        } catch (err) {
          console.error("Failed to fetch schemes:", err);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchSchemes();
    }
  }, [activeTab, fullData.stocks.length, fullData.schemes.length]);

  const handleReprint = async (bill: any) => {
    try {
      let storeDetails = {
        name: "MARKET NINETY NINE PVT LTD.",
        address: "Pacific Mall, Jasola, New Delhi",
        phone: "1234567890",
        gstin: "07AAACA1234A1Z5",
        cin: "U52100DL2018PTC334668",
      };

      if (window.posApi && (window.posApi as any).getBranchByCode) {
        const branch = await (window.posApi as any).getBranchByCode(branchCode);
        if (branch) {
          storeDetails.address = branch.Address || storeDetails.address;
          storeDetails.phone =
            branch.branch_Phone_Number || branch.phoneNo || storeDetails.phone;
          storeDetails.gstin =
            branch.Gst_Number || branch.gstin || storeDetails.gstin;
        }
      }

      let cartItems = bill.cart_items;
      if (typeof cartItems === "string") {
        try {
          cartItems = JSON.parse(cartItems);
        } catch (e) {
          cartItems = [];
        }
      }

      const isBillB2B = bill.bill_no?.startsWith("B");

      const reprintData = {
        storeDetails,
        billDetails: {
          billNo: bill.bill_no,
          date: formatDateTimeIST(bill.created_at || bill.time || new Date()),
          cashier: userName,
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
        // cart: Array.isArray(cartItems) ? cartItems : [],
        cart: Array.isArray(cartItems)
          ? cartItems.map((item: any) => ({
              ...item,
              hsn_code: item.hsn_code
                ? String(item.hsn_code).split(".")[0]
                : "",
            }))
          : [],
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

      if (window.posApi && (window.posApi as any).printEscposReceipt) {
        const toastId = toast.loading("Printing receipt...");
        const escResult = await (window.posApi as any).printEscposReceipt(
          reprintData,
        );
        if (escResult?.status === "success") {
          toast.success("Receipt printed successfully", { id: toastId });
        } else {
          toast.error("Printing failed: " + escResult?.message, {
            id: toastId,
          });
        }
      } else {
        toast.error("Printer API not found");
      }
    } catch (error) {
      console.error("Failed to reprint bill:", error);
      toast.error("Failed to reprint bill");
    }
  };

  const activeData = useMemo(() => {
    let data: any[] = [];
    const term = debouncedSearchTerms[activeTab].toLowerCase();

    if (activeTab === "retailBills" || activeTab === "b2bBills") {
      const isB2BTab = activeTab === "b2bBills";
      data = (fullData.transactions || []).filter((tx: any) => {
        const isTxB2B = tx.bill_no?.startsWith("B") || tx.doc_type === 3;
        return isB2BTab ? isTxB2B : !isTxB2B;
      });
    } else if (activeTab === "retailSync" || activeTab === "b2bSync") {
      const isB2BTab = activeTab === "b2bSync";
      data = (fullData.transactions || []).filter((tx: any) => {
        const isTxB2B = tx.bill_no?.startsWith("B") || tx.doc_type === 3;
        return tx.sync_status !== 1 && (isB2BTab ? isTxB2B : !isTxB2B);
      });
    } else if (activeTab === "invoiceSeries") {
      data = fullData.invoiceSeries || [];
    } else if (activeTab === "stocks") {
      data = fullData.stocks || [];
    } else if (activeTab === "schemes") {
      data = fullData.schemes || [];
    }

    if (term) {
      data = data.filter((item: any) => {
        return Object.values(item).some((val) => {
          if (val === null || val === undefined) return false;
          if (typeof val === "object") {
            return JSON.stringify(val).toLowerCase().includes(term);
          }
          return String(val).toLowerCase().includes(term);
        });
      });
    }
    return data;
  }, [fullData, debouncedSearchTerms, activeTab]);

  const activeView = useMemo(() => {
    const total = activeData.length;
    const { currentPage, limit } = paginationState[activeTab];
    const paginatedData = activeData.slice(
      (currentPage - 1) * limit,
      currentPage * limit,
    );

    return { data: paginatedData, total };
  }, [activeData, paginationState, activeTab]);

  const isSearching =
    searchTerms[activeTab] !== debouncedSearchTerms[activeTab];

  const handleExport = () => {
    if (!activeData || activeData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = Object.keys(activeData[0]);
    const headerRow = headers
      .map((key) => `"${key.replace(/_/g, " ").toUpperCase()}"`)
      .join(",");

    const csvRows = activeData.map((row) => {
      return headers
        .map((key) => {
          let val = row[key];
          if (typeof val === "object" && val !== null) {
            val = JSON.stringify(val);
          }

          let strVal = String(val ?? "");

          // Format dates to readable format and prevent Excel from showing ######
          if (
            strVal &&
            strVal !== "—" &&
            (key.toLowerCase().includes("time") ||
              key.toLowerCase().includes("date") ||
              key.toLowerCase().includes("_at"))
          ) {
            strVal = formatDateTimeIST(strVal);
            strVal = `\t${strVal}`; // Prepended tab forces Excel to treat it as text
          }
          // Prevent Excel from removing leading zeros or using scientific notation
          else if (
            strVal &&
            (key.toLowerCase().includes("mobile") ||
              key.toLowerCase().includes("phone") ||
              key.toLowerCase().includes("code") ||
              key.toLowerCase().includes("no") ||
              /^\d{10,}$/.test(strVal))
          ) {
            strVal = `\t${strVal}`;
          }

          // Escape quotes and wrap in quotes to handle commas safely for Excel
          strVal = strVal.replace(/"/g, '""');
          return `"${strVal}"`;
        })
        .join(",");
    });

    const csvString = [headerRow, ...csvRows].join("\n");

    // Use the UTF-8 BOM (\uFEFF) so Excel opens it automatically with correct encoding
    const blob = new Blob(["\uFEFF" + csvString], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      // `${activeTab}_export_${new Date().getTime()}.csv`,
      `${activeTab}_export_${dateStr}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported successfully!");
  };

  const updateSyncDate = (key: string, stateKey: string) => {
    const todayStr = new Date().toDateString();
    localStorage.setItem(key, todayStr);
    setSyncDates((prev) => ({ ...prev, [stateKey]: todayStr }));
  };

  const handleSync = async (
    type: string,
    syncFn: () => Promise<any>,
    storageKey: string,
    stateKey: string,
  ) => {
    setIsSyncing(type);
    const toastId = toast.loading(`Syncing ${type}...`);
    try {
      await syncFn();
      updateSyncDate(storageKey, stateKey);
      setRefreshTrigger((prev) => prev + 1); // trigger refetch of all data to update counts
      toast.success(`${type} synced successfully!`, { id: toastId });
    } catch (error: any) {
      toast.error(`Failed to sync ${type}: ${error.message}`, { id: toastId });
    } finally {
      setIsSyncing(null);
    }
  };

  const handleManualSync = async (bill_no: string) => {
    if (!window.posApi) return;
    setIsSyncing("Transaction");
    const toastId = toast.loading(`Syncing ${bill_no}...`);
    try {
      await (window.posApi as any).syncSpecificTransaction?.(bill_no, fyCode);
      toast.success("Synced successfully", { id: toastId });
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message}`, { id: toastId });
    } finally {
      setIsSyncing(null);
    }
  };

  const syncActions = [
    {
      id: "items",
      title: "Item Master",
      icon: Box,
      date: syncDates.items,
      color: "blue",
      total: fullData.itemsTotal,
      action: () =>
        handleSync(
          "Items",
          () => (window.posApi as any).syncItems(true),
          "last_items_sync",
          "items",
        ),
    },
    {
      id: "stock",
      title: "Stock",
      icon: Database,
      date: syncDates.stock,
      color: "emerald",
      total: fullData.stockTotal,
      action: () =>
        handleSync(
          "Stock",
          () => (window.posApi as any).syncStock(branchCode, true),
          `last_stock_sync_${branchCode}`,
          "stock",
        ),
    },
    {
      id: "schemes",
      title: "Schemes",
      icon: Tag,
      date: syncDates.schemes,
      color: "purple",
      total: fullData.schemesTotal,
      action: () =>
        handleSync(
          "Schemes",
          () => (window.posApi as any).syncSchemes(true),
          "last_schemes_sync",
          "schemes",
        ),
    },
    {
      id: "branches",
      title: "Branch Master",
      icon: Store,
      date: syncDates.branches,
      color: "amber",
      total: fullData.branchesTotal,
      action: () =>
        handleSync(
          "Branches",
          () => (window.posApi as any).syncBranches(true),
          "last_branches_sync",
          "branches",
        ),
    },
  ];

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden relative">
      <Toaster position="top-center" />
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Full Screen Loading Overlay */}
      {isSyncing && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <div className="text-base font-bold text-slate-800">
                Syncing {isSyncing}...
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">
                Please wait, communicating with server...
              </div>
            </div>
          </div>
        </div>
      )}

      <DashboardHeader
        onLogout={onLogout}
        branchName={branchName}
        branchCode={branchCode}
        userName={userName}
        finYear={finYear}
        time={time}
        isServerOnline={isServerOnline}
        isNetworkOnline={isNetworkOnline}
      />

      <main className="flex-1 flex flex-col px-4 py-3 w-full min-h-0 z-10">
        {/* SYNC CARDS */}
        <SyncCardsGrid syncActions={syncActions} isSyncing={isSyncing} />

        {/* DATA VIEWER */}
        <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
          {/* TAB BAR */}
          <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* TAB CONTENT */}
          <DataViewer
            activeTab={activeTab}
            data={activeView.data}
            total={activeView.total}
            pagination={paginationState[activeTab]}
            onPageChange={(page) => handlePageChange(activeTab, page)}
            searchTerm={searchTerms[activeTab]}
            onSearchChange={(e) =>
              handleSearchChange(activeTab, e.target.value)
            }
            searchPlaceholder="Search by any column value..."
            onExport={handleExport}
            isLoading={isLoadingData}
            isSearching={isSearching}
            colSpan={colSpan}
            dynamicKeys={activeTab === "stocks" ? stockKeys : schemeKeys}
            onReprint={handleReprint}
            onManualSync={handleManualSync}
            isSyncing={isSyncing}
            onTriggerInvoiceSync={() => {
              if (window.posApi && (window.posApi as any).triggerInvoiceSync) {
                setIsSyncing("Invoices");
                const toastId = toast.loading("Syncing invoices...");
                (window.posApi as any)
                  .triggerInvoiceSync()
                  .then(() => {
                    toast.success("Invoice sync triggered", { id: toastId });
                    setRefreshTrigger((prev) => prev + 1);
                  })
                  .catch((err: any) =>
                    toast.error(err.message, { id: toastId }),
                  )
                  .finally(() => {
                    setIsSyncing(null);
                  });
              }
            }}
          />
        </div>
      </main>
    </div>
  );
}
