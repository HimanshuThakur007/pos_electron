import React, { useState, useEffect, useCallback, useRef } from "react";
// import { X, Delete } from "lucide-react";
import { MdOutlineDelete } from "react-icons/md";
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

      if (overwrite) {
        setCurrentOperand(number);
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

  const toggleSign = () => {
    if (currentOperand === "0") return;
    setCurrentOperand((prev) =>
      prev.startsWith("-") ? prev.slice(1) : "-" + prev,
    );
  };

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
    if (isNaN(prev) || isNaN(current)) return;

    let result: number;

    switch (operation) {
      case "+":
        result = prev + current;
        break;
      case "-":
        result = prev - current;
        break;
      case "*":
        result = prev * current;
        break;
      case "/":
        if (current === 0) {
          setCurrentOperand("Error");
          setOverwrite(true);
          return;
        }
        result = prev / current;
        break;
      default:
        return;
    }

    setCurrentOperand(parseFloat(result.toFixed(10)).toString());
    setPreviousOperand("");
    setOperation(undefined);
    setOverwrite(true);
  }, [currentOperand, previousOperand, operation]);

  const chooseOperation = useCallback(
    (op: string) => {
      if (currentOperand === "Error") return;

      if (previousOperand !== "") {
        compute();
      }

      setOperation(op);
      setPreviousOperand(currentOperand);
      setOverwrite(true);
    },
    [currentOperand, previousOperand, compute],
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
      className="fixed shadow-2xl rounded-2xl bg-white border border-gray-200 overflow-hidden"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: "320px",
        zIndex: 1050,
      }}
    >
      {/* Header */}
      <div
        className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50 select-none"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown}
      >
        <span className="font-bold uppercase text-xs tracking-wider text-gray-500">
          Calculator
        </span>
        <button
          className="text-gray-400 hover:text-gray-600 transition p-1 rounded-md hover:bg-gray-200"
          onClick={onClose}
        >
          <RxCross2 size={18} />
        </button>
      </div>

      {/* Display */}
      <div className="p-4 text-right bg-gray-50/50 border-b border-gray-100">
        <div className="text-gray-400 text-sm h-6 font-medium">
          {previousOperand} {operation}
        </div>
        <div className="text-4xl font-bold text-gray-800 break-all tracking-tight">
          {currentOperand}
        </div>
      </div>

      {/* Buttons */}
      <div className="p-3 bg-white">
        <div className="grid grid-cols-4 gap-2">
          {/* Top Row */}
          <button
            className="h-14 rounded-xl font-bold text-lg bg-red-50 text-red-500 hover:bg-red-100 transition active:scale-95"
            onClick={clear}
          >
            AC
          </button>

          <button
            className="h-14 rounded-xl font-bold text-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition active:scale-95 flex items-center justify-center"
            onClick={deleteNumber}
          >
            <MdOutlineDelete size={22} />
          </button>

          <button
            className="h-14 rounded-xl font-bold text-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition active:scale-95"
            onClick={percentage}
          >
            %
          </button>

          <button
            className="h-14 rounded-xl font-bold text-xl bg-amber-100 text-amber-600 hover:bg-amber-200 transition active:scale-95"
            onClick={() => chooseOperation("/")}
          >
            ÷
          </button>

          {/* Numbers */}
          {["7", "8", "9"].map((n) => (
            <button
              key={n}
              className="h-14 rounded-xl font-bold text-xl text-gray-700 hover:bg-gray-50 border border-gray-100 transition active:scale-95"
              onClick={() => appendNumber(n)}
            >
              {n}
            </button>
          ))}
          <button
            className="h-14 rounded-xl font-bold text-xl bg-amber-100 text-amber-600 hover:bg-amber-200 transition active:scale-95"
            onClick={() => chooseOperation("*")}
          >
            ×
          </button>

          {["4", "5", "6"].map((n) => (
            <button
              key={n}
              className="h-14 rounded-xl font-bold text-xl text-gray-700 hover:bg-gray-50 border border-gray-100 transition active:scale-95"
              onClick={() => appendNumber(n)}
            >
              {n}
            </button>
          ))}
          <button
            className="h-14 rounded-xl font-bold text-xl bg-amber-100 text-amber-600 hover:bg-amber-200 transition active:scale-95"
            onClick={() => chooseOperation("-")}
          >
            −
          </button>

          {["1", "2", "3"].map((n) => (
            <button
              key={n}
              className="h-14 rounded-xl font-bold text-xl text-gray-700 hover:bg-gray-50 border border-gray-100 transition active:scale-95"
              onClick={() => appendNumber(n)}
            >
              {n}
            </button>
          ))}
          <button
            className="h-14 rounded-xl font-bold text-xl bg-amber-100 text-amber-600 hover:bg-amber-200 transition active:scale-95"
            onClick={() => chooseOperation("+")}
          >
            +
          </button>

          {/* Last Row */}
          <button
            className="h-14 rounded-xl font-bold text-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition active:scale-95"
            onClick={toggleSign}
          >
            ±
          </button>

          <button
            className="h-14 rounded-xl font-bold text-xl text-gray-700 hover:bg-gray-50 border border-gray-100 transition active:scale-95"
            onClick={() => appendNumber("0")}
          >
            0
          </button>

          <button
            className="h-14 rounded-xl font-bold text-xl text-gray-700 hover:bg-gray-50 border border-gray-100 transition active:scale-95"
            onClick={() => appendNumber(".")}
          >
            .
          </button>

          <button
            className="h-14 rounded-xl font-bold text-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 transition active:scale-95"
            onClick={compute}
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
