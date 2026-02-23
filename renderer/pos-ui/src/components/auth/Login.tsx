// import { useState, useEffect } from "react";
// import {
//   MdEmail,
//   MdLock,
//   MdLogin,
//   MdStore,
//   MdVisibility,
//   MdVisibilityOff,
// } from "react-icons/md";

// interface LoginProps {
//   onLogin: () => void;
// }

// export default function Login({ onLogin }: LoginProps) {
//   const [email, setEmail] = useState("admin@pos.com");
//   const [password, setPassword] = useState("password");
//   const [showPassword, setShowPassword] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [loadingMsg, setLoadingMessage] = useState("Initializing...");

//   useEffect(() => {
//     if (!isLoading) return;
//     const messages = [
//       "Syncing Stock...",
//       "Syncing Items...",
//       "Syncing Schemes...",
//       "Updating Database...",
//       "Please Wait...",
//     ];
//     let i = 0;
//     setLoadingMessage(messages[0]);
//     const interval = setInterval(() => {
//       i = (i + 1) % messages.length;
//       setLoadingMessage(messages[i]);
//     }, 2000);
//     return () => clearInterval(interval);
//   }, [isLoading]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     // Add real authentication logic here later
//     if (email && password) {
//       setIsLoading(true);

//       // Yield execution to ensure the spinner renders
//       await new Promise((resolve) => setTimeout(resolve, 500));

//       // Mock API Response
//       const response = {
//         token: "74|uWVGw4HZvunuOsH5s0xumUbDrwmTq6dLTkaToiWld002b2bb",
//         terminal_code: "A",
//         user: {
//           id: 3,
//           name: "Cashier Two",
//           email: "cashier2@store.com",
//           role: {
//             id: 3,
//             name: "Cashier",
//           },
//           branch: {
//             id: 1,
//             branch_code: "5080",
//             // branch_code: "5010",
//             branch_name: "JASOLA PACIFIC MALL",
//           },
//           pos_role: {
//             id: 3,
//             name: "Cashier",
//           },
//         },
//       };

//       // Check if branch changed
//       const previousBranchCode = localStorage.getItem("branch_code");
//       const isBranchChanged =
//         previousBranchCode !== response.user.branch.branch_code;

//       // Save to LocalStorage
//       localStorage.setItem("auth_token", response.token);
//       localStorage.setItem("user_name", response.user.name);
//       localStorage.setItem("user_role", response.user.role.name);
//       localStorage.setItem("branch_code", response.user.branch.branch_code);
//       localStorage.setItem("branch_name", response.user.branch.branch_name);

//       // Extract branch code
//       const branchCode = response.user.branch.branch_code;
//       console.log("branchCode", branchCode);

//       // Trigger background sync
//       const posApi = (window as any).posApi;
//       if (posApi) {
//         try {
//           setLoadingMessage("Syncing Stock...");
//           if (posApi.syncStock)
//             await posApi.syncStock(branchCode, isBranchChanged);

//           setLoadingMessage("Syncing Items...");
//           if (posApi.syncItems) await posApi.syncItems(false);

//           setLoadingMessage("Syncing Schemes...");
//           if (posApi.syncSchemes) await posApi.syncSchemes(false);
//         } catch (error) {
//           console.error("Sync failed", error);
//         }
//       }
//       setIsLoading(false);
//       onLogin();
//     } else {
//       alert("Please enter any email and password to continue.");
//     }
//   };

//   if (isLoading) {
//     return (
//       <div
//         className="d-flex flex-column justify-content-center align-items-center vh-100"
//         style={{ background: "#f8f9fa" }}
//       >
//         <div
//           className="spinner-border text-primary mb-4"
//           role="status"
//           style={{ width: "4rem", height: "4rem" }}
//         >
//           <span className="visually-hidden">Loading...</span>
//         </div>
//         <h4 className="fw-bold text-dark mb-2">{loadingMsg}</h4>
//         <p className="text-muted">Please wait while we set up your terminal.</p>
//       </div>
//     );
//   }

//   return (
//     <div
//       className="d-flex justify-content-center align-items-center vh-100"
//       style={{
//         background: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)",
//       }}
//     >
//       <div
//         className="card border-0 shadow-lg rounded-4 overflow-hidden"
//         style={{ width: "850px", maxWidth: "90%", minHeight: "500px" }}
//       >
//         <div className="row g-0 h-100">
//           {/* Left Side: Brand/Visual */}
//           <div
//             className="col-md-6 d-none d-md-flex flex-column justify-content-center align-items-center text-white p-5"
//             style={{
//               background: "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
//             }}
//           >
//             <div className="mb-4 p-3 rounded-circle bg-white bg-opacity-10 shadow-sm">
//               <MdStore size={64} className="text-white" />
//             </div>
//             <h2
//               className="fw-bold mb-3 fs-1 text-white"
//               style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
//             >
//               Market99 POS
//             </h2>
//             <p className="text-center opacity-75 fs-5">
//               Exclusively designed for Market99 retail operations.
//             </p>
//           </div>

//           {/* Right Side: Login Form */}
//           <div className="col-md-6 bg-white p-5 d-flex flex-column justify-content-center">
//             <div className="text-center mb-4">
//               <img
//                 src="https://market99.com/cdn/shop/files/M_LOGO.png?v=1695998992&width=260"
//                 alt="Logo"
//                 style={{ maxHeight: "50px", objectFit: "contain" }}
//               />
//             </div>

//             <div className="mb-4 text-center">
//               <h4 className="fw-bold">Sign In</h4>
//               <p className="text-muted small">
//                 Enter your credentials to access the terminal
//               </p>
//             </div>

//             <form onSubmit={handleSubmit}>
//               <div className="mb-3">
//                 <label className="form-label small fw-bold text-secondary">
//                   EMAIL ADDRESS
//                 </label>
//                 <div className="input-group input-group-lg">
//                   <span className="input-group-text bg-light border-end-0 text-secondary">
//                     <MdEmail />
//                   </span>
//                   <input
//                     type="email"
//                     className="form-control bg-light border-start-0 ps-0"
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                     required
//                     placeholder="name@example.com"
//                     style={{ fontSize: "0.95rem" }}
//                   />
//                 </div>
//               </div>

//               <div className="mb-4">
//                 <label className="form-label small fw-bold text-secondary">
//                   PASSWORD
//                 </label>
//                 <div className="input-group input-group-lg">
//                   <span className="input-group-text bg-light border-end-0 text-secondary">
//                     <MdLock />
//                   </span>
//                   <input
//                     type={showPassword ? "text" : "password"}
//                     className="form-control bg-light border-start-0 border-end-0 ps-0"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     required
//                     placeholder="••••••"
//                     style={{ fontSize: "0.95rem" }}
//                   />
//                   <button
//                     className="input-group-text bg-light border-start-0 text-secondary"
//                     type="button"
//                     onClick={() => setShowPassword(!showPassword)}
//                     style={{ cursor: "pointer" }}
//                   >
//                     {showPassword ? <MdVisibility /> : <MdVisibilityOff />}
//                   </button>
//                 </div>
//               </div>

//               <button
//                 type="submit"
//                 className="btn btn-primary btn-lg w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
//                 style={{
//                   background: "linear-gradient(to right, #2563eb, #4f46e5)",
//                   border: "none",
//                 }}
//               >
//                 <MdLogin size={20} />
//                 LOGIN
//               </button>
//             </form>

//             <div className="mt-4 text-center">
//               <small className="text-muted">
//                 v1.0.0 | Support: help@market99.com
//               </small>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import { useState, useEffect, useRef } from "react";
import {
  MdDateRange,
  MdEmail,
  MdLock,
  MdLogin,
  MdStore,
  MdVisibility,
  MdVisibilityOff,
} from "react-icons/md";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("admin@pos.com");
  const [password, setPassword] = useState("password");
  const [financialYear, setFinancialYear] = useState("20252026");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMessage] = useState("Initializing...");

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Auto focus on email when page loads
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Rotating loading messages
  useEffect(() => {
    if (!isLoading) return;

    const messages = [
      "Syncing Stock...",
      "Syncing Items...",
      "Syncing Schemes...",
      "Updating Database...",
      "Please Wait...",
    ];

    let i = 0;
    setLoadingMessage(messages[0]);

    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMessage(messages[i]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Move focus to password when pressing Enter in email
  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      passwordRef.current?.focus();
    }
  };

  // Submit when pressing Enter in password
  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      alert("Email and Password are required.");
      emailRef.current?.focus();
      return;
    }

    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate fy_code like 20252026 from 2025-26
    const fyCode = financialYear.includes("-")
      ? financialYear.replace("-", "20")
      : financialYear;
    console.log("fin year==>", fyCode);

    const response = {
      token: "74|uWVGw4HZvunuOsH5s0xumUbDrwmTq6dLTkaToiWld002b2bb",
      // terminal_code: "Y",
      terminal_code: "X",
      fin_year: financialYear,
      fy_code: fyCode,
      user: {
        // id: 4,
        id: 3,
        name: "Cashier Two",
        email: "cashier2@store.com",
        role: { id: 3, name: "Cashier" },
        branch: {
          id: 1,
          branch_code: "5080",
          branch_name: "JASOLA PACIFIC MALL",
        },
        pos_role: { id: 3, name: "Cashier" },
        fy: {
          fin_year: financialYear,
          fy_code: fyCode,
        },
      },
    };

    const previousBranchCode = localStorage.getItem("branch_code");
    const isBranchChanged =
      previousBranchCode !== response.user.branch.branch_code;

    localStorage.setItem("auth_token", response.token);
    localStorage.setItem("user_name", response.user.name);
    localStorage.setItem("user_id", String(response.user.id));
    localStorage.setItem("user_role", response.user.role.name);
    localStorage.setItem("branch_code", response.user.branch.branch_code);
    localStorage.setItem("branch_name", response.user.branch.branch_name);
    localStorage.setItem("terminal_code", response.terminal_code);
    localStorage.setItem("fy_code", response.fy_code);

    const branchCode = response.user.branch.branch_code;

    const posApi = (window as any).posApi;

    if (posApi) {
      try {
        setLoadingMessage("Syncing Stock...");
        if (posApi.syncStock)
          await posApi.syncStock(branchCode, isBranchChanged);

        setLoadingMessage("Syncing Items...");
        if (posApi.syncItems) await posApi.syncItems(false);

        setLoadingMessage("Syncing Schemes...");
        if (posApi.syncSchemes) await posApi.syncSchemes(false);
      } catch (error) {
        console.error("Sync failed", error);
      }
    }

    setIsLoading(false);
    onLogin();
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
      <div
        className="d-flex flex-column justify-content-center align-items-center vh-100"
        style={{ background: "#f8f9fa" }}
      >
        <div
          className="spinner-border text-primary mb-4"
          role="status"
          style={{ width: "4rem", height: "4rem" }}
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        <h4 className="fw-bold text-dark mb-2">{loadingMsg}</h4>
        <p className="text-muted">Please wait while we set up your terminal.</p>
      </div>
    );
  }

  return (
    <div
      className="d-flex justify-content-center align-items-center vh-100"
      style={{
        background: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)",
      }}
    >
      <div
        className="card border-0 shadow-lg rounded-4 overflow-hidden"
        style={{ width: "850px", maxWidth: "90%", minHeight: "500px" }}
      >
        <div className="row g-0 h-100">
          <div
            className="col-md-6 d-none d-md-flex flex-column justify-content-center align-items-center text-white p-5"
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
            }}
          >
            <div className="mb-4 p-3 rounded-circle bg-white bg-opacity-10 shadow-sm">
              <MdStore size={64} className="text-white" />
            </div>
            <h2
              className="fw-bold mb-3 fs-1 text-white"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
            >
              Market99 POS
            </h2>
            <p className="text-center opacity-75 fs-5">
              Exclusively designed for Market99 retail operations.
            </p>
          </div>

          <div className="col-md-6 bg-white p-5 d-flex flex-column justify-content-center">
            <div className="text-center mb-4">
              <img
                src="https://market99.com/cdn/shop/files/M_LOGO.png?v=1695998992&width=260"
                alt="Logo"
                style={{ maxHeight: "50px", objectFit: "contain" }}
              />
            </div>

            <div className="mb-4 text-center">
              <h4 className="fw-bold">Sign In</h4>
              <p className="text-muted small">
                Enter your credentials to access the terminal
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <div className="mb-3">
                <label className="form-label small fw-bold text-secondary">
                  EMAIL ADDRESS
                </label>
                <div className="input-group input-group-lg">
                  <span className="input-group-text bg-light border-end-0 text-secondary">
                    <MdEmail />
                  </span>
                  <input
                    ref={emailRef}
                    type="email"
                    className="form-control bg-light border-start-0 ps-0"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    required
                    placeholder="name@example.com"
                    style={{ fontSize: "0.95rem" }}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold text-secondary">
                  PASSWORD
                </label>
                <div className="input-group input-group-lg">
                  <span className="input-group-text bg-light border-end-0 text-secondary">
                    <MdLock />
                  </span>
                  <input
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    className="form-control bg-light border-start-0 border-end-0 ps-0"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handlePasswordKeyDown}
                    required
                    placeholder="••••••"
                    style={{ fontSize: "0.95rem" }}
                  />
                  <button
                    className="input-group-text bg-light border-start-0 text-secondary"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ cursor: "pointer" }}
                  >
                    {showPassword ? <MdVisibility /> : <MdVisibilityOff />}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold text-secondary">
                  FINANCIAL YEAR
                </label>
                <div className="input-group input-group-lg">
                  <span className="input-group-text bg-light border-end-0 text-secondary">
                    <MdDateRange />
                  </span>
                  <select
                    className="form-select bg-light border-start-0 ps-0"
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    style={{ fontSize: "0.95rem", cursor: "pointer" }}
                  >
                    <option value="2024-25">2024-25</option>
                    <option value="2025-26">2025-26</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
                style={{
                  background: "linear-gradient(to right, #2563eb, #4f46e5)",
                  border: "none",
                }}
              >
                <MdLogin size={20} />
                LOGIN
              </button>
            </form>

            <div className="mt-4 text-center">
              <small className="text-muted">
                v1.0.0 | Support: help@market99.com
              </small>
              <div className="mt-2">
                <button
                  type="button"
                  className="btn btn-link btn-sm text-danger text-decoration-none"
                  onClick={handleResetDatabase}
                >
                  Reset Database
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
