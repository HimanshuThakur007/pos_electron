import React from "react";
import { MdReceiptLong, MdCloudDone, MdCloudOff, MdSync } from "react-icons/md";

interface PosLastBillBarProps {
  theme: "light" | "dark";
  lastBill: {
    bill_no: string;
    created_at: string;
    grand_total: number;
    total_qty: number;
    amount_received: number;
    payment_mode: string;
    time?: string;
  } | null;
  isOnline: boolean;
  syncStatus: string;
}

const PosLastBillBar = React.memo(
  ({ theme, lastBill, isOnline, syncStatus }: PosLastBillBarProps) => {
    const isDark = theme === "dark";

    const change =
      lastBill &&
      lastBill.payment_mode === "cash" &&
      lastBill.amount_received > lastBill.grand_total
        ? lastBill.amount_received - lastBill.grand_total
        : 0;

    let timeStr = "-";
    if (lastBill) {
      const rawTime = lastBill.time || lastBill.created_at;
      if (rawTime) {
        let dateObj = new Date(rawTime);
        // Handle SQLite UTC timestamp "YYYY-MM-DD HH:MM:SS" which might be parsed as local or invalid
        if (
          isNaN(dateObj.getTime()) ||
          (typeof rawTime === "string" &&
            rawTime.includes(" ") &&
            !rawTime.includes("T"))
        ) {
          dateObj = new Date(rawTime.replace(" ", "T") + "Z");
        }
        if (!isNaN(dateObj.getTime())) {
          timeStr = dateObj.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        } else {
          timeStr = rawTime;
        }
      }
    }

    const getSyncIcon = () => {
      if (!isOnline || syncStatus === "error")
        return <MdCloudOff className="text-danger" />;
      if (syncStatus === "syncing")
        return <MdSync className="text-warning spin-animation" />;
      return <MdCloudDone className="text-success" />;
    };

    return (
      <div
        className={`flex items-center justify-between px-4 py-2 shadow-sm ${
          isDark
            ? "bg-gray-900 text-white border-b border-gray-700"
            : "bg-white text-gray-900 border-b border-gray-200"
        }`}
        style={{
          fontSize: "0.85rem",
          background: isDark
            ? "linear-gradient(to right, #212529, #2c3034)"
            : "linear-gradient(to right, #f8f9fa, #e9ecef)",
          minHeight: "43px",
        }}
      >
        {/* Left: Label */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center rounded-full ${
              isDark ? "bg-gray-700 text-gray-300" : "bg-blue-100 text-blue-600"
            }`}
            style={{ width: "28px", height: "28px" }}
          >
            <MdReceiptLong size={16} />
          </div>
          <span
            className="font-bold uppercase"
            style={{ letterSpacing: "0.5px", fontSize: "0.75rem" }}
          >
            Last Transaction
          </span>
        </div>

        {/* Right: Details */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2" title="Bill Number">
            <span
              className={`opacity-75 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Bill:
            </span>
            <span className="font-semibold font-mono">
              {lastBill?.bill_no || "-"}
            </span>
          </div>

          <div
            className={`w-px h-4 ${isDark ? "bg-gray-600" : "bg-gray-300"}`}
          ></div>

          <div className="flex items-center gap-2" title="Time">
            <span
              className={`opacity-75 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Time:
            </span>
            <span className="font-medium">{timeStr}</span>
          </div>

          <div
            className={`w-px h-4 ${isDark ? "bg-gray-600" : "bg-gray-300"}`}
          ></div>

          <div className="flex items-center gap-2" title="Amount">
            <span
              className={`opacity-75 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Amt:
            </span>
            <span className="font-bold text-green-500">
              ₹{lastBill?.grand_total?.toFixed(2) || "0.00"}
            </span>
          </div>

          <div
            className={`w-px h-4 ${isDark ? "bg-gray-600" : "bg-gray-300"}`}
          ></div>

          <div className="flex items-center gap-2" title="Quantity">
            <span
              className={`opacity-75 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Qty:
            </span>
            <span className="font-medium">{lastBill?.total_qty || 0}</span>
          </div>

          <div
            className={`w-px h-4 ${isDark ? "bg-gray-600" : "bg-gray-300"}`}
          ></div>

          <div className="flex items-center gap-2" title="Change">
            <span
              className={`opacity-75 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Change:
            </span>
            <span className="font-medium">₹{change.toFixed(2)}</span>
          </div>

          <div
            className={`w-px h-4 ${isDark ? "bg-gray-600" : "bg-gray-300"}`}
          ></div>

          <div className="flex items-center gap-2" title="Sync Status">
            {getSyncIcon()}

            <span
              className={`text-sm font-medium ${!isOnline || syncStatus === "error" ? "text-red-500" : ""}`}
            >
              {!isOnline || syncStatus === "error"
                ? "Offline"
                : syncStatus === "syncing"
                  ? "Syncing..."
                  : "Online"}
            </span>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.theme === nextProps.theme &&
      prevProps.isOnline === nextProps.isOnline &&
      prevProps.syncStatus === nextProps.syncStatus &&
      (prevProps.lastBill === nextProps.lastBill ||
        JSON.stringify(prevProps.lastBill) ===
          JSON.stringify(nextProps.lastBill))
    );
  },
);

export default PosLastBillBar;
