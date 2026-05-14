import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  // X,
  Plus,
  Minus,
  ReceiptText,
  ShoppingCart,
  // Delete,
  Trash2,
} from "lucide-react";
import { getSchemeColor, getDisplayScheme } from "../../utils/posUtils";

interface CartItem {
  _rowId: string | number;
  item_code: string;
  item_name: string;
  printDesc?: string;
  scheme_group?: string;
  _scheme?: boolean;
  saleable_qty: number;
  qty: number;
  rate: number | string;
  discount: number | string;
  tax: number | string;
  subtotal: number | string;
  scheme?: any;
  manualDiscount?: any;
  missingQualifyingAmount?: number;
  schm_type?: string | number;
  schm_camp_grp?: string;
  appliedQty?: number;
}

interface ClassicCartAreaProps {
  leftCollapsed?: boolean;
  posReady?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
  barcode?: string;
  setBarcode?: (value: string) => void;
  handleScan?: (
    e:
      | React.KeyboardEvent<HTMLInputElement>
      | { key: string; target: { value: string } },
  ) => void;
  previewInvoice?: string;
  cart?: CartItem[];
  cartContainerRef?: React.RefObject<HTMLDivElement>;
  highlightRowId?: string | number;
  selectedRowIndex?: number;
  setSelectedRowIndex?: (index: number) => void;
  removeFromCart?: (id: string) => void;
  updateQty?: (id: string, delta: number) => void;
  handleQtyChange?: (id: string, val: string) => void;
  handleQtyBlur?: (id: string, qty: number) => void;
  qtyFocusTrigger?: number;
  tableFocusTrigger?: number;
}

function ShortcutChip({
  shortcut,
  label,
}: {
  shortcut: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <kbd className="px-1.5 py-0.5 text-[10px] tracking-wide font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded">
        {shortcut}
      </kbd>
      <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

export default function ClassicCartArea({
  leftCollapsed,
  posReady,
  inputRef,

  barcode,
  setBarcode,
  handleScan,

  previewInvoice,

  cart = [],
  cartContainerRef,
  highlightRowId,
  selectedRowIndex,
  setSelectedRowIndex,

  removeFromCart,
  updateQty,
  handleQtyChange,
  handleQtyBlur,
  qtyFocusTrigger,
  // tableFocusTrigger,
}: ClassicCartAreaProps) {
  const cartCount = Array.isArray(cart) ? cart.length : 0;
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const isMac = useMemo(
    () => navigator.userAgent.toUpperCase().indexOf("MAC") >= 0,
    [],
  );

  const renderInvoiceNumber = (invoice?: string) => {
    if (!invoice) {
      return <span className="opacity-70">Loading...</span>;
    }
    if (invoice === "0") {
      return <span className="text-base opacity-70">0</span>;
    }

    const invoiceSuffix = invoice.slice(-6);
    // Find the index of the first character that is NOT a zero.
    const firstNonZeroIndex = invoiceSuffix.search(/[^0]/);

    // If no non-zero character is found (e.g., "000000"), render all small.
    if (firstNonZeroIndex === -1) {
      return (
        <span className="text-base opacity-70 tracking-tighter">
          {invoiceSuffix}
        </span>
      );
    }

    // If the number starts with a non-zero (e.g., "123456"), render normally.
    if (firstNonZeroIndex === 0) {
      return <span>{invoiceSuffix}</span>;
    }

    // Split into leading zeros and the rest of the number (e.g., "000123").
    const zeros = invoiceSuffix.substring(0, firstNonZeroIndex);
    const numberPart = invoiceSuffix.substring(firstNonZeroIndex);

    return (
      <>
        <span className="text-base opacity-70 tracking-tighter">{zeros}</span>
        <span>{numberPart}</span>
      </>
    );
  };

  // Get header height for scroll padding
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, []);

  // Scroll selected row into view
  useEffect(() => {
    if (
      selectedRowIndex !== undefined &&
      selectedRowIndex >= 0 &&
      rowRefs.current[selectedRowIndex]
    ) {
      rowRefs.current[selectedRowIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedRowIndex]);

  // Focus Qty input on trigger
  useEffect(() => {
    if (
      qtyFocusTrigger &&
      qtyFocusTrigger > 0 &&
      selectedRowIndex !== undefined &&
      selectedRowIndex >= 0 &&
      rowRefs.current[selectedRowIndex]
    ) {
      const row = rowRefs.current[selectedRowIndex];
      const qtyInput = row?.querySelector(
        'input[type="number"]',
      ) as HTMLInputElement;
      if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
      }
    }
  }, [qtyFocusTrigger, selectedRowIndex]);

  // Handle Up/Down Arrow Keys
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedRowIndex?.(Math.max(0, (selectedRowIndex || 0) - 1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedRowIndex?.(
        Math.min(cart.length - 1, (selectedRowIndex || 0) + 1),
      );
    } else {
      handleScan?.(e);
    }
  };

  // Using fractional units allows all columns to shrink proportionally.
  // 'auto' for the first column lets it be as small as its content (the 'X' button).
  const gridTemplate = "auto 3fr 1fr 0.8fr 1.2fr 1fr 1fr 0.8fr 1.2fr";

  return (
    <div
      className={`${leftCollapsed ? "col-span-8" : "col-span-7"} h-full min-h-0 min-w-0 flex flex-col gap-3 transition-all duration-200`}
    >
      {/* Top Search Strip (outside white card like screenshot) */}
      <div className="flex items-center gap-3">
        {/* <div className="shrink-0 px-2.5 py-1.5 rounded-full bg-[#6F86F8] text-white text-xs font-bold shadow-sm">
                    F2
                </div> */}

        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={barcode}
            onChange={(e) => setBarcode?.(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Scan barcode or search product by ItemCode..."
            className="w-full h-11 rounded-xl border border-[#D6DEE9] bg-white px-4 pr-36 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C9D5F7] focus:border-[#BFD0F7] shadow-sm"
          />

          <button
            type="button"
            onClick={() => {
              if (!barcode?.trim()) return;
              handleScan?.({ key: "Enter", target: { value: barcode } } as any);
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 rounded-lg bg-blue-600 text-white px-4 text-xs font-bold hover:bg-blue-700 active:scale-[0.99] transition flex items-center gap-1.5 shadow-sm"
          >
            <Search size={14} />
            SEARCH
          </button>
        </div>

        <div className="relative group">
          <button
            type="button"
            className="shrink-0 h-11 rounded-xl border border-[#BFE8CC] bg-[#EFFBF3] px-4 text-[#15924F] text-sm font-semibold flex items-center gap-2 shadow-sm"
          >
            <ReceiptText size={16} className="text-blue-600" />
            <span className="text-xl font-bold font-mono flex items-baseline">
              {renderInvoiceNumber(previewInvoice)}
            </span>
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            Invoice No :- {previewInvoice}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-800"></div>
          </div>
        </div>
      </div>

      {/* Main Cart Card */}
      <div className="flex-1 min-h-0 rounded-2xl border border-[#DDE4EE] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] overflow-hidden flex flex-col">
        {/* Cart Title Row */}
        <div className="px-3 py-3 border-b border-[#E8EDF4] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ShoppingCart size={18} className="text-blue-600" />
            <div className="font-bold text-slate-900 text-sm">Cart Items</div>
            <div className="min-w-6 h-6 px-2 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {cartCount}
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-3.5">
            <ShortcutChip shortcut="↑ / ↓" label="Navigate" />
            <ShortcutChip
              shortcut={`${isMac ? "⌥" : "Alt"} Q`}
              label="Focus Qty"
            />
            <ShortcutChip
              shortcut={`${isMac ? "⌥" : "Alt"} I`}
              label="Increase Qty"
            />
            <ShortcutChip
              shortcut={`${isMac ? "⌥" : "Alt"} D`}
              label="Decrease Qty"
            />
            <ShortcutChip shortcut="Shift D" label="Delete Item" />
          </div>
        </div>

        {/* Cart Grid Area */}
        <div
          ref={cartContainerRef}
          className="flex-1 min-h-0 bg-slate-50 overflow-auto relative"
          style={{
            scrollPaddingTop: headerHeight ? `${headerHeight}px` : "45px",
          }}
        >
          {/* Sticky Table Header */}
          <div
            ref={headerRef}
            className="sticky top-0 z-20 grid bg-gradient-to-r from-[#0F203C] via-[#132744] to-[#172E4E] text-white text-xs px-2 py-3 font-bold shadow-sm"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div></div>
            <div>PRODUCT DETAILS</div>
            <div className="text-center">SCHEME</div>
            <div className="text-center">STOCK</div>
            <div className="text-center">QTY</div>
            <div className="text-right">PRICE</div>
            <div className="text-right">DISC</div>
            <div className="text-right">TAX</div>
            <div className="text-right">SUB TOTAL</div>
          </div>

          {posReady && cart.length === 0 && (
            <div className="flex flex-col items-center justify-center text-slate-400 gap-2 h-[calc(100%-45px)]">
              <ShoppingCart size={52} className="opacity-60" />
              <div className="text-base font-semibold text-slate-500">
                Cart is Empty
              </div>
              <div className="text-sm">Scan products to add</div>
            </div>
          )}

          {posReady &&
            cart.map((row, index) => (
              <div
                key={row._rowId}
                ref={(el) => {
                  rowRefs.current[index] = el;
                }}
                onClick={() => setSelectedRowIndex?.(index)}
                className={`
                        grid px-2 py-2 text-xs border-b border-slate-200 items-center
                        transition-all duration-100
                        ${highlightRowId === row._rowId ? "bg-emerald-200" : ""}
                        ${
                          selectedRowIndex === index
                            ? "bg-blue-100 border-l-4 border-l-blue-500"
                            : "border-l-4 border-l-transparent hover:bg-emerald-100"
                        }
                    `}
                style={{
                  gridTemplateColumns: gridTemplate,
                }}
              >
                {/* Remove */}
                <div className="flex justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromCart?.(String(row._rowId));
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                    title="Remove item"
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Product Details (SKU merged) */}
                <div className="flex flex-col leading-tight min-w-0">
                  <div
                    className="font-bold text-slate-800 truncate"
                    title={row.item_code}
                  >
                    {row.item_code}
                  </div>

                  <div className="text-[11px] text-slate-700">
                    <span className="">{row.item_name}</span>
                    {row.printDesc && (
                      <>
                        <span className="mx-1">|</span>
                        <span className="">{row.printDesc}</span>
                      </>
                    )}
                    {/* {getDisplayScheme(row as any) !== "-" && (
                      <span
                        className={`text-[10px] ${getSchemeColor(row as any)}`}
                      >
                        {getDisplayScheme(row as any)}
                      </span>
                    )} */}
                    {row.missingQualifyingAmount &&
                      row.missingQualifyingAmount > 0 && (
                        <div className="text-amber-600 mt-1 flex items-center gap-1 text-[10px] font-medium w-full">
                          <span>
                            ⚠️ Add ₹{row.missingQualifyingAmount.toFixed(2)}{" "}
                            more for offer
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                {/* Scheme */}
                <div className="flex flex-col items-center justify-center">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold text-center rounded-full ${
                      getSchemeColor(row as any).includes("text-green-600")
                        ? "bg-green-100 text-green-700"
                        : getSchemeColor(row as any).includes("text-red-600")
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {getDisplayScheme(row as any)}
                  </span>
                </div>

                {/* Stock */}
                <div
                  className={`text-center font-bold ${row.saleable_qty < 5 ? "text-red-500" : "text-slate-800"}`}
                >
                  {row.saleable_qty}
                </div>

                {/* Qty */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQty?.(String(row._rowId), -1);
                      }}
                      className="px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white transition-colors"
                      type="button"
                    >
                      <Minus size={14} />
                    </button>

                    <input
                      type="number"
                      value={row.qty === 0 ? "" : row.qty}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        handleQtyChange?.(String(row._rowId), e.target.value)
                      }
                      onBlur={() =>
                        handleQtyBlur?.(String(row._rowId), row.qty)
                      }
                      className="w-12 text-center text-xs font-bold text-slate-700 border-x border-slate-300 py-1 focus:outline-none focus:bg-emerald-50"
                      style={{
                        boxShadow: "none",
                      }}
                    />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQty?.(String(row._rowId), 1);
                      }}
                      className="px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white transition-colors"
                      type="button"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right font-bold text-slate-700">
                  ₹{Number(row.rate || 0).toFixed(2)}
                </div>

                {/* Discount */}
                <div
                  className={`text-right font-bold ${
                    Number(row.discount) > 0 ? "text-red-700" : "text-slate-400"
                  }`}
                >
                  {Number(row.discount) * row.qty > 0
                    ? `-₹${(Number(row.discount) * row.qty).toFixed(2)}`
                    : ""}
                </div>

                {/* Tax */}
                <div className="text-right font-bold text-slate-700">
                  {Number(row.tax || 0)}%
                </div>

                {/* Subtotal */}
                <div className="text-right font-bold text-slate-800">
                  ₹{Number(row.subtotal || 0).toFixed(2)}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
