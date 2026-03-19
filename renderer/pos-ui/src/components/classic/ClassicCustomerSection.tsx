interface Customer {
  name?: string;
  mobile?: string;
  [key: string]: any;
}

interface ClassicCustomerSectionProps {
  selectedCustomer?: Customer | null;
  onOpenCustomerModal?: () => void;
  onRemoveCustomer?: () => void;
}

export default function ClassicCustomerSection({
  selectedCustomer,
  onOpenCustomerModal,
  onRemoveCustomer,
}: ClassicCustomerSectionProps) {
  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Customer</div>
        <button
          type="button"
          onClick={onOpenCustomerModal}
          className="text-xs px-2 py-1 rounded border bg-white"
        >
          {selectedCustomer ? "Change" : "Select"}
        </button>
      </div>

      {selectedCustomer ? (
        <div className="text-sm space-y-1">
          <div className="font-medium">
            {selectedCustomer.name || "Customer"}
          </div>
          <div className="text-slate-600">{selectedCustomer.mobile || "-"}</div>

          <button
            type="button"
            onClick={onRemoveCustomer}
            className="text-xs mt-2 px-2 py-1 rounded border text-rose-600 border-rose-200"
          >
            Remove Customer
          </button>
        </div>
      ) : (
        <div className="text-sm text-slate-500">No customer selected</div>
      )}
    </div>
  );
}
