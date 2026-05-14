import React, { useState, useEffect, useRef } from "react";
import BaseModal from "../common/BaseModal";
import { Wallet, CreditCard, Layers, QrCode } from "lucide-react";

const modeStyles = {
  cash: {
    active:
      "bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500 shadow-md scale-[1.02]",
    container: "bg-emerald-50/50 border-emerald-200",
    btn: "from-emerald-500 to-emerald-600 focus:ring-emerald-500",
    iconClass: "text-emerald-600",
    inputFocus:
      "focus:ring-emerald-500 focus:border-emerald-500 focus:bg-emerald-50",
    label: "Cash",
  },
  card: {
    active:
      "bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500 shadow-md scale-[1.02]",
    container: "bg-blue-50/50 border-blue-200",
    btn: "from-blue-500 to-blue-600 focus:ring-blue-500",
    iconClass: "text-blue-600",
    inputFocus: "focus:ring-blue-500 focus:border-blue-500 focus:bg-blue-50",
    label: "Card",
  },
  upi: {
    active:
      "bg-purple-50 border-purple-500 text-purple-800 ring-1 ring-purple-500 shadow-md scale-[1.02]",
    container: "bg-purple-50/50 border-purple-200",
    btn: "from-purple-500 to-purple-600 focus:ring-purple-500",
    iconClass: "text-purple-600",
    inputFocus:
      "focus:ring-purple-500 focus:border-purple-500 focus:bg-purple-50",
    label: "UPI",
  },
  split: {
    active:
      "bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-500 shadow-md scale-[1.02]",
    container: "bg-amber-50/50 border-amber-200",
    btn: "from-amber-500 to-amber-600 focus:ring-amber-500",
    iconClass: "text-amber-600",
    inputFocus: "focus:ring-amber-500 focus:border-amber-500 focus:bg-amber-50",
    label: "Split",
  },
};

interface ClassicPaymentModalProps {
  show: boolean;
  onClose: () => void;
  tenderMode: string;
  setTenderMode: (mode: string) => void;
  amountReceived: string;
  setAmountReceived: (val: string) => void;
  transactionRef?: string;
  setTransactionRef?: (val: string) => void;
  grandTotal: number;
  onConfirm: (splitPayments?: any[]) => void;
}

export default function ClassicPaymentModal({
  show,
  onClose,
  tenderMode,
  setTenderMode,
  amountReceived,
  setAmountReceived,
  transactionRef,
  setTransactionRef,
  grandTotal,
  onConfirm,
}: ClassicPaymentModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Split Mode State
  const [cardAmount, setCardAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [cardRef, setCardRef] = useState("");
  const [upiRef, setUpiRef] = useState("");

  const parsedCard = parseFloat(cardAmount) || 0;
  const parsedUpi = parseFloat(upiAmount) || 0;
  const calcCash = Math.max(0, grandTotal - parsedCard - parsedUpi);

  useEffect(() => {
    if (show) {
      if (!amountReceived || parseFloat(amountReceived) === 0) {
        setAmountReceived(grandTotal.toString());
      }
      setCardAmount("");
      setUpiAmount("");
      setCardRef("");
      setUpiRef("");
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [show, grandTotal]);

  const received = parseFloat(amountReceived) || 0;
  const balance = received - grandTotal;

  const handleConfirmClick = () => {
    if (tenderMode === "split") {
      const payments = [];
      if (calcCash > 0) payments.push({ mode: "cash", amount: calcCash });
      if (parsedCard > 0)
        payments.push({
          mode: "card",
          amount: parsedCard,
          rrn: cardRef,
          paytm_rrn: cardRef,
        });
      if (parsedUpi > 0)
        payments.push({
          mode: "upi",
          amount: parsedUpi,
          upi_vpa: upiRef,
          rrn: upiRef,
          paytm_rrn: upiRef,
        });

      if (payments.length === 0 && grandTotal > 0) {
        alert("Please enter a payment amount.");
        return;
      }
      if (payments.length === 0 && grandTotal === 0) {
        payments.push({ mode: "cash", amount: 0 });
      }
      onConfirm(payments);
    } else {
      onConfirm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirmClick();
    }
  };

  const activeStyle =
    modeStyles[tenderMode as keyof typeof modeStyles] || modeStyles.cash;

  const footer = (
    <div className="flex justify-end gap-3 w-full">
      <button
        onClick={onClose}
        className="px-5 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition"
      >
        Cancel
      </button>
      <button
        onClick={handleConfirmClick}
        className={`px-5 py-2 rounded-xl bg-gradient-to-r text-white font-bold hover:brightness-105 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${activeStyle.btn}`}
      >
        Confirm {activeStyle.label}
      </button>
    </div>
  );

  return (
    <BaseModal
      show={show}
      onClose={onClose}
      title="Complete Payment"
      width="450px"
      footer={footer}
    >
      <div className="space-y-5">
        <div className="text-center">
          <span className="text-sm text-slate-500">Total to be paid</span>
          <div className="text-5xl font-bold text-slate-800 tracking-tight">
            <span className="text-3xl align-middle">₹</span>
            {grandTotal.toFixed(2)}
          </div>
        </div>
        {/* Payment Modes */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { id: "cash", label: "Cash", icon: Wallet },
            { id: "card", label: "Card", icon: CreditCard },
            { id: "upi", label: "UPI", icon: QrCode },
            { id: "split", label: "Split", icon: Layers },
          ].map((mode) => {
            const Icon = mode.icon;
            const isSelected = tenderMode === mode.id;
            const style = modeStyles[mode.id as keyof typeof modeStyles];
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTenderMode(mode.id)}
                className={`rounded-xl border px-2 py-3 text-sm font-bold transition-all duration-200 flex flex-col items-center gap-2 ${
                  isSelected
                    ? style.active
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                <div
                  className={`p-2 rounded-full transition-colors ${isSelected ? "bg-white shadow-sm" : "bg-slate-100 group-hover:bg-slate-200"}`}
                >
                  <Icon
                    className={`w-5 h-5 ${isSelected ? style.iconClass : "text-slate-400"}`}
                  />
                </div>
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Amount Summary */}
        {tenderMode === "split" ? (
          <div className="space-y-3">
            {/* Card Section */}
            <div
              className={`border rounded-xl p-3 space-y-2 transition-colors duration-300 ${modeStyles.card.container}`}
            >
              <label className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                <CreditCard size={14} /> Card Details
              </label>
              <div className="flex gap-2">
                <div className="relative w-1/2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={cardAmount}
                    onChange={(e) => setCardAmount(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-blue-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <input
                  type="text"
                  value={cardRef}
                  onChange={(e) => setCardRef(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-1/2 px-3 py-2 bg-white border border-blue-200 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ref No."
                />
              </div>
            </div>

            {/* UPI Section */}
            <div
              className={`border rounded-xl p-3 space-y-2 transition-colors duration-300 ${modeStyles.upi.container}`}
            >
              <label className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                <QrCode size={14} /> UPI Details
              </label>
              <div className="flex gap-2">
                <div className="relative w-1/2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={upiAmount}
                    onChange={(e) => setUpiAmount(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-purple-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0.00"
                  />
                </div>
                <input
                  type="text"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-1/2 px-3 py-2 bg-white border border-purple-200 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Ref No."
                />
              </div>
            </div>

            {/* Cash Section */}
            <div
              className={`border rounded-xl p-3 flex justify-between items-center transition-colors duration-300 ${modeStyles.cash.container}`}
            >
              <label className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <Wallet size={14} /> Cash (Auto-Calculated)
              </label>
              <div className="text-xl font-bold text-emerald-700">
                ₹ {calcCash.toFixed(2)}
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`border rounded-xl p-4 space-y-3.5 transition-colors duration-300 ${activeStyle.container}`}
          >
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {tenderMode === "cash" ? "Amount Received" : "Amount to Charge"}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                  ₹
                </span>
                <input
                  ref={inputRef}
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`w-full pl-8 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 ${activeStyle.inputFocus} transition-all duration-200`}
                  placeholder="0.00"
                />
              </div>
            </div>

            {tenderMode !== "cash" && (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Reference No. (Optional)
                </label>
                <input
                  type="text"
                  value={transactionRef || ""}
                  onChange={(e) => setTransactionRef?.(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-base font-medium text-slate-900 focus:outline-none focus:ring-2 ${activeStyle.inputFocus} transition-all duration-200`}
                  placeholder="Enter Transaction ID / UTR"
                />
              </div>
            )}

            {tenderMode === "cash" && (
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-medium text-slate-600">
                  Balance to Return
                </span>
                <span
                  className={`text-xl font-bold ${balance < 0 ? "text-rose-500" : "text-emerald-600"}`}
                >
                  ₹{balance > 0 ? balance.toFixed(2) : "0.00"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
