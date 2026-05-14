import {
  MdPause,
  MdVisibility,
  MdAddShoppingCart,
  MdReceipt,
  MdSync,
  MdPersonAdd,
  MdKeyboard,
  MdCalculate,
  MdDescription,
  MdPrint,
  MdScreenShare,
  MdCloudDone,
} from "react-icons/md";

interface PosActionButtonsProps {
  theme: "light" | "dark";
  setShowShortcuts: (show: boolean) => void;
  setShowCalculator: (show: boolean) => void;
  onOpenCustomerDisplay: () => void;
  onReprint: () => void;
  onShowTransactions: (filter?: string) => void;
  onHoldSale: () => void;
  onShowHeldSales: () => void;
  onNewSale: () => void;
  onSyncStock: () => void;
  hideCustomerButton?: boolean;
}

export default function PosActionButtons({
  //   theme,
  setShowShortcuts,
  setShowCalculator,
  onOpenCustomerDisplay,
  onReprint,
  onShowTransactions,
  onHoldSale,
  onShowHeldSales,
  onNewSale,
  onSyncStock,
  hideCustomerButton,
}: PosActionButtonsProps) {
  const buttons = [
    {
      label: "Hold Sale",
      icon: MdPause,
      color: "#f59e0b",
      onClick: onHoldSale,
    },
    {
      label: "View Hold",
      icon: MdVisibility,
      color: "#0ea5e9",
      onClick: onShowHeldSales,
    },
    {
      label: "New Sale",
      icon: MdAddShoppingCart,
      color: "#10b981",
      onClick: onNewSale,
    },
    {
      label: "Today's Sales",
      icon: MdReceipt,
      color: "#6366f1",
      onClick: () => onShowTransactions("today"),
    },
    {
      label: "Synced Bills",
      icon: MdCloudDone,
      color: "#0ea5e9",
      onClick: () => onShowTransactions(),
    },
    {
      label: "Sync Stock",
      icon: MdSync,
      color: "#8b5cf6",
      onClick: onSyncStock,
    },
    ...(hideCustomerButton
      ? []
      : [
          {
            label: "Add Customer",
            icon: MdPersonAdd,
            color: "#ec4899",
            onClick: () => {},
          },
        ]),
    {
      label: "Shortcuts",
      icon: MdKeyboard,
      color: "#64748b",
      onClick: () => setShowShortcuts(true),
    },
    {
      label: "Calculator",
      icon: MdCalculate,
      color: "#64748b",
      onClick: () => setShowCalculator(true),
    },
    {
      label: "Invoice",
      icon: MdDescription,
      color: "#64748b",
      onClick: () => {},
    },
    {
      label: "Cust. View",
      icon: MdScreenShare,
      color: "#059669",
      onClick: onOpenCustomerDisplay,
    },
  ];

  return (
    <div className="px-2 py-2">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(85px, 1fr))",
          gap: "0.5rem",
        }}
      >
        {buttons.map((btn, idx) => (
          <button
            key={idx}
            className="text-white shadow-sm flex flex-col items-center justify-center p-1 border-0 hover:brightness-110 transition-all active:scale-95"
            style={{
              backgroundColor: btn.color,
              height: "65px",
              borderRadius: "6px",
            }}
            onClick={btn.onClick}
          >
            <div className="mb-1 opacity-90">
              <btn.icon size={20} />
            </div>
            <span
              className="font-semibold leading-none text-center whitespace-nowrap"
              style={{ fontSize: "0.7rem" }}
            >
              {btn.label}
            </span>
          </button>
        ))}

        <button
          className="text-white shadow-sm flex flex-col items-center justify-center p-1 border-0 hover:brightness-110 transition-all active:scale-95"
          style={{
            backgroundColor: "#ef4444",
            height: "65px",
          }}
          onClick={onReprint}
        >
          <div className="mb-1 opacity-90">
            <MdPrint size={20} />
          </div>
          <span
            className="font-semibold leading-none text-center"
            style={{ fontSize: "0.7rem" }}
          >
            Reprint
          </span>
        </button>
      </div>
    </div>
  );
}
