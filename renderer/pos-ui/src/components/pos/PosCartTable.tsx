import React, { useEffect, useRef } from "react";
import { MdSearch, MdClose, MdReceiptLong } from "react-icons/md";
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
    <div className="col-9 p-2">
      <style>{`
        .pos-selected-row > td {
          background-color: ${theme === "dark" ? "#374151" : "#e0e7ff"} !important;
          color: ${theme === "dark" ? "#fff" : "#3730a3"};
        }
        .pos-selected-row > td:first-child {
          box-shadow: inset 4px 0 0 ${theme === "dark" ? "#60a5fa" : "#4f46e5"};
        }
        .pos-row:focus {
          outline: 2px solid ${theme === "dark" ? "#60a5fa" : "#4f46e5"};
        }
      `}</style>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="input-group shadow-sm" style={{ width: "50%" }}>
          <span
            className={`input-group-text ${theme === "dark" ? "bg-dark text-secondary border-secondary" : "bg-white text-muted"}`}
            style={{ borderRight: 0 }}
          >
            <MdSearch size={18} />
          </span>
          <input
            ref={scanInputRef}
            className={`form-control ${theme === "dark" ? "bg-dark text-light border-secondary" : "bg-white text-dark"}`}
            placeholder="Scan barcode / Search product"
            autoFocus
            disabled={loading}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleInputKeyDown}
            style={{
              borderLeft: 0,
              borderRight: searchTerm ? 0 : undefined,
            }}
          />
          {searchTerm && (
            <button
              className={`btn ${theme === "dark" ? "btn-dark border-secondary text-light" : "bg-white border text-muted"}`}
              style={{
                borderLeft: 0,
                borderColor: theme === "dark" ? "#6c757d" : "#dee2e6",
              }}
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
            className="btn btn-primary px-4 fw-semibold"
            onClick={searchProduct}
            disabled={loading}
          >
            {loading ? "..." : "SEARCH"}
          </button>
        </div>
        <div
          className={`d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm ${
            theme === "dark"
              ? "bg-secondary bg-opacity-10 text-light border border-secondary"
              : "bg-white text-dark border"
          }`}
        >
          <MdReceiptLong size={20} className="opacity-75" />
          <span className="font-monospace fw-bold fs-6">{invoiceNumber}</span>
        </div>
      </div>

      <div
        className="table-responsive pos-table"
        style={{
          borderRadius: "12px",
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          border: theme === "dark" ? "1px solid #374151" : "1px solid #e5e7eb",
          backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
          height: "calc(100vh - 330px)",
          overflowY: "auto",
        }}
      >
        <table
          className={`table mb-0 ${theme === "dark" ? "table-dark" : ""}`}
          style={{ borderCollapse: "separate", borderSpacing: "0" }}
        >
          <thead
            className="sticky-top"
            style={{
              zIndex: 10,
              backgroundColor: theme === "dark" ? "#111827" : "#f9fafb",
            }}
          >
            <tr>
              {[
                { label: "#", width: "5%", align: "center" },
                { label: "PRODUCT", width: "35%", align: "start" },
                { label: "SCHEME", width: "10%", align: "center" },
                { label: "STOCK", width: "8%", align: "center" },
                { label: "QTY", width: "12%", align: "center" },
                { label: "PRICE", width: "10%", align: "end" },
                { label: "DISC", width: "8%", align: "end" },
                { label: "TAX", width: "5%", align: "center" },
                { label: "TOTAL", width: "10%", align: "end" },
              ].map((col, idx) => (
                <th
                  key={idx}
                  className={`py-2 px-2 text-${col.align} fw-bold ${theme === "dark" ? "text-white" : "text-secondary"}`}
                  style={{
                    fontSize: "0.75rem",
                    letterSpacing: "0.05em",
                    borderBottom:
                      theme === "dark"
                        ? "1px solid #374151"
                        : "1px solid #e5e7eb",
                    width: col.width,
                    backgroundColor: theme === "dark" ? "#111827" : "#f9fafb",
                  }}
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
                    className={`d-flex flex-column align-items-center ${theme === "dark" ? "text-secondary" : "text-muted"}`}
                  >
                    <MdSearch size={48} className="mb-3 opacity-25" />
                    <span className="fs-5 fw-medium">Cart is empty</span>
                    <span className="small opacity-75">
                      Scan a barcode or search to add items
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              cart.map((item, index) => (
                <tr
                  key={index}
                  ref={(el) => {
                    rowRefs.current[index] = el;
                  }}
                  tabIndex={-1}
                  className={`pos-row ${selectedIndex === index ? "pos-selected-row" : ""}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <td
                    className="align-middle text-center px-2 py-2"
                    style={{
                      borderBottom:
                        theme === "dark"
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                    }}
                  >
                    <button
                      className="btn btn-link text-danger p-0 opacity-50 hover-opacity-100 text-decoration-none"
                      onClick={() => removeFromCart(item.id)}
                      title="Remove Item"
                    >
                      <MdClose size={18} />
                    </button>
                  </td>
                  <td
                    className="align-middle px-2 py-2"
                    style={{
                      borderBottom:
                        theme === "dark"
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                    }}
                  >
                    <div className="d-flex flex-column">
                      <span
                        className="fw-semibold text-truncate"
                        style={{ maxWidth: "280px" }}
                      >
                        {item.itemName}
                      </span>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <span
                          className={`badge rounded-pill ${theme === "dark" ? "bg-secondary bg-opacity-25 text-light" : "bg-light text-secondary border"}`}
                          style={{ fontSize: "0.65rem", fontWeight: 500 }}
                        >
                          {item.itemCode}
                        </span>
                        {item.printDesc && (
                          <span
                            className="small opacity-75"
                            style={{ fontSize: "0.7rem" }}
                          >
                            {item.printDesc}
                          </span>
                        )}
                        {getDisplayScheme(item) !== "-" && (
                          <span
                            className={`small ${getSchemeColor(item)}`}
                            style={{ fontSize: "0.7rem" }}
                          >
                            {getDisplayScheme(item)}
                          </span>
                        )}
                      </div>
                      {item.missingQualifyingAmount &&
                        item.missingQualifyingAmount > 0 && (
                          <div
                            className="text-warning mt-1 d-flex align-items-center gap-1"
                            style={{ fontSize: "0.7rem" }}
                          >
                            <span>
                              ⚠️ Add ₹{item.missingQualifyingAmount.toFixed(2)}{" "}
                              more for offer
                            </span>
                          </div>
                        )}
                    </div>
                  </td>
                  <td
                    className="align-middle text-center px-2 py-2"
                    style={{
                      borderBottom:
                        theme === "dark"
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                    }}
                  >
                    <span
                      className={`badge rounded-pill ${
                        getSchemeColor(
                          item,
                          //   grossAmount,
                          //   totalPPAmount,
                        ).includes("text-success")
                          ? "bg-success bg-opacity-10 text-success"
                          : getSchemeColor(
                                item,
                                // grossAmount,
                                // totalPPAmount,
                              ).includes("text-danger")
                            ? "bg-danger bg-opacity-10 text-danger"
                            : "bg-secondary bg-opacity-10 text-secondary"
                      }`}
                      style={{ fontSize: "0.7rem" }}
                    >
                      {getDisplayScheme(item)}
                    </span>
                  </td>
                  <td
                    className="align-middle text-center px-2 py-2"
                    style={{
                      borderBottom:
                        theme === "dark"
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                    }}
                  >
                    <span
                      className={`fw-medium ${item.stock < 5 ? "text-danger" : ""}`}
                    >
                      {item.stock}
                    </span>
                  </td>
                  <td
                    className="align-middle text-center px-2 py-2"
                    style={{
                      borderBottom:
                        theme === "dark"
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                    }}
                  >
                    <div
                      className={`d-flex align-items-center justify-content-between rounded-pill border ${theme === "dark" ? "border-secondary bg-dark" : "border-200 bg-white"}`}
                      style={{ width: "100px", padding: "2px" }}
                    >
                      <button
                        className={`btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center ${theme === "dark" ? "text-light" : "text-secondary"}`}
                        style={{ width: "24px", height: "24px" }}
                        onClick={() => updateQty(item.id, -1)}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className={`form-control form-control-sm border-0 text-center p-0 fw-bold ${theme === "dark" ? "bg-transparent text-light" : "bg-transparent text-dark"}`}
                        style={{
                          width: "40px",
                          boxShadow: "none",
                          fontSize: "0.9rem",
                        }}
                        value={item.qty === 0 ? "" : item.qty}
                        onChange={(e) =>
                          handleQtyChange(item.id, e.target.value)
                        }
                        onBlur={() => handleQtyBlur(item.id, item.qty)}
                      />
                      <button
                        className={`btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center ${theme === "dark" ? "text-light" : "text-secondary"}`}
                        style={{ width: "24px", height: "24px" }}
                        onClick={() => updateQty(item.id, 1)}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td
                    className="align-middle text-end px-2 py-2"
                    style={{
                      borderBottom:
                        theme === "dark"
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                    }}
                  >
                    ₹{item.price.toFixed(2)}
                  </td>
                  <td
                    className="align-middle text-end px-2 py-2"
                    style={{
                      borderBottom:
                        theme === "dark"
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                    }}
                  >
                    {item.discount > 0 ? (
                      <span className="text-success fw-medium">
                        -₹{(item.discount * item.qty).toFixed(2)}
                      </span>
                    ) : (
                      <span className="opacity-25">-</span>
                    )}
                  </td>
                  <td
                    className="align-middle text-center px-2 py-2"
                    style={{
                      borderBottom:
                        theme === "dark"
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                    }}
                  >
                    <span
                      className={`badge ${theme === "dark" ? "bg-secondary bg-opacity-25 text-light" : "bg-secondary bg-opacity-10 text-secondary"}`}
                      style={{ fontSize: "0.7rem" }}
                    >
                      {item.tax}%
                    </span>
                  </td>
                  <td
                    className="align-middle text-end px-2 py-2 fw-bold"
                    style={{
                      borderBottom:
                        theme === "dark"
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
                      fontSize: "1rem",
                    }}
                  >
                    ₹{((item.price - item.discount) * item.qty).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
