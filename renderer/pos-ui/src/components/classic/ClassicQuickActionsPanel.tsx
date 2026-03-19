import { useMemo, useState, useEffect } from "react";
import { Grid3X3, ChevronLeft, ChevronRight } from "lucide-react";

interface ActionItem {
  label: string;
  icon?: any;
  action?: () => void;
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
  activeIndex = 0,
  onSelectAction,
  collapsed,
  showCollapse = true,
  onToggleCollapse,
}: ClassicQuickActionsPanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

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
      <div
        className="
                h-full
                rounded-2xl
                border border-[#DDE4EE]
                bg-white
                shadow-[0_4px_16px_rgba(15,23,42,0.05)]
                overflow-hidden
                flex
                flex-col
                relative
            "
      >
        {/* HEADER */}

        <div
          className={`
                        border-b border-[#E8EDF4]
                        font-bold text-slate-900
                        flex items-center gap-2
                        ${
                          isCollapsed ? "px-2 py-2 justify-center" : "px-4 py-3"
                        }
                    `}
        >
          <Grid3X3 size={16} className="text-[#667BE5] shrink-0" />

          {!isCollapsed && <span className="text-sm">{title}</span>}
        </div>

        {/* CATEGORY LIST */}

        <div
          className="
                        flex-1
                        overflow-y-auto
                        p-2
                        space-y-2
                    "
        >
          {leftActions.length === 0 ? (
            <div
              className="
                            rounded-xl
                            border border-dashed border-[#DDE4EE]
                            bg-[#F8FAFC]
                            px-2
                            py-4
                            text-center
                            text-xs
                            text-slate-500
                        "
            >
              {isCollapsed ? "No items" : "No categories available"}
            </div>
          ) : (
            leftActions.map((a, idx) => {
              const isActive = idx === activeIndex;

              return (
                <button
                  key={idx}
                  type="button"
                  title={a.label}
                  onClick={() => {
                    onSelectAction?.(idx, a);
                    a.action?.();
                  }}
                  className={[
                    "w-full rounded-xl border font-semibold transition flex items-center text-left",

                    isCollapsed
                      ? "px-2 py-3 justify-center"
                      : "px-3 py-3 gap-2 text-sm",

                    isActive
                      ? "border-[#C9D5F7] bg-gradient-to-r from-[#EEF2FF] to-[#F5F3FF] text-slate-900 shadow-sm"
                      : "border-[#E1E7F0] bg-white text-slate-700 hover:bg-[#F8FAFC] hover:border-[#D4DDEA]",
                  ].join(" ")}
                >
                  {/* ICON */}

                  <div
                    className={[
                      "rounded-lg flex items-center justify-center shrink-0 border",

                      isCollapsed ? "w-7 h-7" : "w-6 h-6",

                      isActive
                        ? "bg-white border-[#D8E1F4]"
                        : "bg-[#F8FAFC] border-[#E6ECF4]",
                    ].join(" ")}
                  >
                    {a.icon ? (
                      <a.icon
                        size={14}
                        className={
                          isActive ? "text-[#667BE5]" : "text-slate-500"
                        }
                      />
                    ) : (
                      <span className="text-xs text-slate-400">•</span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <span className="flex-1 truncate">{a.label}</span>
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
            className="
                            absolute
                            right-0
                            top-1/2
                            -translate-y-1/2
                            translate-x-1/2
                            w-10
                            h-14
                            rounded-xl
                            bg-gradient-to-b
                            from-[#6F86F8]
                            to-[#5B6FE2]
                            text-white
                            shadow-[0_8px_18px_rgba(91,111,226,0.35)]
                            border border-white/40
                            flex
                            items-center
                            justify-center
                            hover:brightness-105
                            transition
                        "
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
