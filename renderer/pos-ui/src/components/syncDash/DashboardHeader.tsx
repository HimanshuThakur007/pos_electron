import { useNavigate } from "react-router-dom";
import {
  Clock3,
  MonitorSmartphone,
  Store,
  Calendar,
  Wifi,
  WifiOff,
  LogOut,
  Home,
  Database,
} from "lucide-react";
import mLogo from "../../assets/M_LOGO.png";

interface DashboardHeaderProps {
  onLogout?: () => void;
  branchName: string;
  branchCode: string;
  userName: string;
  finYear: string;
  time: Date;
  isServerOnline: boolean;
  isNetworkOnline: boolean;
}

export default function DashboardHeader({
  onLogout,
  branchName,
  branchCode,
  userName,
  finYear,
  time,
  isServerOnline,
  isNetworkOnline,
}: DashboardHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="bg-[#0B1120] border-b border-slate-800 shadow-sm select-none w-full z-50 shrink-0">
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* LEFT: Logo & Metadata */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div
            className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity shrink-0"
            onClick={() => navigate("/")}
            title="Go to Dashboard"
          >
            <img
              src={mLogo}
              alt="Market99 Logo"
              className="h-8 w-auto object-contain"
            />
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
            title="Logout (F10)"
            type="button"
          >
            <LogOut size={14} />
            <span className="text-xs font-bold hidden sm:inline">Logout</span>
          </button>

          <div className="h-5 w-px bg-slate-700/50 hidden lg:block" />

          {/* Metadata */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-medium text-slate-400">
            <div className="flex items-center gap-1.5" title="Branch">
              <Store size={14} className="text-slate-500" />
              <span className="max-w-[150px] truncate text-slate-300">
                {branchName}
              </span>
            </div>
            <div className="flex items-center gap-1.5" title="Terminal">
              <MonitorSmartphone size={14} className="text-slate-500" />
              <span className="text-slate-300">{branchCode || "POS-001"}</span>
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
          {/* Page Indicator Badge */}
          <div
            className="hidden sm:flex items-center px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 select-none cursor-default"
            title="Master Data / Sync Dashboard"
          >
            <Database size={12} className="mr-1.5 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {/* Master Data */}
              Sync Dashboard
            </span>
          </div>

          <div className="h-5 w-px bg-slate-700/50 hidden sm:block" />

          {/* Time */}
          <div className="hidden sm:flex items-center gap-2">
            <Clock3 size={14} className="text-slate-500" />
            <div className="flex flex-col justify-center text-right">
              <span className="text-xs font-bold text-slate-200 font-mono tracking-wide leading-none">
                {time.toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
              <span className="text-[9px] text-slate-200 uppercase font-bold mt-1 leading-none">
                {time.toLocaleDateString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-700/50 hidden sm:block" />

          {/* Network Status */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 h-7 rounded border text-[10px] font-bold uppercase tracking-wider transition-colors ${
              isServerOnline
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : isNetworkOnline
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}
            title={
              isServerOnline
                ? "System is Online"
                : isNetworkOnline
                  ? "Server is Down"
                  : "System is Offline"
            }
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
          </div>

          <div className="h-5 w-px bg-slate-700/50 hidden sm:block" />

          {/* Home */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
            title="Main Menu (ESC)"
            type="button"
          >
            <Home size={14} />
            <span className="text-xs font-bold hidden sm:inline">Home</span>
            <kbd className="hidden sm:inline-block ml-0.5 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400 bg-slate-900/50 border border-slate-700 rounded shadow-sm">
              ESC
            </kbd>
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Fallback Row */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 border-t border-slate-800/50 bg-[#0F172A]">
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0" title="Branch">
            <Store size={12} className="text-slate-500" />
            <span className="text-slate-300">{branchName}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0" title="Terminal">
            <MonitorSmartphone size={12} className="text-slate-500" />
            <span className="text-slate-300">{branchCode || "POS-001"}</span>
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
          {time.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </div>
      </div>
    </header>
  );
}
