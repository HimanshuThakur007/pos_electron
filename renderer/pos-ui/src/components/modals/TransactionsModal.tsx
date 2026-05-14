import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  CheckSquare,
  TrendingUp,
  Users,
  Briefcase,
  Store,
  Receipt,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";

interface TransactionsModalProps {
  show: boolean;
  onClose: () => void;
  transactions: any[];
  theme: "light" | "dark";
  onSync?: (transaction: any) => Promise<boolean>;
  onRefresh?: () => void;
  mode?: string;
}

const TransactionsModal: React.FC<TransactionsModalProps> = ({
  show,
  onClose,
  transactions,
  theme,
  onSync,
  onRefresh,
  mode,
}) => {
  const [selectedIds, setSelectedIds] = useState(new Set<number>());
  const [syncingIds, setSyncingIds] = useState<Set<number>>(new Set());
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);

  const stats = useMemo(() => {
    let b2b = 0;
    let b2c = 0;
    let b2bCount = 0;
    let b2cCount = 0;
    let totalQty = 0;
    const byBranch: Record<string, { amount: number; count: number }> = {};

    transactions.forEach((tx) => {
      const amount = tx.grand_total || 0;
      totalQty += tx.total_qty || 0;

      // Determine B2B by the presence of a customer GSTIN
      if (tx.customer_gstin && tx.customer_gstin.trim() !== "") {
        b2b += amount;
        b2bCount += 1;
      } else {
        b2c += amount;
        b2cCount += 1;
      }

      const branch =
        tx.branch_code || localStorage.getItem("branch_code") || "Main";
      if (!byBranch[branch]) byBranch[branch] = { amount: 0, count: 0 };
      byBranch[branch].amount += amount;
      byBranch[branch].count += 1;
    });

    return {
      b2b,
      b2c,
      b2bCount,
      b2cCount,
      byBranch,
      total: b2b + b2c,
      txCount: transactions.length,
      totalQty,
    };
  }, [transactions]);

  useEffect(() => {
    if (!show) {
      setSelectedIds(new Set()); // Reset selection when modal is closed/hidden
    }
  }, [show]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(transactions.map((tx) => tx.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (txId: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(txId)) newSet.delete(txId);
    else newSet.add(txId);
    setSelectedIds(newSet);
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[1060] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={`rounded-xl shadow-2xl flex flex-col w-[90%] max-w-[1000px] max-h-[85vh] ${theme === "dark" ? "bg-slate-900 text-white" : "bg-white text-slate-900"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex justify-between items-center px-6 py-4 border-b ${theme === "dark" ? "border-slate-700" : "border-slate-100"}`}
        >
          <h3 className="text-lg font-bold leading-tight">
            {mode === "today"
              ? "Today's Sales Dashboard"
              : "Transaction History"}
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === "dark"
                ? "hover:bg-slate-800 text-slate-400 hover:text-white"
                : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {mode === "today" && (
          <div
            className={`flex-1 overflow-auto p-6 ${theme === "dark" ? "bg-slate-900" : "bg-slate-50"}`}
          >
            {transactions.length === 0 ? (
              <div
                className={`text-center py-12 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}
              >
                No sales found today.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Sales Card */}
                <div
                  className={`p-6 rounded-2xl shadow-sm border relative overflow-hidden flex flex-col justify-between ${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
                >
                  <TrendingUp
                    size={120}
                    className={`absolute -right-6 -bottom-6 opacity-5 ${theme === "dark" ? "text-emerald-300" : "text-emerald-500"}`}
                  />
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`p-2.5 rounded-xl ${theme === "dark" ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600"}`}
                      >
                        <TrendingUp size={22} />
                      </div>
                      <p
                        className={`text-sm uppercase font-bold tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                      >
                        Total Sales
                      </p>
                    </div>
                    <p
                      className={`text-3xl font-bold mb-4 relative z-10 ${theme === "dark" ? "text-white" : "text-slate-800"}`}
                    >
                      ₹
                      {stats.total.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div
                    className={`flex items-center gap-4 text-sm font-medium relative z-10 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Receipt size={16} /> {stats.txCount} Bills
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Package size={16} /> {stats.totalQty} Items
                    </span>
                  </div>
                </div>

                {/* B2C Sales Card */}
                <div
                  className={`p-6 rounded-2xl shadow-sm border relative overflow-hidden flex flex-col justify-between ${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
                >
                  <Users
                    size={120}
                    className={`absolute -right-6 -bottom-6 opacity-5 ${theme === "dark" ? "text-blue-300" : "text-blue-500"}`}
                  />
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`p-2.5 rounded-xl ${theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"}`}
                      >
                        <Users size={22} />
                      </div>
                      <p
                        className={`text-sm uppercase font-bold tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                      >
                        B2C Sales
                      </p>
                    </div>
                    <p
                      className={`text-3xl font-bold mb-4 relative z-10 ${theme === "dark" ? "text-white" : "text-slate-800"}`}
                    >
                      ₹
                      {stats.b2c.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div
                    className={`flex items-center gap-4 text-sm font-medium relative z-10 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Receipt size={16} /> {stats.b2cCount} Bills
                    </span>
                  </div>
                </div>

                {/* B2B Sales Card */}
                <div
                  className={`p-6 rounded-2xl shadow-sm border relative overflow-hidden flex flex-col justify-between ${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
                >
                  <Briefcase
                    size={120}
                    className={`absolute -right-6 -bottom-6 opacity-5 ${theme === "dark" ? "text-purple-300" : "text-purple-500"}`}
                  />
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`p-2.5 rounded-xl ${theme === "dark" ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"}`}
                      >
                        <Briefcase size={22} />
                      </div>
                      <p
                        className={`text-sm uppercase font-bold tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                      >
                        B2B Sales
                      </p>
                    </div>
                    <p
                      className={`text-3xl font-bold mb-4 relative z-10 ${theme === "dark" ? "text-white" : "text-slate-800"}`}
                    >
                      ₹
                      {stats.b2b.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div
                    className={`flex items-center gap-4 text-sm font-medium relative z-10 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Receipt size={16} /> {stats.b2bCount} Bills
                    </span>
                  </div>
                </div>

                {/* Branch-wise Card */}
                <div
                  className={`p-6 rounded-2xl shadow-sm border flex flex-col relative overflow-hidden ${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
                >
                  <Store
                    size={120}
                    className={`absolute -right-6 -bottom-6 opacity-5 pointer-events-none ${theme === "dark" ? "text-amber-300" : "text-amber-500"}`}
                  />
                  <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div
                      className={`p-2.5 rounded-xl ${theme === "dark" ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600"}`}
                    >
                      <Store size={22} />
                    </div>
                    <p
                      className={`text-sm uppercase font-bold tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                    >
                      Branch-wise
                    </p>
                  </div>
                  <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                    {Object.entries(stats.byBranch).map(([branch, data]) => (
                      <div
                        key={branch}
                        className="flex justify-between items-center"
                      >
                        <div>
                          <span
                            className={`block text-sm font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}
                          >
                            {branch}
                          </span>
                          <span
                            className={`block text-xs mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                          >
                            {data.count} {data.count === 1 ? "Bill" : "Bills"}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}
                        >
                          ₹
                          {data.amount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {mode !== "today" && (
          <div className="flex-1 overflow-auto p-0">
            <table
              className={`w-full mb-0 ${theme === "dark" ? "text-gray-300" : ""}`}
            >
              <thead
                className={`sticky top-0 z-10 ${theme === "dark" ? "bg-slate-900" : "bg-white"}`}
              >
                <tr>
                  {[
                    {
                      label: (
                        <input
                          type="checkbox"
                          className="rounded border-slate-400"
                          onChange={handleSelectAll}
                          checked={
                            transactions.length > 0 &&
                            selectedIds.size === transactions.length
                          }
                          disabled={transactions.length === 0}
                        />
                      ),
                      align: "center",
                    },
                    { label: "Bill No", align: "left" },
                    { label: "Date", align: "left" },
                    { label: "Time", align: "left" },
                    { label: "Customer", align: "left" },
                    { label: "Qty", align: "left" },
                    { label: "Amount", align: "right" },
                    { label: "Mode", align: "center" },
                    { label: "Sync", align: "center" },
                  ].map((col, idx) => (
                    <th
                      key={idx}
                      className={`px-4 py-3 text-${col.align} font-bold text-sm border-b ${theme === "dark" ? "border-slate-700 text-gray-400" : "border-slate-100 text-gray-500"}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`border-b last:border-0 ${theme === "dark" ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-50 hover:bg-slate-50"}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-400"
                        checked={selectedIds.has(tx.id)}
                        onChange={() => handleSelectOne(tx.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {tx.bill_no}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(tx.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {tx.time &&
                      (tx.time.includes("T") || tx.time.includes("-"))
                        ? new Date(tx.time)
                            .toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: true,
                            })
                            .toUpperCase()
                        : tx.time}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {tx.customer_name || "Walk-in"}
                    </td>
                    <td className="px-4 py-3 text-sm">{tx.total_qty}</td>
                    <td className="px-4 py-3 text-right font-bold text-sm">
                      ₹{tx.grand_total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {tx.payment_mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tx.sync_status === 1 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Synced
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          {tx.sync_status === -1 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                          {onSync && (
                            <button
                              disabled={syncingIds.has(tx.id) || isBulkSyncing}
                              className={`px-2 py-0.5 text-xs rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${theme === "dark" ? "border-slate-600 hover:bg-slate-800" : "border-blue-200 text-blue-600 hover:bg-blue-50"}`}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setSyncingIds((prev) =>
                                  new Set(prev).add(tx.id),
                                );
                                try {
                                  const success = await onSync(tx);
                                  if (success) {
                                    toast.success(
                                      `Transaction ${tx.bill_no} synced!`,
                                    );
                                    onRefresh?.();
                                  }
                                } finally {
                                  setSyncingIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(tx.id);
                                    return next;
                                  });
                                }
                              }}
                            >
                              {syncingIds.has(tx.id) ? "..." : "Sync"}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className={`text-center py-8 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}
                    >
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div
          className={`px-6 py-4 border-t flex justify-between items-center ${theme === "dark" ? "border-slate-700 bg-slate-800/50" : "border-slate-100 bg-slate-50"}`}
        >
          <div>
            {selectedIds.size > 0 && onSync && (
              <button
                disabled={isBulkSyncing}
                className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={async () => {
                  setIsBulkSyncing(true);
                  try {
                    const allWereSelected =
                      transactions.length > 0 &&
                      selectedIds.size === transactions.length;
                    const selectedTxs = transactions.filter((tx) =>
                      selectedIds.has(tx.id),
                    );
                    const results = await Promise.allSettled(
                      selectedTxs.map((tx) => onSync(tx)),
                    );

                    const successCount = results.filter(
                      (r) => r.status === "fulfilled" && r.value === true,
                    ).length;
                    const failureCount = results.length - successCount;

                    if (successCount > 0) {
                      toast.success(
                        `${successCount} transaction(s) synced successfully!`,
                        { id: "bulk-sync-success" },
                      );
                      onRefresh?.();
                    }
                    if (failureCount > 0) {
                      toast.error(
                        `${failureCount} transaction(s) failed to sync.`,
                        { id: "bulk-sync-error" },
                      );
                    }

                    if (allWereSelected && failureCount === 0) {
                      onClose();
                    }
                    setSelectedIds(new Set());
                  } finally {
                    setIsBulkSyncing(false);
                  }
                }}
              >
                <CheckSquare size={16} />
                {isBulkSyncing
                  ? "Syncing..."
                  : `Sync ${selectedIds.size} Selected`}
              </button>
            )}
          </div>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${theme === "dark" ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionsModal;
