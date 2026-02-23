import { createPortal } from "react-dom";
import "../../style/pos.css";
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
import PosPrintReceipt from "./PosPrintReceipt";
import TransactionsModal from "./TransactionsModal";
import HeldSalesModal from "./HoldSalesModal";
import HoldNoteModal from "./HoldNoteModal";

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
    // clearCart,
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
    // New exports from hook
    customerWindow,
    showReprintModal,
    setShowReprintModal,
    receiptRef,
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
    lastBillData,
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

  return (
    <div
      className={`pos-root ${theme === "dark" ? "bg-dark text-light" : "bg-white text-dark"}`}
      data-theme={theme}
    >
      {/* HEADER */}
      <PosHeader
        userDetails={userDetails}
        currentTime={currentTime}
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={onLogout}
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
      />

      {/* MAIN CONTENT */}
      <div className="container-fluid pos-body">
        <div className="row h-100">
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
      {showReprintModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ zIndex: 2000, backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowReprintModal(false)}
        >
          <div
            className={`p-4 rounded-3 shadow-lg ${theme === "dark" ? "bg-dark text-light" : "bg-white"}`}
            style={{ maxWidth: "400px", width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0 fw-bold">Reprint Last Bill</h5>
              <button
                className={`btn-close ${theme === "dark" ? "btn-close-white" : ""}`}
                onClick={() => setShowReprintModal(false)}
              ></button>
            </div>

            <div
              className="border p-2 mb-3 overflow-auto"
              style={{ maxHeight: "400px", background: "white" }}
            >
              <PosPrintReceipt ref={receiptRef} {...lastBillData} />
            </div>

            <div className="d-flex gap-2">
              <button
                className="btn btn-primary flex-grow-1"
                onClick={handlePrintReceipt}
              >
                Print
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowReprintModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
