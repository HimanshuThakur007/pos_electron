import React, { useMemo } from "react";
import { MdRestore } from "react-icons/md";
import BaseModal from "../common/BaseModal";
import { useTableNavigation } from "../../hooks/useTableNavigation";

interface HoldSalesModalProps {
  show: boolean;
  onClose: () => void;
  heldSales: any[];
  onResume: (sale: any) => void;
  theme: "light" | "dark";
}

interface HeldSaleRowProps {
  sale: any;
  index: number;
  isSelected: boolean;
  theme: "light" | "dark";
  onSelect: (index: number) => void;
  onResume: (sale: any) => void;
}

const HeldSaleRow = React.memo(
  ({
    sale,
    index,
    isSelected,
    theme,
    onSelect,
    onResume,
  }: HeldSaleRowProps) => {
    return (
      <tr
        id={`held-sale-row-${index}`}
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
        onDoubleClick={() => onResume(sale)}
      >
        <td className="px-4 py-3">#{sale.id}</td>
        <td className="px-4 py-3">
          {new Date(sale.created_at).toLocaleString()}
        </td>
        <td className="px-4 py-3">{sale.customer_name}</td>
        <td className="px-4 py-3">{sale.note || "-"}</td>
        <td className="px-4 py-3 text-right">{sale.total_qty}</td>
        <td className="px-4 py-3 text-right font-bold">
          ₹{sale.grand_total.toFixed(2)}
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
              onResume(sale);
            }}
          >
            <MdRestore /> Resume
          </button>
        </td>
      </tr>
    );
  },
);

const COLUMNS = [
  { label: "ID" },
  { label: "Date" },
  { label: "Customer" },
  { label: "Note" },
  { label: "Items", className: "text-end" },
  { label: "Total", className: "text-end" },
  { label: "Action", className: "text-center" },
];

const HoldSalesModal: React.FC<HoldSalesModalProps> = ({
  show,
  onClose,
  heldSales,
  onResume,
  theme,
}) => {
  const { selectedIndex, setSelectedIndex } = useTableNavigation(
    heldSales,
    onResume,
    onClose,
    show,
    "held-sale-row",
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
        Resume &nbsp;
        <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-200 rounded-lg text-gray-800">
          Esc
        </kbd>{" "}
        Close
      </div>
    ),
    [onClose, theme],
  );

  const thClass =
    theme === "dark"
      ? "bg-slate-900 text-gray-400 border-slate-700"
      : "bg-gray-50 text-gray-700 border-slate-200";

  return (
    <BaseModal
      show={show}
      onClose={onClose}
      title="Hold Sales"
      subTitle="Select a sale to resume (Enter)"
      theme={theme}
      footer={footer}
    >
      {heldSales.length === 0 ? (
        <div
          className={`text-center py-10 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
        >
          <p className="mb-0">No held sales found.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
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
              {heldSales.map((sale, index) => (
                <HeldSaleRow
                  key={sale.id}
                  sale={sale}
                  index={index}
                  isSelected={index === selectedIndex}
                  theme={theme}
                  onSelect={setSelectedIndex}
                  onResume={onResume}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BaseModal>
  );
};

export default HoldSalesModal;
