import { useState, useEffect, useRef } from "react";
import {
  MdDateRange,
  MdPerson,
  MdLock,
  MdLogin,
  MdVisibility,
  MdVisibilityOff,
  MdClose,
} from "react-icons/md";
import { useApi } from "../../hooks/useApi";
import toast, { Toaster } from "react-hot-toast";
import { useLicense } from "../../hooks/useLicense";
import LicenseScreen from "../../components/auth/LicenseScreen";
import { useAuth } from "../../context/AuthContext";
import {
  ConflictModal,
  type ConflictInfo,
} from "../../components/modals/ConflictModal";
import { OtpModal } from "../../components/modals/OtpModal";
import {
  CheckingLicenseOverlay,
  LoadingOverlay,
} from "../../components/auth/LoginOverlays";
import {
  BrandPanel,
  LoginHeader,
  LoginFooter,
} from "../../components/auth/LoginPanels";

interface FinancialYear {
  id: number;
  fy_code: string;
  label: string;
  start_date: string;
  end_date: string;
}

export default function Login() {
  const [userUid, setUserUid] = useState("");
  const [password, setPassword] = useState("");
  const [financialYear, setFinancialYear] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMessage] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictInfo | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [rememberedUsers, setRememberedUsers] = useState<string[]>([]);
  const [otp, setOtp] = useState("");
  const [otpContext, setOtpContext] = useState<any | null>(null);

  const userUidRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { get, post } = useApi();
  const { login } = useAuth();
  const {
    isLicensed,
    isLoading: isLicenseLoading,
    activateLicense,
  } = useLicense();

  // Auto focus on userUid when page loads and fetch financial years
  useEffect(() => {
    userUidRef.current?.focus();

    const fetchRememberedUsers = async () => {
      console.log(
        "Checking for remembered users...",
        (window as any).posApi && (window as any).posApi.getRememberedUsers,
      );
      if ((window as any).posApi && (window as any).posApi.getRememberedUsers) {
        try {
          const users = await (window as any).posApi.getRememberedUsers();
          console.log("Fetched remembered users:", users);
          if (Array.isArray(users)) {
            setRememberedUsers(users);
          }
        } catch (e) {
          console.error(
            "Login.tsx: Failed to fetch or prefill remembered user. This could be an IPC error.",
            e,
          );
        }
      }
    };
    fetchRememberedUsers();

    const fetchFinancialYears = async () => {
      const { data, error } = await get<FinancialYear[]>("fin-years");
      if (data && Array.isArray(data)) {
        setFinancialYears(data);
        localStorage.setItem("cached_fin_years", JSON.stringify(data));
        // Automatically select the first financial year in the list
        if (data.length > 0) {
          setFinancialYear(data[0].fy_code);
        }
      } else if (error) {
        // Offline fallback: Load from local storage
        const cached = localStorage.getItem("cached_fin_years");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setFinancialYears(parsed);
              setFinancialYear(parsed[0].fy_code);
            }
          } catch (e) {}
        } else {
          console.error("Failed to load financial years:", error);
        }
      }
    };
    fetchFinancialYears();
  }, [get]); // Run only once on mount

  // Move focus to password when pressing Enter in userUid
  const handleUserUidKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      passwordRef.current?.focus();
    }
  };

  const handleSuggestionClick = async (uid: string) => {
    setUserUid(uid);
    setShowSuggestions(false);

    if (
      (window as any).posApi &&
      (window as any).posApi.getCredentialsForUser
    ) {
      try {
        const creds = await (window as any).posApi.getCredentialsForUser(uid);
        if (creds && creds.password) {
          setUserUid(creds.email || uid); // using email field from DB mapping, but setting to UID
          setPassword(creds.password);
          setRememberMe(true);
          passwordRef.current?.focus();
        }
      } catch (err) {
        console.error("Failed to fetch credentials for user:", err);
      }
    }
  };

  const attemptOfflineLogin = async (userId: string, userPass: string) => {
    try {
      const posApi = (window as any).posApi;
      if (posApi && posApi.offlineLogin) {
        const res = await posApi.offlineLogin({
          email: userId, // Assuming backend/sqlite still uses "email" for mapping offline
          password: userPass,
        });
        if (res.success && res.data) {
          toast.success("Logged in offline using cached credentials.");
          await processLoginSuccess(res.data, userId, rememberMe);
        } else {
          toast.error(
            res.error ||
              "Offline login failed. Invalid credentials or user not cached.",
          );
          setIsLoading(false);
        }
      } else {
        toast.error(
          "Offline login module is not configured in the desktop app.",
        );
        setIsLoading(false);
      }
    } catch (e) {
      console.error("Offline login error:", e);
      toast.error("Offline login failed.");
      setIsLoading(false);
    }
  };

  const processLoginSuccess = async (
    response: any,
    userId: string,
    shouldRemember: boolean,
  ) => {
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
      toast.error("Authentication failed: Invalid server response.");
      setIsLoading(false);
      return;
    }

    if (shouldRemember) {
      if ((window as any).posApi && (window as any).posApi.saveRememberedUser) {
        console.log(`Login.tsx: Attempting to save credentials for ${userId}`);
        await (window as any).posApi.saveRememberedUser({
          email: userId,
          password: password, // The password from the form state
        });
        console.log(
          `Login.tsx: Successfully called saveRememberedUser for ${userId}`,
        );
      }
    } else {
      // If "Remember Me" is unchecked, remove the user from the remembered list
      if (
        (window as any).posApi &&
        (window as any).posApi.removeRememberedUser
      ) {
        console.log(
          `Login.tsx: Attempting to remove remembered user ${userId}`,
        );
        await (window as any).posApi.removeRememberedUser(userId);
      }
    }

    const previousBranchCode = localStorage.getItem("branch_code") || "";
    const currentBranchCode = String(payload.user?.branch?.branch_code || "");
    const isBranchChanged = previousBranchCode !== currentBranchCode;

    localStorage.setItem("user_name", payload.user?.name || "");
    localStorage.setItem("user_id", String(payload.user?.id || ""));
    localStorage.setItem("user_role", payload.user?.role?.name || "");
    localStorage.setItem("branch_code", currentBranchCode || "");
    localStorage.setItem("user_uid", payload?.user?.user_uid || "");
    // localStorage.setItem("branch_name", payload.user?.branch?.accnt_name || "");
    localStorage.setItem(
      "branch_name",
      payload.user?.branch?.branch_name || "",
    );
    localStorage.setItem("terminal_code", payload.terminal_code || "");
    localStorage.setItem("fy_code", payload.fy_code || "");
    localStorage.setItem("fin_year", payload.fin_year || "");
    localStorage.setItem("login_time", payload.current_login_at || "");

    const posApi = (window as any).posApi;

    // ── Cache user credentials & payload for future offline logins ──
    if (posApi && posApi.cacheUserLogin && navigator.onLine) {
      try {
        await posApi.cacheUserLogin({
          email: userId,
          password: password, // from form state
          payload: payload,
        });
      } catch (err) {
        console.error("Failed to cache user for offline login:", err);
      }
    }

    // Securely store session via context, which calls the main process
    await login(payload.token, {
      fy_code: payload.fy_code,
      branch_code: currentBranchCode,
      terminal_code: payload.terminal_code,
      user_id: String(payload.user?.id || ""),
      // No need to pass token here again, login function handles it
    });

    if (posApi) {
      try {
        const todayStr = new Date().toDateString(); // Moved up for reuse
        let currentProgress = 10;

        // 1. Check and Sync Stock
        const lastStockSyncDate = localStorage.getItem(
          `last_stock_sync_${currentBranchCode}`,
        );
        // Force sync if branch changed, otherwise only sync if it hasn't been synced today
        if (isBranchChanged || lastStockSyncDate !== todayStr) {
          setProgress(currentProgress);
          setLoadingMessage("Syncing Stock...");
          if (posApi.syncStock) {
            await posApi.syncStock(currentBranchCode, isBranchChanged);
            localStorage.setItem(
              `last_stock_sync_${currentBranchCode}`,
              todayStr,
            );
          }
        }
        currentProgress += 22;

        // 2. Check and Sync Items
        const lastItemsSyncDate = localStorage.getItem("last_items_sync");
        if (lastItemsSyncDate !== todayStr) {
          setProgress(currentProgress);
          setLoadingMessage("Syncing Items...");
          if (posApi.syncItems) {
            await posApi.syncItems(false);
            localStorage.setItem("last_items_sync", todayStr);
          }
        }
        currentProgress += 22;

        // 3. Check and Sync Schemes
        const lastSchemesSyncDate = localStorage.getItem("last_schemes_sync");
        if (lastSchemesSyncDate !== todayStr) {
          setProgress(currentProgress);
          setLoadingMessage("Syncing Schemes...");
          if (posApi.syncSchemes) {
            await posApi.syncSchemes(false);
            localStorage.setItem("last_schemes_sync", todayStr);
          }
        }
        currentProgress += 22;

        // 4. Check and Sync Branches
        const lastBranchesSyncDate = localStorage.getItem("last_branches_sync");
        if (lastBranchesSyncDate !== todayStr) {
          setProgress(currentProgress);
          setLoadingMessage("Syncing Branches...");
          if (posApi.syncBranches) {
            await posApi.syncBranches(false);
            localStorage.setItem("last_branches_sync", todayStr);
          }
        }
        currentProgress += 24;

        // Persist session details for background tasks (auto-start on reboot)
        setProgress(currentProgress);
        setLoadingMessage("Finalizing setup...");
        // This is now handled by the login() call from AuthContext
      } catch (error) {
        console.error("Sync failed", error);
      }
    }

    setProgress(100);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!userUid.trim() || !password.trim()) {
      toast.error("User UID and Password are required.");
      userUidRef.current?.focus();
      return;
    }

    if (navigator.onLine && !financialYear) {
      toast.error("Please wait for Financial Year to load or select one.");
      return;
    }

    setIsLoading(true);
    setProgress(10);
    setLoadingMessage("Signing in...");

    // ── 1. Check if system is offline to attempt local login ──
    if (!navigator.onLine) {
      setLoadingMessage("Offline detected. Attempting local login...");
      await attemptOfflineLogin(userUid, password);
      return;
    }

    try {
      const posApi = (window as any).posApi;
      let deviceUid = "";
      if (posApi && posApi.getDeviceId) {
        deviceUid = await posApi.getDeviceId();
      }

      setLoadingMessage("Signing in...");

      const fyCode = financialYear.includes("-")
        ? financialYear.replace("-", "20")
        : financialYear;

      const { data, error, status } = await post("login", {
        user_uid: userUid,
        password,
        fy_code: fyCode,
        device_uid: deviceUid,
        force_terminate: false,
      });

      if (status === 409 || (data as any)?.code === "DEVICE_LOCKED") {
        setConflictData(data as any);
        setShowConflictModal(true);
        setIsLoading(false);
        return;
      }

      if ((data as any)?.otp_required) {
        // localStorage.setItem("otp_context", JSON.stringify(data));
        setOtpContext(data);
        setShowOtpModal(true);
        setIsLoading(false);
        return;
      }

      // ── 2. Fallback if the fetch failed due to Network Error despite navigator.onLine being true ──
      if (
        !data &&
        error &&
        (error.toLowerCase().includes("fetch") ||
          error.toLowerCase().includes("network") ||
          error.toLowerCase().includes("failed"))
      ) {
        setLoadingMessage("Server unreachable. Attempting local login...");
        await attemptOfflineLogin(userUid, password);
        return;
      }

      if (error || !data) {
        toast.error(error || "Login failed");
        setIsLoading(false);
        return;
      }

      await processLoginSuccess(data, userUid, rememberMe);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setProgress(10);
    setLoadingMessage("Verifying OTP...");

    try {
      const branchId = otpContext?.user?.branch?.branch_code;
      const actionCode = otpContext?.otp_policies?.[0]?.action_code;

      if (!branchId || !actionCode) {
        toast.error(
          "Required OTP information is missing. Please log in again.",
        );
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
        toast.error(error || "OTP Verification failed");
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

      await processLoginSuccess(finalData, userUid, rememberMe);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      toast.error("An error occurred during verification");
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
        toast.success("Database has been reset. Please login to re-sync data.");
      }
    } catch (error) {
      console.error("Reset failed", error);
      toast.error("Reset failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveRememberedUser = async (
    e: React.MouseEvent,
    uid: string,
  ) => {
    e.stopPropagation(); // Prevent the suggestion click from firing
    if ((window as any).posApi && (window as any).posApi.removeRememberedUser) {
      await (window as any).posApi.removeRememberedUser(uid);
      // Refresh the list from the main process
      const users = await (window as any).posApi.getRememberedUsers();
      if (Array.isArray(users)) {
        setRememberedUsers(users);
      }
    }
  };

  const handleLicenseActivate = async (key: string) => {
    setIsLoading(true);
    setLoadingMessage("Activating License...");

    const success = await activateLicense(key);

    if (success) {
      setProgress(10);
      setLoadingMessage("Verifying Master Data Sync...");

      const posApi = (window as any).posApi;
      if (posApi) {
        try {
          setProgress(30);
          setLoadingMessage("Checking Branch Sync Status...");
          await posApi.syncBranches(false);

          setProgress(60);
          setLoadingMessage("Checking Items Sync Status...");
          await posApi.syncItems(false);

          setProgress(90);
          setLoadingMessage("Checking Schemes Sync Status...");
          await posApi.syncSchemes(false);

          setProgress(100);
          setLoadingMessage("Status: Already Synced / Up to Date!");
        } catch (error) {
          console.error("Sync error:", error);
          setLoadingMessage("Status: Sync completed with warnings.");
        }
      } else {
        setProgress(100);
        setLoadingMessage("Status: Ready (Offline)");
      }

      // Pause briefly so the user can read the "Up to Date" status message
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    setIsLoading(false);
    return success;
  };

  // 1. Initial Check: Wait for local storage check to finish
  if (isLicensed === null) {
    return <CheckingLicenseOverlay />;
  }

  // 2. Block: License is Required
  if (!isLicensed) {
    return (
      <LicenseScreen
        onActivate={handleLicenseActivate}
        isLoading={isLicenseLoading}
      />
    );
  }

  if (isLoading) {
    return <LoadingOverlay progress={progress} loadingMsg={loadingMsg} />;
  }

  return (
    <>
      <Toaster />
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#e0eafc] to-[#cfdef3]">
        <div className="bg-white shadow-2xl rounded-3xl overflow-hidden w-[850px] max-w-[90%] min-h-[500px] flex">
          {/* Left Side: Brand/Visual */}
          <BrandPanel />

          {/* Right Side: Login Form */}
          <div className="w-full md:w-1/2 bg-white p-12 flex flex-col justify-center">
            <LoginHeader />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  User ID
                </label>
                <div className="relative">
                  <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden">
                    <span className="pl-3 text-gray-400">
                      <MdPerson size={20} />
                    </span>
                    <input
                      ref={userUidRef}
                      type="text"
                      className="w-full bg-transparent border-none p-3 text-gray-700 focus:outline-none placeholder-gray-400"
                      value={userUid}
                      onChange={(e) => setUserUid(e.target.value)}
                      onKeyDown={handleUserUidKeyDown}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() =>
                        setTimeout(() => setShowSuggestions(false), 150)
                      }
                      required
                      placeholder="Enter User ID"
                      autoComplete="off"
                    />
                  </div>
                  {showSuggestions && rememberedUsers.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                      <ul className="max-h-48 overflow-y-auto">
                        {rememberedUsers.map((uid) => (
                          <li
                            key={uid}
                            className="group flex items-center justify-between px-4 py-3 hover:bg-gray-100 cursor-pointer"
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent onBlur from firing before click
                              handleSuggestionClick(uid);
                            }}
                          >
                            <span className="text-sm text-gray-800 font-medium">
                              {uid}
                            </span>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveRememberedUser(e, uid);
                              }}
                              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-2"
                              title={`Forget ${uid}`}
                            >
                              <MdClose size={18} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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

              <div className="flex items-center justify-end">
                <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="ml-2">Remember me</span>
                </label>
              </div>

              <div className="hidden">
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
                      <option value="">Loading...</option>
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

            <LoginFooter onResetDatabase={handleResetDatabase} />
          </div>
        </div>
      </div>

      {/* Conflict Modal */}
      {showConflictModal && conflictData && (
        <ConflictModal
          conflictData={conflictData}
          onClose={() => setShowConflictModal(false)}
        />
      )}

      {/* OTP Modal */}
      {showOtpModal && (
        <OtpModal otp={otp} setOtp={setOtp} onVerify={handleVerifyOtp} />
      )}
    </>
  );
}
