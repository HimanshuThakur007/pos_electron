import { useState, useEffect } from "react";
import {
  MdSearch,
  MdPersonAdd,
  MdAttachMoney,
  MdCreditCard,
  MdQrCode,
} from "react-icons/md";

interface PosPaymentPanelProps {
  theme: "light" | "dark";
  roundedGrandTotal: number;
  roundOff: number;
  onPaymentComplete: (
    paymentMode: string,
    amountReceived: number,
    transactionRef?: string,
  ) => Promise<boolean>;
}

export default function PosPaymentPanel({
  theme,
  roundedGrandTotal,
  roundOff,
  onPaymentComplete,
}: PosPaymentPanelProps) {
  const [amountReceived, setAmountReceived] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "card" | "upi">(
    "cash",
  );
  const [transactionRef, setTransactionRef] = useState("");

  const isDark = theme === "dark";
  const received = parseFloat(amountReceived) || 0;
  const balance = received - roundedGrandTotal;

  useEffect(() => {
    setAmountReceived(roundedGrandTotal.toFixed(2));
  }, [paymentMode, roundedGrandTotal]);

  const handlePayment = async () => {
    if (paymentMode === "cash" && received < roundedGrandTotal) {
      alert("Amount received is less than the bill amount!");
      return;
    }

    const success = await onPaymentComplete(
      paymentMode,
      received,
      transactionRef,
    );

    if (success) {
      setAmountReceived("");
      setTransactionRef("");
      setPaymentMode("cash");
    }
  };

  return (
    <div className="w-1/4 p-2 flex flex-col gap-3 border-l border-gray-200">
      {/* Customer Search Card */}
      <div
        className={`rounded-lg shadow-sm border ${isDark ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-200"}`}
      >
        <div className="p-3">
          <div className="flex justify-between items-center mb-2">
            <h6
              className={`font-bold mb-0 ${isDark ? "text-white" : "text-blue-600"}`}
            >
              Customer
            </h6>
            <button
              className={`p-1 rounded-full border transition-colors ${isDark ? "border-gray-500 text-gray-300 hover:bg-gray-700 hover:text-white" : "border-blue-200 text-blue-600 hover:bg-blue-50"}`}
              title="Add New Customer"
            >
              <MdPersonAdd size={16} />
            </button>
          </div>
          <div className="flex rounded-md shadow-sm">
            <span
              className={`inline-flex items-center px-3 rounded-l-md border border-r-0 ${isDark ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-300 text-gray-500"}`}
            >
              <MdSearch size={18} />
            </span>
            <input
              type="text"
              className={`flex-1 block w-full px-3 py-2 rounded-r-md border focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isDark ? "bg-gray-900 text-white border-gray-600 placeholder-gray-500" : "bg-white text-gray-900 border-gray-300 placeholder-gray-400"}`}
              placeholder="Search Name / Mobile"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Quick Pay Card */}
      <div
        className={`rounded-lg shadow-sm border ${isDark ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-200"}`}
      >
        <div
          className={`px-3 py-2 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}
        >
          <div className="flex items-center gap-2">
            {paymentMode === "cash" && (
              <MdAttachMoney size={20} className="text-green-500" />
            )}
            {paymentMode === "card" && (
              <MdCreditCard size={20} className="text-blue-500" />
            )}
            {paymentMode === "upi" && (
              <MdQrCode size={20} className="text-yellow-500" />
            )}
            <h6
              className={`mb-0 font-bold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Payment Details
            </h6>
          </div>
        </div>
        <div className="p-3">
          {/* Payment Mode Switcher */}
          <div className="flex gap-2 mb-3">
            <button
              className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-md border transition-colors ${
                paymentMode === "cash"
                  ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                  : isDark
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setPaymentMode("cash")}
            >
              <MdAttachMoney /> Cash
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-md border transition-colors ${
                paymentMode === "card"
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                  : isDark
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setPaymentMode("card")}
            >
              <MdCreditCard /> Card
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-md border transition-colors ${
                paymentMode === "upi"
                  ? "bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600"
                  : isDark
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setPaymentMode("upi")}
            >
              <MdQrCode /> UPI
            </button>
          </div>

          <div className="flex justify-between items-center mb-3">
            <span className="opacity-75 text-sm">Total Bill</span>
            <span className="font-bold text-2xl">
              ₹{roundedGrandTotal.toFixed(2)}
            </span>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium opacity-75 mb-1">
              {paymentMode === "cash" ? "Amount Received" : "Amount to Charge"}
            </label>
            <div className="flex rounded-md shadow-sm">
              <span
                className={`inline-flex items-center px-3 rounded-l-md border border-r-0 ${isDark ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-50 border-gray-300 text-gray-500"}`}
              >
                ₹
              </span>
              <input
                type="number"
                className={`flex-1 block w-full px-3 py-2 rounded-r-md border font-bold text-lg focus:ring-blue-500 focus:border-blue-500 ${isDark ? "bg-gray-900 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300"}`}
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>

          {paymentMode === "cash" && (
            <>
              <div className="flex justify-between items-center mb-2 text-sm">
                <span className="opacity-75">Round Off</span>
                <span>{roundOff.toFixed(2)}</span>
              </div>

              <div
                className={`flex justify-between items-center pt-3 mt-2 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}
              >
                <span className="font-bold">Balance To Return</span>
                <span
                  className={`font-bold text-xl ${balance < 0 ? "text-red-500" : "text-green-500"}`}
                >
                  ₹{balance > 0 ? balance.toFixed(2) : "0.00"}
                </span>
              </div>
            </>
          )}

          {paymentMode !== "cash" && (
            <div className="mb-3">
              <label className="block text-xs font-medium opacity-75 mb-1">
                Transaction Ref (Optional)
              </label>
              <input
                type="text"
                className={`block w-full px-3 py-2 rounded-md border focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isDark ? "bg-gray-900 text-white border-gray-600 placeholder-gray-500" : "bg-white text-gray-900 border-gray-300 placeholder-gray-400"}`}
                placeholder="Enter Ref No."
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
            </div>
          )}

          <button
            className={`w-full mt-3 py-2 px-4 rounded-md font-bold shadow-sm text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              paymentMode === "cash"
                ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                : paymentMode === "card"
                  ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                  : "bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500"
            }`}
            onClick={handlePayment}
          >
            CONFIRM {paymentMode.toUpperCase()} PAYMENT
          </button>
        </div>
      </div>
    </div>
  );
}
