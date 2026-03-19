import React, { useMemo } from "react";
import BaseModal from "../common/BaseModal";
import { useTableNavigation } from "../../hooks/useTableNavigation";

interface ProductSelectionModalProps {
  show: boolean;
  products: any[];
  theme?: "light" | "dark";
  onClose: () => void;
  onSelect: (item: any) => void;
}

const COLUMNS = [
  { label: "Code", className: "w-[20%]" },
  { label: "Name", className: "w-[50%]" },
  { label: "Stock", className: "text-right w-[15%]" },
  { label: "MRP", className: "text-right w-[15%]" },
];

interface ProductRowProps {
  item: any;
  index: number;
  isSelected: boolean;
  theme: "light" | "dark";
  onSelect: (index: number) => void;
  onConfirm: (item: any) => void;
}

const ProductRow = React.memo(
  ({
    item,
    index,
    isSelected,
    theme,
    onSelect,
    onConfirm,
  }: ProductRowProps) => {
    const isDark = theme === "dark";
    const rowClass = `
      border-b last:border-0 transition-colors cursor-pointer
      ${isDark ? "border-slate-700" : "border-slate-200"}
      ${
        isSelected
          ? isDark
            ? "bg-slate-700"
            : "bg-blue-100"
          : isDark
            ? "hover:bg-slate-800/50"
            : "hover:bg-gray-50"
      }
    `;

    return (
      <tr
        id={`product-row-${index}`}
        className={rowClass}
        onClick={() => onSelect(index)}
        onDoubleClick={() => onConfirm(item)}
      >
        <td className="px-4 py-3">{item.itemCode}</td>
        <td className="px-4 py-3">{item.itemName}</td>
        <td className="px-4 py-3 text-right">{item.Stock_Qty}</td>
        <td className="px-4 py-3 text-right font-bold">₹{item.Lot_MRP}</td>
      </tr>
    );
  },
);

const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
  show,
  products,
  onClose,
  onSelect,
  theme = "light",
}) => {
  const { selectedIndex, setSelectedIndex } = useTableNavigation(
    products,
    onSelect,
    onClose,
    show,
    "product-row",
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
        Select &nbsp;
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
      title="Select Product"
      theme={theme}
      footer={footer}
      width="900px"
    >
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
            {products.map((item, index) => (
              <ProductRow
                key={index}
                item={item}
                index={index}
                isSelected={index === selectedIndex}
                theme={theme}
                onSelect={setSelectedIndex}
                onConfirm={onSelect}
              />
            ))}
          </tbody>
        </table>
      </div>
    </BaseModal>
  );
};

export default ProductSelectionModal;
