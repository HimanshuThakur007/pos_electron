import BaseModal from "../common/BaseModal";
import { useMemo } from "react";

interface PosShortcutsModalProps {
  show: boolean;
  onClose: () => void;
  theme?: "light" | "dark";
}

export default function PosShortcutsModal({
  show,
  onClose,
  theme = "light",
}: PosShortcutsModalProps) {
  const isMac = useMemo(
    () => navigator.userAgent.toUpperCase().indexOf("MAC") >= 0,
    [],
  );

  const shortcuts = [
    // General
    { key: "F1", desc: "Show Shortcuts" },
    { key: "F10", desc: "Logout" },
    { key: "Esc", desc: "Close Modals / Focus Search" },
    { key: "Enter", desc: "Search Product" },
    // Cart Navigation & Manipulation
    { key: "↑ / ↓", desc: "Navigate Cart Rows" },
    { key: "Alt Q", desc: "Focus Qty of Selected Item" },
    { key: "Alt I", desc: "Inc. Qty of Selected Item" },
    { key: "Alt D", desc: "Dec. Qty of Selected Item" },
    { key: "Shift D", desc: "Delete Selected Item" },
    // Billing & Sales
    { key: "F6", desc: "New Sale (Clear Cart)" },
    { key: "Alt P", desc: "Save & Print Bill (Cash)" },
    { key: "F2", desc: "Hold Current Sale" },
    { key: "F4", desc: "View Held Sales" },
    // Tools
    { key: "Alt K", desc: "Open Calculator" },
    { key: "Alt R", desc: "Reprint Bill" },
  ];

  const platformShortcuts = useMemo(() => {
    if (!isMac) return shortcuts;
    return shortcuts.map((s) => ({
      ...s,
      key: s.key.replace("Alt", "⌥"),
    }));
  }, [isMac, shortcuts]);

  return (
    <BaseModal
      show={show}
      onClose={onClose}
      title="Keyboard Shortcuts"
      theme={theme}
      width="600px"
      // footer={
      //   <button
      //     className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
      //     onClick={onClose}
      //   >
      //     Close
      //   </button>
      // }
    >
      <div className="grid grid-cols-2 gap-3">
        {platformShortcuts.map((s, i) => (
          <div
            key={i}
            className="flex justify-between items-center p-2 border rounded-lg bg-slate-50/50"
          >
            <span className="text-sm font-medium text-slate-600">{s.desc}</span>
            <kbd className="bg-white text-slate-800 border border-slate-200 shadow-sm font-bold px-2 py-1 rounded-md text-xs">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </BaseModal>
  );
}
