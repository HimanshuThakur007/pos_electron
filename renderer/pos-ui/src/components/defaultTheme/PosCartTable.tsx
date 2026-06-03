import React, { useEffect, useRef } from "react";
import {
  MdSearch,
  MdClose,
  MdReceiptLong,
  MdDeleteOutline,
  MdShoppingCart,
} from "react-icons/md";
import {
  type CartItem,
  getSchemeColor,
  getDisplayScheme,
} from "../../utils/posUtils";

interface PosCartTableProps {
  theme: "light" | "dark";
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleScan: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  searchProduct: () => void;
  //   scanInputRef: React.RefObject<HTMLInputElement>;
  scanInputRef: React.RefObject<HTMLInputElement | null>;
  cart: CartItem[];
  removeFromCart: (id: string) => void;
  grossAmount: number;
  totalPPAmount: number;
  updateQty: (id: string, delta: number) => void;
  handleQtyChange: (id: string, val: string) => void;
  handleQtyBlur: (id: string, qty: number) => void;
  invoiceNumber: string;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  tableFocusTrigger: number;
  qtyFocusTrigger: number;
}

export default function PosCartTable({
  theme,
  loading,
  searchTerm,
  setSearchTerm,
  handleScan,
  searchProduct,
  scanInputRef,
  cart,
  removeFromCart,
  //   grossAmount,
  //   totalPPAmount,
  updateQty,
  handleQtyChange,
  handleQtyBlur,
  invoiceNumber,
  selectedIndex,
  setSelectedIndex,
  tableFocusTrigger,
  qtyFocusTrigger,
}: PosCartTableProps) {
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  useEffect(() => {
    if (selectedIndex >= 0 && rowRefs.current[selectedIndex]) {
      const currentRow = rowRefs.current[selectedIndex];
      currentRow?.scrollIntoView({
        block: "nearest",
      });
      // If focus is currently on a table row, move it to the new selected row
      if (
        rowRefs.current.includes(
          document.activeElement as HTMLTableRowElement,
        ) ||
        tableFocusTrigger > 0 // Force focus if triggered by F8
      ) {
        currentRow?.focus();
      }
    }
  }, [selectedIndex, tableFocusTrigger]);

  useEffect(() => {
    if (
      qtyFocusTrigger > 0 &&
      selectedIndex >= 0 &&
      rowRefs.current[selectedIndex]
    ) {
      const row = rowRefs.current[selectedIndex];
      const qtyInput = row?.querySelector(
        'input[type="number"]',
      ) as HTMLInputElement;
      if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
      }
    }
  }, [qtyFocusTrigger, selectedIndex]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleScan(e);
  };

  return (
    <div className="w-3/4 p-2 flex flex-col h-full">
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="relative" style={{ width: "50%" }}>
          <span
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
          >
            <MdSearch size={20} />
          </span>
          <input
            ref={scanInputRef}
            className={`w-full h-11 rounded-lg border pl-11 pr-36 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm ${theme === "dark" ? "bg-gray-800 text-white border-gray-700 placeholder:text-gray-500" : "bg-white text-gray-900 border-gray-300 placeholder:text-gray-400"}`}
            placeholder="Scan barcode or search product..."
            autoFocus
            disabled={loading}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchTerm && (
              <button
                className={`p-1 rounded-full transition-colors ${theme === "dark" ? "text-gray-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-100"}`}
                onClick={() => {
                  setSearchTerm("");
                  scanInputRef.current?.focus();
                }}
                type="button"
              >
                <MdClose size={18} />
              </button>
            )}
            <button
              className="inline-flex items-center gap-x-1.5 rounded-md px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:z-10 disabled:opacity-50 shadow-sm"
              onClick={searchProduct}
              disabled={loading}
            >
              {loading ? "..." : "Search"}
            </button>
          </div>
        </div>
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm border ${
            theme === "dark"
              ? "bg-slate-800 text-white border-slate-700"
              : "bg-slate-50 text-slate-800 border-slate-200"
          }`}
        >
          <MdReceiptLong
            size={20}
            className={`opacity-75 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`}
          />
          <span className="font-mono font-bold text-lg">{invoiceNumber}</span>
        </div>
      </div>

      <div
        className={`overflow-y-auto rounded-xl shadow-lg border ${theme === "dark" ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"} h-[calc(100vh-350px)]`}
      >
        <table
          className={`w-full mb-0 ${theme === "dark" ? "text-gray-300" : ""}`}
          style={{ borderCollapse: "separate", borderSpacing: "0" }}
        >
          <thead
            className="sticky-top"
            style={{
              zIndex: 10,
              backgroundColor:
                theme === "dark"
                  ? "#111827" /* bg-gray-900 */
                  : "#f9fafb" /* bg-gray-50 */,
            }}
          >
            <tr>
              {[
                { label: "", width: "4%", align: "center" },
                { label: "PRODUCT", width: "36%", align: "start" },
                { label: "SCHEME", width: "10%", align: "center" },
                { label: "STOCK", width: "7%", align: "center" },
                { label: "QTY", width: "12%", align: "center" },
                { label: "PRICE", width: "8%", align: "end" },
                { label: "DISC", width: "8%", align: "end" },
                { label: "TAX", width: "5%", align: "center" },
                { label: "SUBTOTAL", width: "10%", align: "end" },
              ].map((col, idx) => (
                <th
                  key={idx}
                  className={`py-2 px-2 text-${col.align} font-bold uppercase text-xs tracking-wider border-b ${theme === "dark" ? "text-gray-400 border-slate-700 bg-slate-900" : "text-gray-500 border-slate-200 bg-gray-50"}`}
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cart.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-5">
                  <div
                    className={`flex flex-col items-center ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
                  >
                    <MdShoppingCart size={48} className="mb-3 opacity-50" />
                    <span className="text-lg font-medium">Cart is empty</span>
                    <span className="text-sm opacity-75">
                      Scan a barcode or search to add items
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              cart.map((item, index) => {
                const isSelected = selectedIndex === index;
                const rowClass = `
                  transition-colors duration-150 cursor-pointer text-sm
                  focus:outline-2 focus:outline-offset-[-2px]
                  ${theme === "dark" ? "focus:outline-blue-500" : "focus:outline-indigo-500"}
                  ${isSelected ? (theme === "dark" ? "bg-slate-700/70" : "bg-indigo-50") : index % 2 !== 0 ? (theme === "dark" ? "bg-slate-800/50" : "bg-gray-50/50") : theme === "dark" ? "bg-slate-800" : "bg-white"}
                  ${!isSelected && (theme === "dark" ? "hover:bg-slate-700/70" : "hover:bg-gray-100")}
                `;

                return (
                  <tr
                    key={index}
                    ref={(el) => {
                      rowRefs.current[index] = el;
                    }}
                    tabIndex={-1}
                    className={rowClass}
                    onClick={() => setSelectedIndex(index)}
                  >
                    <td
                      className={`align-middle text-center px-2 py-1 border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"} ${isSelected ? (theme === "dark" ? "text-white border-l-4 border-blue-500" : "text-indigo-800 border-l-4 border-indigo-500") : "border-l-4 border-transparent"}`}
                    >
                      <button
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        onClick={() => removeFromCart(item.id)}
                        title="Remove Item"
                      >
                        <MdDeleteOutline size={18} />
                      </button>
                    </td>
                    <td
                      className={`align-middle px-2 py-1 border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"} ${isSelected && (theme === "dark" ? "text-white" : "text-indigo-800")}`}
                    >
                      <div className="flex flex-col">
                        <span
                          className="font-semibold truncate"
                          style={{ maxWidth: "280px" }}
                        >
                          {item.itemName}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${theme === "dark" ? "bg-slate-700 text-gray-300" : "bg-gray-100 text-gray-600 border"}`}
                          >
                            {item.itemCode}
                          </span>
                          {item.printDesc && (
                            <span className="text-xs opacity-75">
                              {item.printDesc}
                            </span>
                          )}
                          {getDisplayScheme(item) !== "-" && (
                            <span className={`text-xs ${getSchemeColor(item)}`}>
                              {getDisplayScheme(item)}
                            </span>
                          )}
                        </div>
                        {item.missingQualifyingAmount &&
                          item.missingQualifyingAmount > 0 && (
                            <div className="text-yellow-500 mt-1 flex items-center gap-1 text-xs">
                              <span>
                                ⚠️ Add ₹
                                {item.missingQualifyingAmount.toFixed(2)} more
                                for offer
                              </span>
                            </div>
                          )}
                      </div>
                    </td>
                    <td
                      className={`align-middle text-center px-2 py-1 border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"} ${isSelected && (theme === "dark" ? "text-white" : "text-indigo-800")}`}
                    >
                      <span className={`text-xs ${getSchemeColor(item)}`}>
                        {getDisplayScheme(item)}
                      </span>
                    </td>
                    <td
                      className={`align-middle text-center px-2 py-1 border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"} ${isSelected && (theme === "dark" ? "text-white" : "text-indigo-800")}`}
                    >
                      <span
                        className={`font-medium ${item.stock < 5 ? "text-red-500" : ""}`}
                      >
                        {item.stock}
                      </span>
                    </td>
                    <td
                      className={`align-middle text-center px-2 py-1 border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"} ${isSelected && (theme === "dark" ? "text-white" : "text-indigo-800")}`}
                    >
                      <div
                        className={`flex items-center justify-between rounded-md border ${theme === "dark" ? "border-gray-600 bg-gray-900/50" : "border-gray-200 bg-white"}`}
                        style={{ width: "100px", padding: "2px" }}
                      >
                        <button
                          className={`flex items-center justify-center w-6 h-6 p-0 rounded-md transition-colors ${theme === "dark" ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"}`}
                          onClick={() => updateQty(item.id, -1)}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          className={`w-10 p-0 text-center bg-transparent border-0 font-bold focus:ring-0 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                          style={{
                            boxShadow: "none",
                          }}
                          value={item.qty === 0 ? "" : item.qty}
                          onChange={(e) =>
                            handleQtyChange(item.id, e.target.value)
                          }
                          onBlur={() => handleQtyBlur(item.id, item.qty)}
                        />
                        <button
                          className={`flex items-center justify-center w-6 h-6 p-0 rounded-md transition-colors ${theme === "dark" ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"}`}
                          onClick={() => updateQty(item.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td
                      className={`align-middle text-end px-2 py-1 border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"} ${isSelected && (theme === "dark" ? "text-white" : "text-indigo-800")}`}
                    >
                      ₹{item.price.toFixed(2)}
                    </td>
                    <td
                      className={`align-middle text-end px-2 py-1 border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"} ${isSelected && (theme === "dark" ? "text-white" : "text-indigo-800")}`}
                    >
                      {item.discount > 0 ? (
                        <span className="text-green-500 font-medium">
                          -₹{(item.discount * item.qty).toFixed(2)}
                        </span>
                      ) : (
                        <span className="opacity-25">-</span>
                      )}
                    </td>
                    <td
                      className={`align-middle text-center px-2 py-1 border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"} ${isSelected && (theme === "dark" ? "text-white" : "text-indigo-800")}`}
                    >
                      <span
                        className={`px-2 py-1 text-xs rounded ${theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}
                      >
                        {item.tax}%
                      </span>
                    </td>
                    <td
                      className={`align-middle text-end px-2 py-1 font-bold text-sm border-b ${theme === "dark" ? "border-slate-700" : "border-slate-200"} ${isSelected && (theme === "dark" ? "text-white" : "text-indigo-800")}`}
                    >
                      ₹{((item.price - item.discount) * item.qty).toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
