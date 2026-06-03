import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { showDialog } from "../components/common/GlobalAlert";

export function useMainMenuLogic(onLogoutProp: () => void) {
  const navigate = useNavigate();
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [showGstModal, setShowGstModal] = useState(false);
  const [showStartDayModal, setShowStartDayModal] = useState(false);
  const [showEndDayModal, setShowEndDayModal] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [pendingTxCount, setPendingTxCount] = useState(0);
  const [previousClosing, setPreviousClosing] = useState<number | null>(null);
  const [previousDifference, setPreviousDifference] = useState<number | null>(
    null,
  );
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [terminalCode, setTerminalCode] = useState("");
  const [finYear, setFinYear] = useState("");
  const [fyCode, setFyCode] = useState("");
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [forceEndDay, setForceEndDay] = useState(false);
  const [isDayEndedForToday, setIsDayEndedForToday] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    items: false,
    stock: false,
    schemes: false,
    branches: false,
  });

  const { isServerOnline, isNetworkOnline } = useAuth();

  useEffect(() => {
    setBranchName(localStorage.getItem("branch_name") || "Market99");
    setBranchCode(localStorage.getItem("branch_code") || "");
    setTerminalCode(localStorage.getItem("terminal_code") || "A");
    setFinYear(localStorage.getItem("fin_year") || "");
    setFyCode(localStorage.getItem("fy_code") || "");
    setUserId(localStorage.getItem("user_id") || "0");
    setUserName(localStorage.getItem("user_name") || "Cashier");
  }, []);

  const handleLogoutClick = useCallback(async () => {
    if (pendingTxCount > 0) {
      showDialog(
        `Cannot log out. ${pendingTxCount} transaction(s) have not been synced.`,
        "error",
        "Logout Restricted",
      );
      return;
    }
    onLogoutProp();
  }, [onLogoutProp, pendingTxCount]);

  // Check if Day Rollover occurred
  useEffect(() => {
    const checkRollover = () => {
      if (activeSession && !showEndDayModal) {
        const openTimeStr =
          activeSession.raw_opened_at ||
          activeSession.opened_at ||
          activeSession.created_at;
        if (openTimeStr) {
          let openDate = new Date();
          if (typeof openTimeStr === "number") {
            openDate = new Date(openTimeStr);
          } else if (typeof openTimeStr === "string") {
            const ddMatch = openTimeStr.match(/^(\d{2})-(\d{2})-(\d{4})/);
            if (ddMatch) {
              openDate = new Date(
                Number(ddMatch[3]),
                Number(ddMatch[2]) - 1,
                Number(ddMatch[1]),
              );
            } else {
              let str = openTimeStr;
              if (str.includes(" ") && !str.includes("T"))
                str = str.replace(" ", "T") + "Z";
              const d = new Date(str);
              if (!isNaN(d.getTime())) openDate = d;
            }
          }
          const today = new Date();
          openDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);

          if (openDate.getTime() < today.getTime()) {
            setForceEndDay(true);
            setShowEndDayModal(true);
          }
        }
      }
    };

    checkRollover(); // Check immediately when triggered
    const interval = setInterval(checkRollover, 60000); // Poll every minute instead of re-rendering every second
    return () => clearInterval(interval);
  }, [activeSession, showEndDayModal]);

  useEffect(() => {
    const checkSync = async () => {
      const todayStr = new Date().toDateString();
      setSyncStatus({
        items: localStorage.getItem("last_items_sync") === todayStr,
        stock:
          localStorage.getItem(`last_stock_sync_${branchCode}`) === todayStr,
        schemes: localStorage.getItem("last_schemes_sync") === todayStr,
        branches: localStorage.getItem("last_branches_sync") === todayStr,
      });

      if (window.posApi && (window.posApi as any).getPendingSyncCount) {
        try {
          const currentFyCode = localStorage.getItem("fy_code") || "";
          const count = await (window.posApi as any).getPendingSyncCount(
            currentFyCode,
            {
              strictlyPending: false,
              excludeFailed: false,
            },
          );
          setPendingTxCount(count);
        } catch (error) {
          console.error("Failed to get pending tx count:", error);
        }
      }
    };
    checkSync();
    const interval = setInterval(checkSync, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [branchCode]);

  // Automatically trigger sync processes when the system comes online
  useEffect(() => {
    if (isServerOnline && fyCode) {
      const triggerOnlineSyncs = async () => {
        try {
          if ((window as any).electron?.ipcRenderer?.invoke) {
            await (window as any).electron.ipcRenderer.invoke(
              "trigger-background-sync",
              fyCode,
            );
            await (window as any).electron.ipcRenderer.invoke(
              "trigger-invoice-sync",
            );
            await (window as any).electron.ipcRenderer.invoke(
              "trigger-shift-sync",
            );
          } else if (window.posApi) {
            if ((window.posApi as any).triggerBackgroundSync)
              await (window.posApi as any).triggerBackgroundSync(fyCode);
            if ((window.posApi as any).triggerInvoiceSync)
              await (window.posApi as any).triggerInvoiceSync();
            if ((window.posApi as any).triggerShiftSync)
              await (window.posApi as any).triggerShiftSync();
          }
        } catch (error) {
          console.error("Failed to trigger syncs on reconnect:", error);
        }
      };
      triggerOnlineSyncs();
    }
  }, [isServerOnline, fyCode]);

  useEffect(() => {
    firstButtonRef.current?.focus();
    buttonRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    const checkActiveSession = async () => {
      if (!branchCode || !terminalCode) return;
      try {
        const reqData = {
          branch_code: branchCode,
          terminal_code: terminalCode,
        };
        const res = (window as any).electron?.ipcRenderer?.invoke
          ? await (window as any).electron.ipcRenderer.invoke(
              "get-active-terminal-session",
              reqData,
            )
          : await (window as any).posApi?.getActiveTerminalSession?.(reqData);

        if (
          res?.success &&
          res?.session &&
          res.session.status?.toLowerCase() === "open"
        ) {
          setActiveSession(res.session);
          let isPastDay = false;
          if (res?.session?.isPreviousDay === true) {
            isPastDay = true;
          } else {
            const openTimeStr =
              res.session.raw_opened_at ||
              res.session.opened_at ||
              res.session.created_at;
            if (openTimeStr) {
              let openDate = new Date();
              if (typeof openTimeStr === "number")
                openDate = new Date(openTimeStr);
              else if (typeof openTimeStr === "string") {
                const ddMatch = openTimeStr.match(/^(\d{2})-(\d{2})-(\d{4})/);
                if (ddMatch) {
                  openDate = new Date(
                    Number(ddMatch[3]),
                    Number(ddMatch[2]) - 1,
                    Number(ddMatch[1]),
                  );
                } else {
                  let str = openTimeStr;
                  if (str.includes(" ") && !str.includes("T"))
                    str = str.replace(" ", "T") + "Z";
                  const d = new Date(str);
                  if (!isNaN(d.getTime())) openDate = d;
                }
              }
              const today = new Date();
              const openDay = new Date(
                openDate.getFullYear(),
                openDate.getMonth(),
                openDate.getDate(),
              ).getTime();
              const todayDay = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
              ).getTime();
              isPastDay = openDay < todayDay;
            }
          }
          if (isPastDay) {
            setForceEndDay(true);
            setShowEndDayModal(true);
            setShowStartDayModal(false);
          } else {
            setForceEndDay(false);
            setShowStartDayModal(false);
          }
          return;
        }
        if (
          res &&
          (!res.session || res.session.status?.toLowerCase() !== "open")
        ) {
          if (activeSession && activeSession.status?.toLowerCase() === "open")
            return;
          setActiveSession(null);
          setForceEndDay(false);
          const lastSessionRes = (window as any).electron?.ipcRenderer?.invoke
            ? await (window as any).electron.ipcRenderer.invoke(
                "get-last-closed-session",
                reqData,
              )
            : await (window as any).posApi?.getLastClosedSession?.(reqData);

          let dayEndedToday = false;
          if (lastSessionRes?.success && lastSessionRes?.session) {
            setPreviousClosing(lastSessionRes.session.closing_amount);
            setPreviousDifference(lastSessionRes.session.difference);

            const openTimeStr =
              lastSessionRes.session.raw_opened_at ||
              lastSessionRes.session.opened_at ||
              lastSessionRes.session.created_at;
            if (openTimeStr) {
              let openDate = new Date();
              if (typeof openTimeStr === "number")
                openDate = new Date(openTimeStr);
              else if (typeof openTimeStr === "string") {
                const ddMatch = openTimeStr.match(/^(\d{2})-(\d{2})-(\d{4})/);
                if (ddMatch) {
                  openDate = new Date(
                    Number(ddMatch[3]),
                    Number(ddMatch[2]) - 1,
                    Number(ddMatch[1]),
                  );
                } else {
                  let str = openTimeStr;
                  if (str.includes(" ") && !str.includes("T"))
                    str = str.replace(" ", "T") + "Z";
                  const d = new Date(str);
                  if (!isNaN(d.getTime())) openDate = d;
                }
              }
              const today = new Date();
              if (
                openDate.getDate() === today.getDate() &&
                openDate.getMonth() === today.getMonth() &&
                openDate.getFullYear() === today.getFullYear()
              ) {
                dayEndedToday = true;
              }
            }
          } else {
            setPreviousClosing(null);
            setPreviousDifference(null);
          }

          setIsDayEndedForToday(dayEndedToday);
          if (!dayEndedToday) {
            setShowStartDayModal(true);
          }
        }
      } catch (e) {
        console.error("❌ Failed to check active terminal session", e);
      }
    };
    checkActiveSession();
  }, [branchCode, terminalCode]);

  const handleStartDay = useCallback(
    async (openingBalance: number) => {
      try {
        const reqData = {
          user_id: Number(userId) || 0,
          branch_code: branchCode,
          terminal_code: terminalCode,
          opening_amount: openingBalance,
          notes: "Started day from Main Menu",
        };
        const res = (window as any).electron?.ipcRenderer?.invoke
          ? await (window as any).electron.ipcRenderer.invoke(
              "open-terminal-session",
              reqData,
            )
          : await (window as any).posApi?.openTerminalSession?.(reqData);

        if (res?.success) {
          setShowStartDayModal(false);
          toast.success("Day started successfully!");
          if (res.session) setActiveSession(res.session);
          else {
            const checkReq = {
              branch_code: branchCode,
              terminal_code: terminalCode,
            };
            const activeRes = (window as any).electron?.ipcRenderer?.invoke
              ? await (window as any).electron.ipcRenderer.invoke(
                  "get-active-terminal-session",
                  checkReq,
                )
              : await (window as any).posApi?.getActiveTerminalSession?.(
                  checkReq,
                );
            if (activeRes?.success && activeRes?.session)
              setActiveSession(activeRes.session);
          }
        } else {
          toast.error(
            "Failed to start day: " + (res?.error || "Unknown error"),
          );
        }
      } catch (err: any) {
        toast.error("Failed to start day: " + err.message);
      }
    },
    [userId, branchCode, terminalCode],
  );

  const handleEndDay = useCallback(
    async (
      closingBalance: number,
      expectedAmount: number = 0,
      difference: number = 0,
      notes: string = "Cash verified",
    ) => {
      try {
        if (!activeSession) {
          toast.error("No active session found.");
          return;
        }
        const reqData = {
          closing_amount: closingBalance,
          expected_amount: expectedAmount,
          difference: difference,
          terminal_id: activeSession.terminal_id,
          shift_id: activeSession.shift_id,
          notes: notes,
        };
        const res = (window as any).electron?.ipcRenderer?.invoke
          ? await (window as any).electron.ipcRenderer.invoke(
              "close-terminal-session",
              { id: activeSession.id, data: reqData },
            )
          : await (window as any).posApi?.closeTerminalSession?.(
              activeSession.id,
              reqData,
            );

        if (res?.success) {
          setShowEndDayModal(false);
          toast.success("Day ended successfully!");
          setActiveSession(null);
          setForceEndDay(false);
          setIsDayEndedForToday(true);
          onLogoutProp();
        } else {
          toast.error("Failed to end day: " + (res?.error || "Unknown error"));
        }
      } catch (err: any) {
        toast.error("Failed to end day: " + err.message);
      }
    },
    [activeSession, onLogoutProp],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showGstModal || showStartDayModal || showEndDayModal) return;
      if (e.key === "F10") {
        e.preventDefault();
        handleLogoutClick();
        return;
      }
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
        return;
      const activeIdx = buttonRefs.current.findIndex(
        (ref) => ref && ref === document.activeElement,
      );
      if (activeIdx === -1) {
        e.preventDefault();
        buttonRefs.current[0]?.focus();
        return;
      }
      let nextIdx = activeIdx;
      const columns = window.innerWidth >= 768 ? 3 : 1;
      if (e.key === "ArrowRight") nextIdx += 1;
      else if (e.key === "ArrowLeft") nextIdx -= 1;
      else if (e.key === "ArrowDown") nextIdx += columns;
      else if (e.key === "ArrowUp") nextIdx -= columns;
      if (nextIdx >= 0 && nextIdx < buttonRefs.current.length) {
        e.preventDefault();
        buttonRefs.current[nextIdx]?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showGstModal, showStartDayModal, showEndDayModal, handleLogoutClick]);

  const handleGstModalClose = useCallback(() => setShowGstModal(false), []);

  const handleGstModalSuccess = useCallback(
    (gstin: string, details: any) => {
      setShowGstModal(false);
      navigate("/b2b-sale", { state: { gstin, companyDetails: details } });
    },
    [navigate],
  );

  const handleMenuClick = async (item: any) => {
    if (forceEndDay && item.path !== "/sync-dashboard") {
      toast.error("Please end the previous day's session first.");
      setShowEndDayModal(true);
      return;
    }
    if (
      (!activeSession || activeSession.status?.toLowerCase() !== "open") &&
      (item.path === "/pos" || item.path === "/b2b-sale")
    ) {
      if (isDayEndedForToday) {
        showDialog(
          "Day has already been ended for today. You cannot start a new sale.",
          "error",
          "Day Ended",
        );
        return;
      }
      toast.error("Please start the day before starting a sale.");
      setShowStartDayModal(true);
      return;
    }
    if (item.path === "/pos" || item.path === "/b2b-sale") {
      const isB2B = item.path === "/b2b-sale";
      let toastId;
      try {
        if (window.posApi && (window.posApi as any).getLastSyncedInvoice) {
          toastId = toast.loading("Verifying invoice series...");
          await (window.posApi as any).getLastSyncedInvoice({
            branch_code: branchCode,
            terminal_code: terminalCode,
            fy_code: fyCode,
            cashier_id: userId,
            isB2B,
            doc_type: isB2B ? 2 : 1,
            isServerOnline,
          });
          toast.dismiss(toastId);
        }
      } catch (error) {
        console.error("Failed to verify invoice series", error);
        if (toastId) toast.dismiss(toastId);
      }
      if (isB2B) setShowGstModal(true);
      else navigate(item.path);
    } else {
      navigate(item.path);
    }
  };

  return {
    firstButtonRef,
    buttonRefs,
    showGstModal,
    showStartDayModal,
    showEndDayModal,
    activeSession,
    pendingTxCount,
    previousClosing,
    previousDifference,
    branchName,
    branchCode,
    terminalCode,
    finYear,
    fyCode,
    userId,
    userName,
    forceEndDay,
    syncStatus,
    isServerOnline,
    isNetworkOnline,
    setShowEndDayModal,
    setShowStartDayModal,
    handleLogoutClick,
    handleStartDay,
    handleEndDay,
    handleGstModalClose,
    handleGstModalSuccess,
    handleMenuClick,
  };
}
