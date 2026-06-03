import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

export function useSystemState(fyCode: string, onLogout?: () => void) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [syncMetrics, setSyncMetrics] = useState<any>(null);
  const [manualMode, setManualMode] = useState("online");
  const [currentTime, setCurrentTime] = useState(new Date());

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    return () => document.body.removeAttribute("data-theme");
  }, [theme]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (window.posApi) {
        window.posApi.triggerBackgroundSync(localStorage.getItem("fy_code"));
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let unsubscribe = () => {};
    if (window.posApi && window.posApi.onSyncStatusChange) {
      unsubscribe = window.posApi.onSyncStatusChange((payload: any) => {
        // Handle both legacy string payloads and new { status, metrics } objects
        if (typeof payload === "string") {
          setSyncStatus(payload);
        } else if (payload && payload.status) {
          setSyncStatus(payload.status);
          if (payload.metrics) setSyncMetrics(payload.metrics);
        }
      });
    }

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (fyCode && window.posApi) {
      window.posApi.triggerBackgroundSync(fyCode);
    }
  }, [fyCode]);

  const handleLogout = useCallback(async () => {
    if (window.posApi && (window.posApi as any).getPendingSyncCount) {
      try {
        const pendingCount = await (window.posApi as any).getPendingSyncCount(
          fyCode,
          { forLogout: true },
        );
        if (pendingCount > 0) {
          toast.error(
            `Cannot log out. ${pendingCount} item(s) have not been synced.`,
          );
          return;
        }
      } catch (error) {
        console.error("Failed to check for pending transactions:", error);
      }
    }
    onLogout?.();
  }, [onLogout, fyCode]);

  const handleSyncTransaction = useCallback(
    async (tx: any): Promise<boolean> => {
      if (window.posApi && window.posApi.syncSpecificTransaction) {
        try {
          const res = await window.posApi.syncSpecificTransaction(
            tx.bill_no,
            fyCode,
          );
          if (res.status === "success") {
            return true;
          } else {
            const errorMessage = res.message || "Unknown error";
            toast.error("Sync failed: " + errorMessage, { id: errorMessage });
            return false;
          }
        } catch (e: any) {
          toast.error("Sync failed: " + e.message, { id: e.message });
          return false;
        }
      }
      return false;
    },
    [fyCode],
  );

  return {
    theme,
    toggleTheme,
    isOnline,
    syncStatus,
    syncMetrics,
    manualMode,
    setManualMode,
    currentTime,
    handleLogout,
    handleSyncTransaction,
  };
}
