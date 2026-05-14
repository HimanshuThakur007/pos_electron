import React, { useMemo } from "react";
import BaseModal from "../common/BaseModal";
import { useTableNavigation } from "../../hooks/useTableNavigation";
import { Td, Kbd, ActionButton } from "../common/TableHelpers";

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
    const isDark = theme === "dark";

    return (
      <tr
        id={`reprint-row-${index}`}
        className={`border-b last:border-0 transition-colors cursor-pointer ${
          isDark ? "border-slate-700" : "border-slate-200"
        } ${
          isSelected
            ? isDark
              ? "bg-slate-700"
              : "bg-blue-50"
            : isDark
              ? "hover:bg-slate-800/50"
              : "hover:bg-gray-50"
        }`}
        onClick={() => onSelect(index)}
        onDoubleClick={() => onPrint(tx)}
      >
        <Td className="font-mono text-sm">{tx.bill_no}</Td>
        <Td className="text-sm">
          {new Date(tx.created_at).toLocaleDateString()}{" "}
          {new Date(tx.created_at).toLocaleTimeString()}
        </Td>
        <Td className="text-sm">{tx.customer_name || "Walk-in"}</Td>
        <Td className="text-right font-bold text-sm">
          {tx.grand_total.toFixed(2)}
        </Td>
        <Td className="text-center">
          <ActionButton
            isSelected={isSelected}
            isDark={isDark}
            onClick={(e) => {
              e.stopPropagation();
              onPrint(tx);
            }}
          >
            Print
          </ActionButton>
        </Td>
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
  const isDark = theme === "dark";

  const { selectedIndex, setSelectedIndex } = useTableNavigation(
    transactions,
    onPrint,
    onClose,
    show,
    "reprint-row",
  );

  const footer = useMemo(
    () => (
      <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        <Kbd>↑</Kbd> <Kbd>↓</Kbd> Navigate &nbsp;
        <Kbd>Enter</Kbd> Print &nbsp;
        <Kbd>Esc</Kbd> Close
      </div>
    ),
    [isDark],
  );

  const thClass = isDark
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
          className={`text-center py-10 ${isDark ? "text-gray-500" : "text-gray-400"}`}
        >
          <p className="mb-0">No bills found.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto" style={{ maxHeight: "60vh" }}>
          <table
            className={`w-full text-sm text-left ${isDark ? "text-gray-300" : "text-gray-600"}`}
          >
            <thead className={`sticky top-0 z-10 uppercase text-xs ${thClass}`}>
              <tr>
                {COLUMNS.map((col, index) => (
                  <th
                    key={index}
                    className={`px-4 py-3 font-semibold border-b ${isDark ? "border-slate-700" : "border-slate-200"} ${col.className || ""}`}
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
