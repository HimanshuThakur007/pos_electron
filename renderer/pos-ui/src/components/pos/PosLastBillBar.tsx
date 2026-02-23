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
        className={`d-flex align-items-center justify-content-between px-4 py-2 shadow-sm ${
          isDark
            ? "bg-dark text-light border-bottom border-secondary"
            : "bg-white text-dark border-bottom"
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
        <div className="d-flex align-items-center gap-2">
          <div
            className={`d-flex align-items-center justify-content-center rounded-circle ${
              isDark
                ? "bg-secondary bg-opacity-25"
                : "bg-primary bg-opacity-10 text-primary"
            }`}
            style={{ width: "28px", height: "28px" }}
          >
            <MdReceiptLong size={16} />
          </div>
          <span
            className="fw-bold text-uppercase"
            style={{ letterSpacing: "0.5px", fontSize: "0.75rem" }}
          >
            Last Transaction
          </span>
        </div>

        {/* Right: Details */}
        <div className="d-flex align-items-center gap-4">
          <div className="d-flex align-items-center gap-2" title="Bill Number">
            <span
              className={`opacity-75 ${isDark ? "text-secondary" : "text-muted"}`}
            >
              Bill:
            </span>
            <span className="fw-semibold font-monospace">
              {lastBill?.bill_no || "-"}
            </span>
          </div>

          <div
            className={`vr ${isDark ? "bg-secondary" : "bg-dark"} opacity-25`}
          ></div>

          <div className="d-flex align-items-center gap-2" title="Time">
            <span
              className={`opacity-75 ${isDark ? "text-secondary" : "text-muted"}`}
            >
              Time:
            </span>
            <span className="fw-medium">{timeStr}</span>
          </div>

          <div
            className={`vr ${isDark ? "bg-secondary" : "bg-dark"} opacity-25`}
          ></div>

          <div className="d-flex align-items-center gap-2" title="Amount">
            <span
              className={`opacity-75 ${isDark ? "text-secondary" : "text-muted"}`}
            >
              Amt:
            </span>
            <span className="fw-bold text-success">
              ₹{lastBill?.grand_total?.toFixed(2) || "0.00"}
            </span>
          </div>

          <div
            className={`vr ${isDark ? "bg-secondary" : "bg-dark"} opacity-25`}
          ></div>

          <div className="d-flex align-items-center gap-2" title="Quantity">
            <span
              className={`opacity-75 ${isDark ? "text-secondary" : "text-muted"}`}
            >
              Qty:
            </span>
            <span className="fw-medium">{lastBill?.total_qty || 0}</span>
          </div>

          <div
            className={`vr ${isDark ? "bg-secondary" : "bg-dark"} opacity-25`}
          ></div>

          <div className="d-flex align-items-center gap-2" title="Change">
            <span
              className={`opacity-75 ${isDark ? "text-secondary" : "text-muted"}`}
            >
              Change:
            </span>
            <span className="fw-medium">₹{change.toFixed(2)}</span>
          </div>

          <div
            className={`vr ${isDark ? "bg-secondary" : "bg-dark"} opacity-25`}
          ></div>

          <div className="d-flex align-items-center gap-2" title="Sync Status">
            {getSyncIcon()}

            <span
              className={`small fw-medium ${!isOnline || syncStatus === "error" ? "text-danger" : ""}`}
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
