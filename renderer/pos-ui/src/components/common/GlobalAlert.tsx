import { useState, useEffect } from "react";
import {
  MdWarning,
  MdInfo,
  MdCheckCircle,
  MdError,
  //   MdClose,
} from "react-icons/md";

type AlertType = "success" | "error" | "info" | "warning";

interface AlertOptions {
  message: string;
  type?: AlertType;
  title?: string;
  onClose?: () => void;
}

// Custom Event target for firing alerts anywhere without React Context
export const alertEventTarget = new EventTarget();

export function showDialog(
  message: string,
  type: AlertType = "info",
  title?: string,
  onClose?: () => void,
) {
  const event = new CustomEvent("show-alert", {
    detail: { message, type, title, onClose },
  });
  alertEventTarget.dispatchEvent(event);
}

export default function GlobalAlert() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);

  useEffect(() => {
    const handleShowAlert = (e: Event) => {
      const customEvent = e as CustomEvent<AlertOptions>;
      setOptions(customEvent.detail);
      setIsOpen(true);
    };

    alertEventTarget.addEventListener("show-alert", handleShowAlert);
    return () => {
      alertEventTarget.removeEventListener("show-alert", handleShowAlert);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (options?.onClose) {
      options.onClose(); // Triggers the scanner refocus securely!
    }
  };

  // Trap focus & allow 'Enter' to confirm
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown, { capture: true });
      return () =>
        window.removeEventListener("keydown", handleKeyDown, { capture: true });
    }
  }, [isOpen, options]);

  if (!isOpen || !options) return null;

  const { message, type = "info", title } = options;

  let Icon = MdInfo;
  let colorClass = "text-blue-600";
  let bgClass = "bg-blue-50/80 border-blue-100";
  let iconBgClass = "bg-blue-100";
  let btnClass =
    "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/30 focus:ring-blue-500";
  let defaultTitle = "Information";

  switch (type) {
    case "success":
      Icon = MdCheckCircle;
      colorClass = "text-emerald-600";
      bgClass = "bg-emerald-50/80 border-emerald-100";
      iconBgClass = "bg-emerald-100";
      btnClass =
        "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/30 focus:ring-emerald-500";
      defaultTitle = "Success";
      break;
    case "error":
      Icon = MdError;
      colorClass = "text-rose-600";
      bgClass = "bg-rose-50/80 border-rose-100";
      iconBgClass = "bg-rose-100";
      btnClass =
        "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/30 focus:ring-rose-500";
      defaultTitle = "Error";
      break;
    case "warning":
      Icon = MdWarning;
      colorClass = "text-amber-600";
      bgClass = "bg-amber-50/80 border-amber-100";
      iconBgClass = "bg-amber-100";
      btnClass =
        "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/30 focus:ring-amber-500";
      defaultTitle = "Warning";
      break;
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 p-4">
      <div
        className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-full max-w-sm overflow-hidden border border-slate-100/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-5 flex items-center gap-4 border-b ${bgClass}`}>
          <div className={`p-2.5 rounded-full shadow-sm ${iconBgClass}`}>
            <Icon className={`w-7 h-7 ${colorClass}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-[19px] font-bold text-slate-800 tracking-tight">
              {title || defaultTitle}
            </h3>
          </div>
        </div>
        <div className="p-6 bg-white">
          <p className="text-slate-600 text-[15.5px] leading-relaxed">
            {message}
          </p>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleClose}
            autoFocus
            className={`px-8 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${btnClass}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
