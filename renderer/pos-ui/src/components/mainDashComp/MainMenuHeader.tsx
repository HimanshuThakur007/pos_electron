import { useState, useEffect } from "react";
import {
  Store,
  LogOut,
  MonitorSmartphone,
  Calendar,
  Wifi,
  WifiOff,
  Clock3,
} from "lucide-react";
import mLogo from "../../assets/M_LOGO.png";

interface MainMenuHeaderProps {
  branchName: string;
  branchCode: string;
  userName: string;
  finYear: string;
  isServerOnline: boolean;
  isNetworkOnline: boolean;
  onEndDayClick: () => void;
  onLogoutClick: () => void;
}

export default function MainMenuHeader({
  branchName,
  branchCode,
  userName,
  finYear,
  isServerOnline,
  isNetworkOnline,
  onEndDayClick,
  onLogoutClick,
}: MainMenuHeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-[#0B1120] border-b border-slate-800 shadow-sm select-none w-full z-50 shrink-0">
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* LEFT: Logo & Metadata */}
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center shrink-0">
            <img
              src={mLogo}
              alt="Market99 Logo"
              className="h-8 w-auto object-contain"
            />
          </div>

          {/* Eye-catching Offline Billing Heading Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] select-none cursor-default">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-purple-400 drop-shadow-sm">
              Offline Billing
            </span>
          </div>

          <button
            onClick={onEndDayClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors"
            title="End Day"
            type="button"
          >
            <Store size={14} />
            <span className="text-xs font-bold hidden sm:inline">End Day</span>
          </button>

          <button
            onClick={onLogoutClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
            title="Logout (F10)"
            type="button"
          >
            <LogOut size={14} />
            <span className="text-xs font-bold hidden sm:inline">Logout</span>
          </button>

          <div className="h-5 w-px bg-slate-700/50 hidden lg:block" />

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
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 h-7 rounded border text-[10px] font-bold uppercase tracking-wider transition-colors ${
              isServerOnline
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : isNetworkOnline
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}
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

          <div className="hidden sm:flex items-center gap-2">
            <Clock3 size={14} className="text-slate-500" />
            <div className="flex flex-col justify-center text-right">
              <span className="text-xs font-bold text-slate-200 font-mono tracking-wide leading-none">
                {time.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-[9px] text-slate-200 uppercase font-bold mt-1 leading-none">
                {time.toLocaleDateString("en-US", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
