import { useState, useEffect } from "react";

export function useUserDetails() {
  const [userDetails, setUserDetails] = useState({
    branchName: "MARKET NINETY NINE PVT LTD",
    branchCode: "",
    userName: "User",
    userRole: "Role",
    userId: "0",
    terminalCode: "A",
    fyCode: "",
    fin_year: "",
  });

  const [branchInfo, setBranchInfo] = useState({
    address: "",
    gstin: "",
    phoneNo: "",
  });

  useEffect(() => {
    setUserDetails({
      branchName:
        localStorage.getItem("branch_name") || "MARKET NINETY NINE PVT LTD",
      branchCode: localStorage.getItem("branch_code") || "",
      userName: localStorage.getItem("user_name") || "User",
      userRole: localStorage.getItem("user_role") || "Role",
      userId: localStorage.getItem("user_id") || "0",
      terminalCode: localStorage.getItem("terminal_code") || "A",
      fyCode: localStorage.getItem("fy_code") || "",
      fin_year: localStorage.getItem("fin_year") || "",
    });
  }, []);

  useEffect(() => {
    const fetchBranchData = async () => {
      try {
        if (window.posApi && window.posApi.getBranches) {
          const branches = await window.posApi.getBranches();
          const branch = branches.find(
            (b: any) =>
              String(b.branchCode) === String(userDetails.branchCode) ||
              String(b.Branch_Code) === String(userDetails.branchCode),
          );
          if (branch) {
            setBranchInfo({
              address: branch.Address || "",
              gstin: branch.Gst_Number || "",
              phoneNo: branch.branch_Phone_Number || "",
            });
          }
        }
      } catch (e) {
        console.error("Failed to fetch branch info", e);
      }
    };
    if (userDetails.branchCode) {
      fetchBranchData();
    }
  }, [userDetails.branchCode]);

  return { userDetails, branchInfo };
}
