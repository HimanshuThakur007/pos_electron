import React from "react";
import {
  Search,
  Download,
  Printer,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const formatDateTimeIST = (
  dateStr: string | number | Date | null | undefined,
) => {
  if (!dateStr) return "—";
  let parsedDate = dateStr;
  if (
    typeof dateStr === "string" &&
    dateStr.includes(" ") &&
    !dateStr.includes("T")
  ) {
    parsedDate = dateStr.replace(" ", "T") + "Z";
  }
  const d = new Date(parsedDate);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const Pagination = ({
  currentPage,
  total,
  limit,
  onPageChange,
}: {
  currentPage: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-200 bg-slate-50 mt-auto shrink-0">
      <span className="text-sm text-slate-600">
        Showing {(currentPage - 1) * limit + 1} to{" "}
        {Math.min(currentPage * limit, total)} of {total} entries
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 transition cursor-pointer"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="flex items-center px-2 text-sm font-medium text-slate-600">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 transition cursor-pointer"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

const SearchInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}) => (
  <div className="relative shrink-0 group w-full">
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-4 pl-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white shadow-sm transition-all"
    />
    <Search
      size={16}
      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
    />
  </div>
);

const getStatusBadge = (status: number) => {
  switch (status) {
    case 1:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200/60">
          Synced
        </span>
      );
    case 2:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200/60">
          Syncing
        </span>
      );
    case -1:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200/60">
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200/60">
          Pending
        </span>
      );
  }
};

type TabType =
  | "retailBills"
  | "b2bBills"
  | "retailSync"
  | "b2bSync"
  | "invoiceSeries"
  | "stocks"
  | "schemes";

interface DataViewerProps {
  activeTab: TabType;
  data: any[];
  total: number;
  pagination: { currentPage: number; limit: number };
  onPageChange: (page: number) => void;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchPlaceholder: string;
  onExport: () => void;
  isLoading: boolean;
  isSearching: boolean;
  colSpan: number;
  dynamicKeys: string[];
  onReprint: (bill: any) => void;
  onManualSync: (bill_no: string) => void;
  isSyncing: string | null;
  onTriggerInvoiceSync: () => void;
}

const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <th
    className={`px-4 py-3 font-semibold text-[11px] uppercase tracking-widest text-slate-500 whitespace-nowrap bg-slate-50/95 backdrop-blur-sm sticky top-0 z-10 shadow-[inset_0_-1px_0_0_#e2e8f0] ${className}`}
  >
    {children}
  </th>
);

const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <td className={`px-4 py-2.5 text-sm ${className}`}>{children}</td>;

export default function DataViewer({
  activeTab,
  data,
  total,
  pagination,
  onPageChange,
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  onExport,
  isLoading,
  isSearching,
  colSpan,
  dynamicKeys,
  onReprint,
  onManualSync,
  isSyncing,
  onTriggerInvoiceSync,
}: DataViewerProps) {
  const isBillTab = activeTab === "retailBills" || activeTab === "b2bBills";
  const isSyncTab = activeTab === "retailSync" || activeTab === "b2bSync";
  const isDynamicTab = activeTab === "stocks" || activeTab === "schemes";
  const isInvoiceTab = activeTab === "invoiceSeries";

  const renderTableHeader = () => {
    if (isBillTab) {
      return (
        <tr>
          <Th>Bill No</Th>
          <Th>Date</Th>
          <Th>Customer</Th>
          <Th className="text-right">Amount</Th>
          <Th className="text-center">Action</Th>
        </tr>
      );
    }
    if (isSyncTab) {
      return (
        <tr>
          <Th>Bill No</Th>
          <Th>Date</Th>
          <Th className="text-right">Amount</Th>
          <Th className="text-center">Status</Th>
          <Th className="text-center">Action</Th>
        </tr>
      );
    }
    if (isInvoiceTab) {
      return (
        <tr>
          <Th>Doc Type</Th>
          <Th>Branch</Th>
          <Th className="text-center">Terminal</Th>
          <Th className="text-center">FY Code</Th>
          <Th className="text-center">Current No.</Th>
          <Th className="text-center">Sync Status</Th>
          <Th className="text-right">Last Updated</Th>
          <Th className="text-center">Action</Th>
        </tr>
      );
    }
    if (isDynamicTab) {
      return (
        <tr>
          {dynamicKeys.map((key) => (
            <Th key={key} className="whitespace-nowrap">
              {key.replace(/_/g, " ")}
            </Th>
          ))}
        </tr>
      );
    }
    return null;
  };

  const renderTableRow = (row: any, i: number) => {
    const rowClass = `border-b border-slate-100/70 hover:bg-blue-50/60 transition-colors group ${
      i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
    }`;

    const formattedDate = formatDateTimeIST(
      row.created_at || row.time || row.updated_at,
    );
    const formattedAmt = `₹${Number(row.grand_total || 0).toFixed(2)}`;

    if (isBillTab) {
      return (
        <tr key={i} className={rowClass}>
          <Td className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
            {row.bill_no}
          </Td>
          <Td className="text-slate-700">{formattedDate}</Td>
          <Td className="text-slate-600">
            {row.customer_name || "Walk-in"}
            {row.customer_mobile && (
              <div className="text-xs text-slate-400 mt-0.5 font-mono">
                {row.customer_mobile}
              </div>
            )}
          </Td>
          <Td className="font-bold text-slate-800 text-right">
            {formattedAmt}
          </Td>
          <Td className="text-center">
            <button
              onClick={() => onReprint(row)}
              className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors inline-flex items-center justify-center"
              title="Print Receipt"
            >
              <Printer size={16} />
            </button>
          </Td>
        </tr>
      );
    }
    if (isSyncTab) {
      return (
        <tr key={i} className={rowClass}>
          <Td className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
            {row.bill_no}
          </Td>
          <Td className="text-slate-700">{formattedDate}</Td>
          <Td className="font-bold text-slate-800 text-right">
            {formattedAmt}
          </Td>
          <Td className="text-center">{getStatusBadge(row.sync_status)}</Td>
          <Td className="text-center">
            <button
              onClick={() => onManualSync(row.bill_no)}
              disabled={row.sync_status === 2}
              className="p-1.5 bg-slate-800 text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 rounded transition-colors inline-flex items-center justify-center"
              title="Push to Server"
            >
              <UploadCloud size={16} />
            </button>
          </Td>
        </tr>
      );
    }
    if (isInvoiceTab) {
      return (
        <tr key={i} className={rowClass}>
          <Td className="font-semibold text-slate-800">
            {row.doc_type === 1
              ? "Retail Invoice (1)"
              : row.doc_type === 3
                ? "B2B Invoice (3)"
                : row.doc_type}
          </Td>
          <Td className="text-slate-600">{row.branch_code}</Td>
          <Td className="text-slate-600 text-center font-mono">
            {row.terminal_code}
          </Td>
          <Td className="text-slate-700 text-center font-mono">
            {row.fy_code}
          </Td>
          <Td className="font-bold text-slate-800 text-center">
            {row.current_number}
          </Td>
          <Td className="text-center">{getStatusBadge(row.sync_status)}</Td>
          <Td className="text-slate-500 text-right">{formattedDate}</Td>
          <Td className="text-center">
            <button
              onClick={onTriggerInvoiceSync}
              disabled={row.sync_status === 1 || isSyncing !== null}
              className="p-1.5 bg-slate-800 text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 rounded transition-colors inline-flex items-center justify-center"
              title="Push to Server"
            >
              <UploadCloud size={16} />
            </button>
          </Td>
        </tr>
      );
    }
    if (isDynamicTab) {
      return (
        <tr key={i} className={rowClass}>
          {dynamicKeys.map((key) => {
            const val = row[key];
            return (
              <Td key={key} className="text-slate-600 whitespace-nowrap">
                {typeof val === "object" && val !== null
                  ? JSON.stringify(val)
                  : String(val ?? "")}
              </Td>
            );
          })}
        </tr>
      );
    }
    return null;
  };

  return (
    <div className="px-4 pt-4 pb-4 flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 mb-3 shrink-0">
        <div className="flex-1">
          <SearchInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm shrink-0"
        >
          <Download size={16} />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto rounded-xl border border-slate-200/80 bg-white">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>{renderTableHeader()}</thead>
          <tbody>
            {isLoading || isSearching ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-3 py-4 text-center text-slate-500 font-medium"
                >
                  {isSearching
                    ? "Searching..."
                    : "Loading data, please wait..."}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-3 py-4 text-center text-slate-500"
                >
                  No data found.
                </td>
              </tr>
            ) : (
              data.map(renderTableRow)
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={pagination.currentPage}
        total={total}
        limit={pagination.limit}
        onPageChange={onPageChange}
      />
    </div>
  );
}
