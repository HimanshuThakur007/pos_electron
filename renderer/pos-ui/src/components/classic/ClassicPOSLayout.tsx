import React, { useState, useMemo } from "react";
import SettingsModal from "../pos/SettingsModal";
import ClassicTopBar from "./ClassicTopBar";
import ClassicCartArea from "./ClassicCartArea";
import ClassicRightPanel from "./ClassicRightPanel";
import ClassicLastBillFooter from "./ClassicLastBillFooter";
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
  appliedQty?: number;
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
  // Header Data
  userDetails: PosUserDetails | null;
  currentTime: Date;
  onLogout?: () => void;
  uiVariant: string;
  changeUIVariant: (variant: string) => void;
  printFormat?: string;
  changePrintFormat?: (format: string) => void;
  isOnline: boolean;
  syncStatus: string;
  netOffline?: boolean;
  manualMode?: string;
  setManualMode?: (mode: string) => void;

  // Cart Data
  cart: PosCartItem[];
  scanInputRef: React.RefObject<HTMLInputElement | null>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleScan: (
    e:
      | React.KeyboardEvent<HTMLInputElement>
      | { key: string; target: { value: string } },
  ) => void;
  searchProduct: () => void;
  invoiceNumber: string;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  handleQtyChange: (id: string, val: string) => void;
  handleQtyBlur: (id: string, qty: number) => void;

  // Totals
  totalQty: number;
  grossAmount: number;
  totalDiscount: number;
  taxableValue: number;
  totalTax: number;
  grandTotal: number;
  roundedGrandTotal: number;
  roundOff: number;

  // Actions
  handleSaveBill: (
    mode: string,
    amount: number,
    ref?: string,
  ) => Promise<boolean>;
  handleHoldSale: (note: string) => void;
  handleReprint: () => void;
  handleShowTransactions: (filter?: string) => void;
  handleShowHeldSales: () => void;
  setShowShortcuts: (show: boolean) => void;

  // Last Bill
  lastBill: PosLastBill | null;
  qtyFocusTrigger: number;
  tableFocusTrigger: number;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}

export default function ClassicPOSLayout({
  userDetails,
  currentTime,
  onLogout,
  uiVariant,
  changeUIVariant,
  printFormat,
  changePrintFormat,
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
  invoiceNumber,
  removeFromCart,
  updateQty,
  handleQtyChange,
  handleQtyBlur,

  totalQty,
  grossAmount,
  totalDiscount,
  // taxableValue,
  totalTax,
  // grandTotal,
  roundedGrandTotal,
  // roundOff,

  handleSaveBill,
  handleHoldSale,
  handleReprint,
  handleShowTransactions,
  handleShowHeldSales,
  setShowShortcuts,
  lastBill,
  qtyFocusTrigger,
  tableFocusTrigger,
  selectedIndex,
  setSelectedIndex,
}: ClassicPOSLayoutProps) {
  // --- Local State for Classic UI ---
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tenderMode, setTenderMode] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");

  // Customer Search State (Local for now)
  const [customerKeyword, setCustomerKeyword] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    name: string;
    mobile: string;
    id?: string;
  } | null>(null);

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
      appliedQty: item.appliedQty,
    }));
  }, [cart]);

  // Map Classic callbacks to modern logic
  const handleRemoveClassic = (itemCode: string) => {
    const item = cart.find((c) => c.itemCode === itemCode);
    if (item) removeFromCart(item.id);
  };

  // Payment Logic
  const onPayNow = async () => {
    const received = parseFloat(amountReceived) || 0;
    if (tenderMode === "cash" && received < roundedGrandTotal) {
      alert("Amount received is less than the bill amount!");
      return;
    }
    const success = await handleSaveBill(tenderMode, received);
    if (success) {
      setAmountReceived("");
      setTenderMode("cash");
    }
  };

  // Quick Actions
  const quickActions = [
    { label: "New Sale", action: () => {}, icon: Plus },
    { label: "Hold Sale", action: () => handleHoldSale(""), icon: Timer },
    {
      label: "View Hold Bills",
      action: handleShowHeldSales,
      icon: ShoppingCart,
    },
    { label: "Reprint Bill", action: handleReprint, icon: Printer },
    {
      label: "Today's Sales",
      action: () => handleShowTransactions("today"),
      icon: Calendar,
    },
    { label: "Calculator", action: () => {}, icon: Calculator },
    {
      label: "Keyboard Shortcuts",
      action: () => setShowShortcuts(true),
      icon: Grid,
    },
    { label: "Sync Stock", action: () => {}, icon: RefreshCw },
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
        netMsg={netMsg}
        netBackOnline={isOnline && syncStatus === "synced"}
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
          posReady={true}
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
          onHoldBill={() => handleHoldSale("")} // Simple hold for now
          customerKeyword={customerKeyword}
          setCustomerKeyword={setCustomerKeyword}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          netOffline={netOffline}
          manualMode={manualMode}
          setManualMode={setManualMode}
        />
      </div>

      {/* FOOTER */}
      <ClassicLastBillFooter
        lastBill={{
          invoice: lastBill?.bill_no,
          time: lastBill?.created_at,
          amount: lastBill?.grand_total,
          qty: lastBill?.total_qty,
          received: lastBill?.amount_received,
          change:
            lastBill?.payment_mode === "cash"
              ? lastBill.amount_received - lastBill.grand_total
              : 0,
        }}
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
    </div>
  );
}
