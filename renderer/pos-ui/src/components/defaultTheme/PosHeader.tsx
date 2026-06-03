import {
  MdStore,
  MdAccessTime,
  MdLightMode,
  MdDarkMode,
  MdPerson,
  MdLogout,
  MdSettings,
} from "react-icons/md";

interface PosHeaderProps {
  userDetails: {
    branchName: string;
    branchCode: string;
    userName: string;
    userRole: string;
  };
  currentTime: Date;
  theme: "light" | "dark";
  toggleTheme: () => void;
  onLogout?: () => void;
  onOpenSettings: () => void;
  onEndDayClick?: () => void;
}

export default function PosHeader({
  userDetails,
  currentTime,
  theme,
  toggleTheme,
  onLogout,
  onOpenSettings,
  onEndDayClick,
}: PosHeaderProps) {
  return (
    <div
      className={`flex justify-between items-center px-4 py-2 shadow-sm border-b ${theme === "light" ? "bg-white text-gray-900 border-gray-200" : "bg-gray-900 text-white border-gray-700"}`}
      style={{ minHeight: "60px" }}
    >
      {/* Left: Branch Info */}
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-full ${theme === "light" ? "bg-blue-50 text-blue-600" : "bg-gray-700 text-gray-200"}`}
        >
          <MdStore size={24} />
        </div>
        <div>
          <div className="font-bold leading-none text-lg">
            {userDetails.branchName}
          </div>
          <div className="text-xs opacity-75 mt-1">
            Branch Code: {userDetails.branchCode}
          </div>
        </div>
      </div>

      {/* Center: Time */}
      <div
        className={`hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full border ${
          theme === "light"
            ? "bg-gray-50 text-gray-900 border-gray-200"
            : "bg-gray-800 text-white border-gray-700"
        }`}
      >
        <MdAccessTime size={20} />
        <span
          className="font-medium text-lg"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {currentTime.toLocaleTimeString("en-US", { hour12: true })}
        </span>
        <span
          className={`text-sm border-l pl-3 ${theme === "light" ? "border-gray-300" : "border-gray-600"}`}
        >
          {currentTime.toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>

      {/* Right: Actions & User */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSettings}
          className={`p-2 rounded-full border transition-colors ${theme === "light" ? "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100" : "bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700"}`}
          title="Settings"
        >
          <MdSettings size={18} />
        </button>

        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full border transition-colors ${theme === "light" ? "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100" : "bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700"}`}
          title="Toggle Theme"
        >
          {theme === "dark" ? (
            <MdLightMode size={18} />
          ) : (
            <MdDarkMode size={18} />
          )}
        </button>

        <div
          className={`w-px h-8 mx-1 ${theme === "light" ? "bg-gray-300" : "bg-gray-600"}`}
        ></div>

        <div className="flex items-center gap-2 text-right">
          <div>
            <div className="font-bold leading-none">{userDetails.userName}</div>
            <div className="text-xs opacity-75 mt-0.5">
              {userDetails.userRole}
            </div>
          </div>
          <div
            className={`flex items-center justify-center rounded-full ${theme === "light" ? "bg-gray-200 text-gray-600" : "bg-gray-700 text-gray-300"}`}
            style={{ width: "36px", height: "36px" }}
          >
            <MdPerson size={20} />
          </div>
        </div>

        <button
          className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-colors text-sm font-medium ${theme === "light" ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100" : "bg-amber-900/30 text-amber-500 border-amber-800 hover:bg-amber-900/50"}`}
          onClick={onEndDayClick}
          title="End Day"
        >
          <MdStore size={16} />
          <span className="hidden lg:inline">End Day</span>
        </button>

        <button
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors ms-2 text-sm font-medium"
          onClick={onLogout}
        >
          <MdLogout size={16} />
          <span className="hidden lg:inline">Logout</span>
        </button>
      </div>
    </div>
  );
}
