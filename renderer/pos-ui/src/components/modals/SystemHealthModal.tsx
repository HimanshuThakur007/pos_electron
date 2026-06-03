import { useState, useEffect } from "react";
import {
  Activity,
  Database,
  Wifi,
  Server,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Cpu,
  RotateCcw,
  HardDrive,
} from "lucide-react";

interface SystemHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isServerOnline?: boolean;
  isNetworkOnline?: boolean;
}

export default function SystemHealthModal({
  isOpen,
  onClose,
  isServerOnline,
  isNetworkOnline,
}: SystemHealthModalProps) {
  const [dbStatus, setDbStatus] = useState<
    "checking" | "ok" | "error" | "warning"
  >("checking");
  const [pendingSyncs, setPendingSyncs] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [uptime, setUptime] = useState<string>("Calculating...");
  const [storageDetails, setStorageDetails] = useState<string>("Checking...");
  const [dbSize, setDbSize] = useState<string>("Checking...");

  const checkHealth = async () => {
    setIsRefreshing(true);
    setDbStatus("checking");

    let currentDbStatus: "checking" | "ok" | "error" | "warning" = "checking";

    try {
      // Check Local Database by querying pending syncs
      if (window.posApi && window.posApi.getPendingSyncCount) {
        const fyCode = localStorage.getItem("fy_code") || "";
        const count = await window.posApi.getPendingSyncCount(fyCode);
        setPendingSyncs(count);
        currentDbStatus = "ok";
      } else {
        currentDbStatus = "error";
      }

      // Check DB Size from Electron backend
      try {
        let sizeBytes = 0;
        if (window.posApi && (window.posApi as any).getDbSize) {
          sizeBytes = await (window.posApi as any).getDbSize();
        }
        if (sizeBytes > 0) {
          const sizeMB = sizeBytes / (1024 * 1024);
          setDbSize(`${sizeMB.toFixed(2)} MB`);

          // Trigger warning if SQLite database exceeds 500 MB
          if (sizeMB > 500 && currentDbStatus === "ok") {
            currentDbStatus = "warning";
          }
        } else {
          setDbSize("Unknown");
        }
      } catch (e) {
        setDbSize("Unknown");
      }

      setDbStatus(currentDbStatus);

      // Check Storage Quota (if supported)
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usageMB = estimate.usage
          ? (estimate.usage / (1024 * 1024)).toFixed(2)
          : "0";
        setStorageDetails(`${usageMB} MB used`);
      } else {
        setStorageDetails("Unknown");
      }

      // Calculate Renderer Uptime
      const uptimeMins = Math.floor(performance.now() / 60000);
      const hrs = Math.floor(uptimeMins / 60);
      const mins = uptimeMins % 60;
      setUptime(`${hrs}h ${mins}m`);
    } catch (err) {
      console.error("Health check failed", err);
      setDbStatus("error");
      setPendingSyncs(null);
      setDbSize("Unknown");
    } finally {
      setIsRefreshing(false);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isOpen) {
      checkHealth();
      // Auto-refresh the health metrics every 30 seconds
      interval = setInterval(() => {
        checkHealth();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const HealthCard = ({
    title,
    status,
    icon: Icon,
    detail,
  }: {
    title: string;
    status: "ok" | "error" | "warning" | "checking";
    icon: any;
    detail: string | number;
  }) => (
    <div className="flex items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
      <div
        className={`p-3 rounded-full mr-4 ${
          status === "ok"
            ? "bg-emerald-100 text-emerald-600"
            : status === "error"
              ? "bg-rose-100 text-rose-600"
              : status === "warning"
                ? "bg-amber-100 text-amber-600"
                : "bg-blue-100 text-blue-600"
        }`}
      >
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold text-slate-700">{title}</div>
        <div className="text-xs font-medium text-slate-500 mt-0.5">
          {detail}
        </div>
      </div>
      <div>
        {status === "ok" && (
          <CheckCircle2 className="text-emerald-500" size={20} />
        )}
        {status === "error" && (
          <AlertCircle className="text-rose-500" size={20} />
        )}
        {status === "warning" && (
          <AlertCircle className="text-amber-500" size={20} />
        )}
        {status === "checking" && (
          <RefreshCw className="text-blue-500 animate-spin" size={20} />
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
            <Activity className="text-blue-600" />
            System Diagnostics
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <HealthCard
            title="Internet Connection"
            icon={Wifi}
            status={isNetworkOnline ? "ok" : "error"}
            detail={
              isNetworkOnline ? "Connected to Network" : "No Internet Access"
            }
          />
          <HealthCard
            title="API Server Reachability"
            icon={Server}
            status={
              isServerOnline ? "ok" : isNetworkOnline ? "warning" : "error"
            }
            detail={
              isServerOnline ? "Server is responding" : "Server unreachable"
            }
          />
          <HealthCard
            title="Local Database"
            icon={Database}
            status={dbStatus}
            detail={
              dbStatus === "ok"
                ? `SQLite operational | Size: ${dbSize}`
                : dbStatus === "warning"
                  ? `High storage usage | Size: ${dbSize}`
                  : dbStatus === "checking"
                    ? "Verifying..."
                    : "Database Error"
            }
          />
          <HealthCard
            title="Sync Queue"
            icon={RefreshCw}
            status={
              pendingSyncs === 0
                ? "ok"
                : pendingSyncs === null
                  ? "checking"
                  : "warning"
            }
            detail={
              pendingSyncs === null
                ? "Calculating..."
                : `${pendingSyncs} transaction(s) pending`
            }
          />
          <HealthCard
            title="System Performance"
            icon={Cpu}
            status="ok"
            detail={`CPU Cores: ${navigator.hardwareConcurrency || "Unknown"} | Memory: ${(navigator as any).deviceMemory ? "~" + (navigator as any).deviceMemory + "GB+" : "Optimal"}`}
          />
          <HealthCard
            title="Uptime & Storage"
            icon={HardDrive}
            status="ok"
            detail={`Uptime: ${uptime} | Storage: ${storageDetails}`}
          />
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Terminal: {localStorage.getItem("terminal_code") || "A"} • v1.0.5
            </span>
            {lastChecked && (
              <span className="text-[10px] text-slate-400 mt-0.5">
                Last checked: {lastChecked.toLocaleTimeString()} (Auto-updating)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-3 py-2 bg-slate-200 border border-slate-300 shadow-sm rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-300 transition-colors"
              title="Soft Reload UI"
            >
              <RotateCcw size={14} /> Reload
            </button>
            <button
              onClick={checkHealth}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={isRefreshing ? "animate-spin" : ""}
              />{" "}
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
