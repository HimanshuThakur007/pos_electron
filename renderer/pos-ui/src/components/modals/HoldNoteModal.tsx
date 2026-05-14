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
    <div className="flex justify-end gap-2 w-full">
      <button
        className={`px-4 py-2 rounded-lg font-medium ${
          theme === "dark"
            ? "bg-slate-700 hover:bg-slate-600 text-white"
            : "bg-gray-200 hover:bg-gray-300 text-gray-800"
        }`}
        onClick={onClose}
      >
        Cancel
      </button>
      <button
        className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        onClick={() => onConfirm(note)}
      >
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
      <div>
        <label
          className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
        >
          Enter a note (optional):
        </label>
        <input
          ref={inputRef}
          type="text"
          className={`block w-full px-3 py-2 rounded-md border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            theme === "dark"
              ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
              : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
          }`}
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
