import { MdVpnKey } from "react-icons/md";

export function OtpModal({
  otp,
  setOtp,
  onVerify,
}: {
  otp: string;
  setOtp: (val: string) => void;
  onVerify: (e: React.FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-scale-up">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-3">
            <MdVpnKey size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">OTP Verification</h3>
          <p className="text-sm text-gray-500 mt-1">
            Enter the 6-digit code sent to your email.
          </p>
        </div>

        <form onSubmit={onVerify} className="space-y-4">
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
  );
}
