import React, { useMemo } from "react";
import { MdRestore } from "react-icons/md";
import BaseModal from "../common/BaseModal";
import { useTableNavigation } from "../../hooks/useTableNavigation";

interface HoldSalesModalProps {
  show: boolean;
  onClose: () => void;
  heldSales: any[];
  onResume: (sale: any) => void;
  theme: "light" | "dark";
}

interface HeldSaleRowProps {
  sale: any;
  index: number;
  isSelected: boolean;
  theme: "light" | "dark";
  onSelect: (index: number) => void;
  onResume: (sale: any) => void;
}

const HeldSaleRow = React.memo(
  ({
    sale,
    index,
    isSelected,
    theme,
    onSelect,
    onResume,
  }: HeldSaleRowProps) => {
    return (
      <tr
        id={`held-sale-row-${index}`}
        className={
          isSelected
            ? theme === "dark"
              ? "table-active"
              : "table-primary"
            : ""
        }
        style={{ cursor: "pointer" }}
        onClick={() => onSelect(index)}
        onDoubleClick={() => onResume(sale)}
      >
        <td>#{sale.id}</td>
        <td>{new Date(sale.created_at).toLocaleString()}</td>
        <td>{sale.customer_name}</td>
        <td>{sale.note || "-"}</td>
        <td className="text-end">{sale.total_qty}</td>
        <td className="text-end fw-bold">₹{sale.grand_total.toFixed(2)}</td>
        <td className="text-center">
          <button
            className={`btn btn-sm ${
              isSelected ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onResume(sale);
            }}
          >
            <MdRestore /> Resume
          </button>
        </td>
      </tr>
    );
  },
);

const COLUMNS = [
  { label: "ID" },
  { label: "Date" },
  { label: "Customer" },
  { label: "Note" },
  { label: "Items", className: "text-end" },
  { label: "Total", className: "text-end" },
  { label: "Action", className: "text-center" },
];

const HoldSalesModal: React.FC<HoldSalesModalProps> = ({
  show,
  onClose,
  heldSales,
  onResume,
  theme,
}) => {
  const { selectedIndex, setSelectedIndex } = useTableNavigation(
    heldSales,
    onResume,
    onClose,
    show,
    "held-sale-row",
  );

  const footer = useMemo(
    () => (
      <>
        <div className="small text-muted">
          <kbd>↑</kbd> <kbd>↓</kbd> Navigate &nbsp; <kbd>Enter</kbd> Resume
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
      title="Hold Sales"
      subTitle="Select a sale to resume (Enter)"
      theme={theme}
      footer={footer}
    >
      {heldSales.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <p className="mb-0">No held sales found.</p>
        </div>
      ) : (
        <table className={`table mb-0 ${theme === "dark" ? "table-dark" : ""}`}>
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
            {heldSales.map((sale, index) => (
              <HeldSaleRow
                key={sale.id}
                sale={sale}
                index={index}
                isSelected={index === selectedIndex}
                theme={theme}
                onSelect={setSelectedIndex}
                onResume={onResume}
              />
            ))}
          </tbody>
        </table>
      )}
    </BaseModal>
  );
};

export default HoldSalesModal;
