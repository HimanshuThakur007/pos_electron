import React, { useState, useEffect } from "react";
import {
  MdPlayCircleFilled,
  MdPointOfSale,
  MdPerson,
  MdInfoOutline,
} from "react-icons/md";

interface StartDayModalProps {
  isOpen: boolean;
  userDetails: {
    userName: string;
    branchName: string;
    branchCode: string;
    terminalCode: string;
  };
  onStartDay: (openingBalance: number) => Promise<void>;
  previousDayClosing?: number | null;
  previousDayDifference?: number | null;
}

export default function StartDayModal({
  isOpen,
  userDetails,
  onStartDay,
  previousDayClosing,
  previousDayDifference,
}: StartDayModalProps) {
  const [openingBalance, setOpeningBalance] = useState<string>("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      // When modal opens, set opening balance to previous closing if available
      setOpeningBalance(previousDayClosing?.toString() || "0");
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen, previousDayClosing]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onStartDay(parseFloat(openingBalance) || 0);
    setIsSubmitting(false);
  };

  const dayAndDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeString = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <MdPointOfSale size={20} className="text-blue-400" />
            <h5
              className="text-lg font-bold tracking-tight text-slate-200"
              style={{ color: "white" }}
            >
              Start Day
            </h5>
          </div>
          <div className="text-slate-200 text-xs text-right">
            <div className="font-medium">{dayAndDate}</div>
            <div className="font-mono mt-0.5">{timeString}</div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 shadow-sm">
            <MdInfoOutline size={16} className="shrink-0 text-blue-600" />
            <p className="text-center m-0 leading-tight">
              Please start your day before proceeding.
            </p>
          </div>

          {/* Compact Info Section */}
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-200/70 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold border border-slate-300/50 shrink-0">
              <MdPerson size={14} className="text-slate-500" />
              {userDetails.userName || "N/A"}
            </div>
            <div className="text-[10px] text-slate-500 font-medium truncate">
              {userDetails.branchName || "N/A"} -{" "}
              {userDetails.branchCode || "N/A"}
            </div>
          </div>

          {previousDayClosing !== null &&
            typeof previousDayClosing !== "undefined" && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Previous Closing Balance
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    ₹{previousDayClosing.toFixed(2)}
                  </span>
                </div>
                {previousDayDifference !== null &&
                  typeof previousDayDifference !== "undefined" && (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {previousDayDifference < 0
                          ? "Last Session Shortage"
                          : previousDayDifference > 0
                            ? "Last Session Excess"
                            : "Last Session Diff"}
                      </span>
                      <span
                        className={`text-sm font-bold ${previousDayDifference < 0 ? "text-red-600" : previousDayDifference > 0 ? "text-emerald-600" : "text-slate-500"}`}
                      >
                        ₹{Math.abs(previousDayDifference).toFixed(2)}
                      </span>
                    </div>
                  )}
              </div>
            )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Opening Balance (₹)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-500 font-bold text-base">₹</span>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                autoFocus
                className="block w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-lg font-bold text-slate-800 text-right shadow-sm"
                placeholder="0.00"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <MdPlayCircleFilled size={18} />
                <span>Start Day</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
