import React from "react";

interface TransactionsModalProps {
  show: boolean;
  onClose: () => void;
  transactions: any[];
  theme: "light" | "dark";
}

const TransactionsModal: React.FC<TransactionsModalProps> = ({
  show,
  onClose,
  transactions,
  theme,
}) => {
  if (!show) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ zIndex: 1060, backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className={`bg-${theme === "dark" ? "dark text-light" : "white"} rounded-3 shadow-lg`}
        style={{
          width: "90%",
          maxWidth: "1000px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
          <h5 className="mb-0 fw-bold">Transaction History</h5>
          <button
            className={`btn-close ${theme === "dark" ? "btn-close-white" : ""}`}
            onClick={onClose}
          ></button>
        </div>

        <div className="flex-grow-1 overflow-auto p-0">
          <table
            className={`table table-hover mb-0 ${theme === "dark" ? "table-dark" : ""}`}
          >
            <thead className="sticky-top bg-body">
              <tr>
                <th>Bill No</th>
                <th>Date</th>
                <th>Time</th>
                <th>Customer</th>
                <th>Items</th>
                <th className="text-end">Amount</th>
                <th className="text-center">Mode</th>
                <th className="text-center">Sync</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="font-monospace">{tx.bill_no}</td>
                  <td>{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td>{tx.time}</td>
                  <td>{tx.customer_name || "Walk-in"}</td>
                  <td>{tx.total_qty}</td>
                  <td className="text-end fw-bold">
                    ₹{tx.grand_total.toFixed(2)}
                  </td>
                  <td className="text-center">
                    <span className="badge bg-secondary">
                      {tx.payment_mode}
                    </span>
                  </td>
                  <td className="text-center">
                    {tx.sync_status === 1 ? (
                      <span className="badge bg-success">Synced</span>
                    ) : tx.sync_status === -1 ? (
                      <span className="badge bg-danger">Failed</span>
                    ) : (
                      <span className="badge bg-warning text-dark">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-top text-end">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionsModal;
