import { useMemo, useState, useEffect, useRef } from "react";
import { Grid3X3, ChevronLeft, ChevronRight } from "lucide-react";

interface ActionItem {
  label: string;
  iconColor?: string;
  icon?: any;
  action?: () => void;
  shortcut?: string;
  disabled?: boolean;
}

interface ClassicQuickActionsPanelProps {
  leftActions?: ActionItem[];
  activeIndex?: number;
  onSelectAction?: (index: number, action: ActionItem) => void;
  collapsed?: boolean;
  showCollapse?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export default function ClassicQuickActionsPanel({
  leftActions = [],
  activeIndex: activeIndexProp,
  onSelectAction,
  collapsed,
  showCollapse = true,
  onToggleCollapse,
}: ClassicQuickActionsPanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(activeIndexProp);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    // Sync with prop if it's provided and changes
    if (activeIndexProp !== undefined) {
      setActiveIndex(activeIndexProp);
    }
  }, [activeIndexProp]);

  const getIconBgColor = (index: number) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-red-500",
      "bg-yellow-500",
      "bg-orange-500",
      "bg-cyan-500",
      "bg-lime-500",
      "bg-indigo-400",
      "bg-teal-400",
      "bg-orange-400",
    ];
    return colors[index % colors.length];
  };

  /* AUTO COLLAPSE ON SMALL SCREEN */

  useEffect(() => {
    if (typeof collapsed === "boolean") return;

    const handleResize = () => {
      if (window.innerWidth < 1400) {
        setInternalCollapsed(true);
      } else {
        setInternalCollapsed(false);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [collapsed]);

  /* GLOBAL KEYBOARD SHORTCUTS FOR ACTIONS */
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const matchedIndex = leftActions.findIndex((a) => {
        if (a.disabled) return false;
        if (!a.shortcut) return false;
        // Normalize shortcut for cross-platform consistency (Alt vs ⌥)
        const short = a.shortcut.toLowerCase().replace("⌥", "alt");
        if (short === e.key.toLowerCase()) return true;
        if (short.includes("alt+") && e.altKey) {
          return e.key.toLowerCase() === short.split("+")[1].trim();
        }
        return false;
      });

      if (matchedIndex !== -1) {
        e.preventDefault();
        setActiveIndex(matchedIndex);
        onSelectAction?.(matchedIndex, leftActions[matchedIndex]);
        leftActions[matchedIndex].action?.();
        buttonRefs.current[matchedIndex]?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [leftActions, onSelectAction]);

  const isCollapsed =
    typeof collapsed === "boolean" ? collapsed : internalCollapsed;

  const handleToggle = () => {
    const next = !isCollapsed;

    if (typeof onToggleCollapse === "function") {
      onToggleCollapse(next);
    } else {
      setInternalCollapsed(next);
    }
  };

  /* RESPONSIVE WIDTH */

  const panelColSpanClass = isCollapsed ? "col-span-1" : "col-span-2";

  const title = useMemo(
    () => (isCollapsed ? "Categories" : "Quick Categories"),
    [isCollapsed],
  );

  return (
    <div
      className={`${panelColSpanClass} h-full min-h-0 transition-all duration-200`}
    >
      <div className="h-full rounded-2xl border border-[#DDE4EE] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] overflow-hidden flex flex-col relative">
        {/* HEADER */}

        <div
          className={`border-b border-[#E8EDF4] font-bold text-slate-900 flex items-center gap-2 ${isCollapsed ? "px-2 py-2 justify-center" : "px-4 py-3"}`}
        >
          <Grid3X3 size={16} className="text-blue-600 shrink-0" />

          {!isCollapsed && <span className="text-sm">{title}</span>}
        </div>

        {/* CATEGORY LIST */}

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {leftActions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#DDE4EE] bg-[#F8FAFC] px-2 py-4 text-center text-xs text-slate-500">
              {isCollapsed ? "No items" : "No categories available"}
            </div>
          ) : (
            leftActions.map((a, idx) => {
              const isActive = idx === activeIndex;

              return (
                <button
                  key={idx}
                  ref={(el) => {
                    buttonRefs.current[idx] = el;
                  }}
                  disabled={a.disabled}
                  type="button"
                  title={a.shortcut ? `${a.label} (${a.shortcut})` : a.label}
                  onClick={() => {
                    setActiveIndex(idx);
                    onSelectAction?.(idx, a);
                    a.action?.();
                    buttonRefs.current[idx]?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setActiveIndex(undefined);
                      (e.target as HTMLElement).blur();
                    }
                  }}
                  className={[
                    "w-full rounded-xl border font-semibold transition flex",

                    isCollapsed
                      ? "flex-col items-center justify-center px-1 py-2.5 gap-1.5 text-center"
                      : "flex-row items-center text-left px-3 py-3 gap-2 text-sm",

                    a.disabled
                      ? "border-[#E1E7F0] bg-slate-50 text-slate-400 cursor-not-allowed opacity-70"
                      : isActive
                        ? "border-blue-300 bg-blue-50 text-slate-900 shadow-sm"
                        : "border-[#E1E7F0] bg-white text-slate-700 hover:bg-[#F8FAFC] hover:border-[#D4DDEA]",
                  ].join(" ")}
                >
                  {/* ICON */}

                  <div
                    className={[
                      "rounded-lg flex items-center justify-center shrink-0 border",

                      isCollapsed ? "w-7 h-7" : "w-6 h-6",

                      a.disabled
                        ? "bg-slate-200 border-slate-300"
                        : isActive
                          ? "bg-white border-blue-200"
                          : `${getIconBgColor(idx)} border-transparent`,
                    ].join(" ")}
                  >
                    {a.icon ? (
                      <a.icon
                        size={14}
                        className={
                          a.disabled
                            ? "text-slate-400 font-bold"
                            : isActive
                              ? "text-blue-600 font-bold"
                              : "text-white font-semibold"
                        }
                      />
                    ) : (
                      <span
                        className={`text-xs font-semibold ${isActive ? "text-slate-400" : "text-white"}`}
                      >
                        •
                      </span>
                    )}
                  </div>

                  {isCollapsed ? (
                    <span className="text-[10px] leading-tight w-full truncate px-0.5">
                      {a.label}
                    </span>
                  ) : (
                    <span className="flex-1 truncate">{a.label}</span>
                  )}

                  {!isCollapsed && a.shortcut && (
                    <kbd className="ml-auto hidden xl:inline-block px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded uppercase">
                      {a.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* COLLAPSE BUTTON */}

        {showCollapse && (
          <button
            type="button"
            onClick={handleToggle}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-10 h-14 rounded-xl bg-gradient-to-b from-[#6F86F8] to-[#5B6FE2] 
            text-white shadow-[0_8px_18px_rgba(91,111,226,0.35)] border border-white/40 flex items-center justify-center hover:brightness-105 transition"
            title={isCollapsed ? "Expand categories" : "Collapse categories"}
          >
            {isCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
