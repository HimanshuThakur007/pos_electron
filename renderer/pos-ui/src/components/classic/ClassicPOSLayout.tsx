import React, { useState, useMemo, useEffect } from "react";
import SettingsModal from "../modals/SettingsModal";
import ClassicTopBar from "./ClassicTopBar";
import ClassicCartArea from "./ClassicCartArea";
import ClassicRightPanel from "./ClassicRightPanel";
import ClassicLastBillFooter from "./ClassicLastBillFooter";
import ClassicPaymentModal from "../modals/ClassicPaymentModal";
import ClassicQuickActionsPanel from "./ClassicQuickActionsPanel";
import {
  Plus,
  Timer,
  ShoppingCart,
  Printer,
  Calendar,
  Calculator,
  Grid,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
// import { usePosContext } from "../../context/PosContext";
import { usePosContext } from "../../context/PosContext";

export interface PosUserDetails {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

export interface PosCartItem {
  id: string;
  itemCode: string;
  itemName: string;
  printDesc?: string;
  qty: number;
  stock: number;
  price: number;
  discount: number;
  tax: number;
  scheme?: any;
  scheme_group?: string;
  _scheme?: boolean;
  manualDiscount?: number;
  missingQualifyingAmount?: number;
  schm_type?: string | number;
  schm_camp_grp?: string;
  group_name?: string;
  appliedQty?: number;
  hsn_code?: string;
}

export interface PosLastBill {
  bill_no: string;
  created_at: string;
  grand_total: number;
  total_qty: number;
  amount_received: number;
  payment_mode: string;
  [key: string]: any;
}

interface ClassicPOSLayoutProps {
  uiVariant: string;
  changeUIVariant: (variant: string) => void;
  printFormat?: string;
  changePrintFormat?: (format: string) => void;
  onAddNewCustomer?: () => void;
  // onEditSelectedCustomer?: () => void;
  onEditSelectedCustomer?: (data: any) => void;
  onSyncStock?: () => void;
  isB2B?: boolean;
  onChangeGST?: () => void;
  onEndDayClick?: () => void;
}

export default function ClassicPOSLayout({
  uiVariant,
  changeUIVariant,
  printFormat,
  changePrintFormat,
  onAddNewCustomer,
  onEditSelectedCustomer,
  onSyncStock,
  isB2B,
  onChangeGST,
  onEndDayClick,
}: ClassicPOSLayoutProps) {
  const posLogic = usePosContext();
  const {
    userDetails,
    currentTime,
    onLogout,
    isOnline,
    syncStatus,
    netOffline,
    manualMode,
    setManualMode,
    cart,
    scanInputRef,
    searchTerm,
    setSearchTerm,
    handleScan,
    // searchProduct,
    updateQty,
    handleQtyChange,
    handleQtyBlur,
    totalQty,
    grossAmount,
    totalDiscount,
    totalTax,
    roundedGrandTotal,
    roundOff,
    handleSaveBill,
    handleNewSale,
    handleReprint,
    handleShowTransactions,
    handleShowHeldSales,
    setShowShortcuts,
    setItemToDelete,
    setShowCalculator,
    setShowHoldNoteModal,
    lastBill,
    qtyFocusTrigger,
    tableFocusTrigger,
    selectedIndex,
    setSelectedIndex,
    selectedCustomer,
    setSelectedCustomer,
    customerKeyword,
    setCustomerKeyword,
    branchInfo,
    generateInvoiceNumber,
    isInvoiceLoading,
    isServerOnline,
    isNetworkOnline,
  } = posLogic;

  const invoiceNumber = generateInvoiceNumber();

  // --- Local State for Classic UI ---
  const [leftCollapsed, setLeftCollapsed] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tenderMode, setTenderMode] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (!showPaymentModal && !showSettingsModal && !isInvoiceLoading) {
      const timer = setTimeout(() => scanInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [showPaymentModal, showSettingsModal, isInvoiceLoading, scanInputRef]);

  useEffect(() => {
    const handleOpenPayment = () => {
      setTenderMode("cash");
      setShowPaymentModal(true);
    };
    window.addEventListener(
      "openPaymentModal",
      handleOpenPayment as EventListener,
    );
    return () =>
      window.removeEventListener(
        "openPaymentModal",
        handleOpenPayment as EventListener,
      );
  }, []);

  const isMac = useMemo(
    () => navigator.userAgent.toUpperCase().indexOf("MAC") >= 0,
    [],
  );

  // --- Data Mapping ---

  // Map modern cart items to ClassicCartItem interface
  const classicCart = useMemo(() => {
    return cart.map((item) => ({
      _rowId: item.id,
      item_code: item.itemCode,
      item_name: item.itemName,
      printDesc: item.printDesc,
      qty: item.qty,
      saleable_qty: item.stock,
      rate: item.price,
      discount: item.discount,
      tax: item.tax,
      subtotal: (item.price - item.discount) * item.qty,
      scheme: item.scheme,
      scheme_group: item.scheme_group,
      _scheme: item._scheme,
      manualDiscount: item.manualDiscount,
      missingQualifyingAmount: item.missingQualifyingAmount,
      schm_type: item.schm_type,
      schm_camp_grp: item.schm_camp_grp,
      group_name: item.group_name,
      appliedQty: item.appliedQty,
      hsn_code: item.hsn_code,
    }));
  }, [cart]);

  // Map Classic callbacks to modern logic
  const handleRemoveClassic = (id: string) => {
    const itemToDelete = cart.find((c) => c.id === id);
    if (itemToDelete) {
      setItemToDelete(itemToDelete);
    }
  };

  // Payment Logic
  const onPayNow = async (splitPaymentsOrEvent?: any) => {
    const isArray = Array.isArray(splitPaymentsOrEvent);
    const splitData = isArray ? splitPaymentsOrEvent : undefined;

    // If in split mode but we don't have the explicit split payment array payload, force the modal open
    if (tenderMode === "split" && !isArray) {
      setShowPaymentModal(true);
      return;
    }

    const received = amountReceived
      ? parseFloat(amountReceived)
      : roundedGrandTotal;
    if (tenderMode === "cash" && received < roundedGrandTotal) {
      alert("Amount received is less than the bill amount!");
      return;
    }
    const success = await handleSaveBill(
      tenderMode,
      received,
      transactionRef,
      selectedCustomer,
      splitData,
    );
    if (success) {
      setAmountReceived("");
      setTenderMode("cash");
      setTransactionRef("");
      setShowPaymentModal(false);
      setCustomerKeyword?.("");
    }
  };

  // Quick Actions
  const quickActions = [
    { label: "New Sale", action: handleNewSale, icon: Plus, shortcut: "F6" },
    {
      label: "Hold Sale",
      action: () => setShowHoldNoteModal(true),
      icon: Timer,
      shortcut: "F2",
    },
    {
      label: "View Hold Bills",
      action: handleShowHeldSales,
      icon: ShoppingCart,
      shortcut: "F4",
    },
    {
      label: "Reprint Bill",
      action: handleReprint,
      icon: Printer,
      shortcut: isMac ? "⌥ R" : "Alt R",
    },
    {
      label: "Today's Sales",
      action: () => handleShowTransactions("today"),
      icon: Calendar,
    },
    {
      label: "Calculator",
      action: () => setShowCalculator(true),
      icon: Calculator,
      shortcut: isMac ? "⌥ K" : "Alt K",
    },
    {
      label: "Shortcuts",
      action: () => setShowShortcuts(true),
      icon: Grid,
      shortcut: "F1",
    },
    {
      label: "Sync Stock",
      action: onSyncStock,
      icon: RefreshCw,
      disabled: true,
    },
    {
      label: "Sync Tracker",
      action: () => handleShowTransactions(),
      icon: TrendingUp,
    },
  ];

  // Network Status Mapping
  const netMsg =
    syncStatus === "error"
      ? "Sync Failed"
      : syncStatus === "syncing"
        ? "Syncing..."
        : "";

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden font-sans">
      {/* TOP BAR */}
      <ClassicTopBar
        user={userDetails}
        now={currentTime}
        formatTime={(d) =>
          d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        }
        formatDate={(d) =>
          d.toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })
        }
        logout={onLogout}
        // uiVariant={uiVariant}
        onOpenSettings={() => setShowSettingsModal(true)}
        netOffline={netOffline}
        isServerOnline={isServerOnline}
        isNetworkOnline={isNetworkOnline}
        netMsg={netMsg}
        netBackOnline={isOnline && syncStatus === "synced"}
        manualMode={manualMode}
        setManualMode={setManualMode}
        isB2B={isB2B}
        onEndDayClick={onEndDayClick}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 min-h-0 grid grid-cols-12 p-2 gap-2">
        {/* LEFT: Quick Actions */}
        <ClassicQuickActionsPanel
          leftActions={quickActions}
          collapsed={leftCollapsed}
          onToggleCollapse={setLeftCollapsed}
        />

        {/* CENTER: Cart */}
        <ClassicCartArea
          leftCollapsed={leftCollapsed}
          posReady={!isInvoiceLoading}
          inputRef={scanInputRef as any}
          barcode={searchTerm}
          setBarcode={setSearchTerm}
          handleScan={handleScan}
          previewInvoice={invoiceNumber}
          cart={classicCart}
          selectedRowIndex={selectedIndex}
          setSelectedRowIndex={setSelectedIndex}
          removeFromCart={handleRemoveClassic}
          updateQty={updateQty}
          handleQtyChange={handleQtyChange}
          handleQtyBlur={handleQtyBlur}
          qtyFocusTrigger={qtyFocusTrigger}
          tableFocusTrigger={tableFocusTrigger}
        />

        {/* RIGHT: Summary & Payment */}
        <ClassicRightPanel
          summary={{
            subtotal: grossAmount,
            discount: totalDiscount,
            tax: totalTax,
            grandTotal: roundedGrandTotal,
            qty: totalQty,
          }}
          cartItems={cart}
          totalQty={totalQty}
          tenderMode={tenderMode}
          setTenderMode={setTenderMode}
          //   setAmountReceived={setAmountReceived as any}
          onPayNow={onPayNow}
          onOpenPaymentModal={(mode) => {
            setTenderMode(mode);
            setShowPaymentModal(true);
          }}
          onHoldBill={() => setShowHoldNoteModal(true)}
          customerKeyword={customerKeyword}
          setCustomerKeyword={setCustomerKeyword}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          onAddNewCustomer={onAddNewCustomer}
          onEditSelectedCustomer={onEditSelectedCustomer}
          netOffline={netOffline}
          manualMode={manualMode}
          setManualMode={setManualMode}
          roundOff={roundOff}
          isB2B={isB2B}
          branchInfo={branchInfo}
          onChangeGST={onChangeGST}
        />
      </div>

      {/* FOOTER */}
      <ClassicLastBillFooter
        lastBill={
          lastBill
            ? {
                invoice: lastBill.bill_no,
                time: lastBill.time || lastBill.created_at,
                amount: lastBill.grand_total,
                qty: lastBill.total_qty,
                received: lastBill.amount_received,
                change:
                  lastBill.payment_mode === "cash"
                    ? (lastBill.amount_received || 0) -
                      (lastBill.grand_total || 0)
                    : 0,
              }
            : null
        }
        onReprintClick={handleReprint}
      />

      <SettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        uiVariant={uiVariant}
        changeUIVariant={changeUIVariant}
        printFormat={printFormat}
        changePrintFormat={changePrintFormat}
        returnFocusRef={scanInputRef as React.RefObject<HTMLElement>}
      />

      <ClassicPaymentModal
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        tenderMode={tenderMode}
        setTenderMode={setTenderMode}
        amountReceived={amountReceived}
        setAmountReceived={setAmountReceived}
        transactionRef={transactionRef}
        setTransactionRef={setTransactionRef}
        grandTotal={roundedGrandTotal}
        onConfirm={onPayNow}
      />
    </div>
  );
}
