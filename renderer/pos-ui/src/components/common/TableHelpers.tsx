import React from "react";

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className = "",
  ...props
}) => <td className={`px-4 py-3 ${className}`} {...props} />;

export const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-200 rounded-lg text-gray-800">
    {children}
  </kbd>
);

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isSelected: boolean;
  isDark: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  isSelected,
  isDark,
  className = "",
  ...props
}) => (
  <button
    className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-colors border ${
      isSelected
        ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
        : isDark
          ? "border-blue-400 text-blue-400 hover:bg-blue-400/10"
          : "border-blue-600 text-blue-600 hover:bg-blue-50"
    } ${className}`}
    {...props}
  />
);
