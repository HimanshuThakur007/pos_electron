import React from "react";
import {
  MonitorSmartphone,
  ArrowLeftRight,
  Briefcase,
  RefreshCcw,
  Truck,
} from "lucide-react";

export const MENU_ITEMS = [
  {
    title: "Sale Billing",
    description:
      "Create new sales, scan items, manage cart discounts, and generate printable receipts.",
    path: "/pos",
    icon: MonitorSmartphone,
    hoverBorder: "hover:border-blue-300",
    hoverShadow: "hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.2)]",
    bgGlow: "bg-blue-500",
    iconBg: "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-500/30",
  },
  {
    title: "Sync Dashboard",
    description:
      "Manage master data syncs and view locally available offline branches and schemes.",
    path: "/sync-dashboard",
    icon: RefreshCcw,
    hoverBorder: "hover:border-emerald-300",
    hoverShadow: "hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)]",
    bgGlow: "bg-emerald-500",
    iconBg:
      "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30",
  },
  {
    title: "Sale Return",
    description:
      "Process customer returns, adjust previous invoices, and manage refund documentation.",
    path: "/sale-return",
    icon: ArrowLeftRight,
    hoverBorder: "hover:border-purple-300",
    hoverShadow: "hover:shadow-[0_20px_40px_-15px_rgba(168,85,247,0.2)]",
    bgGlow: "bg-purple-500",
    iconBg:
      "bg-gradient-to-br from-purple-500 to-purple-700 shadow-purple-500/30",
  },
  {
    title: "B2B Sale",
    description:
      "Process wholesale transactions, manage bulk pricing, and generate B2B invoices.",
    path: "/b2b-sale",
    icon: Briefcase,
    hoverBorder: "hover:border-amber-300",
    hoverShadow: "hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.2)]",
    bgGlow: "bg-amber-500",
    iconBg:
      "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30",
  },
  {
    title: "Exchange",
    description:
      "Handle item exchanges, manage price differences, and update inventory seamlessly.",
    path: "/exchange",
    icon: RefreshCcw,
    hoverBorder: "hover:border-rose-300",
    hoverShadow: "hover:shadow-[0_20px_40px_-15px_rgba(244,63,94,0.2)]",
    bgGlow: "bg-rose-500",
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/30",
  },
  {
    title: "Stock Transfer",
    description:
      "Initiate and track stock movements between branches or warehouses.",
    path: "/stock-transfer",
    icon: Truck,
    hoverBorder: "hover:border-cyan-300",
    hoverShadow: "hover:shadow-[0_20px_40px_-15px_rgba(6,182,212,0.2)]",
    bgGlow: "bg-cyan-500",
    iconBg: "bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/30",
  },
];

interface MainMenuGridProps {
  onItemClick: (item: any) => void;
  buttonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  firstButtonRef: React.MutableRefObject<HTMLButtonElement | null>;
}

export default function MainMenuGrid({
  onItemClick,
  buttonRefs,
  firstButtonRef,
}: MainMenuGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
      {MENU_ITEMS.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            ref={(el) => {
              buttonRefs.current[index] = el;
              if (index === 0) {
                firstButtonRef.current = el;
              }
            }}
            onClick={() => onItemClick(item)}
            className={`group relative overflow-hidden rounded-2xl bg-white/90 border border-slate-200 p-6 hover:bg-white transition-all duration-300 ease-out transform-gpu hover:-translate-y-1 text-left flex flex-col focus:outline-none focus:ring-4 focus:ring-blue-400/50 focus:border-blue-400 ${item.hoverBorder} ${item.hoverShadow}`}
          >
            <div
              className={`absolute top-0 right-0 w-24 h-24 rounded-full transition-opacity duration-500 ease-out opacity-5 group-hover:opacity-10 pointer-events-none transform-gpu ${item.bgGlow}`}
            />
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-md ${item.iconBg}`}
            >
              <Icon size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {item.title}
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              {item.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
