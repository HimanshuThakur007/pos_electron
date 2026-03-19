import React from "react";
import { X } from "lucide-react";

interface TransactionsModalProps {
  show: boolean;
  onClose: () => void;
  transactions: any[];
  theme: "light" | "dark";
  onSync?: (transaction: any) => void;
}

const TransactionsModal: React.FC<TransactionsModalProps> = ({
  show,
  onClose,
  transactions,
  theme,
  onSync,
}) => {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[1060] flex items-center justify-center bg-black/50 backdrop-blur-sm"
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
            Transaction History
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

        <div className="flex-1 overflow-auto p-0">
          <table
            className={`w-full mb-0 ${theme === "dark" ? "text-gray-300" : ""}`}
          >
            <thead
              className={`sticky top-0 z-10 ${theme === "dark" ? "bg-slate-900" : "bg-white"}`}
            >
              <tr>
                {[
                  { label: "Bill No", align: "left" },
                  { label: "Date", align: "left" },
                  { label: "Time", align: "left" },
                  { label: "Customer", align: "left" },
                  { label: "Items", align: "left" },
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
                  <td className="px-4 py-3 font-mono text-sm">{tx.bill_no}</td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm">{tx.time}</td>
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
                            className={`px-2 py-0.5 text-xs rounded border transition-colors ${theme === "dark" ? "border-slate-600 hover:bg-slate-800" : "border-blue-200 text-blue-600 hover:bg-blue-50"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSync(tx);
                            }}
                          >
                            Sync
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

        {/* <div
          className={`px-6 py-4 border-t flex justify-end ${theme === "dark" ? "border-slate-700 bg-slate-800/50" : "border-slate-100 bg-slate-50"}`}
        >
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${theme === "dark" ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
            onClick={onClose}
          >
            Close
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default TransactionsModal;
