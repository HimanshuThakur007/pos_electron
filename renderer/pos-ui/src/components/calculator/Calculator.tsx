import React, { useState, useEffect, useCallback, useRef } from "react";
import { MdBackspace, MdHistory } from "react-icons/md";
import { RxCross2 } from "react-icons/rx";

interface CalculatorProps {
  onClose: () => void;
  show: boolean;
}

const Calculator: React.FC<CalculatorProps> = ({ onClose, show }) => {
  const [currentOperand, setCurrentOperand] = useState("0");
  const [previousOperand, setPreviousOperand] = useState("");
  const [operation, setOperation] = useState<string | undefined>(undefined);
  const [overwrite, setOverwrite] = useState(false);
  const [memory, setMemory] = useState<number>(0);
  const [history, setHistory] = useState<
    { equation: string; result: string }[]
  >([]);
  const [showHistory, setShowHistory] = useState(false);

  // Draggable state
  const calcRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState<{ x: number; y: number } | null>(null);

  // Center on show
  useEffect(() => {
    if (show && calcRef.current) {
      const calcWidth = calcRef.current.offsetWidth;
      const calcHeight = calcRef.current.offsetHeight;
      setPosition({
        x: window.innerWidth / 2 - calcWidth / 2,
        y: window.innerHeight / 2 - calcHeight / 2,
      });
    }
  }, [show]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    setIsDragging(true);
    setRel({
      x: e.pageX - position.x,
      y: e.pageY - position.y,
    });
  };

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !rel) return;
      e.preventDefault();
      setPosition({
        x: e.pageX - rel.x,
        y: e.pageY - rel.y,
      });
    },
    [isDragging, rel],
  );

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, onMouseMove, onMouseUp]);

  /* ---------------- Core Actions ---------------- */

  const evaluate = (prev: string, current: string, op: string): string => {
    const p = parseFloat(prev);
    const c = parseFloat(current);
    if (isNaN(p) || isNaN(c)) return "";
    let computation = 0;
    switch (op) {
      case "+":
        computation = p + c;
        break;
      case "-":
        computation = p - c;
        break;
      case "*":
        computation = p * c;
        break;
      case "/":
        if (c === 0) return "Error";
        computation = p / c;
        break;
    }
    return parseFloat(computation.toFixed(10)).toString();
  };

  const clear = useCallback(() => {
    setCurrentOperand("0");
    setPreviousOperand("");
    setOperation(undefined);
    setOverwrite(false);
  }, []);

  const deleteNumber = useCallback(() => {
    if (overwrite) {
      setCurrentOperand("0");
      setOverwrite(false);
      return;
    }
    if (currentOperand.length <= 1) {
      setCurrentOperand("0");
    } else {
      setCurrentOperand(currentOperand.slice(0, -1));
    }
  }, [currentOperand, overwrite]);

  const appendNumber = useCallback(
    (number: string) => {
      if (number === "." && currentOperand.includes(".")) return;
      if (number === "00" && currentOperand === "0") return;

      if (overwrite) {
        setCurrentOperand(number === "." ? "0." : number);
        setOverwrite(false);
      } else {
        setCurrentOperand(
          currentOperand === "0" && number !== "."
            ? number
            : currentOperand + number,
        );
      }
    },
    [currentOperand, overwrite],
  );

  const memoryAdd = useCallback(() => {
    const val = parseFloat(currentOperand);
    if (!isNaN(val)) {
      setMemory((m) => m + val);
      setOverwrite(true);
    }
  }, [currentOperand]);

  const memorySubtract = useCallback(() => {
    const val = parseFloat(currentOperand);
    if (!isNaN(val)) {
      setMemory((m) => m - val);
      setOverwrite(true);
    }
  }, [currentOperand]);

  const memoryRecall = useCallback(() => {
    setCurrentOperand(parseFloat(memory.toFixed(10)).toString());
    setOverwrite(true);
  }, [memory]);

  const memoryClear = useCallback(() => {
    setMemory(0);
  }, []);

  const percentage = () => {
    const current = parseFloat(currentOperand);
    if (isNaN(current)) return;

    if (
      previousOperand &&
      operation &&
      (operation === "+" || operation === "-")
    ) {
      const prev = parseFloat(previousOperand);
      const val = (prev * current) / 100;
      setCurrentOperand(parseFloat(val.toFixed(10)).toString());
    } else {
      setCurrentOperand(parseFloat((current / 100).toFixed(10)).toString());
    }
  };

  const compute = useCallback(() => {
    const prev = parseFloat(previousOperand);
    const current = parseFloat(currentOperand);
    if (isNaN(prev) || isNaN(current) || !operation) return;

    const result = evaluate(previousOperand, currentOperand, operation);
    setHistory((h) => [
      ...h,
      { equation: `${previousOperand} ${operation} ${currentOperand}`, result },
    ]);
    setCurrentOperand(result);
    setPreviousOperand("");
    setOperation(undefined);
    setOverwrite(true);
  }, [currentOperand, previousOperand, operation]);

  const chooseOperation = useCallback(
    (op: string) => {
      if (currentOperand === "Error") return;

      if (previousOperand === "") {
        setOperation(op);
        setPreviousOperand(currentOperand);
        setOverwrite(true);
        return;
      }

      if (overwrite) {
        setOperation(op);
        return;
      }

      if (operation) {
        const result = evaluate(previousOperand, currentOperand, operation);
        setHistory((h) => [
          ...h,
          {
            equation: `${previousOperand} ${operation} ${currentOperand}`,
            result,
          },
        ]);
        setCurrentOperand(result);
        setPreviousOperand(result);
        setOperation(op);
        setOverwrite(true);
      }
    },
    [currentOperand, previousOperand, operation, overwrite],
  );

  /* ---------------- Keyboard Support ---------------- */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!show) return;

      if (e.key >= "0" && e.key <= "9") appendNumber(e.key);
      if (e.key === ".") appendNumber(".");
      if (e.key === "=" || e.key === "Enter") {
        e.preventDefault();
        compute();
      }
      if (e.key === "Backspace") deleteNumber();
      if (["+", "-", "*", "/"].includes(e.key)) chooseOperation(e.key);
      if (e.key === "%") percentage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show, appendNumber, compute, deleteNumber, clear, chooseOperation]);

  if (!show) return null;

  /* ---------------- UI ---------------- */

  return (
    <div
      ref={calcRef}
      className="fixed shadow-2xl rounded-xl bg-slate-200 border-2 border-slate-400 overflow-hidden flex flex-col"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: showHistory ? "560px" : "320px",
        zIndex: 1050,
        transition: isDragging ? "none" : "width 0.2s ease-in-out",
      }}
    >
      {/* Header */}
      <div
        className="flex justify-between items-center px-4 py-2 bg-slate-800 border-b-2 border-slate-900 select-none cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
      >
        <span className="font-bold uppercase text-xs tracking-wider text-slate-300">
          POS Calculator
        </span>
        <div className="flex gap-2">
          <button
            className={`text-slate-400 hover:text-white transition p-1.5 rounded-md hover:bg-slate-700 active:scale-95 ${showHistory ? "bg-slate-700 text-white" : ""}`}
            onClick={() => setShowHistory(!showHistory)}
            title="History"
          >
            <MdHistory size={18} />
          </button>
          <button
            className="text-slate-400 hover:text-white transition p-1.5 rounded-md hover:bg-slate-700 active:scale-95"
            onClick={onClose}
          >
            <RxCross2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex bg-slate-200 h-full">
        {/* Left Side: Calculator Body */}
        <div className="w-[320px] shrink-0 flex flex-col">
          {/* Display */}
          <div className="p-4 text-right bg-slate-900 border-b-4 border-slate-400 shadow-inner relative">
            {memory !== 0 && (
              <div className="absolute top-2 left-3 text-xs font-bold text-rose-500 tracking-widest">
                M
              </div>
            )}
            <div className="text-slate-500 text-sm h-6 font-mono font-medium tracking-wider">
              {previousOperand} {operation}
            </div>
            <div className="text-4xl font-bold font-mono text-emerald-400 break-all tracking-widest drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
              {currentOperand}
            </div>
          </div>

          {/* Buttons */}
          <div className="p-4">
            <div className="grid grid-cols-4 gap-3">
              {/* Memory Math Row */}
              <button
                className="h-12 rounded-lg font-bold text-lg bg-slate-300 text-slate-800 shadow-[0_4px_0_#94a3b8] active:shadow-[0_0px_0_#94a3b8] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={memoryClear}
              >
                MC
              </button>
              <button
                className="h-12 rounded-lg font-bold text-lg bg-slate-300 text-slate-800 shadow-[0_4px_0_#94a3b8] active:shadow-[0_0px_0_#94a3b8] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={memoryRecall}
              >
                MR
              </button>
              <button
                className="h-12 rounded-lg font-bold text-lg bg-slate-300 text-slate-800 shadow-[0_4px_0_#94a3b8] active:shadow-[0_0px_0_#94a3b8] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={memorySubtract}
              >
                M−
              </button>
              <button
                className="h-12 rounded-lg font-bold text-lg bg-slate-300 text-slate-800 shadow-[0_4px_0_#94a3b8] active:shadow-[0_0px_0_#94a3b8] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={memoryAdd}
              >
                M+
              </button>

              {/* Top Row */}
              <button
                className="h-12 rounded-lg font-bold text-lg bg-rose-600 text-white shadow-[0_4px_0_#9f1239] active:shadow-[0_0px_0_#9f1239] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={clear}
              >
                AC
              </button>

              <button
                className="h-12 rounded-lg font-bold text-lg bg-amber-500 text-white shadow-[0_4px_0_#b45309] active:shadow-[0_0px_0_#b45309] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={deleteNumber}
              >
                <MdBackspace size={22} />
              </button>

              <button
                className="h-12 rounded-lg font-bold text-xl bg-slate-700 text-white shadow-[0_4px_0_#334155] active:shadow-[0_0px_0_#334155] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={percentage}
              >
                %
              </button>

              <button
                className="h-12 rounded-lg font-bold text-2xl bg-slate-700 text-white shadow-[0_4px_0_#334155] active:shadow-[0_0px_0_#334155] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={() => chooseOperation("/")}
              >
                ÷
              </button>

              {/* Numbers */}
              {["7", "8", "9"].map((n) => (
                <button
                  key={n}
                  className="h-12 rounded-lg font-bold text-2xl bg-slate-50 text-slate-800 shadow-[0_4px_0_#94a3b8] active:shadow-[0_0px_0_#94a3b8] active:translate-y-[4px] transition-all flex items-center justify-center"
                  onClick={() => appendNumber(n)}
                >
                  {n}
                </button>
              ))}
              <button
                className="h-12 rounded-lg font-bold text-2xl bg-slate-700 text-white shadow-[0_4px_0_#334155] active:shadow-[0_0px_0_#334155] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={() => chooseOperation("*")}
              >
                ×
              </button>

              {["4", "5", "6"].map((n) => (
                <button
                  key={n}
                  className="h-12 rounded-lg font-bold text-2xl bg-slate-50 text-slate-800 shadow-[0_4px_0_#94a3b8] active:shadow-[0_0px_0_#94a3b8] active:translate-y-[4px] transition-all flex items-center justify-center"
                  onClick={() => appendNumber(n)}
                >
                  {n}
                </button>
              ))}
              <button
                className="h-12 rounded-lg font-bold text-2xl bg-slate-700 text-white shadow-[0_4px_0_#334155] active:shadow-[0_0px_0_#334155] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={() => chooseOperation("-")}
              >
                −
              </button>

              {["1", "2", "3"].map((n) => (
                <button
                  key={n}
                  className="h-12 rounded-lg font-bold text-2xl bg-slate-50 text-slate-800 shadow-[0_4px_0_#94a3b8] active:shadow-[0_0px_0_#94a3b8] active:translate-y-[4px] transition-all flex items-center justify-center"
                  onClick={() => appendNumber(n)}
                >
                  {n}
                </button>
              ))}
              <button
                className="h-12 rounded-lg font-bold text-2xl bg-slate-700 text-white shadow-[0_4px_0_#334155] active:shadow-[0_0px_0_#334155] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={() => chooseOperation("+")}
              >
                +
              </button>

              {/* Last Row */}
              <button
                className="h-12 rounded-lg font-bold text-2xl bg-slate-50 text-slate-800 shadow-[0_4px_0_#94a3b8] active:shadow-[0_0px_0_#94a3b8] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={() => appendNumber("00")}
              >
                00
              </button>

              <button
                className="h-12 rounded-lg font-bold text-2xl bg-slate-50 text-slate-800 shadow-[0_4px_0_#94a3b8] active:shadow-[0_0px_0_#94a3b8] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={() => appendNumber("0")}
              >
                0
              </button>

              <button
                className="h-12 rounded-lg font-bold text-2xl bg-slate-400 text-slate-800 shadow-[0_4px_0_#64748b] active:shadow-[0_0px_0_#64748b] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={() => appendNumber(".")}
              >
                .
              </button>

              <button
                className="h-12 rounded-lg font-bold text-2xl bg-blue-600 text-white shadow-[0_4px_0_#1e40af] active:shadow-[0_0px_0_#1e40af] active:translate-y-[4px] transition-all flex items-center justify-center"
                onClick={compute}
              >
                =
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: History Drawer */}
        {showHistory && (
          <div className="w-[240px] shrink-0 border-l-2 border-slate-400 bg-slate-100 flex flex-col">
            <div className="px-4 py-3 bg-slate-300 border-b border-slate-400 flex justify-between items-center">
              <span className="font-bold text-sm text-slate-700 uppercase tracking-wider">
                History
              </span>
              <button
                onClick={() => setHistory([])}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
              >
                CLEAR
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[384px]">
              {history.length === 0 ? (
                <div className="text-center text-slate-400 text-sm mt-10 font-medium">
                  No history yet
                </div>
              ) : (
                history.map((h, i) => (
                  <div
                    key={i}
                    className="text-right border-b border-slate-200 pb-2 last:border-0"
                  >
                    <div className="text-xs text-slate-500 font-mono tracking-widest">
                      {h.equation} =
                    </div>
                    <div className="text-lg font-bold text-slate-800 font-mono tracking-wider">
                      {h.result}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calculator;
