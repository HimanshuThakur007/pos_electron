import { useState } from "react";
import {
  Monitor,
  Home,
  // Power,
  Store,
  MonitorSmartphone,
  Clock3,
  Wifi,
  WifiOff,
  // Settings,
  Calendar,
  LogOut,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import mLogo from "../../assets/M_LOGO.png";
import SystemHealthModal from "../modals/SystemHealthModal";
// import { POS_UI_VARIANTS } from "../../uiRegistry";

interface ClassicPOSHeaderProps {
  user?: any;
  branchName?: string;
  branchCode?: string;
  userName?: string;
  finYear?: string;
  now?: Date;
  time?: Date;
  formatTime?: (date: Date) => string;
  formatDate?: (date: Date) => string;
  logout?: (options?: any) => void;
  onLogout?: () => void;
  stopAutoSync?: () => void;
  openCustomerDisplay?: () => void;
  displayConnected?: boolean;
  displayWindow?: boolean;
  onOpenSettings?: () => void;
  netOffline?: boolean;
  isServerOnline?: boolean;
  isNetworkOnline?: boolean;
  netMsg?: string;
  netBackOnline?: boolean;
  manualMode?: string;
  setManualMode?: (mode: string) => void;
  isB2B?: boolean;
  onEndDayClick?: () => void;
  isSyncDashboard?: boolean;
  isMainMenu?: boolean;
  syncStatus?: string;
  syncMetrics?: any;
}

export default function ClassicPOSHeader({
  user,
  branchName: propBranchName,
  branchCode: propBranchCode,
  userName: propUserName,
  finYear: propFinYear,
  now,
  time,
  formatTime,
  formatDate,
  logout,
  onLogout,
  stopAutoSync,

  openCustomerDisplay,
  displayConnected,
  displayWindow,
  // onOpenSettings,

  netOffline,
  isServerOnline,
  isNetworkOnline,
  // netMsg,
  // netBackOnline,
  manualMode,
  setManualMode,
  isB2B,
  onEndDayClick,
  isSyncDashboard,
  isMainMenu,
  syncStatus,
  syncMetrics,
}: ClassicPOSHeaderProps) {
  const [showHealthModal, setShowHealthModal] = useState(false);
  // const location = useLocation();
  const navigate = useNavigate();
  const goDashboard = () => navigate("/");

  const branchName = propBranchName || user?.branchName || "Market99";
  const branchCode = propBranchCode || user?.branchCode || "POS-001";
  const userName = propUserName || user?.userName || "Cashier";
  const finYear = propFinYear || user?.fin_year || user?.fy_code || "";

  const currentTime = time || now;

  const isOnline =
    isServerOnline !== undefined
      ? isServerOnline
      : netOffline
        ? false
        : manualMode === "online";

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else if (logout) {
      logout({ stopAutoSync });
    }
  };

  return (
    <header className="bg-[#0B1120] border-b border-slate-800 shadow-sm select-none w-full z-50 shrink-0">
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* LEFT: Logo & Metadata */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div
            className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity shrink-0"
            onClick={goDashboard}
            title="Go to Dashboard"
          >
            <img
              src={mLogo}
              alt="Market99 Logo"
              className="h-8 w-auto object-contain"
            />
          </div>

          {/* Offline Billing Badge for Main Menu */}
          {isMainMenu && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] select-none cursor-default">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-purple-400 drop-shadow-sm">
                Offline Billing
              </span>
            </div>
          )}

          {/* End Day */}
          {!isSyncDashboard && (
            <button
              onClick={onEndDayClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors"
              title="End Day"
              type="button"
            >
              <Store size={14} />
              <span className="text-xs font-bold hidden sm:inline">
                End Day
              </span>
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
            title="Logout (F10)"
            type="button"
          >
            <LogOut size={14} />
            <span className="text-xs font-bold hidden sm:inline">Logout</span>
          </button>

          <div className="h-5 w-px bg-slate-700/50 hidden lg:block" />

          {/* Metadata (Hidden on very small screens, falls back to bottom row) */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-medium text-slate-400">
            <div className="flex items-center gap-1.5" title="Branch">
              <Store size={14} className="text-slate-500" />
              <span className="max-w-[150px] truncate text-slate-300">
                {branchName}
              </span>
            </div>
            <div className="flex items-center gap-1.5" title="Terminal">
              <MonitorSmartphone size={14} className="text-slate-500" />
              <span className="text-slate-300">{branchCode}</span>
            </div>
            <div
              className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50"
              title="Cashier"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.4)]" />
              <span className="text-slate-200">{userName}</span>
            </div>
            {finYear && (
              <div className="flex items-center gap-1.5" title="Financial Year">
                <Calendar size={14} className="text-slate-500" />
                <span className="text-slate-300">{finYear}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Controls & Time */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          {/* Billing Mode Pill */}
          {isSyncDashboard ? (
            <div
              className="hidden sm:flex items-center px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 select-none cursor-default"
              title="Master Data / Sync Dashboard"
            >
              <Database size={12} className="mr-1.5 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Sync Dashboard
              </span>
            </div>
          ) : isMainMenu ? null : (
            <div
              className={`flex items-center px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-widest ${
                isB2B
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : "bg-blue-500/10 border-blue-500/20 text-blue-400"
              }`}
            >
              {isB2B ? "B2B Sale" : "Sale Billing"}
            </div>
          )}

          {!isMainMenu && (
            <div className="h-5 w-px bg-slate-700/50 hidden sm:block" />
          )}

          {/* Time */}
          <div className="hidden sm:flex items-center gap-2">
            <Clock3 size={14} className="text-slate-500" />
            <div className="flex flex-col justify-center text-right">
              <span className="text-xs font-bold text-slate-200 font-mono tracking-wide leading-none">
                {currentTime && formatTime
                  ? formatTime(currentTime)
                  : currentTime
                    ? currentTime.toLocaleTimeString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : ""}
              </span>
              <span className="text-[9px] text-slate-200 uppercase font-bold mt-1 leading-none">
                {currentTime && formatDate
                  ? formatDate(currentTime)
                  : currentTime
                    ? currentTime.toLocaleDateString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })
                    : ""}
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-700/50 hidden sm:block" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Background Sync Indicator */}
            {syncStatus && syncStatus !== "idle" && (
              <div
                className={`hidden sm:flex items-center gap-1.5 px-2.5 h-7 rounded border text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  syncStatus === "syncing"
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    : syncStatus === "synced"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}
                title={
                  syncMetrics
                    ? `Batches: ${syncMetrics.totalBatches}\nSynced: ${syncMetrics.totalSynced}\nErrors: ${syncMetrics.totalErrors}\nAvg Time: ${syncMetrics.avgSyncTimeMs}ms`
                    : "Background Sync Status"
                }
              >
                {syncStatus === "syncing" && (
                  <RefreshCw size={12} className="animate-spin" />
                )}
                {syncStatus === "synced" && <CheckCircle2 size={12} />}
                {syncStatus === "error" && <AlertCircle size={12} />}
                <span>
                  {syncStatus === "syncing"
                    ? `Syncing ${syncMetrics?.totalSynced !== undefined ? `(${syncMetrics.totalSynced})` : ""}`
                    : syncStatus === "synced"
                      ? "Synced"
                      : "Sync Error"}
                </span>
              </div>
            )}

            {/* System Health / Diagnostics */}
            <button
              type="button"
              onClick={() => setShowHealthModal(true)}
              className={`hidden sm:flex items-center justify-center w-7 h-7 rounded border transition-colors ${
                isServerOnline && isNetworkOnline
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20"
              }`}
              title="System Health Diagnostics"
            >
              <Activity size={14} strokeWidth={2.5} />
            </button>

            {/* Network Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = isOnline ? "offline" : "online";
                setManualMode?.(next);
              }}
              disabled={!setManualMode || isSyncDashboard || isMainMenu}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 h-7 rounded border text-[10px] font-bold uppercase tracking-wider transition-colors ${
                isServerOnline
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                  : isNetworkOnline
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
              }`}
              title="Toggle Network Mode"
            >
              {isServerOnline || isNetworkOnline ? (
                <Wifi size={13} strokeWidth={2.5} />
              ) : (
                <WifiOff size={13} strokeWidth={2.5} />
              )}
              <span>
                {isServerOnline
                  ? "Online"
                  : isNetworkOnline
                    ? "Server Down"
                    : "Offline"}
              </span>
            </button>

            {/* Display Toggle */}
            {!isSyncDashboard && !isMainMenu && (
              <button
                onClick={openCustomerDisplay}
                className={`p-1.5 rounded transition-colors border ${
                  displayConnected
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                    : displayWindow
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                }`}
                title="Customer Display"
                type="button"
              >
                <Monitor size={16} />
              </button>
            )}

            {/* Home */}
            {!isMainMenu &&
              (isSyncDashboard ? (
                <button
                  onClick={goDashboard}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                  title="Main Menu (ESC)"
                  type="button"
                >
                  <Home size={14} />
                  <span className="text-xs font-bold hidden sm:inline">
                    Home
                  </span>
                  <kbd className="hidden sm:inline-block ml-0.5 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400 bg-slate-900/50 border border-slate-700 rounded shadow-sm">
                    ESC
                  </kbd>
                </button>
              ) : (
                <button
                  onClick={goDashboard}
                  className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                  title="Main Menu"
                  type="button"
                >
                  <Home size={16} />
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Fallback Row (Hidden on LG and above) */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 border-t border-slate-800/50 bg-[#0F172A]">
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0" title="Branch">
            <Store size={12} className="text-slate-500" />
            <span className="text-slate-300">{branchName}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0" title="Terminal">
            <MonitorSmartphone size={12} className="text-slate-500" />
            <span className="text-slate-300">{branchCode}</span>
          </div>
          <div
            className="flex items-center gap-1.5 shrink-0 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50"
            title="Cashier"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.4)]" />
            <span className="text-slate-200">{userName}</span>
          </div>
        </div>

        <div className="sm:hidden flex items-center gap-1.5 shrink-0 text-xs font-mono font-bold text-slate-300">
          {currentTime && formatTime
            ? formatTime(currentTime)
            : currentTime
              ? currentTime.toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : ""}
        </div>
      </div>

      <SystemHealthModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        isServerOnline={isServerOnline}
        isNetworkOnline={isNetworkOnline}
      />
    </header>
  );
}
