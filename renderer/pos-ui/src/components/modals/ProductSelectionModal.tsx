import React, { useMemo } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import BaseModal from "../common/BaseModal";
import { useTableNavigation } from "../../hooks/useTableNavigation";
import { Td, Kbd } from "../common/TableHelpers";

interface ProductSelectionModalProps {
  show: boolean;
  products: any[];
  theme?: "light" | "dark";
  onClose: () => void;
  onSelect: (item: any) => void;
}

const COLUMNS = [
  { label: "Product Details", className: "" },
  { label: "Scheme", className: "text-center" },
  { label: "Stock", className: "text-right" },
  { label: "MRP", className: "text-right" },
  { label: "Status", className: "text-center" },
];

const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
  show,
  products,
  onClose,
  onSelect,
  theme = "light",
}) => {
  const isDark = theme === "dark";

  const { selectedIndex, setSelectedIndex } = useTableNavigation(
    products,
    onSelect,
    onClose,
    show,
    "product-row",
  );

  const footer = useMemo(
    () => (
      <div className="flex justify-between items-center w-full">
        <div
          className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> Navigate &nbsp;
          <Kbd>Enter</Kbd> Select &nbsp;
          <Kbd>Esc</Kbd> Close
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {selectedIndex + 1} of {products.length} items
          </span>
        </div>
      </div>
    ),
    [isDark, selectedIndex, products.length],
  );

  if (!show) return null;

  const thClass = isDark
    ? "bg-slate-900 text-gray-400 border-slate-700"
    : "bg-gray-50 text-gray-700 border-slate-200";

  return (
    <BaseModal
      show={show}
      onClose={onClose}
      title="Select Lot / Price"
      subTitle="Multiple items match your search. Press Enter to select the correct one."
      theme={theme}
      footer={footer}
      width="900px"
    >
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
            {products.map((product, i) => {
              const isSelected = i === selectedIndex;
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
                  id={`product-row-${i}`}
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  onDoubleClick={() => onSelect(product)}
                  className={rowClass}
                >
                  {[
                    {
                      className: "",
                      content: (
                        <>
                          <div
                            className={`font-semibold ${isSelected ? (isDark ? "text-white" : "text-blue-800") : isDark ? "text-gray-200" : "text-slate-800"}`}
                          >
                            {product.itemCode}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${isDark ? "bg-slate-600 text-gray-300" : "bg-slate-200 text-slate-600"}`}
                            >
                              {product.itemName}
                            </span>
                            {product.printDesc && (
                              <span
                                className={`text-xs ${isDark ? "text-gray-400" : "text-slate-500"}`}
                              >
                                {product.printDesc}
                              </span>
                            )}
                          </div>
                        </>
                      ),
                    },
                    {
                      className: "text-center",
                      content: (
                        <span
                          className={`
                            inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                            ${
                              product.schm_camp_grp
                                ? isDark
                                  ? "bg-emerald-900/50 text-emerald-400 border-emerald-800"
                                  : "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : isDark
                                  ? "bg-slate-800 text-slate-400 border-slate-700"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                            }
                          `}
                        >
                          {product.schm_camp_grp || "No Scheme"}
                        </span>
                      ),
                    },
                    {
                      className: "text-right",
                      content: (
                        <span
                          className={`font-bold ${isDark ? "text-gray-300" : "text-slate-700"}`}
                        >
                          {product.Stock_Qty}
                        </span>
                      ),
                    },
                    {
                      className: "text-right",
                      content:
                        Number(product.Lot_MRP) === 0 ? (
                          <span className="inline-flex items-center justify-end gap-1 font-bold text-rose-500">
                            <AlertCircle size={14} /> Missing Price
                          </span>
                        ) : (
                          <span
                            className={`font-bold ${isDark ? "text-blue-400" : "text-indigo-700"}`}
                          >
                            ₹{product.Lot_MRP}
                          </span>
                        ),
                    },
                    {
                      className: "text-center",
                      content: isSelected ? (
                        <div className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                          <CheckCircle size={14} />
                          Selected
                        </div>
                      ) : (
                        <span
                          className={`text-xs ${isDark ? "text-gray-500" : "text-slate-400"}`}
                        >
                          Click to select
                        </span>
                      ),
                    },
                  ].map((cell, cellIndex) => (
                    <Td key={cellIndex} className={cell.className}>
                      {cell.content as React.ReactNode}
                    </Td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </BaseModal>
  );
};

export default ProductSelectionModal;
