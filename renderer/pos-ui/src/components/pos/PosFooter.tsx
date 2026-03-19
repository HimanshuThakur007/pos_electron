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
      className={`flex items-center justify-between px-6 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] ${
        isDark
          ? "bg-gray-900 text-white border-t border-gray-700"
          : "bg-white text-gray-900 border-t border-gray-200"
      }`}
      style={{ zIndex: 100, height: "70px" }}
    >
      {/* Left: Summary Metrics */}
      <div className="flex gap-6 items-center">
        <div className="flex flex-col">
          <span
            className={`text-xs uppercase font-bold ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
            style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}
          >
            Total Qty
          </span>
          <span className="font-bold text-2xl leading-none">{totalQty}</span>
        </div>

        <div
          className={`w-px ${isDark ? "bg-gray-600" : "bg-gray-300"}`}
          style={{ height: "40px" }}
        ></div>

        <div className="flex flex-col">
          <span
            className={`text-xs uppercase font-bold ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
            style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}
          >
            Taxable
          </span>
          <span className="font-semibold text-lg">
            ₹{taxableValue.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col">
          <span
            className={`text-xs uppercase font-bold ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
            style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}
          >
            Tax
          </span>
          <span className="font-semibold text-lg text-red-500">
            ₹{totalTax.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col">
          <span
            className={`text-xs uppercase font-bold ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
            style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}
          >
            Discount
          </span>
          <span className="font-semibold text-lg text-green-500">
            -₹{totalDiscount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Right: Grand Total & Pay Button */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div
            className={`text-xs uppercase font-bold ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
            style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}
          >
            Grand Total
          </div>
          <div
            className="font-bold leading-none"
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
