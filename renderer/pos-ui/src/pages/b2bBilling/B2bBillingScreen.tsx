import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
// import BaseModal from "../../components/common/BaseModal";
import SettingsModal from "../../components/modals/SettingsModal";
import ProductSelectionModal from "../../components/modals/ProductSelectionModal";
import PosShortcutsModal from "../../components/modals/PosShortcutsModal";
import Calculator from "../../components/calculator/Calculator";
import { usePosLogic } from "../../hooks/usePosLogic";
import TransactionsModal from "../../components/modals/TransactionsModal";
import HeldSalesModal from "../../components/modals/HoldSalesModal";
import HoldNoteModal from "../../components/modals/HoldNoteModal";
import ReprintModal from "../../components/modals/ReprintModal";
import "../../style/pos.css";
import toast from "react-hot-toast";
import ClassicPOSLayout from "../../components/classicTheme/ClassicPOSLayout";
import GstValidationModal from "../../components/b2b/GstValidationModal";
import CustomerFacingDisplay from "../../components/defaultTheme/CustomerFacingDisplay";
import { PosProvider } from "../../context/PosContext";

interface B2bBillingScreenProps {
  onLogout?: () => void;
}

export default function B2bBillingScreen({ onLogout }: B2bBillingScreenProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const gstin = location.state?.gstin || "";
  const companyDetails = location.state?.companyDetails || null;

  const posLogic = usePosLogic(onLogout, { isB2B: true });

  // If accessed directly without GSTIN, redirect back to main menu
  useEffect(() => {
    if (!gstin) {
      navigate("/");
      toast.error("Please validate GSTIN first");
    } else {
      posLogic.setCustomerKeyword?.(gstin);
      if (companyDetails) {
        posLogic.setSelectedCustomer?.({
          ...companyDetails.company,
          selected_address: companyDetails.selectedAddress,
          company_name:
            companyDetails.company?.legal_name ||
            companyDetails.company?.trade_name,
          name: companyDetails.company?.legal_name || "B2B Customer",
          mobile: gstin,
          gstin: gstin,
          id: "b2b",
        });
      } else {
        posLogic.setSelectedCustomer?.({
          name: "B2B Customer",
          mobile: gstin,
          gstin: gstin,
          id: "b2b",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gstin, companyDetails]);

  const [uiVariant, setUiVariant] = useState("classic");
  const [printFormat, setPrintFormat] = useState("print1");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGstModal, setShowGstModal] = useState(false);

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
    showGstModal ||
    !!posLogic.itemToDelete;

  useEffect(() => {
    if (!isAnyModalOpen) {
      const timer = setTimeout(() => {
        posLogic.scanInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAnyModalOpen, posLogic.scanInputRef]);

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

  const handleGstModalSuccess = (newGstin: string, details: any) => {
    setShowGstModal(false);
    posLogic.setCustomerKeyword?.(newGstin);
    if (details) {
      posLogic.setSelectedCustomer?.({
        ...details.company,
        selected_address: details.selectedAddress,
        company_name:
          details.company?.legal_name || details.company?.trade_name,
        name: details.company?.legal_name || "B2B Customer",
        mobile: newGstin,
        gstin: newGstin,
        id: "b2b",
      });
    }
  };

  return (
    <PosProvider value={posLogic}>
      <ClassicPOSLayout
        uiVariant={uiVariant}
        changeUIVariant={setUiVariant}
        printFormat={printFormat}
        changePrintFormat={setPrintFormat}
        onAddNewCustomer={() => {}}
        onEditSelectedCustomer={() => {}}
        onSyncStock={handleSyncStock}
        isB2B={true}
        onChangeGST={() => setShowGstModal(true)}
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
        returnFocusRef={posLogic.scanInputRef as React.RefObject<HTMLElement>}
      />
      <GstValidationModal
        show={showGstModal}
        onClose={() => setShowGstModal(false)}
        onSuccess={handleGstModalSuccess}
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
    </PosProvider>
  );
}
