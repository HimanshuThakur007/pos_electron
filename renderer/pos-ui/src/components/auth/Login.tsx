import { useState, useEffect, useRef } from "react";
import {
  MdDateRange,
  MdEmail,
  MdLock,
  MdLogin,
  MdStore,
  MdVisibility,
  MdVisibilityOff,
  MdWarning,
  MdDevices,
  MdVpnKey,
} from "react-icons/md";
import { useApi } from "../../hooks/useApi";

interface LoginProps {
  onLogin: () => void;
}

interface FinancialYear {
  id: number;
  fy_code: string;
  label: string;
  start_date: string;
  end_date: string;
}

interface ConflictInfo {
  message: string;
  code: string;
  can_force_terminate: boolean;
  active_session: {
    session_id: number;
    device_uid: string;
    last_seen_at: string;
    created_at: string;
    branch_code: string;
    terminal_code: string;
  };
  attempted_login: {
    branch_code: string;
    terminal_code: string;
    device_uid: string;
    last_seen_at: string;
  };
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [financialYear, setFinancialYear] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMessage] = useState("Initializing...");
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictInfo | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpContext, setOtpContext] = useState<any | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { get, post } = useApi();

  // Auto focus on email when page loads and fetch financial years
  useEffect(() => {
    emailRef.current?.focus();

    const fetchFinancialYears = async () => {
      const { data, error } = await get<FinancialYear[]>("fin-years");
      if (data && Array.isArray(data)) {
        setFinancialYears(data);
        // Automatically select the first financial year in the list
        if (data.length > 0) {
          setFinancialYear(data[0].fy_code);
        }
      } else if (error) {
        console.error("Failed to load financial years:", error);
      }
    };
    fetchFinancialYears();
  }, [get]);

  // Move focus to password when pressing Enter in email
  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      passwordRef.current?.focus();
    }
  };

  const processLoginSuccess = async (response: any) => {
    // Robust payload extraction to handle variations in API response structure (Login vs OTP)
    let payload = response || {};
    console.log("Login response received:", response);
    // Prioritize object containing 'user'
    if (response?.data?.user) {
      payload = response.data;
    } else if (response?.user) {
      payload = response;
    } else if (response?.data) {
      payload = response.data;
    }

    // Ensure token is captured (might be at root while user is in data)
    if (!payload.token && response?.token) {
      payload.token = response.token;
    }

    if (!payload.token) {
      console.error("Login response missing token:", response);
      alert("Authentication failed: Invalid server response.");
      setIsLoading(false);
      return;
    }

    const previousBranchCode = localStorage.getItem("branch_code") || "";
    const currentBranchCode = String(payload.user?.branch?.branch_code || "");
    const isBranchChanged = previousBranchCode !== currentBranchCode;

    localStorage.setItem("auth_token", payload.token);
    localStorage.setItem("user_name", payload.user?.name || "");
    localStorage.setItem("user_id", String(payload.user?.id || ""));
    localStorage.setItem("user_role", payload.user?.role?.name || "");
    localStorage.setItem("branch_code", currentBranchCode || "");
    localStorage.setItem("branch_name", payload.user?.branch?.accnt_name || "");
    // localStorage.setItem(
    //   "branch_name",
    //   payload.user?.branch?.branch_name || "",
    // );
    localStorage.setItem("terminal_code", payload.terminal_code || "");
    localStorage.setItem("fy_code", payload.fy_code || "");
    localStorage.setItem("login_time", payload.current_login_at || "");

    const posApi = (window as any).posApi;

    if (posApi) {
      try {
        const todayStr = new Date().toDateString();

        // 1. Check and Sync Stock
        const lastStockSyncDate = localStorage.getItem(
          `last_stock_sync_${currentBranchCode}`,
        );
        if (isBranchChanged || lastStockSyncDate !== todayStr) {
          setLoadingMessage("Syncing Stock...");
          if (posApi.syncStock) {
            await posApi.syncStock(currentBranchCode, isBranchChanged);
            localStorage.setItem(
              `last_stock_sync_${currentBranchCode}`,
              todayStr,
            );
          }
        }

        // 2. Check and Sync Items
        const lastItemsSyncDate = localStorage.getItem("last_items_sync");
        if (lastItemsSyncDate !== todayStr) {
          setLoadingMessage("Syncing Items...");
          if (posApi.syncItems) {
            await posApi.syncItems(false);
            localStorage.setItem("last_items_sync", todayStr);
          }
        }

        // 3. Check and Sync Schemes
        const lastSchemesSyncDate = localStorage.getItem("last_schemes_sync");
        if (lastSchemesSyncDate !== todayStr) {
          setLoadingMessage("Syncing Schemes...");
          if (posApi.syncSchemes) {
            await posApi.syncSchemes(false);
            localStorage.setItem("last_schemes_sync", todayStr);
          }
        }

        // Persist session details for background tasks (auto-start on reboot)
        if (posApi.setLoginDetails) {
          console.log("💾 Persisting session for auto-resume...");
          await posApi.setLoginDetails({
            fy_code: payload.fy_code,
            branch_code: currentBranchCode,
            terminal_code: payload.terminal_code,
          });
        } else {
          console.warn(
            "⚠️ posApi.setLoginDetails is not defined in preload. Session will not persist.",
          );
        }
      } catch (error) {
        console.error("Sync failed", error);
      }
    }

    setIsLoading(false);
    onLogin();
  };

  const handleSubmit = async (forceTerminate: boolean = false) => {
    if (!email.trim() || !password.trim()) {
      alert("Email and Password are required.");
      emailRef.current?.focus();
      return;
    }

    setIsLoading(true);
    if (forceTerminate) {
      setLoadingMessage("Terminating previous session...");
      console.log("Force terminating session with data:", forceTerminate);
    } else {
      setLoadingMessage("Signing in...");
    }

    try {
      const posApi = (window as any).posApi;
      let deviceUid = "";
      if (posApi && posApi.getDeviceId) {
        deviceUid = await posApi.getDeviceId();
      }

      const fyCode = financialYear.includes("-")
        ? financialYear.replace("-", "20")
        : financialYear;

      const { data, error, status } = await post("login", {
        email,
        password,
        fy_code: fyCode,
        device_uid: deviceUid,
        force_terminate: forceTerminate,
      });

      if (status === 409 || (data as any)?.code === "DEVICE_LOCKED") {
        setConflictData(data as any);
        setShowConflictModal(true);
        setIsLoading(false);
        return;
      }

      if ((data as any)?.otp_required) {
        // localStorage.setItem("otp_context", JSON.stringify(data));
        localStorage.setItem("auth_token", data.token);
        setOtpContext(data);
        setShowOtpModal(true);
        setIsLoading(false);
        return;
      }

      if (error || !data) {
        alert(error || "Login failed");
        setIsLoading(false);
        return;
      }

      await processLoginSuccess(data);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      alert("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Verifying OTP...");

    try {
      const branchId = otpContext?.user?.branch?.branch_code;
      const actionCode = otpContext?.otp_policies?.[0]?.action_code;

      if (!branchId || !actionCode) {
        alert("Required OTP information is missing. Please log in again.");
        setIsLoading(false);
        return;
      }
      console.log(branchId, actionCode, otp, "hreufhruhfur");

      const temporaryToken = otpContext?.token || otpContext?.data?.token;
      const { data, error } = await post(
        "pos/totp/verify",
        {
          branch_code: branchId,
          action_code: actionCode,
          code: otp,
        },
        temporaryToken,
      );

      console.log("OTP verification response:", { data, error });

      if (error || !data) {
        alert(error || "OTP Verification failed");
        // Clear OTP input on failure
        setOtp("");
        setIsLoading(false);
        return;
      }

      // If the verify endpoint only returns a success message without the full user payload,
      // fallback to the original login response stored in otpContext.
      let finalData = data as any;
      if (!finalData?.user && !finalData?.data?.user) {
        finalData = otpContext;
      } else if (!finalData.token && !finalData.data?.token) {
        finalData.token = temporaryToken;
      }

      await processLoginSuccess(finalData);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      alert("An error occurred during verification");
    }
  };

  const handleResetDatabase = async () => {
    if (
      !confirm(
        "⚠️ WARNING: This will delete all local data (Stock, Transactions, Logs). Are you sure?",
      )
    )
      return;

    setIsLoading(true);
    setLoadingMessage("Resetting Database...");

    try {
      const posApi = (window as any).posApi;
      if (posApi && posApi.resetDatabase) {
        const fyCode = financialYear.includes("-")
          ? financialYear.replace("-", "20")
          : financialYear;
        await posApi.resetDatabase(fyCode);
        alert("Database has been reset. Please login to re-sync data.");
      }
    } catch (error) {
      console.error("Reset failed", error);
      alert("Reset failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h4 className="font-bold text-gray-900 text-xl mb-2">{loadingMsg}</h4>
        <p className="text-gray-500">
          Please wait while we set up your terminal.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#e0eafc] to-[#cfdef3]">
        <div className="bg-white shadow-2xl rounded-3xl overflow-hidden w-[850px] max-w-[90%] min-h-[500px] flex">
          {/* Left Side: Brand/Visual */}
          <div className="hidden md:flex flex-col justify-center items-center text-white p-12 w-1/2 bg-gradient-to-br from-slate-900 to-slate-700">
            <div className="mb-6 p-4 rounded-full bg-white/10 shadow-sm backdrop-blur-sm">
              <MdStore size={64} className="text-white" />
            </div>
            <h2 className="font-bold mb-3 text-4xl text-white drop-shadow-md">
              Market99 POS
            </h2>
            <p className="text-center opacity-80 text-lg">
              Exclusively designed for Market99 retail operations.
            </p>
          </div>

          {/* Right Side: Login Form */}
          <div className="w-full md:w-1/2 bg-white p-12 flex flex-col justify-center">
            <div className="text-center mb-6">
              <img
                src="https://market99.com/cdn/shop/files/M_LOGO.png?v=1695998992&width=260"
                alt="Logo"
                className="h-12 object-contain mx-auto"
              />
            </div>

            <div className="mb-6 text-center">
              <h4 className="font-bold text-2xl text-gray-800">Sign In</h4>
              <p className="text-gray-500 text-sm mt-1">
                Enter your credentials to access the terminal
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden">
                  <span className="pl-3 text-gray-400">
                    <MdEmail size={20} />
                  </span>
                  <input
                    ref={emailRef}
                    type="email"
                    className="w-full bg-transparent border-none p-3 text-gray-700 focus:outline-none placeholder-gray-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    required
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden">
                  <span className="pl-3 text-gray-400">
                    <MdLock size={20} />
                  </span>
                  <input
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-transparent border-none p-3 text-gray-700 focus:outline-none placeholder-gray-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••"
                  />
                  <button
                    className="pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <MdVisibility size={20} />
                    ) : (
                      <MdVisibilityOff size={20} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Financial Year
                </label>
                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden">
                  <span className="pl-3 text-gray-400">
                    <MdDateRange size={20} />
                  </span>
                  <select
                    className="w-full bg-transparent border-none p-3 text-gray-700 focus:outline-none cursor-pointer"
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                  >
                    {financialYears.length > 0 ? (
                      financialYears.map((fy) => (
                        <option key={fy.id} value={fy.fy_code}>
                          {fy.label}
                        </option>
                      ))
                    ) : (
                      <option value="20252026">Loading...</option>
                    )}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:opacity-90 transition shadow-md flex items-center justify-center gap-2 transform active:scale-[0.99]"
              >
                <MdLogin size={20} />
                LOGIN
              </button>
            </form>

            <div className="mt-8 text-center">
              <small className="text-gray-400 block mb-2">
                v1.0.0 | Support: help@market99.com
              </small>
              <button
                type="button"
                className="text-sm text-red-500 hover:text-red-700 font-medium transition"
                onClick={handleResetDatabase}
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Modal */}
      {showConflictModal && conflictData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-4">
              <div className="bg-red-100 p-3 rounded-full text-red-600">
                <MdWarning size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Session Conflict
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  You are already logged in on another device.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center gap-2 mb-3 text-gray-500 font-medium text-xs uppercase tracking-wider">
                    <MdDevices size={16} /> Active Session
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Branch:</span>{" "}
                      <span className="font-semibold text-gray-900">
                        {conflictData.active_session.branch_code}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Terminal:</span>{" "}
                      <span className="font-semibold text-gray-900">
                        {conflictData.active_session.terminal_code}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">UID:</span>{" "}
                      <span
                        className="font-semibold text-gray-900 truncate max-w-[120px]"
                        title={conflictData.active_session.device_uid}
                      >
                        {conflictData.active_session.device_uid.substring(
                          0,
                          10,
                        )}
                        ...
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Seen:</span>{" "}
                      <span className="font-semibold text-gray-900">
                        {new Date(
                          conflictData.active_session.last_seen_at,
                        ).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/50">
                  <div className="flex items-center gap-2 mb-3 text-blue-600 font-medium text-xs uppercase tracking-wider">
                    <MdDevices size={16} /> Current Device
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Branch:</span>{" "}
                      <span className="font-semibold text-gray-900">
                        {conflictData.attempted_login.branch_code}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Terminal:</span>{" "}
                      <span className="font-semibold text-gray-900">
                        {conflictData.attempted_login.terminal_code}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">UID:</span>{" "}
                      <span
                        className="font-semibold text-gray-900 truncate max-w-[120px]"
                        title={conflictData.attempted_login.device_uid}
                      >
                        {conflictData.attempted_login.device_uid.substring(
                          0,
                          10,
                        )}
                        ...
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Seen:</span>{" "}
                      <span className="font-semibold text-gray-900">
                        {new Date(
                          conflictData.attempted_login.last_seen_at,
                        ).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                  {conflictData.message}
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowConflictModal(false)}
                className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              {conflictData.can_force_terminate && (
                <button
                  onClick={() => {
                    setShowConflictModal(false);
                    handleSubmit(true);
                  }}
                  className="px-5 py-2.5 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg shadow-lg hover:shadow-red-500/30 transition flex items-center gap-2"
                >
                  Terminate & Login
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-scale-up">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-3">
                <MdVpnKey size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                OTP Verification
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Enter the 6-digit code sent to your email.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={6}
                  className="w-full text-center text-2xl font-bold tracking-widest p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition"
              >
                Verify OTP
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
