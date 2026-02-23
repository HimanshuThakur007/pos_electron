import React, { useEffect, useRef } from "react";

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
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ zIndex: 1060, backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`rounded-3 shadow-lg d-flex flex-column ${
          theme === "dark" ? "bg-dark text-light" : "bg-white text-dark"
        }`}
        style={{
          width: width,
          maxWidth: "95%",
          maxHeight: "85vh",
          outline: "none",
        }}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0 fw-bold">{title}</h5>
            {subTitle && <small className="text-muted">{subTitle}</small>}
          </div>
          <button
            className={`btn-close ${theme === "dark" ? "btn-close-white" : ""}`}
            onClick={onClose}
          ></button>
        </div>

        <div className="flex-grow-1 overflow-auto p-0">{children}</div>

        {footer && (
          <div className="p-3 border-top d-flex justify-content-between align-items-center">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseModal;
