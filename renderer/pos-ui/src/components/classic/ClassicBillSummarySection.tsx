interface ClassicBillSummarySectionProps {
  summary?: {
    subtotal?: number | string;
    discount?: number | string;
    tax?: number | string;
    grandTotal?: number | string;
  };
  cartItems?: any[];
  totalQty?: number | string;
}

export default function ClassicBillSummarySection({
  summary,
  cartItems,
  totalQty,
}: ClassicBillSummarySectionProps) {
  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="text-sm font-semibold mb-2">Bill Summary</div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Items</span>
          <span>{cartItems?.length || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Qty</span>
          <span>{totalQty || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹ {Number(summary?.subtotal || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount</span>
          <span>- ₹ {Number(summary?.discount || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>₹ {Number(summary?.tax || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
          <span>Grand Total</span>
          <span>₹ {Number(summary?.grandTotal || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
