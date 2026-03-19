import { ReceiptIndianRupee, CreditCard, Wallet, Layers } from "lucide-react";

import CustomerSearchCardClassic from "./CustomerSearchCardClassic";

interface ClassicRightPanelProps {
  summary?: any;
  cartItems?: any[];
  totalQty?: number | string;
  tenderMode?: string;
  setTenderMode?: (mode: string) => void;
  onPayNow?: () => void;
  onHoldBill?: () => void;
  onOpenSplitPayment?: () => void;
  customerKeyword?: string;
  setCustomerKeyword?: (keyword: string) => void;
  customerResults?: any[];
  customerLoading?: boolean;
  customerSearched?: boolean;
  selectedCustomer?: any;
  setSelectedCustomer?: (customer: any) => void;
  searchCustomers?: () => void;
  onAddNewCustomer?: () => void;
  onEditSelectedCustomer?: () => void;
  onRemoveCustomer?: () => void;
  setManualMode?: (mode: string) => void;
  netOffline?: boolean;
  manualMode?: string;
}

function money(n: number | string | undefined) {
  const v = Number(n || 0);
  return `₹${v.toFixed(0)}`;
}

export default function ClassicRightPanel({
  summary,
  cartItems,
  totalQty,

  tenderMode,
  setTenderMode,
  onPayNow,
  // onHoldBill,
  onOpenSplitPayment,

  customerKeyword,
  setCustomerKeyword,
  customerResults,
  customerLoading,
  customerSearched,
  selectedCustomer,
  setSelectedCustomer,
  searchCustomers,
  onAddNewCustomer,
  onEditSelectedCustomer,
  // onRemoveCustomer,
  netOffline,
  manualMode,
  setManualMode,
}: ClassicRightPanelProps) {
  const total = Number(summary?.total ?? summary?.grandTotal ?? 0);
  const subTotal = Number(summary?.subtotal ?? summary?.subTotal ?? total);
  const discount = Number(summary?.discount ?? 0);
  // const tax = Number(summary?.tax ?? summary?.taxAmount ?? 0);
  const qty = Number(totalQty ?? summary?.qty ?? 0);
  const itemCount = Array.isArray(cartItems) ? cartItems.length : 0;
  /* ============================
       NETWORK MODE
    ============================ */

  const isOnline = netOffline ? false : manualMode === "online";
  //   const isOnline = true;

  /* ============================
       PAYMENT HANDLER
    ============================ */

  const handleTenderClick = (mode: any) => {
    setTenderMode?.(mode);

    if (mode === "split") {
      onOpenSplitPayment?.();
    } else {
      onPayNow?.();
    }
  };
  return (
    <div className="col-span-3 h-full min-h-0">
      <div className="h-full min-h-0 flex flex-col gap-3">
        {/* =========================
                    BILL SUMMARY
                ========================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <ReceiptIndianRupee className="w-5 h-5 text-indigo-600" />
            <h6 className="text-sm font-semibold text-slate-800">
              Bill Summary
            </h6>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                <div className="text-[11px] font-semibold uppercase text-slate-500">
                  Items
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {itemCount}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                <div className="text-[11px] font-semibold uppercase text-slate-500">
                  Qty
                </div>
                <div className="text-sm font-bold text-slate-800">{qty}</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                <div className="text-[11px] font-semibold uppercase text-slate-500">
                  Subtotal
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {money(subTotal)}
                </div>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-2">
                <div className="text-[11px] font-semibold uppercase text-rose-500">
                  Discount
                </div>
                <div className="text-sm font-bold text-rose-600">
                  - {money(discount)}
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 rounded-xl border border-rose-200 bg-gradient-to-r from-[#667BE5] via-[#6D66CA] to-[#744FA9] text-white px-3 py-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Grand Total</span>

              <span className="text-lg font-bold">{money(total)}</span>
            </div>
          </div>
        </div>

        {/* =========================
                    PAYMENT
                ========================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />

            <h6 className="text-sm font-semibold text-slate-800">Payment</h6>

            {/* NETWORK TOGGLE */}

            <button
              type="button"
              onClick={() => {
                const next = isOnline ? "offline" : "online";
                setManualMode?.(next);
              }}
              className={`ml-auto relative inline-flex h-6 w-20 items-center rounded-full px-1 text-[10px] font-semibold transition
    ${isOnline ? "bg-emerald-600 text-white" : "bg-slate-400 text-white"}`}
            >
              <span
                className={`absolute left-1 top-1/2 -translate-y-1/2 h-4 w-9 rounded-full bg-white transition-all duration-200
        ${isOnline ? "translate-x-9" : "translate-x-0"}`}
              />

              <span className="w-1/2 text-center z-10">Online</span>

              <span className="w-1/2 text-center z-10">Offline</span>
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* PAYMENT MODES */}

            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleTenderClick("cash")}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold transition
                                ${
                                  tenderMode === "cash"
                                    ? "bg-slate-800 text-white border-slate-800"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                }`}
              >
                <span className="inline-flex items-center gap-1 justify-center">
                  <Wallet className="w-3.5 h-3.5" />
                  Cash
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTenderClick("card")}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold transition
                                ${
                                  tenderMode === "card"
                                    ? "bg-slate-800 text-white border-slate-800"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                }`}
              >
                <span className="inline-flex items-center gap-1 justify-center">
                  <CreditCard className="w-3.5 h-3.5" />
                  Card
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTenderClick("upi")}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold transition
                                ${
                                  tenderMode === "upi"
                                    ? "bg-slate-800 text-white border-slate-800"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                }`}
              >
                <span className="inline-flex items-center gap-1 justify-center">
                  <CreditCard className="w-3.5 h-3.5" />
                  UPI
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTenderClick("split")}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold transition
                                ${
                                  tenderMode === "split"
                                    ? "bg-slate-800 text-white border-slate-800"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                }`}
              >
                <span className="inline-flex items-center gap-1 justify-center">
                  <Layers className="w-3.5 h-3.5" />
                  Split
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================
                    CUSTOMER SEARCH
                ========================== */}

        <div className="flex-1 min-h-0 overflow-hidden">
          <CustomerSearchCardClassic
            customerKeyword={customerKeyword}
            setCustomerKeyword={setCustomerKeyword}
            customerResults={customerResults}
            customerLoading={customerLoading}
            customerSearched={customerSearched}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            searchCustomers={searchCustomers}
            onAddNew={onAddNewCustomer}
            onEditSelected={onEditSelectedCustomer}
          />
        </div>
      </div>
    </div>
  );
}
