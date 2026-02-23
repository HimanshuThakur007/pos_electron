import React, { useState, useEffect, useRef } from "react";
import BaseModal from "../common/BaseModal";

interface HoldNoteModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
  theme: "light" | "dark";
}

const HoldNoteModal: React.FC<HoldNoteModalProps> = ({
  show,
  onClose,
  onConfirm,
  theme,
}) => {
  const [note, setNote] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show) {
      setNote("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [show]);

  const footer = (
    <div className="d-flex justify-content-end gap-2 w-100">
      <button className="btn btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button className="btn btn-primary" onClick={() => onConfirm(note)}>
        Confirm Hold
      </button>
    </div>
  );

  return (
    <BaseModal
      show={show}
      onClose={onClose}
      title="Hold Sale"
      theme={theme}
      width="400px"
      footer={footer}
    >
      <div className="p-3">
        <label className="form-label">Enter a note (optional):</label>
        <input
          ref={inputRef}
          type="text"
          className={`form-control ${theme === "dark" ? "bg-dark text-light border-secondary" : ""}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onConfirm(note);
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
          placeholder="e.g. Customer forgot wallet"
        />
      </div>
    </BaseModal>
  );
};

export default HoldNoteModal;
