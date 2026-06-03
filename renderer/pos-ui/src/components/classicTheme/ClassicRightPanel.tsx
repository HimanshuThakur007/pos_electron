import { useMemo } from "react";
import {
  ReceiptIndianRupee,
  CreditCard,
  Wallet,
  Layers,
  Save,
  QrCode,
} from "lucide-react";
// import { useNavigate } from "react-router-dom";

import CustomerSearchCardClassic from "./CustomerSearchCardClassic";

const modeStyles = {
  cash: {
    active: "bg-emerald-50 border-emerald-500 text-emerald-800",
    iconClass: "text-emerald-600",
    iconBg: "bg-emerald-100",
  },
  card: {
    active: "bg-blue-50 border-blue-500 text-blue-800",
    iconClass: "text-blue-600",
    iconBg: "bg-blue-100",
  },
  upi: {
    active: "bg-purple-50 border-purple-500 text-purple-800",
    iconClass: "text-purple-600",
    iconBg: "bg-purple-100",
  },
  split: {
    active: "bg-amber-50 border-amber-500 text-amber-800",
    iconClass: "text-amber-600",
    iconBg: "bg-amber-100",
  },
};

// const GST_STATE_CODES: Record<string, string> = {
//   "01": "Jammu & Kashmir",
//   "02": "Himachal Pradesh",
//   "03": "Punjab",
//   "04": "Chandigarh",
//   "05": "Uttarakhand",
//   "06": "Haryana",
//   "07": "Delhi",
//   "08": "Rajasthan",
//   "09": "Uttar Pradesh",
//   "10": "Bihar",
//   "11": "Sikkim",
//   "12": "Arunachal Pradesh",
//   "13": "Nagaland",
//   "14": "Manipur",
//   "15": "Mizoram",
//   "16": "Tripura",
//   "17": "Meghalaya",
//   "18": "Assam",
//   "19": "West Bengal",
//   "20": "Jharkhand",
//   "21": "Odisha",
//   "22": "Chhattisgarh",
//   "23": "Madhya Pradesh",
//   "24": "Gujarat",
//   "25": "Daman & Diu",
//   "26": "Dadra & Nagar Haveli",
//   "27": "Maharashtra",
//   "28": "Andhra Pradesh",
//   "29": "Karnataka",
//   "30": "Goa",
//   "31": "Lakshadweep",
//   "32": "Kerala",
//   "33": "Tamil Nadu",
//   "34": "Puducherry",
//   "35": "Andaman & Nicobar Islands",
//   "36": "Telangana",
//   "37": "Andhra Pradesh (New)",
//   "38": "Ladakh",
// };

function GSTCustomerCard({
  gstNumber,
  branchGstin,
  b2bCustomer,
  onChangeGST,
}: {
  gstNumber: string;
  branchGstin: string;
  b2bCustomer?: any;
  onChangeGST?: () => void;
}) {
  const stateCode = gstNumber?.substring(0, 2);
  const branchStateCode = branchGstin?.substring(0, 2);
  const taxType =
    stateCode && branchStateCode && stateCode === branchStateCode
      ? "CGST + SGST"
      : "IGST";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <h5 className="text-sm font-semibold text-slate-800">B2B Customer</h5>
        <button
          onClick={onChangeGST}
          className="text-[10px] text-indigo-600 font-semibold border border-indigo-200 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100 transition"
        >
          Change
        </button>
      </div>
      <div className="p-3 text-xs space-y-1.5 text-slate-700">
        {b2bCustomer ? (
          <>
            <div className="flex justify-between items-start gap-2">
              <span className="font-bold text-sm text-slate-900 truncate">
                {b2bCustomer.company_name || gstNumber}
              </span>
              {taxType && (
                <span
                  className={`font-bold shrink-0 ${taxType === "IGST" ? "text-amber-600" : "text-emerald-600"}`}
                >
                  {taxType}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">
                GSTIN:{" "}
                <span className="text-slate-800 font-semibold">
                  {gstNumber}
                </span>
              </span>
              <span className="text-slate-500">
                State:{" "}
                <span className="text-slate-800 font-semibold">
                  {b2bCustomer.state || "—"}
                </span>
              </span>
            </div>
            {b2bCustomer.selected_address && (
              <div className="text-[11px] text-slate-600 leading-tight mt-1 border-t border-slate-100 pt-1.5">
                {b2bCustomer.selected_address.addr1}
                {b2bCustomer.selected_address.addr2
                  ? `, ${b2bCustomer.selected_address.addr2}`
                  : ""}
                {b2bCustomer.selected_address.street
                  ? `, ${b2bCustomer.selected_address.street}`
                  : ""}
                <br />
                {b2bCustomer.selected_address.district} ·{" "}
                {b2bCustomer.selected_address.pincode}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="font-bold text-sm text-slate-900 truncate">
              {gstNumber}
            </div>
            <div className="text-[11px] text-slate-400">
              Fetching GST details...
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ClassicRightPanelProps {
  summary?: any;
  cartItems?: any[];
  totalQty?: number | string;
  tenderMode?: string;
  setTenderMode?: (mode: string) => void;
  onPayNow?: () => void;
  onHoldBill?: () => void;
  onOpenSplitPayment?: () => void;
  onOpenPaymentModal?: (mode: string) => void;
  customerKeyword?: string;
  setCustomerKeyword?: (keyword: string) => void;
  customerResults?: any[];
  customerLoading?: boolean;
  customerSearched?: boolean;
  selectedCustomer?: any;
  setSelectedCustomer?: (customer: any) => void;
  searchCustomers?: () => void;
  onAddNewCustomer?: () => void;
  // onEditSelectedCustomer?: () => void;
  onEditSelectedCustomer?: (data: any) => void;
  onRemoveCustomer?: () => void;
  setManualMode?: (mode: string) => void;
  netOffline?: boolean;
  manualMode?: string;
  roundOff?: number;
  isB2B?: boolean;
  branchInfo?: { address: string; gstin: string; phoneNo: string };
  onChangeGST?: () => void;
}

function money(n: number | string | undefined) {
  const v = Number(n || 0);
  return `₹${v.toFixed(0)}`;
}

export default function ClassicRightPanel({
  summary,
  cartItems,
  totalQty,
  // roundOff,
  tenderMode,
  setTenderMode,
  onPayNow,
  // onHoldBill,
  // onOpenSplitPayment,
  onOpenPaymentModal,

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
  // manualMode,
  // setManualMode,
  isB2B,
  branchInfo,
  onChangeGST,
}: ClassicRightPanelProps) {
  // const navigate = useNavigate();

  const isMac = useMemo(
    () => navigator.userAgent.toUpperCase().indexOf("MAC") >= 0,
    [],
  );

  const total = Number(summary?.total ?? summary?.grandTotal ?? 0);
  const subTotal = Number(summary?.subtotal ?? summary?.subTotal ?? total);
  const discount = Number(summary?.discount ?? 0);
  // const tax = Number(summary?.tax ?? summary?.taxAmount ?? 0);
  const qty = Number(totalQty ?? summary?.qty ?? 0);
  const itemCount = Array.isArray(cartItems) ? cartItems.length : 0;
  /* ============================
       NETWORK MODE
    ============================ */

  // const isOnline = netOffline ? false : manualMode === "online";
  //   const isOnline = true;

  /* ============================
       PAYMENT HANDLER
    ============================ */

  const handleTenderClick = (mode: any) => {
    setTenderMode?.(mode);
    onOpenPaymentModal?.(mode);
  };
  return (
    <div className="col-span-3 h-full min-h-0">
      <div className="h-full min-h-0 flex flex-col gap-3">
        {/* ===================================
                    BILL SUMMARY
            =================================== */}

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

            <div className="pt-3 mt-3 rounded-xl border-transparent bg-slate-800 text-white px-3 py-2 flex items-center justify-between shadow-lg shadow-slate-800/20">
              <span className="text-sm font-semibold">Grand Total</span>

              <span className="text-lg font-bold">{money(total)}</span>
            </div>
          </div>
        </div>

        {/* =================================
                    PAYMENT
            =============================== */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 space-y-3">
            {/* PAYMENT MODES */}
            <div className="grid grid-cols-2 gap-3">
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
                    onClick={() => handleTenderClick(mode.id)}
                    className={`group rounded-xl border-2 p-3 text-sm font-bold transition-all duration-200 flex flex-col items-center justify-center gap-2 h-20
                    ${
                      isSelected
                        ? `${style.active} ring-2 ring-offset-1 ring-current`
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full transition-colors ${
                        isSelected
                          ? "bg-white"
                          : "bg-slate-100 group-hover:bg-slate-200"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 transition-colors ${
                          isSelected ? style.iconClass : "text-slate-400"
                        }`}
                      />
                    </div>
                    <span className="transition-colors">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* =========================
                    CUSTOMER SEARCH
                ========================== */}

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-1">
          {/* <CustomerSearchCardClassic
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
          /> */}
          {!netOffline && isB2B ? (
            <GSTCustomerCard
              gstNumber={customerKeyword || ""}
              branchGstin={branchInfo?.gstin || ""}
              b2bCustomer={selectedCustomer}
              onChangeGST={onChangeGST}
            />
          ) : !netOffline ? (
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
          ) : null}
        </div>

        {/* Save Bill Button */}
        <button
          type="button"
          onClick={onPayNow}
          className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-base hover:bg-green-700 active:scale-[0.99] transition flex items-center justify-between gap-2 shadow-lg shadow-green-600/30 px-4"
        >
          <div className="flex items-center gap-2">
            <Save size={16} />
            <span>Save & Print Bill</span>
          </div>
          <kbd className="px-2 py-1 text-xs font-bold text-green-100 bg-green-700/50 border border-green-500/50 rounded-md">
            {isMac ? "⌥" : "Alt"} P
          </kbd>
        </button>
      </div>
    </div>
  );
}
// import {
//   ReceiptIndianRupee,
//   CreditCard,
//   Wallet,
//   Layers,
//   Save,
// } from "lucide-react";

// import CustomerSearchCardClassic from "./CustomerSearchCardClassic";

// interface ClassicRightPanelProps {
//   summary?: any;
//   cartItems?: any[];
//   totalQty?: number | string;
//   tenderMode?: string;
//   setTenderMode?: (mode: string) => void;
//   onPayNow?: () => void;
//   onHoldBill?: () => void;
//   onOpenSplitPayment?: () => void;
//   onOpenPaymentModal?: (mode: string) => void;
//   customerKeyword?: string;
//   setCustomerKeyword?: (keyword: string) => void;
//   customerResults?: any[];
//   customerLoading?: boolean;
//   customerSearched?: boolean;
//   selectedCustomer?: any;
//   setSelectedCustomer?: (customer: any) => void;
//   searchCustomers?: () => void;
//   onAddNewCustomer?: () => void;
//   onEditSelectedCustomer?: () => void;
//   onRemoveCustomer?: () => void;
//   setManualMode?: (mode: string) => void;
//   netOffline?: boolean;
//   manualMode?: string;
// }

// function money(n: number | string | undefined) {
//   const v = Number(n || 0);
//   return `₹${v.toFixed(0)}`;
// }

// export default function ClassicRightPanel({
//   summary,
//   cartItems,
//   totalQty,

//   tenderMode,
//   setTenderMode,
//   onPayNow,
//   onHoldBill,
//   onOpenSplitPayment,
//   onOpenPaymentModal,

//   customerKeyword,
//   setCustomerKeyword,
//   customerResults,
//   customerLoading,
//   customerSearched,
//   selectedCustomer,
//   setSelectedCustomer,
//   searchCustomers,
//   onAddNewCustomer,
//   onEditSelectedCustomer,
//   // onRemoveCustomer,
//   netOffline,
//   manualMode,
//   setManualMode,
// }: ClassicRightPanelProps) {
//   const total = Number(summary?.total ?? summary?.grandTotal ?? 0);
//   const subTotal = Number(summary?.subtotal ?? summary?.subTotal ?? total);
//   const discount = Number(summary?.discount ?? 0);
//   // const tax = Number(summary?.tax ?? summary?.taxAmount ?? 0);
//   const qty = Number(totalQty ?? summary?.qty ?? 0);
//   const itemCount = Array.isArray(cartItems) ? cartItems.length : 0;
//   /* ============================
//        NETWORK MODE
//     ============================ */

//   const isOnline = netOffline ? false : manualMode === "online";
//   //   const isOnline = true;

//   /* ============================
//        PAYMENT HANDLER
//     ============================ */

//   const handleTenderClick = (mode: any) => {
//     setTenderMode?.(mode);
//     onOpenPaymentModal?.(mode);
//   };
//   return (
//     <div className="col-span-3 h-full min-h-0">
//       <div className="h-full min-h-0 flex flex-col gap-3">
//         {/* =========================
//                     BILL SUMMARY
//                 ========================== */}

//         <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
//           <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
//             <ReceiptIndianRupee className="w-5 h-5 text-indigo-600" />
//             <h6 className="text-sm font-semibold text-slate-800">
//               Bill Summary
//             </h6>
//           </div>

//           <div className="p-4">
//             <div className="grid grid-cols-4 gap-2">
//               <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
//                 <div className="text-[11px] font-semibold uppercase text-slate-500">
//                   Items
//                 </div>
//                 <div className="text-sm font-bold text-slate-800">
//                   {itemCount}
//                 </div>
//               </div>

//               <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
//                 <div className="text-[11px] font-semibold uppercase text-slate-500">
//                   Qty
//                 </div>
//                 <div className="text-sm font-bold text-slate-800">{qty}</div>
//               </div>

//               <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
//                 <div className="text-[11px] font-semibold uppercase text-slate-500">
//                   Subtotal
//                 </div>
//                 <div className="text-sm font-bold text-slate-800">
//                   {money(subTotal)}
//                 </div>
//               </div>

//               <div className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-2">
//                 <div className="text-[11px] font-semibold uppercase text-rose-500">
//                   Discount
//                 </div>
//                 <div className="text-sm font-bold text-rose-600">
//                   - {money(discount)}
//                 </div>
//               </div>
//             </div>

//             <div className="pt-3 mt-3 rounded-xl border-transparent bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-2 flex items-center justify-between shadow-lg shadow-emerald-500/20">
//               <span className="text-sm font-semibold">Grand Total</span>

//               <span className="text-lg font-bold">{money(total)}</span>
//             </div>
//           </div>
//         </div>

//         {/* =========================
//                     PAYMENT
//                 ========================== */}

//         <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
//           <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
//             <CreditCard className="w-5 h-5 text-emerald-600" />

//             <h6 className="text-sm font-semibold text-slate-800">Payment</h6>

//             {/* NETWORK TOGGLE */}

//             <button
//               type="button"
//               onClick={() => {
//                 const next = isOnline ? "offline" : "online";
//                 setManualMode?.(next);
//               }}
//               className={`ml-auto relative inline-flex h-6 w-20 items-center rounded-full px-1 text-[10px] font-semibold transition
//     ${isOnline ? "bg-emerald-600 text-white" : "bg-slate-400 text-white"}`}
//             >
//               <span
//                 className={`absolute left-1 top-1/2 -translate-y-1/2 h-4 w-9 rounded-full bg-white transition-all duration-200
//         ${isOnline ? "translate-x-9" : "translate-x-0"}`}
//               />

//               <span className="w-1/2 text-center z-10">Online</span>

//               <span className="w-1/2 text-center z-10">Offline</span>
//             </button>
//           </div>

//           <div className="p-4 space-y-3">
//             {/* PAYMENT MODES */}

//             <div className="grid grid-cols-4 gap-2">
//               <button
//                 type="button"
//                 onClick={() => handleTenderClick("cash")}
//                 className={`rounded-xl border px-2 py-2 text-xs font-semibold transition
//                                 ${
//                                   tenderMode === "cash"
//                                     ? "bg-slate-800 text-white border-slate-800"
//                                     : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
//                                 }`}
//               >
//                 <span className="inline-flex items-center gap-1 justify-center">
//                   <Wallet className="w-3.5 h-3.5" />
//                   Cash
//                 </span>
//               </button>

//               <button
//                 type="button"
//                 onClick={() => handleTenderClick("card")}
//                 className={`rounded-xl border px-2 py-2 text-xs font-semibold transition
//                                 ${
//                                   tenderMode === "card"
//                                     ? "bg-slate-800 text-white border-slate-800"
//                                     : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
//                                 }`}
//               >
//                 <span className="inline-flex items-center gap-1 justify-center">
//                   <CreditCard className="w-3.5 h-3.5" />
//                   Card
//                 </span>
//               </button>

//               <button
//                 type="button"
//                 onClick={() => handleTenderClick("upi")}
//                 className={`rounded-xl border px-2 py-2 text-xs font-semibold transition
//                                 ${
//                                   tenderMode === "upi"
//                                     ? "bg-slate-800 text-white border-slate-800"
//                                     : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
//                                 }`}
//               >
//                 <span className="inline-flex items-center gap-1 justify-center">
//                   <CreditCard className="w-3.5 h-3.5" />
//                   UPI
//                 </span>
//               </button>

//               <button
//                 type="button"
//                 onClick={() => handleTenderClick("split")}
//                 className={`rounded-xl border px-2 py-2 text-xs font-semibold transition
//                                 ${
//                                   tenderMode === "split"
//                                     ? "bg-slate-800 text-white border-slate-800"
//                                     : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
//                                 }`}
//               >
//                 <span className="inline-flex items-center gap-1 justify-center">
//                   <Layers className="w-3.5 h-3.5" />
//                   Split
//                 </span>
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* =========================
//                     CUSTOMER SEARCH
//                 ========================== */}

//         <div className="flex-1 min-h-0 overflow-hidden">
//           <CustomerSearchCardClassic
//             customerKeyword={customerKeyword}
//             setCustomerKeyword={setCustomerKeyword}
//             customerResults={customerResults}
//             customerLoading={customerLoading}
//             customerSearched={customerSearched}
//             selectedCustomer={selectedCustomer}
//             setSelectedCustomer={setSelectedCustomer}
//             searchCustomers={searchCustomers}
//             onAddNew={onAddNewCustomer}
//             onEditSelected={onEditSelectedCustomer}
//           />

//           {/* Save Bill Button */}
//           <button
//             type="button"
//             onClick={onPayNow}
//             className="w-full mt-3 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-[0.99] transition flex items-center justify-center gap-2 shadow-sm"
//           >
//             <Save size={15} />
//             Save Bill
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
//                 type="button"
//                 onClick={() => handleTenderClick("upi")}
//                 className={`rounded-xl border px-2 py-2 text-xs font-semibold transition
//                                 ${
//                                   tenderMode === "upi"
//                                     ? "bg-slate-800 text-white border-slate-800"
//                                     : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
//                                 }`}
//               >
//                 <span className="inline-flex items-center gap-1 justify-center">
//                   <CreditCard className="w-3.5 h-3.5" />
//                   UPI
//                 </span>
//               </button>

//               <button
//                 type="button"
//                 onClick={() => handleTenderClick("split")}
//                 className={`rounded-xl border px-2 py-2 text-xs font-semibold transition
//                                 ${
//                                   tenderMode === "split"
//                                     ? "bg-slate-800 text-white border-slate-800"
//                                     : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
//                                 }`}
//               >
//                 <span className="inline-flex items-center gap-1 justify-center">
//                   <Layers className="w-3.5 h-3.5" />
//                   Split
//                 </span>
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* =========================
//                     CUSTOMER SEARCH
//                 ========================== */}

//         <div className="flex-1 min-h-0 overflow-hidden">
//           <CustomerSearchCardClassic
//             customerKeyword={customerKeyword}
//             setCustomerKeyword={setCustomerKeyword}
//             customerResults={customerResults}
//             customerLoading={customerLoading}
//             customerSearched={customerSearched}
//             selectedCustomer={selectedCustomer}
//             setSelectedCustomer={setSelectedCustomer}
//             searchCustomers={searchCustomers}
//             onAddNew={onAddNewCustomer}
//             onEditSelected={onEditSelectedCustomer}
//           />

//           {/* Save Bill Button */}
//           <button
//             type="button"
//             onClick={onPayNow}
//             className="w-full mt-3 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-[0.99] transition flex items-center justify-center gap-2 shadow-sm"
//           >
//             <Save size={15} />
//             Save Bill
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
