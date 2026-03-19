import React from "react";
import { Plus, Search, Users, Edit } from "lucide-react";

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
  onEditSelected?: () => void;
}

export default function CustomerSearchCardClassic({
  customerKeyword,
  setCustomerKeyword,
  customerResults,
  customerLoading,
  customerSearched,
  selectedCustomer,
  setSelectedCustomer,
  searchCustomers,
  onAddNew,
  onEditSelected,
}: CustomerSearchCardClassicProps) {
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

  return (
    <div className="bg-white rounded-2xl border border-[#DDE4EE] shadow-[0_4px_16px_rgba(15,23,42,0.05)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E8EDF4] flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] border border-[#D9E2F7] flex items-center justify-center">
          <Users size={16} className="text-[#667BE5]" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900">
            Customer Search
          </div>
          <div className="text-[11px] text-slate-500">
            Search by mobile or customer name
          </div>
        </div>
      </div>

      <div className="p-3">
        {/* Search Box */}
        <div className="relative mb-3">
          <input
            value={customerKeyword}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                searchCustomers?.();
              }
            }}
            placeholder="Enter mobile or name"
            className="w-full h-11 rounded-xl border border-[#D6DEE9] bg-white px-3 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C9D5F7] focus:border-[#BFD0F7]"
          />

          <button
            type="button"
            onClick={searchCustomers}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-gradient-to-r from-[#667BE5] via-[#6D66CA] to-[#744FA9]  text-white flex items-center justify-center hover:brightness-105 active:scale-[0.99] transition"
            title="Search Customer"
          >
            <Search size={14} />
          </button>
        </div>

        {/* Results */}
        <div className="relative">
          {customerLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-xl">
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#667BE5] border-t-transparent rounded-full animate-spin"></div>
                <div className="text-xs text-slate-500">Searching...</div>
              </div>
            </div>
          )}

          <div className="min-h-[110px] max-h-[180px] overflow-y-auto pr-1 space-y-2">
            {!customerLoading &&
              customerResults?.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCustomer?.(c)}
                    className={[
                      "w-full rounded-xl border px-3 py-2 text-left transition",
                      isSelected
                        ? "border-[#BFE8CC] bg-[#EAF9EF] shadow-sm"
                        : "border-[#E1E7F0] bg-[#F8FAFC] hover:bg-white hover:border-[#D4DDEA]",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div
                        className={`text-sm font-semibold truncate ${
                          isSelected ? "text-[#136C3D]" : "text-slate-800"
                        }`}
                      >
                        {c.name} || {c.mobile || "No mobile"}
                      </div>
                    </div>
                  </button>
                );
              })}

            {!customerLoading &&
              customerSearched &&
              customerResults?.length === 0 &&
              !selectedCustomer && (
                <div className="rounded-xl border border-[#F6D58E] bg-[#FFF8E7] px-3 py-4 text-center text-sm text-amber-700 font-medium">
                  No customer found
                </div>
              )}
          </div>

          {customerSearched && (
            <div className="mt-3">
              {selectedCustomer && selectedCustomer.id !== 1 && (
                <button
                  type="button"
                  onClick={onEditSelected}
                  className="w-full rounded-xl border border-[#C9D5F7] bg-gradient-to-r from-[#EEF2FF] to-[#F5F3FF] px-3 py-2.5 text-sm font-semibold text-slate-800 hover:brightness-[0.99] active:scale-[0.99] transition flex items-center justify-center gap-2"
                >
                  <Edit size={15} className="text-[#667BE5]" />
                  Edit Customer
                </button>
              )}

              {!selectedCustomer && customerResults?.length === 0 && (
                <button
                  type="button"
                  onClick={onAddNew}
                  className="w-full rounded-xl bg-gradient-to-r from-[#667BE5] via-[#6D66CA] to-[#744FA9] px-3 py-2.5 text-sm font-semibold text-white hover:brightness-105 active:scale-[0.99] transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <Plus size={15} />
                  Add New Customer
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
