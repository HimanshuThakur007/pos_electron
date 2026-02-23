import React, { useMemo } from "react";
import BaseModal from "../common/BaseModal";
import { useTableNavigation } from "../../hooks/useTableNavigation";

interface ProductSelectionModalProps {
  show: boolean;
  products: any[];
  theme?: "light" | "dark";
  onClose: () => void;
  onSelect: (item: any) => void;
}

const COLUMNS = [
  { label: "Code" },
  { label: "Name" },
  { label: "Stock", className: "text-end" },
  { label: "MRP", className: "text-end" },
];

interface ProductRowProps {
  item: any;
  index: number;
  isSelected: boolean;
  theme: "light" | "dark";
  onSelect: (index: number) => void;
  onConfirm: (item: any) => void;
}

const ProductRow = React.memo(
  ({
    item,
    index,
    isSelected,
    theme,
    onSelect,
    onConfirm,
  }: ProductRowProps) => {
    return (
      <tr
        id={`product-row-${index}`}
        className={
          isSelected
            ? theme === "dark"
              ? "table-active"
              : "table-primary"
            : ""
        }
        style={{ cursor: "pointer" }}
        onClick={() => onSelect(index)}
        onDoubleClick={() => onConfirm(item)}
      >
        <td>{item.itemCode}</td>
        <td>{item.itemName}</td>
        <td className="text-end">{item.Stock_Qty}</td>
        <td className="text-end">{item.Lot_MRP}</td>
      </tr>
    );
  },
);

const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
  show,
  products,
  onClose,
  onSelect,
  theme = "light",
}) => {
  const { selectedIndex, setSelectedIndex } = useTableNavigation(
    products,
    onSelect,
    onClose,
    show,
    "product-row",
  );

  const footer = useMemo(
    () => (
      <>
        <div className="small text-muted">
          <kbd>↑</kbd> <kbd>↓</kbd> Navigate &nbsp; <kbd>Enter</kbd> Select
          &nbsp; <kbd>Esc</kbd> Close
        </div>
        {/* <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button> */}
      </>
    ),
    [onClose],
  );

  const thClass = theme === "dark" ? "bg-secondary text-white" : "bg-light";

  return (
    <BaseModal
      show={show}
      onClose={onClose}
      title="Select Product"
      theme={theme}
      footer={footer}
      width="900px"
    >
      <table
        className={`table table-hover mb-0 ${theme === "dark" ? "table-dark" : ""}`}
      >
        <thead className="sticky-top" style={{ zIndex: 1 }}>
          <tr>
            {COLUMNS.map((col, index) => (
              <th key={index} className={`${thClass} ${col.className || ""}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((item, index) => (
            <ProductRow
              key={item.itemCode || index}
              item={item}
              index={index}
              isSelected={index === selectedIndex}
              theme={theme}
              onSelect={setSelectedIndex}
              onConfirm={onSelect}
            />
          ))}
        </tbody>
      </table>
    </BaseModal>
  );
};

export default ProductSelectionModal;
