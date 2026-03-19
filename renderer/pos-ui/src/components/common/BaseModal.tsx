import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface BaseModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  theme: "light" | "dark";
  width?: string;
  subTitle?: string;
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
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) {
      // Small timeout to ensure render before focus
      setTimeout(() => modalRef.current?.focus(), 50);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[1060] flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300"
      onClick={onClose}
    >
      <style>{`
        @keyframes modal-pop {
          0% { opacity: 0; transform: scale(0.95) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
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
          animation: "modal-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
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
            className={`p-2 rounded-full transition-all duration-200 ${
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
