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
      className="position-fixed shadow-lg rounded-4 bg-white border"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: "330px",
        zIndex: 1050,
      }}
    >
      {/* Header */}
      <div
        className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-light rounded-top"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown}
      >
        <span className="fw-bold text-uppercase small text-secondary">
          Calculator
        </span>
        <button className="btn btn-sm btn-link p-0" onClick={onClose}>
          <RxCross2 size={18} />
        </button>
      </div>

      {/* Display */}
      <div className="p-3 text-end bg-light border-bottom">
        <div className="text-muted small" style={{ minHeight: "18px" }}>
          {previousOperand} {operation}
        </div>
        <div className="fs-2 fw-bold text-dark text-break">
          {currentOperand}
        </div>
      </div>

      {/* Buttons */}
      <div className="p-2">
        <div className="row g-2">
          {/* Top Row */}
          <div className="col-3">
            <button
              className="btn btn-danger w-100 py-3 fw-bold"
              onClick={clear}
            >
              AC
            </button>
          </div>

          <div className="col-3">
            <button
              className="btn btn-light w-100 py-3 fw-bold"
              onClick={deleteNumber}
            >
              <MdOutlineDelete size={18} />
            </button>
          </div>

          <div className="col-3">
            <button
              className="btn btn-light w-100 py-3 fw-bold"
              onClick={percentage}
            >
              %
            </button>
          </div>

          <div className="col-3">
            <button
              className="btn btn-warning w-100 py-3 fw-bold"
              onClick={() => chooseOperation("/")}
            >
              ÷
            </button>
          </div>

          {/* Numbers */}
          {["7", "8", "9"].map((n) => (
            <div key={n} className="col-3">
              <button
                className="btn btn-outline-dark w-100 py-3 fw-bold"
                onClick={() => appendNumber(n)}
              >
                {n}
              </button>
            </div>
          ))}
          <div className="col-3">
            <button
              className="btn btn-warning w-100 py-3 fw-bold"
              onClick={() => chooseOperation("*")}
            >
              ×
            </button>
          </div>

          {["4", "5", "6"].map((n) => (
            <div key={n} className="col-3">
              <button
                className="btn btn-outline-dark w-100 py-3 fw-bold"
                onClick={() => appendNumber(n)}
              >
                {n}
              </button>
            </div>
          ))}
          <div className="col-3">
            <button
              className="btn btn-warning w-100 py-3 fw-bold"
              onClick={() => chooseOperation("-")}
            >
              −
            </button>
          </div>

          {["1", "2", "3"].map((n) => (
            <div key={n} className="col-3">
              <button
                className="btn btn-outline-dark w-100 py-3 fw-bold"
                onClick={() => appendNumber(n)}
              >
                {n}
              </button>
            </div>
          ))}
          <div className="col-3">
            <button
              className="btn btn-warning w-100 py-3 fw-bold"
              onClick={() => chooseOperation("+")}
            >
              +
            </button>
          </div>

          {/* Last Row */}
          <div className="col-3">
            <button
              className="btn btn-light w-100 py-3 fw-bold"
              onClick={toggleSign}
            >
              ±
            </button>
          </div>

          <div className="col-3">
            <button
              className="btn btn-outline-dark w-100 py-3 fw-bold"
              onClick={() => appendNumber("0")}
            >
              0
            </button>
          </div>

          <div className="col-3">
            <button
              className="btn btn-outline-dark w-100 py-3 fw-bold"
              onClick={() => appendNumber(".")}
            >
              .
            </button>
          </div>

          <div className="col-3">
            <button
              className="btn btn-primary w-100 py-3 fw-bold"
              onClick={compute}
            >
              =
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
