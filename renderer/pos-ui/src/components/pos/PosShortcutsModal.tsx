import { MdKeyboard } from "react-icons/md";

interface PosShortcutsModalProps {
  show: boolean;
  onClose: () => void;
}

export default function PosShortcutsModal({
  show,
  onClose,
}: PosShortcutsModalProps) {
  if (!show) return null;

  const shortcuts = [
    { key: "F2", desc: "Edit Quantity (Selected Row)" },
    { key: "F3", desc: "Clear Cart" },
    { key: "F4", desc: "Remove Last Item" },
    { key: "F6", desc: "Toggle Calculator" },
    { key: "F8", desc: "Focus Product Table" },
    { key: "F10", desc: "Logout" },
    { key: "Alt + I", desc: "Increase Qty (+1)" },
    { key: "Alt + D", desc: "Decrease Qty (-1)" },
    { key: "Alt + Q", desc: "Edit Quantity" },
    { key: "Alt + P", desc: "Save & Print (Cash)" },
    { key: "Alt + H", desc: "Hold Sale" },
    { key: "↑ / ↓", desc: "Navigate Table" },
    { key: "Enter", desc: "Search Product" },
    { key: "Esc", desc: "Close Modals / Focus Search" },
  ];

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ zIndex: 1060, backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3 shadow-lg p-0 overflow-hidden"
        style={{ maxWidth: "600px", width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
          <div className="d-flex align-items-center gap-2">
            <MdKeyboard size={20} className="text-primary" />
            <h6 className="mb-0 fw-bold">Keyboard Shortcuts</h6>
          </div>
          <button className="btn-close" onClick={onClose}></button>
        </div>

        <div className="p-4">
          <div className="row g-3">
            {shortcuts.map((s, i) => (
              <div key={i} className="col-6">
                <div className="d-flex justify-content-between align-items-center p-2 border rounded bg-light bg-opacity-50">
                  <span className="small fw-medium text-secondary">
                    {s.desc}
                  </span>
                  <kbd
                    className="bg-white text-dark border shadow-sm fw-bold px-2 py-1"
                    style={{ fontSize: "0.75rem" }}
                  >
                    {s.key}
                  </kbd>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-top text-end bg-light">
          <button className="btn btn-primary px-4" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
