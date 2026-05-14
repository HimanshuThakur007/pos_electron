import React, { useMemo } from "react";
import { MdRestore } from "react-icons/md";
import BaseModal from "../common/BaseModal";
import { useTableNavigation } from "../../hooks/useTableNavigation";
import { Td, Kbd, ActionButton } from "../common/TableHelpers";

interface HoldSalesModalProps {
  show: boolean;
  onClose: () => void;
  heldSales: any[];
  onResume: (sale: any) => void;
  theme: "light" | "dark";
}

interface HoldSaleRowProps {
  sale: any;
  index: number;
  isSelected: boolean;
  theme: "light" | "dark";
  onSelect: (index: number) => void;
  onResume: (sale: any) => void;
}

const HoldSaleRow = React.memo(
  ({
    sale,
    index,
    isSelected,
    theme,
    onSelect,
    onResume,
  }: HoldSaleRowProps) => {
    const isDark = theme === "dark";

    return (
      <tr
        id={`held-sale-row-${index}`}
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
        onDoubleClick={() => onResume(sale)}
      >
        {[
          { content: `#${sale.id}` },
          { content: new Date(sale.created_at).toLocaleString() },
          { content: sale.customer_name },
          { content: sale.note || "-" },
          { content: sale.total_qty, className: "text-right" },
          {
            content: `₹${sale.grand_total.toFixed(2)}`,
            className: "text-right font-bold",
          },
        ].map((cell, i) => (
          <Td key={i} className={cell.className}>
            {cell.content as React.ReactNode}
          </Td>
        ))}
        <Td className="text-center">
          <ActionButton
            isSelected={isSelected}
            isDark={isDark}
            onClick={(e) => {
              e.stopPropagation();
              onResume(sale);
            }}
          >
            <MdRestore /> Resume
          </ActionButton>
        </Td>
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
  const isDark = theme === "dark";

  const { selectedIndex, setSelectedIndex } = useTableNavigation(
    heldSales,
    onResume,
    onClose,
    show,
    "held-sale-row",
  );

  const footer = useMemo(
    () => (
      <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        <Kbd>↑</Kbd> <Kbd>↓</Kbd> Navigate &nbsp;
        <Kbd>Enter</Kbd> Resume &nbsp;
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
      title="Hold Sales"
      subTitle="Select a sale to resume (Enter)"
      theme={theme}
      footer={footer}
    >
      {heldSales.length === 0 ? (
        <div
          className={`text-center py-10 ${isDark ? "text-gray-500" : "text-gray-400"}`}
        >
          <p className="mb-0">No held sales found.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
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
              {heldSales.map((sale, index) => (
                <HoldSaleRow
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
