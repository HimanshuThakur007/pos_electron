import { MdWarning, MdDevices } from "react-icons/md";

export interface ConflictInfo {
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

export function ConflictModal({
  conflictData,
  onClose,
}: {
  conflictData: ConflictInfo;
  onClose: () => void;
}) {
  return (
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
                    {conflictData.active_session.device_uid.substring(0, 10)}
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
                    {conflictData.attempted_login.device_uid.substring(0, 10)}
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
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
