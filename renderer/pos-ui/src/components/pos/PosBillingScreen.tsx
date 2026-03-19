import { useState } from "react";
import { createPortal } from "react-dom";
import SettingsModal from "./SettingsModal";
import ProductSelectionModal from "./ProductSelectionModal";
import PosShortcutsModal from "./PosShortcutsModal";
import Calculator from "../calculator/Calculator";
import { usePosLogic } from "../../hooks/usePosLogic";
import PosHeader from "./PosHeader";
import PosActionButtons from "./PosActionButtons";
import PosLastBillBar from "./PosLastBillBar";
import PosCartTable from "./PosCartTable";
import PosPaymentPanel from "./PosPaymentPanel";
import PosFooter from "./PosFooter";
import CustomerFacingDisplay from "./CustomerFacingDisplay";
// import PosPrintReceipt from "./PosPrintReceipt";
import TransactionsModal from "./TransactionsModal";
import HeldSalesModal from "./HoldSalesModal";
import HoldNoteModal from "./HoldNoteModal";
import ReprintModal from "./ReprintModal";
import ClassicPOSLayout from "../classic/ClassicPOSLayout";
import "../../style/pos.css";

interface PosBillingScreenProps {
  onLogout?: () => void;
}

export default function PosBillingScreen({ onLogout }: PosBillingScreenProps) {
  const {
    // State
    searchTerm,
    setSearchTerm,
    cart,
    searchResults,
    // setSearchResults,
    theme,
    showShortcuts,
    setShowShortcuts,
    showCalculator,
    setShowCalculator,
    loading,
    scanInputRef,
    userDetails,
    currentTime,

    // Actions
    toggleTheme,
    // addToCart,
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
    netOffline,
    manualMode,
    setManualMode,
    // New exports from hook
    customerWindow,
    showReprintModal,
    setShowReprintModal,
    // receiptRef,
    lastBill,
    handleProductSelect,
    handleCloseSearchResults,
    handleCloseShortcuts,
    handleCloseCalculator,
    openCustomerDisplay,
    handleReprint,
    handleReprintBill,
    reprintTransactions,
    // handlePrintReceipt,
    showTransactions,
    setShowTransactions,
    transactions,
    handleShowTransactions,
    generateInvoiceNumber,
    handleSaveBill,
    // lastBillData,
    handleSyncTransaction,
    handleHoldSale,
    showHeldSales,
    setShowHeldSales,
    showHoldNoteModal,
    setShowHoldNoteModal,
    handleShowHeldSales,
    heldSales,
    handleResumeHeldSale,

    // Computed
    totalQty,
    grossAmount,
    totalDiscount,
    taxableValue,
    totalTax,
    grandTotal,
    roundedGrandTotal,
    roundOff,
    totalPPAmount,
  } = usePosLogic(onLogout);

  const [uiVariant, setUiVariant] = useState("classic");
  const [printFormat, setPrintFormat] = useState("print1");
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // --- CONDITIONAL RENDER: CLASSIC LAYOUT ---
  if (uiVariant === "classic") {
    return (
      <>
        <ClassicPOSLayout
          userDetails={userDetails}
          currentTime={currentTime}
          onLogout={onLogout}
          uiVariant={uiVariant}
          changeUIVariant={setUiVariant}
          printFormat={printFormat}
          changePrintFormat={setPrintFormat}
          isOnline={isOnline}
          syncStatus={syncStatus}
          netOffline={netOffline}
          manualMode={manualMode}
          setManualMode={setManualMode}
          cart={cart}
          scanInputRef={scanInputRef}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleScan={handleScan}
          searchProduct={searchProduct}
          invoiceNumber={generateInvoiceNumber()}
          removeFromCart={removeFromCart}
          updateQty={updateQty}
          handleQtyChange={handleQtyChange}
          handleQtyBlur={handleQtyBlur}
          totalQty={totalQty}
          grossAmount={grossAmount}
          totalDiscount={totalDiscount}
          taxableValue={taxableValue}
          totalTax={totalTax}
          grandTotal={grandTotal}
          roundedGrandTotal={roundedGrandTotal}
          roundOff={roundOff}
          handleSaveBill={handleSaveBill}
          handleHoldSale={(note) => handleHoldSale(note)}
          handleReprint={handleReprint}
          handleShowTransactions={handleShowTransactions}
          handleShowHeldSales={handleShowHeldSales}
          setShowShortcuts={setShowShortcuts}
          lastBill={lastBill}
          qtyFocusTrigger={qtyFocusTrigger}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          tableFocusTrigger={tableFocusTrigger}
        />
        {/* Modals that are shared across layouts */}
        <ProductSelectionModal
          show={searchResults.length > 0}
          products={searchResults}
          theme={theme}
          onClose={handleCloseSearchResults}
          onSelect={handleProductSelect}
        />
        <TransactionsModal
          show={showTransactions}
          onClose={() => setShowTransactions(false)}
          transactions={transactions}
          theme={theme}
          onSync={handleSyncTransaction}
        />
        <HoldNoteModal
          show={showHoldNoteModal}
          onClose={() => setShowHoldNoteModal(false)}
          onConfirm={(note) => {
            handleHoldSale(note);
            setShowHoldNoteModal(false);
          }}
          theme={theme}
        />
        <HeldSalesModal
          show={showHeldSales}
          onClose={() => setShowHeldSales(false)}
          heldSales={heldSales}
          onResume={(sale) => {
            handleResumeHeldSale(sale);
            setShowHeldSales(false);
          }}
          theme={theme}
        />
        <ReprintModal
          show={showReprintModal}
          onClose={() => setShowReprintModal(false)}
          transactions={reprintTransactions}
          theme={theme}
          onPrint={handleReprintBill}
        />
        <PosShortcutsModal
          show={showShortcuts}
          onClose={handleCloseShortcuts}
        />
        {/* CALCULATOR */}
        <Calculator show={showCalculator} onClose={handleCloseCalculator} />
        <SettingsModal
          show={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          uiVariant={uiVariant}
          changeUIVariant={setUiVariant}
          printFormat={printFormat}
          changePrintFormat={setPrintFormat}
          returnFocusRef={scanInputRef as React.RefObject<HTMLElement>}
        />
      </>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}
      data-theme={theme}
    >
      {/* HEADER */}
      <PosHeader
        userDetails={userDetails}
        currentTime={currentTime}
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={onLogout}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* LAST BILL BAR */}
      <PosLastBillBar
        theme={theme}
        lastBill={lastBill}
        isOnline={isOnline}
        syncStatus={syncStatus}
      />

      {/* ACTION BUTTONS */}
      <PosActionButtons
        theme={theme}
        setShowShortcuts={setShowShortcuts}
        setShowCalculator={setShowCalculator}
        onOpenCustomerDisplay={openCustomerDisplay}
        onReprint={handleReprint}
        onShowTransactions={handleShowTransactions}
        onHoldSale={() => setShowHoldNoteModal(true)}
        onShowHeldSales={handleShowHeldSales}
        onNewSale={clearCart}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col w-full overflow-hidden p-2">
        <div className="flex h-full gap-2">
          {/* LEFT - BILL TABLE */}
          <PosCartTable
            theme={theme}
            loading={loading}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleScan={handleScan}
            searchProduct={searchProduct}
            scanInputRef={scanInputRef}
            cart={cart}
            removeFromCart={removeFromCart}
            grossAmount={grossAmount}
            totalPPAmount={totalPPAmount}
            updateQty={updateQty}
            handleQtyChange={handleQtyChange}
            handleQtyBlur={handleQtyBlur}
            invoiceNumber={generateInvoiceNumber()}
            selectedIndex={selectedIndex}
            setSelectedIndex={setSelectedIndex}
            tableFocusTrigger={tableFocusTrigger}
            qtyFocusTrigger={qtyFocusTrigger}
          />

          {/* RIGHT - PAYMENT PANEL */}
          <PosPaymentPanel
            theme={theme}
            roundedGrandTotal={roundedGrandTotal}
            roundOff={roundOff}
            onPaymentComplete={handleSaveBill}
          />
        </div>
      </div>

      {/* FOOTER TOTALS */}
      <PosFooter
        theme={theme}
        totalQty={totalQty}
        taxableValue={taxableValue}
        totalTax={totalTax}
        totalDiscount={totalDiscount}
        grandTotal={grandTotal}
      />

      {/* SEARCH RESULTS MODAL */}
      <ProductSelectionModal
        show={searchResults.length > 0}
        products={searchResults}
        theme={theme}
        onClose={handleCloseSearchResults}
        onSelect={handleProductSelect}
      />

      {/* SHORTCUTS MODAL */}
      <PosShortcutsModal show={showShortcuts} onClose={handleCloseShortcuts} />

      <TransactionsModal
        show={showTransactions}
        onClose={() => setShowTransactions(false)}
        transactions={transactions}
        theme={theme}
        onSync={handleSyncTransaction}
      />

      <HoldNoteModal
        show={showHoldNoteModal}
        onClose={() => setShowHoldNoteModal(false)}
        onConfirm={(note) => {
          handleHoldSale(note);
          setShowHoldNoteModal(false);
        }}
        theme={theme}
      />

      <HeldSalesModal
        show={showHeldSales}
        onClose={() => setShowHeldSales(false)}
        heldSales={heldSales}
        onResume={(sale) => {
          handleResumeHeldSale(sale);
          setShowHeldSales(false);
        }}
        theme={theme}
      />

      {/* CALCULATOR */}
      <Calculator show={showCalculator} onClose={handleCloseCalculator} />

      {/* CUSTOMER FACING DISPLAY PORTAL */}
      {customerWindow &&
        createPortal(
          <CustomerFacingDisplay
            cart={cart}
            totals={{
              totalQty,
              grandTotal,
              totalDiscount,
              taxableValue,
              totalTax,
            }}
            theme={theme}
          />,
          customerWindow.document.body,
        )}

      {/* REPRINT MODAL */}
      <ReprintModal
        show={showReprintModal}
        onClose={() => setShowReprintModal(false)}
        transactions={reprintTransactions}
        theme={theme}
        onPrint={handleReprintBill}
      />

      {/* SETTINGS MODAL */}
      <SettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        uiVariant={uiVariant}
        changeUIVariant={setUiVariant}
        printFormat={printFormat}
        changePrintFormat={setPrintFormat}
        returnFocusRef={scanInputRef as React.RefObject<HTMLElement>}
      />
    </div>
  );
}
