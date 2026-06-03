import React, { useEffect } from "react";
import { Plus, Search, Users, Edit } from "lucide-react";
import { useCustomerSearch } from "../../hooks/useCustomerSearch";

interface CustomerSearchCardClassicProps {
  customerKeyword?: string;
  setCustomerKeyword?: (val: string) => void;
  customerResults?: any[];
  customerLoading?: boolean;
  customerSearched?: boolean;
  selectedCustomer?: any;
  setSelectedCustomer?: (customer: any) => void;
  searchCustomers?: () => void;
  onAddNew?: () => void;
  // onEditSelected?: () => void;
  onEditSelected?: (data: any) => void;
}

export default function CustomerSearchCardClassic({
  customerKeyword,
  setCustomerKeyword,
  customerResults: externalResults,
  customerLoading: externalLoading,
  customerSearched: externalSearched,
  selectedCustomer,
  setSelectedCustomer,
  searchCustomers: externalSearch,
  onAddNew,
  onEditSelected,
}: CustomerSearchCardClassicProps) {
  const {
    searchCustomers: localSearchCall,
    loading: localLoading,
    results: localResults,
    searched: localSearched,
    clearSearch,
  } = useCustomerSearch();

  useEffect(() => {
    if (!customerKeyword) {
      clearSearch();
    }
  }, [customerKeyword, clearSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value || "";

    // agar input number se start ho raha hai to sirf digits + max 10
    if (/^\d/.test(value)) {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    setCustomerKeyword?.(value);
    setSelectedCustomer?.(null);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text") || "";

    if (/^\d/.test(pasted.trim())) {
      e.preventDefault();
      const digitsOnly = pasted.replace(/\D/g, "").slice(0, 10);
      setCustomerKeyword?.(digitsOnly);
      setSelectedCustomer?.(null);
    }
  };

  const handleSearch = async () => {
    // Fallback to parent logic if provided
    if (externalSearch) {
      externalSearch();
      return;
    }

    if (!customerKeyword?.trim()) return;

    await localSearchCall(customerKeyword);
  };

  const displayLoading = externalLoading || localLoading;
  const displaySearched = externalSearched || localSearched;
  const displayResults = externalResults || localResults;

  return (
    <div className="bg-white rounded-2xl border border-[#DDE4EE] shadow-[0_4px_16px_rgba(15,23,42,0.05)] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
          <Users size={14} className="text-blue-600" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-900">
            Customer Search
          </div>
          <div className="text-[10px] text-slate-500 leading-tight">
            Search by mobile or customer name
          </div>
        </div>
      </div>

      <div className="p-2">
        {/* Search Box */}
        <div className="relative mb-2">
          <input
            value={customerKeyword}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Enter mobile or name"
            className="w-full h-9 rounded-lg border border-[#D6DEE9] bg-white px-3 pr-10 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C9D5F7] focus:border-[#BFD0F7]"
          />

          <button
            type="button"
            onClick={handleSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 active:scale-[0.99] transition"
            title="Search Customer"
          >
            <Search size={14} />
          </button>
        </div>

        {/* Results */}
        <div className="relative">
          {displayLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-xl">
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#667BE5] border-t-transparent rounded-full animate-spin"></div>
                <div className="text-xs text-slate-500">Searching...</div>
              </div>
            </div>
          )}

          <div className="max-h-[120px] overflow-y-auto pr-1 space-y-1.5">
            {!displayLoading &&
              displayResults?.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer?.(c);
                      setCustomerKeyword?.(c.name || c.mobile || "");
                      clearSearch();
                    }}
                    className={[
                      "w-full rounded-lg border px-2.5 py-1.5 text-left transition",
                      isSelected
                        ? "border-[#BFE8CC] bg-[#EAF9EF] shadow-sm"
                        : "border-[#E1E7F0] bg-[#F8FAFC] hover:bg-white hover:border-[#D4DDEA]",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-semibold truncate ${
                          isSelected ? "text-[#136C3D]" : "text-green-600"
                        }`}
                      >
                        {c.name} || {c.mobile || "No mobile"}
                      </div>
                    </div>
                  </button>
                );
              })}

            {!displayLoading &&
              displaySearched &&
              displayResults?.length === 0 &&
              !selectedCustomer && (
                <div className="rounded-lg border border-[#F6D58E] bg-[#FFF8E7] px-2.5 py-2.5 text-center text-xs text-amber-700 font-medium">
                  No customer found
                </div>
              )}
          </div>

          <div className="mt-1">
            {displayResults?.length !== 0 && (
              <button
                type="button"
                onClick={() => onEditSelected?.(displayResults)}
                className="w-full rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-semibold text-slate-800 hover:bg-blue-100 active:scale-[0.99] transition flex items-center justify-center gap-1.5"
              >
                <Edit size={13} className="text-blue-600" />
                Edit Customer
              </button>
            )}

            {!selectedCustomer &&
              displaySearched &&
              displayResults?.length === 0 && (
                <button
                  type="button"
                  onClick={onAddNew}
                  className="w-full rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:scale-[0.99] transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Plus size={13} />
                  Add New Customer
                </button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
