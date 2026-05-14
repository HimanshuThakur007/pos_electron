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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import mLogo from "../../assets/M_LOGO.png";
// import { POS_UI_VARIANTS } from "../../uiRegistry";

interface ClassicPOSHeaderProps {
  user?: any;
  now?: Date;
  formatTime?: (date: Date) => string;
  formatDate?: (date: Date) => string;
  logout?: (options?: any) => void;
  stopAutoSync?: () => void;
  openCustomerDisplay?: () => void;
  displayConnected?: boolean;
  displayWindow?: boolean;
  onOpenSettings: () => void;
  netOffline?: boolean;
  isServerOnline?: boolean;
  isNetworkOnline?: boolean;
  netMsg?: string;
  netBackOnline?: boolean;
  manualMode?: string;
  setManualMode?: (mode: string) => void;
  isB2B?: boolean;
  onEndDayClick?: () => void;
}

export default function ClassicPOSHeader({
  user,
  now,
  formatTime,
  formatDate,
  logout,
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
}: ClassicPOSHeaderProps) {
  // const location = useLocation();
  const navigate = useNavigate();
  const goDashboard = () => navigate("/");

  const branchName = user?.branchName || "Market99";
  const branchCode = user?.branchCode || "POS-001";
  const isOnline =
    isServerOnline !== undefined
      ? isServerOnline
      : netOffline
        ? false
        : manualMode === "online";

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

          {/* End Day */}
          <button
            onClick={onEndDayClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors"
            title="End Day"
            type="button"
          >
            <Store size={14} />
            <span className="text-xs font-bold hidden sm:inline">End Day</span>
          </button>

          {/* Logout */}
          <button
            onClick={() => logout?.({ stopAutoSync })}
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
              <span className="text-slate-200">
                {user?.userName || "Cashier"}
              </span>
            </div>
            {(user?.fin_year || user?.fy_code) && (
              <div className="flex items-center gap-1.5" title="Financial Year">
                <Calendar size={14} className="text-slate-500" />
                <span className="text-slate-300">
                  {user?.fin_year || user?.fy_code}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Controls & Time */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          {/* Billing Mode Pill */}
          <div
            className={`flex items-center px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-widest ${
              isB2B
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-blue-500/10 border-blue-500/20 text-blue-400"
            }`}
          >
            {isB2B ? "B2B Sale" : "Sale Billing"}
          </div>

          <div className="h-5 w-px bg-slate-700/50 hidden sm:block" />

          {/* Time */}
          <div className="hidden sm:flex items-center gap-2">
            <Clock3 size={14} className="text-slate-500" />
            <div className="flex flex-col justify-center text-right">
              <span className="text-xs font-bold text-slate-200 font-mono tracking-wide leading-none">
                {now && formatTime ? formatTime(now) : ""}
              </span>
              <span className="text-[9px] text-slate-200 uppercase font-bold mt-1 leading-none">
                {now && formatDate ? formatDate(now) : ""}
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-700/50 hidden sm:block" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Network Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = isOnline ? "offline" : "online";
                setManualMode?.(next);
              }}
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

            {/* Home */}
            <button
              onClick={goDashboard}
              className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
              title="Main Menu"
              type="button"
            >
              <Home size={16} />
            </button>
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
            <span className="text-slate-200">
              {user?.userName || "Cashier"}
            </span>
          </div>
        </div>

        <div className="sm:hidden flex items-center gap-1.5 shrink-0 text-xs font-mono font-bold text-slate-300">
          {now && formatTime ? formatTime(now) : ""}
        </div>
      </div>
    </header>
  );
}
