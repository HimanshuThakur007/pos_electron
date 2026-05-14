import React, { useState, useEffect } from "react";
import {
  MdStopCircle,
  MdPointOfSale,
  MdPerson,
  MdInfoOutline,
} from "react-icons/md";
import toast from "react-hot-toast";

interface EndDayModalProps {
  isOpen: boolean;
  userDetails: {
    userName: string;
    branchName: string;
    branchCode: string;
    terminalCode: string;
    userId?: string;
    fyCode?: string;
  };
  activeSession: any;
  pendingTxCount: number;
  onEndDay: (
    closingBalance: number,
    expectedAmount?: number,
    difference?: number,
    notes?: string,
  ) => Promise<void>;
  onClose: () => void;
  forceEndDay?: boolean;
}

const CurrentTimeDisplay = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="text-slate-200 text-xs text-right">
      <div className="font-medium">{dayAndDate}</div>
      <div className="font-mono mt-0.5">{timeString}</div>
    </div>
  );
};

export default function EndDayModal({
  isOpen,
  pendingTxCount,
  userDetails,
  activeSession,
  onEndDay,
  onClose,
  forceEndDay,
}: EndDayModalProps) {
  const [closingBalance, setClosingBalance] = useState<string>("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closingNotes, setClosingNotes] = useState(
    "Cash verified and closed successfully",
  );
  const [sessionTotals, setSessionTotals] = useState({
    cash: 0,
    card: 0,
    upi: 0,
  });
  const [isFetchingTotals, setIsFetchingTotals] = useState(false);

  useEffect(() => {
    if (isOpen && activeSession) {
      setClosingBalance("0");
      setSessionTotals({ cash: 0, card: 0, upi: 0 });

      const fetchTotals = async () => {
        setIsFetchingTotals(true);
        try {
          const posApi = (window as any).posApi;
          if (posApi && posApi.getTransactions) {
            // Fetch all transactions for the current branch and terminal for today
            const txns = await posApi.getTransactions({
              branch_code: userDetails.branchCode,
              terminal_code: userDetails.terminalCode,
              fy_code: userDetails.fyCode,
            });
            let cashTotal = 0;
            let cardTotal = 0;
            let upiTotal = 0;

            let openTimeStr =
              activeSession.raw_opened_at ||
              activeSession.opened_at ||
              activeSession.created_at;
            let openDate = new Date();
            if (openTimeStr) {
              if (typeof openTimeStr === "number") {
                openDate = new Date(openTimeStr);
              } else if (typeof openTimeStr === "string") {
                const ddMatch = openTimeStr.match(/^(\d{2})-(\d{2})-(\d{4})/);
                console.log("openTimeStr:", openTimeStr, "ddMatch:", ddMatch);
                if (ddMatch) {
                  openDate = new Date(
                    Number(ddMatch[3]),
                    Number(ddMatch[2]) - 1,
                    Number(ddMatch[1]),
                  );
                } else {
                  let str = openTimeStr;
                  if (str.includes(" ") && !str.includes("T")) {
                    str = str.replace(" ", "T") + "Z";
                  }
                  const d = new Date(str);
                  if (!isNaN(d.getTime())) openDate = d;
                }
              }
            }

            // Set time to the start of the local day to include all transactions for today
            openDate.setHours(0, 0, 0, 0);
            const openTime = openDate.getTime();

            for (const tx of txns || []) {
              let txTime = 0;
              const rawTxTime = tx.time || tx.created_at;
              if (rawTxTime) {
                if (typeof rawTxTime === "number") {
                  txTime = rawTxTime;
                } else if (typeof rawTxTime === "string") {
                  let str = rawTxTime;
                  if (str.includes(" ") && !str.includes("T")) {
                    str = str.replace(" ", "T") + "Z";
                  }
                  const d = new Date(str);
                  if (!isNaN(d.getTime())) txTime = d.getTime();
                } else if (rawTxTime instanceof Date) {
                  txTime = rawTxTime.getTime();
                }
              }

              if (txTime >= openTime) {
                let paymentsArr = [];
                if (typeof tx.payments === "string") {
                  try {
                    paymentsArr = JSON.parse(tx.payments);
                  } catch (e) {}
                } else if (Array.isArray(tx.payments)) {
                  paymentsArr = tx.payments;
                }

                if (paymentsArr && paymentsArr.length > 0) {
                  paymentsArr.forEach((p: any) => {
                    const pMode = (p.mode || "").toLowerCase();
                    if (pMode === "cash") cashTotal += Number(p.amount || 0);
                    else if (pMode === "card")
                      cardTotal += Number(p.amount || 0);
                    else if (pMode === "upi") upiTotal += Number(p.amount || 0);
                  });
                } else {
                  const mode = (tx.payment_mode || "cash").toLowerCase();
                  if (mode === "cash") cashTotal += Number(tx.grand_total || 0);
                  else if (mode === "card")
                    cardTotal += Number(tx.grand_total || 0);
                  else if (mode === "upi")
                    upiTotal += Number(tx.grand_total || 0);
                }
              }
            }
            setSessionTotals({
              cash: cashTotal,
              card: cardTotal,
              upi: upiTotal,
            });
          }
        } catch (e) {
          console.error("Failed to calculate session totals", e);
        } finally {
          setIsFetchingTotals(false);
        }
      };

      fetchTotals();
    }
  }, [
    isOpen,
    activeSession?.id,
    activeSession?.raw_opened_at,
    activeSession?.opened_at,
    activeSession?.created_at,
    userDetails.branchCode,
    userDetails.terminalCode,
    userDetails.userId,
    userDetails.fyCode,
  ]);

  if (!isOpen) return null;
  // console.log("Active session in EndDayModal:", activeSession);

  const expectedAmount = activeSession
    ? Number(activeSession.opening_amount || 0) + sessionTotals.cash
    : 0;
  const currentClosing = parseFloat(closingBalance) || 0;
  const currentDifference = currentClosing - expectedAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pendingTxCount > 0) {
      toast.error(
        "Please sync all pending transactions before ending the day.",
      );
      return;
    }

    setIsSubmitting(true);

    await onEndDay(
      currentClosing,
      expectedAmount,
      currentDifference,
      closingNotes,
    );
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <MdPointOfSale size={20} className="text-amber-400" />
            <h5 className="text-lg font-bold tracking-tight text-white">
              End Day
            </h5>
          </div>
          <CurrentTimeDisplay />
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="p-4 space-y-3 overflow-y-auto max-h-[85vh] custom-scrollbar"
        >
          {/* Info Message */}
          {forceEndDay ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 shadow-sm">
              <MdInfoOutline size={16} className="shrink-0 text-rose-600" />
              <p className="text-center m-0 leading-tight">
                Previous session not closed. You must end the day.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 shadow-sm">
              <MdInfoOutline size={16} className="shrink-0 text-amber-600" />
              <p className="text-center m-0 leading-tight">
                Please count your drawer and end your day.
              </p>
            </div>
          )}

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

          {pendingTxCount > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 shadow-sm">
              <MdInfoOutline size={16} className="shrink-0 text-red-600" />
              <p>
                You have{" "}
                <span className="font-bold">{pendingTxCount} pending</span>{" "}
                transactions. Sync them before ending the day.
              </p>
            </div>
          )}

          {activeSession && (
            <div className="bg-slate-50 rounded-lg border border-slate-200 flex flex-col shadow-sm">
              <div className="p-3 pb-2 flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Opening Balance
                </span>
                <span className="text-sm font-bold text-slate-800">
                  ₹{Number(activeSession.opening_amount).toFixed(2)}
                </span>
              </div>
              <div className="px-3 pb-3 grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Cash Tx
                  </div>
                  <div className="text-sm font-bold text-emerald-600">
                    {isFetchingTotals
                      ? "..."
                      : `₹${sessionTotals.cash.toFixed(2)}`}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Card Tx
                  </div>
                  <div className="text-sm font-bold text-blue-600">
                    {isFetchingTotals
                      ? "..."
                      : `₹${sessionTotals.card.toFixed(2)}`}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    UPI Tx
                  </div>
                  <div className="text-sm font-bold text-purple-600">
                    {isFetchingTotals
                      ? "..."
                      : `₹${sessionTotals.upi.toFixed(2)}`}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center px-3 py-2.5 border-t border-slate-200 bg-slate-200/50 rounded-b-lg">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  Expected Cash
                </span>
                <span className="text-base font-bold text-slate-900">
                  {isFetchingTotals ? "..." : `₹${expectedAmount.toFixed(2)}`}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Closing Balance (₹)
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
                className="block w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-amber-500 text-lg font-bold text-slate-800 text-right"
                placeholder="0.00"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </div>

            {activeSession && closingBalance !== "" && !isFetchingTotals && (
              <div className="flex justify-between items-center pt-1.5 px-1 mt-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Difference
                </span>
                <span
                  className={`text-sm font-bold ${currentDifference < 0 ? "text-red-600" : currentDifference > 0 ? "text-emerald-600" : "text-slate-500"}`}
                >
                  {currentDifference > 0
                    ? "+ ₹"
                    : currentDifference < 0
                      ? "- ₹"
                      : "₹"}
                  {Math.abs(currentDifference).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="pt-0.5">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              rows={1}
              className="block w-full px-3 py-2 bg-white border border-slate-300 rounded focus:outline-none focus:border-amber-500 text-sm font-medium text-slate-800 shadow-sm resize-none"
              placeholder="Enter any notes or observations here..."
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
            ></textarea>
          </div>

          <div className="flex gap-2 pt-1.5">
            {(!forceEndDay || pendingTxCount > 0) && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="w-1/3 py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm rounded-lg shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {forceEndDay ? "Close" : "Cancel"}
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || pendingTxCount > 0}
              className={`${forceEndDay ? "w-full" : "w-2/3"} flex items-center justify-center gap-2 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-lg shadow-sm disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <MdStopCircle size={18} />
                  <span>End Day</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
