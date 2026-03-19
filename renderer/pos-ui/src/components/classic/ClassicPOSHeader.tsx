import {
  Monitor,
  // Home,
  Power,
  Store,
  MonitorSmartphone,
  Clock3,
  Wifi,
  WifiOff,
  Settings,
} from "lucide-react";
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
  netMsg?: string;
  netBackOnline?: boolean;
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
  onOpenSettings,

  netOffline,
  netMsg,
  netBackOnline,
}: ClassicPOSHeaderProps) {
  // const location = useLocation();
  // const navigate = useNavigate();

  //   const pageTitle = useMemo(() => {
  //     const p = location.pathname;
  //     if (p === "/pos/sale-bill") return "Sale Bill";
  //     if (p === "/pos-otp") return "POS OTP";
  //     if (p === "/pos/edc-config") return "EDC Config";

  //     const last = p.split("/").filter(Boolean).pop() || "";
  //     if (!last) return "";
  //     return last.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  //   }, [location.pathname]);

  //   const goDashboard = () => navigate("/dashboard");

  //   const variants = uiVariants || POS_UI_VARIANTS;

  const branchName = user?.branchName || "Market99";
  const branchCode = user?.branchCode || "POS-001";
  type NetworkStatus = {
    label: string;
    icon: string;
    iconColor: string;
    borderColor: string;
    bgColor: string;
    wrapClass: string;
    iconClass: string;
  };

  const networkStatus: NetworkStatus = (() => {
    if (netOffline) {
      const m = String(netMsg || "").toLowerCase();
      const isServer =
        m.includes("backend service is unreachable") ||
        m.includes("server connection");
      const isInternet =
        m.includes("network connection lost") || m.includes("internet");

      const iconColor = "#FFD38A";
      const borderColor = "#FFC46B";
      const bgColor = "rgba(255, 244, 214, 0.1)";

      return {
        label: isServer
          ? "Offline (Server)"
          : isInternet
            ? "Offline (Internet)"
            : "Offline",
        icon: "off",
        iconColor,
        borderColor,
        bgColor,
        wrapClass: `border-[${borderColor}] bg-[${bgColor}]`,
        iconClass: `text-[${iconColor}]`,
      };
    }

    if (netBackOnline) {
      const iconColor = "#78F7A2";
      const borderColor = "#44E67C";
      const bgColor = "rgba(255, 255, 255, 0.08)";

      return {
        label: "Restored",
        icon: "wifi",
        iconColor,
        borderColor,
        bgColor,
        wrapClass: `border-[${borderColor}] bg-[${bgColor}]`,
        iconClass: `text-[${iconColor}]`,
      };
    }

    const iconColor = "#78F7A2";
    const borderColor = "#44E67C";
    const bgColor = "rgba(255, 255, 255, 0.08)";

    return {
      label: "Online",
      icon: "wifi",
      iconColor,
      borderColor,
      bgColor,
      wrapClass: `border-[${borderColor}] bg-[${bgColor}]`,
      iconClass: `text-[${iconColor}]`,
    };
  })();

  return (
    <div className="px-3 pt-2 pb-1">
      <div className="rounded-2xl bg-gradient-to-r from-[#667BE5] via-[#6D66CA] to-[#744FA9] shadow-[0_8px_24px_rgba(90,85,180,0.28)] border border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* LEFT: Store + terminal + cashier + active */}
          <div className="min-w-0 flex items-center gap-3">
            {/* Store title pill */}
            <div className="min-w-0 flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-3 py-2 backdrop-blur-sm">
              <Store size={16} className="text-white shrink-0" />
              <span className="text-white font-semibold text-sm truncate">
                {branchName}
              </span>
            </div>

            {/* POS code pill */}
            <div className="hidden md:flex items-center gap-2 rounded-xl bg-white/12 border border-white/15 px-3 py-2 backdrop-blur-sm">
              <MonitorSmartphone size={14} className="text-white/90" />
              <span className="text-white text-sm font-semibold whitespace-nowrap">
                {branchCode}
              </span>
            </div>

            {/* Cashier pill */}
            <div className="hidden lg:flex items-center gap-2 rounded-xl bg-white/12 border border-white/15 px-3 py-2 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-white/90" />
              <span className="text-white text-sm font-semibold whitespace-nowrap">
                {user?.userName || "Cashier"}
              </span>
            </div>
          </div>

          {/* RIGHT: Time + online + controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Time card */}
            <div className="hidden xl:flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-1 py-1 backdrop-blur-sm min-w-[170px] justify-center">
              <Clock3 size={15} className="text-white/90" />
              <div className="leading-tight">
                <div className="text-[11px] text-white/80 font-medium">
                  {now && formatDate ? formatDate(now) : ""}
                </div>
                <div className="text-sm text-white font-bold font-mono">
                  {now && formatTime ? formatTime(now) : ""}
                </div>
              </div>
            </div>

            <div
              className={`hidden sm:flex items-center gap-2 rounded-xl border px-3 py-2 text-white backdrop-blur-sm ${networkStatus.wrapClass}`}
              title={netMsg || (netOffline ? "Offline Mode" : "Connected")}
            >
              {networkStatus.icon === "off" ? (
                <WifiOff size={14} className={networkStatus.iconClass} />
              ) : (
                <Wifi size={14} className={networkStatus.iconClass} />
              )}
              <div className="leading-tight">
                <div className="text-white text-xs font-semibold whitespace-nowrap">
                  {networkStatus.label}
                </div>
              </div>
            </div>

            {/* UI Switch */}
            <button
              onClick={onOpenSettings}
              className="hidden lg:flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 px-3 py-2 text-white transition backdrop-blur-sm"
              title="UI Settings"
              type="button"
            >
              <Settings size={14} className="text-white/90" />
            </button>

            {/* Customer Display */}
            <button
              onClick={openCustomerDisplay}
              className="rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 px-3 py-2 text-white flex items-center gap-2 transition backdrop-blur-sm"
              title="Customer Display"
              type="button"
            >
              <Monitor
                size={14}
                className={
                  displayConnected
                    ? "text-[#78F7A2]"
                    : displayWindow
                      ? "text-[#FFD3D3]"
                      : "text-white/90"
                }
              />
              <span className="text-xs font-semibold hidden 2xl:inline">
                {displayConnected
                  ? "Display On"
                  : displayWindow
                    ? "Closed"
                    : "Display"}
              </span>
            </button>

            {/* Home */}
            {/* <button
              onClick={goDashboard}
              className="rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 px-3 py-2 text-white transition backdrop-blur-sm"
              title="Dashboard"
              type="button"
            >
              <Home size={14} className="text-white" />
            </button> */}

            {/* Logout */}
            <button
              onClick={() => logout?.({ stopAutoSync })}
              className="rounded-xl bg-white/10 border border-white/15 hover:bg-rose-400/20 px-3 py-2 text-white transition backdrop-blur-sm"
              title="Logout"
              type="button"
            >
              <Power size={14} className="text-white" />
            </button>
          </div>
        </div>

        {/* Second row (mobile/tablet): time + metadata */}
        <div className="xl:hidden mt-2 flex flex-wrap items-center gap-2 text-xs">
          <div className="rounded-lg bg-white/10 border border-white/15 px-2.5 py-1.5 text-white/90 font-mono">
            {now && formatDate && formatTime
              ? `${formatDate(now)} • ${formatTime(now)}`
              : ""}
          </div>

          {/* {pageTitle && (
            <div className="rounded-lg bg-white/10 border border-white/15 px-2.5 py-1.5 text-white font-semibold">
              {pageTitle}
            </div>
          )} */}

          {(user?.fin_year || user?.fy_code) && (
            <div className="rounded-lg bg-white/10 border border-white/15 px-2.5 py-1.5 text-white/90">
              FY: {user?.fin_year || user?.fy_code}
            </div>
          )}

          <div className="sm:hidden rounded-full bg-[#3DDC74] text-white px-2.5 py-1 font-semibold">
            Active
          </div>
        </div>
      </div>
    </div>
  );
}
