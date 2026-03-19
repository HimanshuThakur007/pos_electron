import { Printer } from "lucide-react";

interface LastBill {
  invoice?: string;
  time?: string | number | Date;
  amount?: number | string;
  qty?: number | string;
  received?: number | string;
  change?: number | string;
}

interface LastBillFooterProps {
  lastBill?: LastBill | null;
  onReprintClick?: () => void;
}

function fmtMoney(v: number | string | undefined) {
  const n = Number(v || 0);
  return `₹${n.toFixed(2)}`;
}

function fmtTime(t: string | number | Date | undefined) {
  if (!t) return "--:--";
  try {
    return new Date(t).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--:--";
  }
}

function StatChip({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
      <span className="text-[11px] text-white/70 whitespace-nowrap">
        {label}
      </span>
      <span className={`text-xs font-semibold whitespace-nowrap ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

function ShortcutChip({
  keyLabel,
  label,
}: {
  keyLabel: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 shrink-0">
      <span className="text-[11px] font-bold text-[#9DB0FF]">{keyLabel}</span>
      <span className="text-[11px] text-white/80 whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

export default function LastBillFooter({
  lastBill,
  onReprintClick,
}: LastBillFooterProps) {
  return (
    <div className="w-full z-[40] shrink-0">
      <div className="mx-0 border-t border-[#243553] bg-gradient-to-r from-[#0F203C] via-[#132744] to-[#172E4E]">
        <div className="px-3 py-2 flex items-center justify-between gap-3">
          {/* Left content */}
          <div className="min-w-0 flex items-center gap-2 flex-1 overflow-hidden">
            {!lastBill ? (
              <div className="text-sm text-white/70 truncate">
                No previous bill
              </div>
            ) : (
              <div className="min-w-0 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1.5 rounded-lg border border-[#2E3B57] bg-[#1B2A46] px-2.5 py-1.5 shrink-0">
                  <span className="text-[11px] text-white/70">Last Bill</span>
                  <span className="text-xs font-bold text-[#FFD36A] whitespace-nowrap">
                    {lastBill.invoice || "-"}
                  </span>
                </div>

                <StatChip
                  label="Time"
                  value={fmtTime(lastBill.time)}
                  valueClass="text-[#BFD3FF]"
                />

                <div className="hidden sm:block">
                  <StatChip
                    label="Bill Amount"
                    value={fmtMoney(lastBill.amount)}
                    valueClass="text-[#FFD36A]"
                  />
                </div>

                <div className="hidden md:block">
                  <StatChip
                    label="Qty"
                    value={String(lastBill.qty ?? 0)}
                    valueClass="text-white"
                  />
                </div>

                <div className="hidden lg:block">
                  <StatChip
                    label="Received"
                    value={fmtMoney(lastBill.received)}
                    valueClass="text-[#86EFAC]"
                  />
                </div>

                <div className="hidden xl:block">
                  <StatChip
                    label="Change"
                    value={fmtMoney(lastBill.change)}
                    valueClass="text-[#FCA5A5]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar border-l border-[#2E3B57] pl-3">
              <ShortcutChip keyLabel="ESC" label="Search" />
              <ShortcutChip keyLabel="ALT + K" label="Calculator" />
              <ShortcutChip keyLabel="F2" label="Hold Bill" />
              <ShortcutChip keyLabel="F7" label="Customer" />
              <ShortcutChip keyLabel="F9" label="Payment" />
            </div>

            <button
              onClick={onReprintClick}
              type="button"
              className="h-9 rounded-xl border border-[#2E3B57] bg-white text-[#0F172A] hover:bg-slate-100 px-3 text-xs font-semibold flex items-center gap-2 shadow-sm transition"
              title="Reprint last/recent bill"
            >
              <Printer size={14} />
              <span>Reprint</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
