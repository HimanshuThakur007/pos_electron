import { useState, useEffect, useRef } from "react";
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
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function showDialog(
  message: string,
  type: AlertType = "info",
  title?: string,
  onClose?: () => void,
  onConfirm?: () => void,
  confirmText?: string,
  cancelText?: string,
) {
  const event = new CustomEvent("show-alert", {
    detail: {
      message,
      type,
      title,
      onClose,
      onConfirm,
      confirmText,
      cancelText,
    },
  });
  window.dispatchEvent(event);
}

export default function GlobalAlert() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleShowAlert = (e: Event) => {
      const customEvent = e as CustomEvent<AlertOptions>;
      setOptions(customEvent.detail);
      setIsOpen(true);
    };

    window.addEventListener("show-alert", handleShowAlert);
    return () => {
      window.removeEventListener("show-alert", handleShowAlert);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (options?.onClose) {
      options.onClose(); // Triggers the scanner refocus securely!
    }
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (options?.onConfirm) {
      options.onConfirm();
    }
  };

  // Trap focus & allow 'Enter' to confirm
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          if (
            options?.onConfirm &&
            document.activeElement === cancelBtnRef.current
          ) {
            handleClose();
          } else if (options?.onConfirm) {
            handleConfirm();
          } else {
            handleClose();
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
        } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          if (
            options?.onConfirm &&
            cancelBtnRef.current &&
            confirmBtnRef.current
          ) {
            e.preventDefault();
            if (document.activeElement === confirmBtnRef.current) {
              cancelBtnRef.current.focus();
            } else {
              confirmBtnRef.current.focus();
            }
          }
        }
      };
      window.addEventListener("keydown", handleKeyDown, { capture: true });
      return () =>
        window.removeEventListener("keydown", handleKeyDown, { capture: true });
    }
  }, [isOpen, options]);

  if (!isOpen || !options) return null;

  const {
    message,
    type = "info",
    title,
    onConfirm,
    confirmText,
    cancelText,
  } = options;

  let Icon = MdInfo;
  let colorClass = "text-blue-600";
  let iconBgClass = "bg-blue-100";
  let btnClass =
    "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/30 focus:ring-blue-500";
  let defaultTitle = "Information";

  switch (type) {
    case "success":
      Icon = MdCheckCircle;
      colorClass = "text-emerald-600";
      iconBgClass = "bg-emerald-100";
      btnClass =
        "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/30 focus:ring-emerald-500";
      defaultTitle = "Success";
      break;
    case "error":
      Icon = MdError;
      colorClass = "text-rose-600";
      iconBgClass = "bg-rose-100";
      btnClass =
        "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/30 focus:ring-rose-500";
      defaultTitle = "Error";
      break;
    case "warning":
      Icon = MdWarning;
      colorClass = "text-amber-600";
      iconBgClass = "bg-amber-100";
      btnClass =
        "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/30 focus:ring-amber-500";
      defaultTitle = "Warning";
      break;
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 p-4">
      <div
        className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 w-full max-w-[320px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-3 rounded-full ${iconBgClass}`}>
          <Icon className={`w-8 h-8 ${colorClass}`} />
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-slate-800">
            {title || defaultTitle}
          </div>
          <div className="text-sm font-medium text-slate-500 mt-1.5 leading-snug">
            {message}
          </div>
        </div>
        <div className="flex w-full gap-3 mt-2">
          {onConfirm && (
            <button
              ref={cancelBtnRef}
              onClick={handleClose}
              className="w-1/2 py-2.5 text-slate-700 bg-slate-200 hover:bg-slate-300 text-sm font-bold rounded-xl shadow-sm transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {cancelText || "Cancel"}
            </button>
          )}
          <button
            ref={confirmBtnRef}
            onClick={onConfirm ? handleConfirm : handleClose}
            autoFocus
            className={`flex-1 py-2.5 text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${btnClass}`}
          >
            {onConfirm ? confirmText || "Confirm" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
