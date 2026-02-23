import {
  MdStore,
  MdAccessTime,
  MdLightMode,
  MdDarkMode,
  MdPerson,
  MdLogout,
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
}

export default function PosHeader({
  userDetails,
  currentTime,
  theme,
  toggleTheme,
  onLogout,
}: PosHeaderProps) {
  return (
    <div
      className={`pos-header d-flex justify-content-between align-items-center px-4 py-2 shadow-sm ${theme === "light" ? "bg-white text-dark border-bottom" : "bg-dark text-light border-bottom border-secondary"}`}
      style={{ height: "auto", minHeight: "60px" }}
    >
      {/* Left: Branch Info */}
      <div className="d-flex align-items-center gap-3">
        <div
          className={`p-2 rounded-circle ${theme === "light" ? "bg-primary bg-opacity-10 text-primary" : "bg-secondary bg-opacity-25 text-light"}`}
        >
          <MdStore size={24} />
        </div>
        <div>
          <div className="fw-bold lh-1 fs-5">{userDetails.branchName}</div>
          <div className="small opacity-75" style={{ fontSize: "0.75rem" }}>
            Branch Code: {userDetails.branchCode}
          </div>
        </div>
      </div>

      {/* Center: Time */}
      <div
        className={`d-none d-md-flex align-items-center gap-3 px-3 py-1 rounded-pill border ${
          theme === "light"
            ? "bg-light text-dark"
            : "bg-secondary bg-opacity-25 text-light border-secondary"
        }`}
      >
        <MdAccessTime size={20} />
        <span
          className="fw-medium fs-5"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {currentTime.toLocaleTimeString("en-US", { hour12: true })}
        </span>
        <span
          className={`small border-start ps-3 ${theme === "light" ? "border-dark" : "border-light"}`}
        >
          {currentTime.toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>

      {/* Right: Actions & User */}
      <div className="d-flex align-items-center gap-3">
        <button
          onClick={toggleTheme}
          className={`btn btn-icon btn-sm rounded-circle ${theme === "light" ? "btn-light text-dark border" : "btn-dark text-light border-secondary"}`}
          title="Toggle Theme"
        >
          {theme === "dark" ? (
            <MdLightMode size={18} />
          ) : (
            <MdDarkMode size={18} />
          )}
        </button>

        <div className="vr opacity-25 mx-1"></div>

        <div className="d-flex align-items-center gap-2 text-end">
          <div>
            <div className="fw-bold lh-1">{userDetails.userName}</div>
            <div className="small opacity-75" style={{ fontSize: "0.7rem" }}>
              {userDetails.userRole}
            </div>
          </div>
          <div
            className={`d-flex align-items-center justify-content-center rounded-circle ${theme === "light" ? "bg-secondary bg-opacity-10" : "bg-secondary"}`}
            style={{ width: "36px", height: "36px" }}
          >
            <MdPerson size={20} />
          </div>
        </div>

        <button
          className="btn btn-danger btn-sm d-flex align-items-center gap-2 px-3 rounded-pill ms-2"
          onClick={onLogout}
        >
          <MdLogout size={16} />
          <span className="d-none d-lg-inline">Logout</span>
        </button>
      </div>
    </div>
  );
}
