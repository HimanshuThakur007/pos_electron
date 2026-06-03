import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Login from "./pages/auth/Login";
import PosBillingScreen from "./pages/saleBilling/PosBillingScreen";
import GlobalAlert, { showDialog } from "./components/common/GlobalAlert";
import MainMenu from "./pages/mainMenuDash/MainMenu";
import { useAuth } from "./context/AuthContext";
import B2bBillingScreen from "./pages/b2bBilling/B2bBillingScreen";
import SyncDashboard from "./pages/syncDashboard/SyncDashboard";
import MainLayout from "./pages/layout/MainLayout";

// Reusable Placeholder View for WIP Routes
const PlaceholderView = ({ title }: { title: string }) => {
  const navigate = useNavigate();
  return (
    <div className="p-10 flex flex-col items-center">
      <button
        onClick={() => navigate("/")}
        className="self-start mb-6 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition font-medium"
      >
        &larr; Back to Menu
      </button>
      <div className="text-xl font-bold mt-10">{title} Coming Soon...</div>
    </div>
  );
};

function App() {
  const { isAuthenticated, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    // Check for pending transactions before allowing logout
    const fyCode = localStorage.getItem("fy_code") || "";
    if (window.posApi && (window.posApi as any).getPendingSyncCount) {
      try {
        const currentPendingCount = await (
          window.posApi as any
        ).getPendingSyncCount(fyCode, {
          strictlyPending: false, // Include actively syncing transactions
          excludeFailed: false, // Include failed transactions
        });
        if (currentPendingCount > 0) {
          showDialog(
            `Cannot log out. ${currentPendingCount} transaction(s) have not been synced.`,
            "error",
            "Logout Restricted",
          );
          return;
        }
      } catch (error) {
        console.error("Failed to check pending transactions:", error);
      }
    }

    setIsLoggingOut(true);
    try {
      await logout();
      const preservedData: Record<string, string> = {};
      const keysToPreserve = [
        "pos_license_key",
        "branch_code",
        "last_items_sync",
        "last_schemes_sync",
        "explicit_logout",
      ];

      // Collect data to preserve
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (keysToPreserve.includes(key) || key.startsWith("last_stock_sync_"))
        ) {
          preservedData[key] = localStorage.getItem(key) || "";
        }
      }

      // Clear everything
      localStorage.clear();

      // Restore preserved data
      Object.entries(preservedData).forEach(([k, v]) => {
        localStorage.setItem(k, v);
      });

      navigate("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // When auth state is still loading, show a blank screen or a loader
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h4 className="font-bold text-gray-900 text-xl mb-2">
          Initializing App...
        </h4>
      </div>
    );
  }

  return (
    <>
      <GlobalAlert />

      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-md shadow-md px-6 py-5 flex items-center gap-4">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <h4 className="font-bold text-slate-800 text-lg m-0 leading-tight">
              Logging out, please wait...
            </h4>
          </div>
        </div>
      )}

      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />

        {/* Protected Routes */}
        <Route
          element={
            isAuthenticated ? (
              <MainLayout onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          {/* Main Menu Route */}
          <Route path="/" element={<MainMenu onLogout={handleLogout} />} />

          {/* Main POS Route */}
          <Route
            path="/pos"
            element={<PosBillingScreen onLogout={handleLogout} />}
          />

          {/* Sync Dashboard Route */}
          <Route
            path="/sync-dashboard"
            element={<SyncDashboard onLogout={handleLogout} />}
          />

          <Route
            path="/sale-return"
            element={<PlaceholderView title="Sale Return" />}
          />

          <Route
            path="/b2b-sale"
            element={<B2bBillingScreen onLogout={handleLogout} />}
          />

          <Route
            path="/exchange"
            element={<PlaceholderView title="Exchange" />}
          />

          <Route
            path="/stock-transfer"
            element={<PlaceholderView title="Stock Transfer" />}
          />
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
