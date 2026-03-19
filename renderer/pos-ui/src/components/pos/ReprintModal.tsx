import React, { useMemo } from "react";
import BaseModal from "../common/BaseModal";
import { useTableNavigation } from "../../hooks/useTableNavigation";

interface ReprintModalProps {
  show: boolean;
  onClose: () => void;
  transactions: any[];
  theme: "light" | "dark";
  onPrint: (transaction: any) => void;
}

interface ReprintRowProps {
  tx: any;
  index: number;
  isSelected: boolean;
  theme: "light" | "dark";
  onSelect: (index: number) => void;
  onPrint: (transaction: any) => void;
}

const ReprintRow = React.memo(
  ({ tx, index, isSelected, theme, onSelect, onPrint }: ReprintRowProps) => {
    return (
      <tr
        id={`reprint-row-${index}`}
        className={`border-b last:border-0 transition-colors cursor-pointer ${
          theme === "dark" ? "border-slate-700" : "border-slate-200"
        } ${
          isSelected
            ? theme === "dark"
              ? "bg-slate-700"
              : "bg-blue-50"
            : theme === "dark"
              ? "hover:bg-slate-800/50"
              : "hover:bg-gray-50"
        }`}
        onClick={() => onSelect(index)}
        onDoubleClick={() => onPrint(tx)}
      >
        <td className="px-4 py-3 font-mono text-sm">{tx.bill_no}</td>
        <td className="px-4 py-3 text-sm">
          {new Date(tx.created_at).toLocaleDateString()}{" "}
          {new Date(tx.created_at).toLocaleTimeString()}
        </td>
        <td className="px-4 py-3 text-sm">{tx.customer_name || "Walk-in"}</td>
        <td className="px-4 py-3 text-right font-bold text-sm">
          {tx.grand_total.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-center">
          <button
            className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-colors border ${
              isSelected
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : theme === "dark"
                  ? "border-blue-400 text-blue-400 hover:bg-blue-400/10"
                  : "border-blue-600 text-blue-600 hover:bg-blue-50"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onPrint(tx);
            }}
          >
            Print
          </button>
        </td>
      </tr>
    );
  },
);

const COLUMNS = [
  { label: "Bill No" },
  { label: "Date" },
  { label: "Customer" },
  { label: "Amount", className: "text-end" },
  { label: "Action", className: "text-center" },
];

const ReprintModal: React.FC<ReprintModalProps> = ({
  show,
  onClose,
  transactions,
  theme,
  onPrint,
}) => {
  const { selectedIndex, setSelectedIndex } = useTableNavigation(
    transactions,
    onPrint,
    onClose,
    show,
    "reprint-row",
  );

  const footer = useMemo(
    () => (
      <div
        className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
      >
        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-200 rounded-lg text-gray-800">
          ↑
        </kbd>{" "}
        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-200 rounded-lg text-gray-800">
          ↓
        </kbd>{" "}
        Navigate &nbsp;
        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-200 rounded-lg text-gray-800">
          Enter
        </kbd>{" "}
        Print &nbsp;
        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-200 rounded-lg text-gray-800">
          Esc
        </kbd>{" "}
        Close
      </div>
    ),
    [theme],
  );

  const thClass =
    theme === "dark"
      ? "bg-slate-900 text-gray-400 border-slate-700"
      : "bg-gray-50 text-gray-700 border-slate-200";

  return (
    <BaseModal
      show={show}
      onClose={onClose}
      title="Reprint Last 5 Bills"
      subTitle="Select a bill to reprint (Enter)"
      theme={theme}
      footer={footer}
    >
      {transactions.length === 0 ? (
        <div
          className={`text-center py-10 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
        >
          <p className="mb-0">No bills found.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto" style={{ maxHeight: "60vh" }}>
          <table
            className={`w-full text-sm text-left ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
          >
            <thead className={`sticky top-0 z-10 uppercase text-xs ${thClass}`}>
              <tr>
                {COLUMNS.map((col, index) => (
                  <th
                    key={index}
                    className={`px-4 py-3 font-semibold border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"} ${col.className || ""}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, index) => (
                <ReprintRow
                  key={tx.id}
                  tx={tx}
                  index={index}
                  isSelected={index === selectedIndex}
                  theme={theme}
                  onSelect={setSelectedIndex}
                  onPrint={onPrint}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BaseModal>
  );
};

export default ReprintModal;
