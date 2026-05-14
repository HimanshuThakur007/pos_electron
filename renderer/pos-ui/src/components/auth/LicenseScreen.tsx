import { useState } from "react";
import { MdVpnKey, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { Toaster } from "react-hot-toast";
import mLogo from "../../assets/M_LOGO.png";
import logo1 from "../../../../../electron/logo1.png";

interface LicenseScreenProps {
  onActivate: (key: string) => Promise<boolean>;
  isLoading: boolean;
}

export default function LicenseScreen({
  onActivate,
  isLoading,
}: LicenseScreenProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [showLicense, setShowLicense] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;
    await onActivate(licenseKey.trim());
  };

  return (
    <>
      <Toaster />
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#e0eafc] to-[#cfdef3]">
        <div className="bg-white shadow-2xl rounded-3xl overflow-hidden w-[850px] max-w-[90%] min-h-[500px] flex">
          {/* Left Side: Brand/Visual */}
          <div className="hidden md:flex flex-col justify-center items-center text-white p-12 w-1/2 bg-gradient-to-br from-slate-900 to-slate-700">
            <div className="mb-6 p-4 rounded-full bg-white/10 shadow-sm backdrop-blur-sm">
              <img
                src={logo1}
                alt="Logo"
                className="w-16 h-16 object-cover rounded-full bg-white"
              />
            </div>
            <h2 className="font-bold mb-3 text-4xl text-white drop-shadow-md text-center">
              Market99 POS
            </h2>
            <p className="text-center opacity-80 text-lg">
              Please activate your terminal with a valid license key to
              continue.
            </p>
          </div>

          {/* Right Side: License Form */}
          <div className="w-full md:w-1/2 bg-white p-12 flex flex-col justify-center">
            <div className="text-center mb-6">
              <img
                src={mLogo}
                alt="Logo"
                className="h-12 object-contain mx-auto"
              />
            </div>

            <div className="mb-8 text-center">
              <h4 className="font-bold text-2xl text-gray-800">
                Software License
              </h4>
              <p className="text-gray-500 text-sm mt-1">
                Enter your license key to register this device
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  License Key
                </label>
                <div className="flex items-center border border-gray-300 rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden">
                  <span className="pl-3 text-gray-400">
                    <MdVpnKey size={20} />
                  </span>
                  <input
                    type={showLicense ? "text" : "password"}
                    className="w-full bg-transparent border-none p-4 text-gray-800 font-mono tracking-wider focus:outline-none placeholder-gray-400 uppercase"
                    value={licenseKey}
                    onChange={(e) =>
                      setLicenseKey(e.target.value.toUpperCase())
                    }
                    required
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    autoFocus
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLicense(!showLicense)}
                    className="pr-4 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                  >
                    {showLicense ? (
                      <MdVisibility size={20} />
                    ) : (
                      <MdVisibilityOff size={20} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !licenseKey.trim()}
                className="w-full py-4 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-lg hover:opacity-90 transition shadow-md flex items-center justify-center gap-2 transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <MdVpnKey size={20} />
                )}
                {isLoading ? "ACTIVATING..." : "ACTIVATE LICENSE"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
