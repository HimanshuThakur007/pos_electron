import { useState } from "react";

import Login from "./components/auth/Login";
import Home from "./Home";
import PosBillingScreen from "./components/pos/PosBillingScreen";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPos, setShowPos] = useState(true);

  const handleLogout = async () => {
    if (window.posApi && window.posApi.getPendingSyncCount) {
      try {
        const fyCode = localStorage.getItem("fy_code") || "";
        const pendingCount = await window.posApi.getPendingSyncCount(fyCode);
        if (pendingCount > 0) {
          alert(
            `Cannot log out. ${pendingCount} item(s) have not been synced. Please wait for sync to complete.`,
          );
          return;
        }
      } catch (error) {
        console.error("Logout check failed:", error);
      }
    }
    localStorage.clear();
    setIsAuthenticated(false);
  };

  return (
    <>
      {isAuthenticated ? (
        showPos ? (
          <PosBillingScreen onLogout={handleLogout} />
        ) : (
          <Home onLogout={handleLogout} onOpenPos={() => setShowPos(true)} />
        )
      ) : (
        <Login onLogin={() => setIsAuthenticated(true)} />
      )}
    </>
  );
}

export default App;
