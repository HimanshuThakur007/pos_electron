// import React from "react";
// import { MdPayment } from "react-icons/md";

interface PosFooterProps {
  theme: "light" | "dark";
  totalQty: number;
  taxableValue: number;
  totalTax: number;
  totalDiscount: number;
  grandTotal: number;
}

export default function PosFooter({
  theme,
  totalQty,
  taxableValue,
  totalTax,
  totalDiscount,
  grandTotal,
}: PosFooterProps) {
  const isDark = theme === "dark";

  return (
    <div
      className={`pos-footer d-flex align-items-center justify-content-between px-4 py-3 shadow-lg ${
        isDark
          ? "bg-dark text-light border-top border-secondary"
          : "bg-white text-dark border-top"
      }`}
      style={{ zIndex: 100, height: "70px" }}
    >
      {/* Left: Summary Metrics */}
      <div className="d-flex gap-4 align-items-center">
        <div className="d-flex flex-column">
          <span
            className={`small text-uppercase fw-bold ${
              isDark ? "text-white opacity-75" : "text-muted"
            }`}
            style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}
          >
            Total Qty
          </span>
          <span className="fw-bold fs-4 lh-1">{totalQty}</span>
        </div>

        <div
          className={`vr ${isDark ? "bg-secondary" : "bg-dark"} opacity-25`}
          style={{ height: "40px" }}
        ></div>

        <div className="d-flex flex-column">
          <span
            className={`small text-uppercase fw-bold ${
              isDark ? "text-white opacity-75" : "text-muted"
            }`}
            style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}
          >
            Taxable
          </span>
          <span className="fw-semibold fs-6">₹{taxableValue.toFixed(2)}</span>
        </div>

        <div className="d-flex flex-column">
          <span
            className={`small text-uppercase fw-bold ${
              isDark ? "text-white opacity-75" : "text-muted"
            }`}
            style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}
          >
            Tax
          </span>
          <span className="fw-semibold fs-6 text-danger">
            ₹{totalTax.toFixed(2)}
          </span>
        </div>

        <div className="d-flex flex-column">
          <span
            className={`small text-uppercase fw-bold ${
              isDark ? "text-white opacity-75" : "text-muted"
            }`}
            style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}
          >
            Discount
          </span>
          <span className="fw-semibold fs-6 text-success">
            -₹{totalDiscount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Right: Grand Total & Pay Button */}
      <div className="d-flex align-items-center gap-4">
        <div className="text-end">
          <div
            className={`small text-uppercase fw-bold ${
              isDark ? "text-white opacity-75" : "text-muted"
            }`}
            style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}
          >
            Grand Total
          </div>
          <div
            className="fw-bold lh-1"
            style={{ fontSize: "1.8rem", color: isDark ? "#fff" : "#111" }}
          >
            ₹{grandTotal.toFixed(2)}
          </div>
        </div>

        {/* <button
          className="btn text-white border-0 d-flex align-items-center gap-2 px-4 rounded-pill shadow"
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            height: "45px",
            transition: "transform 0.1s, box-shadow 0.2s",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.96)";
            e.currentTarget.style.boxShadow = "none";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 .5rem 1rem rgba(0,0,0,.15)";
          }}
        >
          <MdPayment size={22} />
          <span className="fw-bold">PAY</span>
        </button> */}
      </div>
    </div>
  );
}
