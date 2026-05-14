import { useState, useEffect } from "react";
import { MdWarning, MdExitToApp, MdDevices, MdClose } from "react-icons/md";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";

export default function SessionWatcher() {
  const [terminationData, setTerminationData] = useState<any>(null);
  const [deviceUid, setDeviceUid] = useState<string>("");
  const { get } = useApi();
  const { token, logout } = useAuth();

  useEffect(() => {
    // Fetch device UID only once when the component mounts
    if ((window as any).posApi && (window as any).posApi.getDeviceId) {
      (window as any).posApi.getDeviceId().then(setDeviceUid);
    }
  }, []);

  useEffect(() => {
    // Poll every 5 seconds
    const pingInterval = setInterval(async () => {
      if (!token) return; // Skip polling if the user isn't logged in
      console.log("Token====>", token);
      try {
        const endpoint = deviceUid ? `auth/ping` : "auth/ping";
        const response = (await get(endpoint)) as any;
        console.log("Session ping response:", response);
        // The JSON might be in 'data', or in 'error' if the API returns a 4xx status code
        const payload = response?.data || response?.error || response;

        // Check if the API responded with the SESSION_TERMINATED code
        if (payload && payload.code === "SESSION_TERMINATED") {
          clearInterval(pingInterval); // Stop polling once terminated

          // Only show the modal if explicit termination details are provided
          if (payload.terminated) {
            setTerminationData(payload);
          } else {
            // If it's just an expired session, stop polling but DON'T force logout
            // so they can continue offline billing.
            clearInterval(pingInterval);
          }
        }
      } catch (err) {
        console.error("Session ping error:", err);
      }
    }, 50000);

    return () => clearInterval(pingInterval);
  }, [get, token, deviceUid]);

  const handleLogout = () => {
    // Trigger central logout
    logout();
  };

  if (!terminationData) return null; // Render nothing if the session is active

  const { message, terminated } = terminationData;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
        <div className="bg-red-50 p-6 border-b border-red-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-full text-red-600">
              <MdWarning size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Session Terminated
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Your access has been revoked remotely.
              </p>
            </div>
          </div>
          <button
            onClick={() => setTerminationData(null)}
            className="text-gray-400 hover:text-gray-600 transition p-1"
          >
            <MdClose size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-800 text-sm font-medium bg-red-50/50 p-3 rounded-lg border border-red-100 text-center">
            {message || "Your session has been terminated. Please login again."}
          </p>

          {terminated && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 text-gray-500 font-medium text-xs uppercase tracking-wider">
                <MdDevices size={16} /> Termination Details
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Terminated By:</span>
                  <span className="font-semibold text-gray-900">
                    {terminated.by_user_name || "Admin"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Time:</span>
                  <span className="font-semibold text-gray-900">
                    {terminated.at
                      ? new Date(terminated.at).toLocaleString()
                      : "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Branch:</span>
                  <span className="font-semibold text-gray-900">
                    {terminated.branch_code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Terminal:</span>
                  <span className="font-semibold text-gray-900">
                    {terminated.from_terminal}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={() => setTerminationData(null)}
            className="px-5 py-3 text-gray-700 font-bold hover:bg-gray-200 rounded-xl transition"
          >
            Dismiss
          </button>
          <button
            onClick={handleLogout}
            className="px-5 py-3 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl shadow-lg hover:shadow-red-500/30 transition flex items-center justify-center gap-2"
          >
            <MdExitToApp size={20} />
            Acknowledge & Logout
          </button>
        </div>
      </div>
    </div>
  );
}
