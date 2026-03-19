interface ClassicPaymentSectionProps {
  tenderMode?: string;
  setTenderMode?: (mode: string) => void;
  amountReceived?: number | string;
  setAmountReceived?: (value: string) => void;
  balanceAmount?: number | string;
  onPayNow?: () => void;
  onHoldBill?: () => void;
  onOpenSplitPayment?: () => void;
}

export default function ClassicPaymentSection({
  tenderMode,
  setTenderMode,
  amountReceived,
  setAmountReceived,
  balanceAmount,
  onPayNow,
  onHoldBill,
  onOpenSplitPayment,
}: ClassicPaymentSectionProps) {
  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="text-sm font-semibold mb-2">Payment</div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          type="button"
          onClick={() => setTenderMode?.("cash")}
          className={`px-3 py-2 rounded border text-sm ${
            tenderMode === "cash" ? "bg-slate-800 text-white" : "bg-white"
          }`}
        >
          Cash
        </button>

        <button
          type="button"
          onClick={() => setTenderMode?.("card")}
          className={`px-3 py-2 rounded border text-sm ${
            tenderMode === "card" ? "bg-slate-800 text-white" : "bg-white"
          }`}
        >
          Card
        </button>

        <button
          type="button"
          onClick={() => setTenderMode?.("split")}
          className={`px-3 py-2 rounded border text-sm ${
            tenderMode === "split" ? "bg-slate-800 text-white" : "bg-white"
          }`}
        >
          Split
        </button>
      </div>

      <div className="space-y-2">
        <input
          type="number"
          value={amountReceived ?? ""}
          onChange={(e) => setAmountReceived?.(e.target.value)}
          placeholder="Amount Received"
          className="w-full border rounded px-3 py-2 text-sm"
        />

        <div className="flex justify-between text-sm">
          <span>Balance / Change</span>
          <span>₹ {Number(balanceAmount || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          type="button"
          onClick={onHoldBill}
          className="px-3 py-2 rounded border bg-white text-sm"
        >
          Hold
        </button>

        <button
          type="button"
          onClick={tenderMode === "split" ? onOpenSplitPayment : onPayNow}
          className="px-3 py-2 rounded bg-emerald-600 text-white text-sm font-medium"
        >
          {tenderMode === "split" ? "Split Pay" : "Pay Now"}
        </button>
      </div>
    </div>
  );
}
