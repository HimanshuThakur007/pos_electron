import { useState } from "react";

import Login from "./components/auth/Login";
import Home from "./Home";
import PosBillingScreen from "./components/pos/PosBillingScreen";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPos, setShowPos] = useState(true);

  return (
    <>
      {isAuthenticated ? (
        showPos ? (
          <PosBillingScreen onLogout={() => setIsAuthenticated(false)} />
        ) : (
          <Home
            onLogout={() => setIsAuthenticated(false)}
            onOpenPos={() => setShowPos(true)}
          />
        )
      ) : (
        <Login onLogin={() => setIsAuthenticated(true)} />
      )}
    </>
  );
}

export default App;
