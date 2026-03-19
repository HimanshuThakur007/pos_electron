import { X, Monitor, Printer, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
// import ClassicImage from "../../../src/assets/classic_theme.png";
// import DefaultImage from "../../../public/default_theme.png";

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
  uiVariant: string;
  changeUIVariant: (variant: string) => void;
  printFormat?: string;
  changePrintFormat?: (format: string) => void;
  returnFocusRef: React.RefObject<HTMLElement>;
}

export default function SettingsModal({
  show,
  onClose,
  uiVariant,
  changeUIVariant,
  printFormat,
  changePrintFormat,
  returnFocusRef,
}: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [activeOption, setActiveOption] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const restoreFocus = () => {
    requestAnimationFrame(() => {
      returnFocusRef?.current?.focus?.();
    });
  };
  const sections = useMemo<
    {
      id: string;
      name: string;
      icon: any;
      options: { value: string; label: string; image?: string }[];
      currentValue?: string;
      setter?: (val: string) => void;
    }[]
  >(
    () => [
      {
        id: "ui",
        name: "POS UI",
        icon: Monitor,
        options: [
          {
            value: "classic",
            label: "Classic",
            // image: ClassicImage,
            image: "/src/assets/classic_theme.png",
            // image: "https://placehold.co/300x200/4f46e5/white?text=Classic+UI",
          },
          {
            value: "default",
            label: "Market99",
            image: "/src/assets/default_theme.png",
            // image: DefaultImage,
            // image: "https://placehold.co/300x200/2563eb/white?text=Default+UI",
          },
        ],
        currentValue: uiVariant,
        setter: changeUIVariant,
      },
      {
        id: "print",
        name: "Print Format",
        icon: Printer,
        options: [
          { value: "print1", label: "Single Line" },
          { value: "print2", label: "Double Line" },
        ],
        currentValue: printFormat,
        setter: changePrintFormat,
      },
    ],
    [uiVariant, printFormat, changeUIVariant, changePrintFormat],
  );

  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setActiveSection((prev) => {
            const newSection = prev > 0 ? prev - 1 : sections.length - 1;
            setActiveOption((opt) => {
              const count = sections[newSection].options.length;
              return Math.min(opt, count - 1);
            });
            return newSection;
          });
          break;

        case "ArrowDown":
          e.preventDefault();
          setActiveSection((prev) => {
            const newSection = prev < sections.length - 1 ? prev + 1 : 0;
            setActiveOption((opt) => {
              const count = sections[newSection].options.length;
              return Math.min(opt, count - 1);
            });
            return newSection;
          });
          break;

        case "ArrowLeft":
          e.preventDefault();
          setActiveOption((prev) => {
            const optionsCount = sections[activeSection].options.length;
            return prev > 0 ? prev - 1 : optionsCount - 1;
          });
          break;

        case "ArrowRight":
          e.preventDefault();
          setActiveOption((prev) => {
            const optionsCount = sections[activeSection].options.length;
            return prev < optionsCount - 1 ? prev + 1 : 0;
          });
          break;

        case "Enter":
          e.preventDefault();
          const section = sections[activeSection];
          section.setter?.(section.options[activeOption].value);
          const optionEl = optionRefs.current[activeSection]?.[activeOption];
          if (optionEl) {
            optionEl.classList.add("ring-2", "ring-indigo-300");
            setTimeout(() => {
              optionEl.classList.remove("ring-2", "ring-indigo-300");
            }, 180);
          }
          break;

        case "Escape":
          onClose();
          setTimeout(restoreFocus, 0);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show, activeSection, activeOption, onClose, sections]);

  useEffect(() => {
    if (show) {
      setActiveSection(0);
      setActiveOption(0);
      optionRefs.current = sections.map(() => []);
      setTimeout(() => modalRef.current?.focus(), 0);
    }
  }, [show, sections]);

  useEffect(() => {
    if (!show) {
      setTimeout(restoreFocus, 0);
    }
  }, [show]);

  useEffect(() => {
    const optionEl = optionRefs.current[activeSection]?.[activeOption];
    if (optionEl && typeof optionEl.scrollIntoView === "function") {
      optionEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeSection, activeOption]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={() => {
        onClose();
        restoreFocus();
      }}
    >
      <div
        ref={modalRef}
        tabIndex={0}
        className="bg-white w-[700px] rounded-xl shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="POS Configuration Modal"
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
          <div className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Monitor size={22} className="text-indigo-600" />
            POS Configuration
          </div>
          <button
            onClick={() => {
              onClose();
              restoreFocus();
            }}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-slate-600" />
          </button>
        </div>
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="border border-slate-300 px-2 py-0.5 rounded bg-white text-xs">
                ↑
              </span>
              <span className="border border-slate-300 px-2 py-0.5 rounded bg-white text-xs">
                ↓
              </span>
              <span className="ml-1">Sections</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="border border-slate-300 px-2 py-0.5 rounded bg-white text-xs">
                ←
              </span>
              <span className="border border-slate-300 px-2 py-0.5 rounded bg-white text-xs">
                →
              </span>
              <span className="ml-1">Options</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="border border-slate-300 px-3 py-0.5 rounded bg-white text-xs">
                Enter
              </span>
              <span className="ml-1">Select</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="border border-slate-300 px-3 py-0.5 rounded bg-white text-xs">
                Esc
              </span>
              <span className="ml-1">Close</span>
            </span>
          </div>
        </div>
        <div className="p-6 max-h-[55vh] overflow-y-auto bg-slate-50">
          <div className="space-y-6">
            {sections.map((section, sectionIndex) => {
              const SectionIcon = section.icon;
              const isSectionActive = activeSection === sectionIndex;
              return (
                <div key={section.id} className="space-y-3">
                  <h3
                    className={`text-sm font-bold border-b pb-1.5 mb-2 flex items-center justify-between ${isSectionActive ? "text-indigo-600 border-indigo-200" : "text-slate-700 border-slate-200"}`}
                  >
                    <span className="flex items-center gap-2">
                      <SectionIcon
                        size={16}
                        className={
                          isSectionActive ? "text-indigo-500" : "text-slate-500"
                        }
                      />
                      {section.name}
                    </span>
                    {isSectionActive && (
                      <span className="text-xs font-normal bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {section.options.map((opt, optionIndex) => {
                      const isSelected = section.currentValue === opt.value;
                      const isActive =
                        isSectionActive && activeOption === optionIndex;
                      return (
                        <div
                          key={optionIndex}
                          ref={(el) => {
                            if (!optionRefs.current[sectionIndex]) {
                              optionRefs.current[sectionIndex] = [];
                            }
                            optionRefs.current[sectionIndex][optionIndex] = el;
                          }}
                          onClick={() => {
                            if (typeof section.setter === "function") {
                              section.setter(opt.value);
                            }
                          }}
                          className={`group relative cursor-pointer rounded-xl border transition-all duration-200 overflow-hidden ${isActive ? "border-indigo-400 ring-2 ring-indigo-200" : "border-slate-200 hover:border-slate-300 hover:shadow-md"} ${isSelected ? "border-indigo-500 bg-indigo-50" : "bg-white"}`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow">
                              ✓
                            </div>
                          )}
                          {opt.image && (
                            <div className="bg-slate-100 flex items-center justify-center p-3">
                              <img
                                src={opt.image}
                                alt={opt.label}
                                className="h-24 object-contain transition-all duration-300 group-hover:scale-125"
                              />
                            </div>
                          )}
                          <div className="text-center py-3 font-medium text-slate-700">
                            {opt.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-6 py-4 bg-white border-t border-slate-200 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle size={14} className="text-amber-600" />
              <span className="text-slate-600">
                Tips: <b>↑/↓</b> sections • <b>←/→</b> options • <b>Enter</b>{" "}
                select • <b>Esc</b> close
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onClose();
                  restoreFocus();
                }}
                className="px-4 py-2 bg-red-600 text-sm font-medium text-white hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
