import { useState, useEffect } from "react";

export function useTableNavigation<T>(
  items: T[],
  onSelect: (item: T) => void,
  onClose: () => void,
  show: boolean,
  idPrefix: string = "table-row",
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (show) {
      setSelectedIndex(0);
    }
  }, [show, items]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!show) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (items.length > 0) {
          onSelect(items[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show, items, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    if (show) {
      const row = document.getElementById(`${idPrefix}-`);
      row?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, show, idPrefix]);

  return { selectedIndex, setSelectedIndex };
}
