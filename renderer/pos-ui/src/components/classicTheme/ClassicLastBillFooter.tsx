import { Printer } from "lucide-react";
import { useMemo } from "react";

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
    let dateObj = new Date(t);

    // Handle SQLite UTC timestamp "YYYY-MM-DD HH:MM:SS" which might be parsed as local or invalid
    if (
      isNaN(dateObj.getTime()) ||
      (typeof t === "string" && t.includes(" ") && !t.includes("T"))
    ) {
      dateObj = new Date(String(t).replace(" ", "T") + "Z");
    }

    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } else {
      // Fallback: Strips the seconds from a raw time string like "10:20:30 AM" -> "10:20 AM"
      return typeof t === "string"
        ? t.replace(/(:\d{2})(?=\s?[a-zA-Z]{2}|$)/, "")
        : String(t);
    }
  } catch {
    return "--:--";
  }
}

function ShortcutChip({
  keyLabel,
  label,
  onClick,
}: {
  keyLabel: string;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="text-[11px] font-bold text-[#9DB0FF]">{keyLabel}</span>
      <span className="text-[11px] text-white/80 whitespace-nowrap">
        {label}
      </span>
    </>
  );
  const baseClass =
    "flex items-center gap-1.5 hover:bg-white/10 px-3 py-1.5 shrink-0 transition-colors focus:outline-none";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} cursor-pointer active:scale-95`}
      >
        {content}
      </button>
    );
  }
  return <div className={baseClass}>{content}</div>;
}

function BillStat({
  label,
  value,
  valueColor,
  hideClass,
}: {
  label: string;
  value: string;
  valueColor: string;
  hideClass: string;
}) {
  return (
    <>
      <span className={`${hideClass} text-white/30 px-1`}>|</span>
      <span className={`${hideClass} text-white/70`}>{label}:</span>
      <span className={`${hideClass} font-bold ${valueColor}`}>{value}</span>
    </>
  );
}

export default function LastBillFooter({
  lastBill,
  onReprintClick,
}: LastBillFooterProps) {
  const isMac = useMemo(
    () => navigator.userAgent.toUpperCase().indexOf("MAC") >= 0,
    [],
  );

  const triggerShortcut = (key: string, code: string, altKey = false) => {
    const target = document.activeElement || document.body;
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        code,
        altKey,
        bubbles: true,
      }),
    );
  };

  // console.log("Rendering ClassicLastBillFooter with lastBill:", lastBill);
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
              <div className="flex items-center gap-1.5 rounded-lg border border-[#2E3B57] bg-[#1B2A46] px-3 py-1.5 shrink-0 overflow-x-auto no-scrollbar text-[11px] whitespace-nowrap">
                <span className="text-white/70">Last Bill:</span>
                <span className="font-bold text-[#FFD36A]">
                  {lastBill.invoice || "-"}
                </span>

                <span className="text-white/30 px-1">|</span>
                <span className="font-semibold text-[#BFD3FF]">
                  {fmtTime(lastBill.time)}
                </span>

                {[
                  {
                    label: "Amt",
                    value: fmtMoney(lastBill.amount),
                    valueColor: "text-[#FFD36A]",
                    hideClass: "hidden sm:inline",
                  },
                  {
                    label: "Qty",
                    value: String(lastBill.qty ?? 0),
                    valueColor: "text-white",
                    hideClass: "hidden md:inline",
                  },
                  {
                    label: "Rcvd",
                    value: fmtMoney(lastBill.received),
                    valueColor: "text-[#86EFAC]",
                    hideClass: "hidden lg:inline",
                  },
                  {
                    label: "Change",
                    value: fmtMoney(lastBill.change),
                    valueColor: "text-[#FCA5A5]",
                    hideClass: "hidden xl:inline",
                  },
                ].map((stat, index) => (
                  <BillStat key={index} {...stat} />
                ))}
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center overflow-x-auto no-scrollbar rounded-lg border border-white/10 bg-black/20 divide-x divide-white/10 mr-2">
              {[
                {
                  keyLabel: "ESC",
                  label: "Search",
                  onClick: () => triggerShortcut("Escape", "Escape"),
                },
                {
                  keyLabel: isMac ? "⌥ K" : "ALT K",
                  label: "Calculator",
                  onClick: () => triggerShortcut("k", "KeyK", true),
                },
                {
                  keyLabel: "F2",
                  label: "Hold Bill",
                  onClick: () => triggerShortcut("F2", "F2"),
                },
                {
                  keyLabel: "F7",
                  label: "Customer",
                  onClick: () => triggerShortcut("F7", "F7"),
                },
                {
                  keyLabel: "F9",
                  label: "Payment",
                  onClick: () =>
                    window.dispatchEvent(new CustomEvent("openPaymentModal")),
                },
              ].map((shortcut, index) => (
                <ShortcutChip key={index} {...shortcut} />
              ))}
            </div>

            <button
              onClick={onReprintClick}
              type="button"
              className="h-9 rounded-xl border border-[#2E3B57] bg-white text-[#0F172A] hover:bg-slate-100 px-3 text-xs font-semibold flex items-center gap-2 shadow-sm transition"
              title="Reprint last/recent bill"
            >
              <Printer size={14} />
              <span>Reprint</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded">
                {isMac ? "⌥" : "Alt"} R
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
