import { useState, useEffect, useCallback, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ClassicPOSHeader from "../../components/classicTheme/ClassicPOSHeader";
import { HeaderPropsContext } from "../../context/HeaderContext";

interface MainLayoutProps {
  onLogout: () => void;
}

export default function MainLayout({ onLogout }: MainLayoutProps) {
  const location = useLocation();
  const { isServerOnline, isNetworkOnline } = useAuth();
  const [time, setTime] = useState(new Date());
  const [headerProps, setHeaderProps] = useState<any>({});

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const branchName = localStorage.getItem("branch_name") || "Market99";
  const branchCode = localStorage.getItem("branch_code") || "POS-001";
  const userName = localStorage.getItem("user_name") || "Cashier";
  const finYear =
    localStorage.getItem("fin_year") || localStorage.getItem("fy_code") || "01";

  const isMainMenu = location.pathname === "/";
  const isSyncDashboard = location.pathname === "/sync-dashboard";
  const isB2B = location.pathname === "/b2b-sale";

  // Bulletproof setter to prevent infinite loops from effect dependency thrashing
  const setHeaderPropsSafely = useCallback((newPropsOrUpdater: any) => {
    setHeaderProps((prev: any) => {
      const newProps =
        typeof newPropsOrUpdater === "function"
          ? newPropsOrUpdater(prev)
          : newPropsOrUpdater;
      if (!newProps) return {};
      const keys1 = Object.keys(prev);
      const keys2 = Object.keys(newProps);
      if (keys1.length !== keys2.length) return newProps;
      for (const key of keys1) {
        if (prev[key] !== newProps[key]) return newProps;
      }
      return prev; // Props are identical -> bail out of re-render
    });
  }, []);

  const contextValue = useMemo(
    () => ({ setHeaderProps: setHeaderPropsSafely }),
    [setHeaderPropsSafely],
  );

  return (
    <HeaderPropsContext.Provider value={contextValue}>
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
        <ClassicPOSHeader
          branchName={branchName}
          branchCode={branchCode}
          userName={userName}
          finYear={finYear}
          time={time}
          isServerOnline={isServerOnline}
          isNetworkOnline={isNetworkOnline}
          onLogout={onLogout}
          isMainMenu={isMainMenu}
          isSyncDashboard={isSyncDashboard}
          isB2B={isB2B}
          {...headerProps}
        />
        <div className="flex-1 overflow-auto relative flex flex-col">
          <Outlet />
        </div>
      </div>
    </HeaderPropsContext.Provider>
  );
}
