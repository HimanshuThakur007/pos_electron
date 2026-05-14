import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface BaseModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  theme?: "light" | "dark";
  width?: string;
  subTitle?: string;
  onConfirm?: () => void;
}

const BaseModal: React.FC<BaseModalProps> = ({
  show,
  onClose,
  title,
  children,
  footer,
  theme,
  width = "800px",
  subTitle,
  onConfirm,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) {
      // Small timeout to ensure render before focus
      setTimeout(() => modalRef.current?.focus(), 50);
    }
  }, [show]);

  // Handle keyboard shortcuts for the modal
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && onConfirm) {
        e.preventDefault();
        e.stopPropagation(); // Prevent Enter from triggering other actions
        onConfirm();
      }
    };

    // Use capture phase to catch the event before other elements do
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [show, onClose, onConfirm]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[1060] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`relative flex flex-col rounded-2xl shadow-2xl outline-none overflow-hidden ${
          theme === "dark"
            ? "bg-slate-900 text-white border border-slate-700"
            : "bg-white text-slate-900 border border-slate-100"
        }`}
        style={{
          width: width,
          maxWidth: "95%",
          maxHeight: "85vh",
        }}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-3 border-b ${
            theme === "dark"
              ? "border-slate-800 bg-slate-900/50"
              : "border-slate-100 bg-white/80"
          }`}
        >
          <div>
            <h3 className="text-xl font-bold leading-tight tracking-tight">
              {title}
            </h3>
            {subTitle && (
              <p
                className={`text-sm mt-1 font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
              >
                {subTitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full ${
              theme === "dark"
                ? "hover:bg-slate-800 text-slate-400 hover:text-white active:bg-slate-700"
                : "hover:bg-slate-100 text-slate-400 hover:text-slate-900 active:bg-slate-200"
            }`}
          >
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className={`px-6 py-4 border-t flex items-center justify-end gap-3 ${
              theme === "dark"
                ? "border-slate-800 bg-slate-800/30"
                : "border-slate-100 bg-slate-50/80"
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseModal;
