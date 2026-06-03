import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
// import BaseModal from "../../components/common/BaseModal";
import SettingsModal from "../../components/modals/SettingsModal";
import ProductSelectionModal from "../../components/modals/ProductSelectionModal";
import PosShortcutsModal from "../../components/modals/PosShortcutsModal";
import Calculator from "../../components/calculator/Calculator";
import { usePosLogic } from "../../hooks/usePosLogic";
import PosHeader from "../../components/defaultTheme/PosHeader";
import PosActionButtons from "../../components/defaultTheme/PosActionButtons";
import PosLastBillBar from "../../components/defaultTheme/PosLastBillBar";
import PosCartTable from "../../components/defaultTheme/PosCartTable";
import PosPaymentPanel from "../../components/defaultTheme/PosPaymentPanel";
import PosFooter from "../../components/defaultTheme/PosFooter";
import CustomerFacingDisplay from "../../components/defaultTheme/CustomerFacingDisplay";
// import PosPrintReceipt from "./PosPrintReceipt";
import TransactionsModal from "../../components/modals/TransactionsModal";
import HeldSalesModal from "../../components/modals/HoldSalesModal";
import HoldNoteModal from "../../components/modals/HoldNoteModal";
import ReprintModal from "../../components/modals/ReprintModal";
import ClassicPOSLayout from "../../components/classicTheme/ClassicPOSLayout";
import EndDayModal from "../../components/modals/EndDayModal";
import "../../style/pos.css";
import CustomerModal from "../../components/modals/CustomerModal";
import toast, { Toaster } from "react-hot-toast";
// import { PosProvider } from "../../context/PosContext";
import { PosProvider } from "../../context/PosContext";

interface PosBillingScreenProps {
  onLogout?: () => void;
}

export default function PosBillingScreen({ onLogout }: PosBillingScreenProps) {
  const posLogic = usePosLogic(onLogout);

  const [uiVariant, setUiVariant] = useState("classic");
  const [printFormat, setPrintFormat] = useState("print1");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerModalMode, setCustomerModalMode] = useState<"add" | "update">(
    "add",
  );
  const [showEndDayModal, setShowEndDayModal] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [pendingTxCount, setPendingTxCount] = useState(0);

  const isAnyModalOpen =
    posLogic.isInvoiceLoading ||
    posLogic.searchResults.length > 0 ||
    posLogic.showTransactions ||
    posLogic.showHoldNoteModal ||
    posLogic.showHeldSales ||
    posLogic.showReprintModal ||
    posLogic.showShortcuts ||
    posLogic.showCalculator ||
    showSettingsModal ||
    showCustomerModal ||
    !!posLogic.itemToDelete ||
    showEndDayModal;

  useEffect(() => {
    if (!isAnyModalOpen) {
      const timer = setTimeout(() => {
        posLogic.scanInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAnyModalOpen, posLogic.scanInputRef]);

  const handleEndDayClick = async () => {
    try {
      const branchCode = posLogic.userDetails.branchCode;
      const terminalCode = posLogic.userDetails.terminalCode;
      const fyCode = posLogic.userDetails.fyCode;

      const reqData = { branch_code: branchCode, terminal_code: terminalCode };
      const res = (window as any).electron?.ipcRenderer?.invoke
        ? await (window as any).electron.ipcRenderer.invoke(
            "get-active-terminal-session",
            reqData,
          )
        : await (window as any).posApi?.getActiveTerminalSession?.(reqData);

      if (res?.success && res?.session) {
        setActiveSession(res.session);
        if (window.posApi && (window.posApi as any).getPendingSyncCount) {
          const count = await (window.posApi as any).getPendingSyncCount(
            fyCode,
            { strictlyPending: false, excludeFailed: false },
          );
          setPendingTxCount(count);
        }
        setShowEndDayModal(true);
      } else {
        toast.error("No active session found. Please start the day first.");
      }
    } catch (e) {
      console.error("Failed to check active session for End Day", e);
      toast.error("Failed to check active session.");
    }
  };

  const handleEndDay = async (
    closingBalance: number,
    expectedAmount: number = 0,
    difference: number = 0,
  ) => {
    try {
      if (!activeSession) {
        toast.error("No active session found.");
        return;
      }

      const reqData = {
        closing_amount: closingBalance,
        expected_amount: expectedAmount,
        difference: difference,
      };

      const res = (window as any).electron?.ipcRenderer?.invoke
        ? await (window as any).electron.ipcRenderer.invoke(
            "close-terminal-session",
            { id: activeSession.id, data: reqData },
          )
        : await (window as any).posApi?.closeTerminalSession?.(
            activeSession.id,
            reqData,
          );

      if (res?.success) {
        setShowEndDayModal(false);
        toast.success("Day ended successfully!");
        setActiveSession(null);
        if (onLogout) {
          onLogout();
        }
      } else {
        toast.error("Failed to end day: " + (res?.error || "Unknown error"));
      }
    } catch (err: any) {
      toast.error("Failed to end day: " + err.message);
    }
  };

  const handleSyncStock = async () => {
    const posApi = (window as any).posApi;
    if (posApi && posApi.syncStock) {
      const toastId = toast.loading("Syncing stock...");
      try {
        await posApi.syncStock(posLogic.userDetails.branchCode, true);
        toast.success("Stock synced successfully!", { id: toastId });
      } catch (error: any) {
        toast.error("Failed to sync stock: " + error.message, { id: toastId });
      }
    }
  };
  const handleCustomerSave = (data: any) => {
    const customer = data?.data || data;
    if (customer) {
      posLogic.setSelectedCustomer(customer);
      posLogic.setCustomerKeyword(customer.name || customer.mobile || "");
    }
  };

  return (
    <PosProvider value={posLogic}>
      {/* Global Invoice Loading Overlay */}
      {posLogic.isInvoiceLoading && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70">
          <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <div className="text-base font-bold text-slate-800">
                Initializing POS
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">
                Generating Invoice Number...
              </div>
            </div>
          </div>
        </div>
      )}
      {uiVariant === "classic" ? (
        <>
          <Toaster
            position="top-center"
            containerStyle={{
              top: "50%",
              bottom: "auto",
              transform: "translateY(-50%)",
            }}
            toastOptions={{
              style: {
                maxWidth: "500px",
                wordBreak: "break-word",
              },
            }}
          />
          <ClassicPOSLayout
            uiVariant={uiVariant}
            changeUIVariant={setUiVariant}
            printFormat={printFormat}
            changePrintFormat={setPrintFormat}
            onAddNewCustomer={() => {
              setCustomerModalMode("add");
              setShowCustomerModal(true);
            }}
            onEditSelectedCustomer={(data: any) => {
              setCustomerModalMode("update");
              setShowCustomerModal(true);
              posLogic.setSelectedCustomer(data);
            }}
            onSyncStock={handleSyncStock}
            onEndDayClick={handleEndDayClick}
          />
          {/* Modals that are shared across layouts */}
          <ProductSelectionModal
            show={posLogic.searchResults.length > 0}
            products={posLogic.searchResults}
            theme={posLogic.theme}
            onClose={posLogic.handleCloseSearchResults}
            onSelect={posLogic.handleProductSelect}
          />
          <TransactionsModal
            show={posLogic.showTransactions}
            onClose={() => posLogic.setShowTransactions(false)}
            transactions={posLogic.transactions}
            theme={posLogic.theme}
            onSync={posLogic.handleSyncTransaction as any}
            onRefresh={posLogic.handleShowTransactions}
            mode={posLogic.transactionMode}
          />
          <HoldNoteModal
            show={posLogic.showHoldNoteModal}
            onClose={() => posLogic.setShowHoldNoteModal(false)}
            onConfirm={(note) => {
              posLogic.handleHoldSale(note);
              posLogic.setShowHoldNoteModal(false);
            }}
            theme={posLogic.theme}
          />
          <HeldSalesModal
            show={posLogic.showHeldSales}
            onClose={() => posLogic.setShowHeldSales(false)}
            heldSales={posLogic.heldSales}
            onResume={(sale) => {
              posLogic.handleResumeHeldSale(sale);
              posLogic.setShowHeldSales(false);
            }}
            theme={posLogic.theme}
          />
          <ReprintModal
            show={posLogic.showReprintModal}
            onClose={() => posLogic.setShowReprintModal(false)}
            transactions={posLogic.reprintTransactions}
            theme={posLogic.theme}
            onPrint={posLogic.handleReprintBill}
          />
          <PosShortcutsModal
            show={posLogic.showShortcuts}
            onClose={posLogic.handleCloseShortcuts}
          />
          {/* CALCULATOR */}
          <Calculator
            show={posLogic.showCalculator}
            onClose={posLogic.handleCloseCalculator}
          />
          <SettingsModal
            show={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            uiVariant={uiVariant}
            changeUIVariant={setUiVariant}
            printFormat={printFormat}
            changePrintFormat={setPrintFormat}
            returnFocusRef={
              posLogic.scanInputRef as React.RefObject<HTMLElement>
            }
          />
          {showCustomerModal && (
            <CustomerModal
              mode={customerModalMode}
              selectedCustomer={posLogic.selectedCustomer}
              onClose={() => setShowCustomerModal(false)}
              onSave={handleCustomerSave}
              scanRef={posLogic.scanInputRef}
            />
          )}
          <EndDayModal
            isOpen={showEndDayModal}
            userDetails={{
              userName: posLogic.userDetails.userName,
              branchName: posLogic.userDetails.branchName,
              branchCode: posLogic.userDetails.branchCode,
              terminalCode: posLogic.userDetails.terminalCode,
              userId: posLogic.userDetails.userId,
              fyCode: posLogic.userDetails.fyCode,
            }}
            activeSession={activeSession}
            pendingTxCount={pendingTxCount}
            onEndDay={handleEndDay}
            onClose={() => setShowEndDayModal(false)}
          />

          {/* CUSTOMER FACING DISPLAY PORTAL */}
          {posLogic.customerWindow &&
            createPortal(
              <CustomerFacingDisplay
                cart={posLogic.cart}
                totals={{
                  totalQty: posLogic.totalQty,
                  grandTotal: posLogic.grandTotal,
                  totalDiscount: posLogic.totalDiscount,
                  taxableValue: posLogic.taxableValue,
                  totalTax: posLogic.totalTax,
                }}
                theme={posLogic.theme}
              />,
              posLogic.customerWindow.document.body,
            )}
        </>
      ) : (
        <div
          className={`min-h-screen flex flex-col ${posLogic.theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}
          data-theme={posLogic.theme}
        >
          {/* HEADER */}
          <PosHeader
            userDetails={posLogic.userDetails}
            currentTime={posLogic.currentTime}
            theme={posLogic.theme}
            toggleTheme={posLogic.toggleTheme}
            onLogout={onLogout}
            onOpenSettings={() => setShowSettingsModal(true)}
            onEndDayClick={handleEndDayClick}
          />

          {/* LAST BILL BAR */}
          <PosLastBillBar
            theme={posLogic.theme}
            lastBill={posLogic.lastBill}
            isOnline={posLogic.isOnline}
            syncStatus={posLogic.syncStatus}
          />

          {/* ACTION BUTTONS */}
          <PosActionButtons
            theme={posLogic.theme}
            setShowShortcuts={posLogic.setShowShortcuts}
            setShowCalculator={posLogic.setShowCalculator}
            onOpenCustomerDisplay={posLogic.openCustomerDisplay}
            onReprint={posLogic.handleReprint}
            onShowTransactions={posLogic.handleShowTransactions}
            onHoldSale={() => posLogic.setShowHoldNoteModal(true)}
            onShowHeldSales={posLogic.handleShowHeldSales}
            onNewSale={posLogic.handleNewSale}
            onSyncStock={handleSyncStock}
          />

          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col w-full overflow-hidden p-2">
            <div className="flex h-full gap-2">
              {/* LEFT - BILL TABLE */}
              <PosCartTable
                theme={posLogic.theme}
                loading={posLogic.loading}
                searchTerm={posLogic.searchTerm}
                setSearchTerm={posLogic.setSearchTerm}
                handleScan={posLogic.handleScan}
                searchProduct={posLogic.searchProduct}
                scanInputRef={posLogic.scanInputRef}
                cart={posLogic.cart}
                removeFromCart={posLogic.removeFromCart}
                grossAmount={posLogic.grossAmount}
                totalPPAmount={posLogic.totalPPAmount}
                updateQty={posLogic.updateQty}
                handleQtyChange={posLogic.handleQtyChange}
                handleQtyBlur={posLogic.handleQtyBlur}
                invoiceNumber={posLogic.generateInvoiceNumber()}
                selectedIndex={posLogic.selectedIndex}
                setSelectedIndex={posLogic.setSelectedIndex}
                tableFocusTrigger={posLogic.tableFocusTrigger}
                qtyFocusTrigger={posLogic.qtyFocusTrigger}
              />

              {/* RIGHT - PAYMENT PANEL */}
              <PosPaymentPanel
                theme={posLogic.theme}
                roundedGrandTotal={posLogic.roundedGrandTotal}
                roundOff={posLogic.roundOff}
                onPaymentComplete={posLogic.handleSaveBill}
              />
            </div>
          </div>

          {/* FOOTER TOTALS */}
          <PosFooter
            theme={posLogic.theme}
            totalQty={posLogic.totalQty}
            taxableValue={posLogic.taxableValue}
            totalTax={posLogic.totalTax}
            totalDiscount={posLogic.totalDiscount}
            grandTotal={posLogic.grandTotal}
          />

          {/* SEARCH RESULTS MODAL */}
          <ProductSelectionModal
            show={posLogic.searchResults.length > 0}
            products={posLogic.searchResults}
            theme={posLogic.theme}
            onClose={posLogic.handleCloseSearchResults}
            onSelect={posLogic.handleProductSelect}
          />

          {/* SHORTCUTS MODAL */}
          <PosShortcutsModal
            show={posLogic.showShortcuts}
            onClose={posLogic.handleCloseShortcuts}
          />

          <TransactionsModal
            show={posLogic.showTransactions}
            onClose={() => posLogic.setShowTransactions(false)}
            transactions={posLogic.transactions}
            theme={posLogic.theme}
            onSync={posLogic.handleSyncTransaction as any}
            mode={posLogic.transactionMode}
          />

          <HoldNoteModal
            show={posLogic.showHoldNoteModal}
            onClose={() => posLogic.setShowHoldNoteModal(false)}
            onConfirm={(note) => {
              posLogic.handleHoldSale(note);
              posLogic.setShowHoldNoteModal(false);
            }}
            theme={posLogic.theme}
          />

          <HeldSalesModal
            show={posLogic.showHeldSales}
            onClose={() => posLogic.setShowHeldSales(false)}
            heldSales={posLogic.heldSales}
            onResume={(sale) => {
              posLogic.handleResumeHeldSale(sale);
              posLogic.setShowHeldSales(false);
            }}
            theme={posLogic.theme}
          />

          {showCustomerModal && (
            <CustomerModal
              mode={customerModalMode}
              selectedCustomer={posLogic.selectedCustomer}
              onClose={() => setShowCustomerModal(false)}
              onSave={handleCustomerSave}
              scanRef={posLogic.scanInputRef}
            />
          )}

          {/* CALCULATOR */}
          <Calculator
            show={posLogic.showCalculator}
            onClose={posLogic.handleCloseCalculator}
          />

          {/* CUSTOMER FACING DISPLAY PORTAL */}
          {posLogic.customerWindow &&
            createPortal(
              <CustomerFacingDisplay
                cart={posLogic.cart}
                totals={{
                  totalQty: posLogic.totalQty,
                  grandTotal: posLogic.grandTotal,
                  totalDiscount: posLogic.totalDiscount,
                  taxableValue: posLogic.taxableValue,
                  totalTax: posLogic.totalTax,
                }}
                theme={posLogic.theme}
              />,
              posLogic.customerWindow.document.body,
            )}
          {/* REPRINT MODAL */}
          <ReprintModal
            show={posLogic.showReprintModal}
            onClose={() => posLogic.setShowReprintModal(false)}
            transactions={posLogic.reprintTransactions}
            theme={posLogic.theme}
            onPrint={posLogic.handleReprintBill}
          />

          {/* SETTINGS MODAL */}
          <SettingsModal
            show={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            uiVariant={uiVariant}
            changeUIVariant={setUiVariant}
            printFormat={printFormat}
            changePrintFormat={setPrintFormat}
            returnFocusRef={
              posLogic.scanInputRef as React.RefObject<HTMLElement>
            }
          />
          <EndDayModal
            isOpen={showEndDayModal}
            userDetails={{
              userName: posLogic.userDetails.userName,
              branchName: posLogic.userDetails.branchName,
              branchCode: posLogic.userDetails.branchCode,
              terminalCode: posLogic.userDetails.terminalCode,
              userId: posLogic.userDetails.userId,
              fyCode: posLogic.userDetails.fyCode,
            }}
            activeSession={activeSession}
            pendingTxCount={pendingTxCount}
            onEndDay={handleEndDay}
            onClose={() => setShowEndDayModal(false)}
          />
        </div>
      )}
    </PosProvider>
  );
}
