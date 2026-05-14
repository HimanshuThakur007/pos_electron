import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string, userDetails: any) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isServerOnline: boolean;
  isNetworkOnline: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isServerOnline, setIsServerOnline] = useState(navigator.onLine);
  const [isNetworkOnline, setIsNetworkOnline] = useState(navigator.onLine);

  useEffect(() => {
    let isMounted = true;
    const checkConnection = async () => {
      const online = navigator.onLine;
      if (isMounted) setIsNetworkOnline(online);

      if (!online) {
        if (isMounted) setIsServerOnline(false);
        return;
      }
      try {
        const apiBaseUrl =
          (window as any).posApi?.apiBaseUrl2 || "https://market99pos.com/api";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(`${apiBaseUrl}/health`, {
          method: "GET",
          signal: controller.signal,
        });
        const resData = await res.json().catch(() => null);
        // console.log("Health API response:", res.status, resData);
        clearTimeout(timeoutId);
        // Consider the server online if the app status is "ok"
        if (isMounted) setIsServerOnline(resData?.app === "ok");
      } catch (error) {
        if (isMounted) setIsServerOnline(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000); // Centralized 10s ping

    const handleOffline = () => {
      if (isMounted) {
        setIsNetworkOnline(false);
        setIsServerOnline(false);
      }
    };
    const handleOnline = () => {
      if (isMounted) setIsNetworkOnline(true);
      checkConnection();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [token]);

  const verifySession = useCallback(async () => {
    setIsLoading(true);
    try {
      // If the user explicitly logged out, skip auto-login so we stay on the login screen
      if (localStorage.getItem("explicit_logout") === "true") {
        setToken(null);
        setIsAuthenticated(false);
        return;
      }

      if ((window as any).posApi && (window as any).posApi.getSession) {
        const session = await (window as any).posApi.getSession();
        if (session && session.token) {
          setToken(session.token);
          setIsAuthenticated(true);
        } else {
          setToken(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error("Failed to verify session:", error);
      setToken(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const login = async (newToken: string, userDetails: any) => {
    localStorage.removeItem("explicit_logout"); // Remove flag on a fresh login
    if ((window as any).posApi && (window as any).posApi.setLoginDetails) {
      // Persist the full session details (including token) to the main process
      await (window as any).posApi.setLoginDetails({
        ...userDetails,
        token: newToken,
      });
      setToken(newToken);
      setIsAuthenticated(true);
    }
  };

  const logout = async () => {
    try {
      if ((window as any).posApi && token) {
        let deviceUid = "";
        if ((window as any).posApi.getDeviceId) {
          deviceUid = await (window as any).posApi.getDeviceId();
        }
        let apiBaseUrl =
          (window as any).posApi.apiBaseUrl2 || "https://market99pos.com/api";
        if (apiBaseUrl.endsWith("/")) {
          apiBaseUrl = apiBaseUrl.slice(0, -1);
        }

        const response = await fetch(`${apiBaseUrl}/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-Device-UID": deviceUid,
          },
          body: JSON.stringify({
            device_uid: deviceUid,
          }),
        });
        const data = await response.json().catch(() => null);
        console.log("Logout response:", {
          status: response.status,
          ok: response.ok,
          data,
        });
      }
    } catch (e) {
      console.error("Central logout API failed:", e);
    }

    // We intentionally DO NOT clear the session in the backend so background sync
    // can continue uploading pending transactions using the valid cached token.
    // if ((window as any).posApi && (window as any).posApi.clearSession) {
    //   await (window as any).posApi.clearSession();
    // }

    localStorage.setItem("explicit_logout", "true");
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        login,
        logout,
        isLoading,
        isServerOnline,
        isNetworkOnline,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
