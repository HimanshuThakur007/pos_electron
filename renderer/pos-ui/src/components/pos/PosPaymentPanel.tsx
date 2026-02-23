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
    <div className="col-3 p-2 pos-right d-flex flex-column gap-3">
      {/* Customer Search Card */}
      <div
        className={`card shadow-sm ${isDark ? "bg-dark text-light border-secondary" : "bg-white text-dark border"}`}
      >
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6
              className={`fw-bold mb-0 ${isDark ? "text-white" : "text-primary"}`}
            >
              Customer
            </h6>
            <button
              className={`btn btn-sm btn-icon rounded-circle ${isDark ? "btn-outline-light" : "btn-outline-primary"}`}
              title="Add New Customer"
            >
              <MdPersonAdd size={16} />
            </button>
          </div>
          <div className="input-group">
            <span
              className={`input-group-text ${isDark ? "bg-secondary bg-opacity-25 border-secondary text-light" : "bg-light border"}`}
            >
              <MdSearch size={18} />
            </span>
            <input
              type="text"
              className={`form-control ${isDark ? "bg-dark text-light border-secondary" : "bg-white text-dark"}`}
              placeholder="Search Name / Mobile"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Quick Pay Card */}
      <div
        className={`card shadow-sm ${isDark ? "bg-dark text-light border-secondary" : "bg-white text-dark border"}`}
      >
        <div
          className={`card-header py-2 ${isDark ? "border-secondary" : "border-bottom"}`}
        >
          <div className="d-flex align-items-center gap-2">
            {paymentMode === "cash" && (
              <MdAttachMoney size={20} className="text-success" />
            )}
            {paymentMode === "card" && (
              <MdCreditCard size={20} className="text-primary" />
            )}
            {paymentMode === "upi" && (
              <MdQrCode size={20} className="text-warning" />
            )}
            <h6
              className={`mb-0 fw-bold ${isDark ? "text-white" : "text-dark"}`}
            >
              Payment Details
            </h6>
          </div>
        </div>
        <div className="card-body p-3">
          {/* Payment Mode Switcher */}
          <div className="d-flex gap-2 mb-3">
            <button
              className={`btn flex-grow-1 d-flex align-items-center justify-content-center gap-1 p-2 ${
                paymentMode === "cash"
                  ? "btn-success text-white"
                  : isDark
                    ? "btn-outline-secondary text-light"
                    : "btn-outline-secondary"
              }`}
              onClick={() => setPaymentMode("cash")}
            >
              <MdAttachMoney /> Cash
            </button>
            <button
              className={`btn flex-grow-1 d-flex align-items-center justify-content-center gap-1 p-2 ${
                paymentMode === "card"
                  ? "btn-primary text-white"
                  : isDark
                    ? "btn-outline-secondary text-light"
                    : "btn-outline-secondary"
              }`}
              onClick={() => setPaymentMode("card")}
            >
              <MdCreditCard /> Card
            </button>
            <button
              className={`btn flex-grow-1 d-flex align-items-center justify-content-center gap-1 p-2 ${
                paymentMode === "upi"
                  ? "btn-warning text-dark"
                  : isDark
                    ? "btn-outline-secondary text-light"
                    : "btn-outline-secondary"
              }`}
              onClick={() => setPaymentMode("upi")}
            >
              <MdQrCode /> UPI
            </button>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="opacity-75">Total Bill</span>
            <span className="fw-bold fs-4">
              ₹{roundedGrandTotal.toFixed(2)}
            </span>
          </div>

          <div className="mb-3">
            <label className="form-label small opacity-75 mb-1">
              {paymentMode === "cash" ? "Amount Received" : "Amount to Charge"}
            </label>
            <div className="input-group input-group-lg">
              <span
                className={`input-group-text ${isDark ? "bg-secondary bg-opacity-25 border-secondary text-light" : "bg-light"}`}
              >
                ₹
              </span>
              <input
                type="number"
                className={`form-control fw-bold ${isDark ? "bg-dark text-light border-secondary" : "bg-white text-dark"}`}
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>

          {paymentMode === "cash" && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-2 small">
                <span className="opacity-75">Round Off</span>
                <span>{roundOff.toFixed(2)}</span>
              </div>

              <div
                className={`d-flex justify-content-between align-items-center pt-3 mt-2 border-top ${isDark ? "border-secondary" : ""}`}
              >
                <span className="fw-bold">Balance To Return</span>
                <span
                  className={`fw-bold fs-5 ${balance < 0 ? "text-danger" : "text-success"}`}
                >
                  ₹{balance > 0 ? balance.toFixed(2) : "0.00"}
                </span>
              </div>
            </>
          )}

          {paymentMode !== "cash" && (
            <div className="mb-3">
              <label className="form-label small opacity-75 mb-1">
                Transaction Ref (Optional)
              </label>
              <input
                type="text"
                className={`form-control ${isDark ? "bg-dark text-light border-secondary" : "bg-white text-dark"}`}
                placeholder="Enter Ref No."
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
            </div>
          )}

          <button
            className={`btn w-100 mt-3 py-2 fw-bold shadow-sm ${paymentMode === "cash" ? "btn-success" : paymentMode === "card" ? "btn-primary" : "btn-warning"}`}
            onClick={handlePayment}
          >
            CONFIRM {paymentMode.toUpperCase()} PAYMENT
          </button>
        </div>
      </div>
    </div>
  );
}
