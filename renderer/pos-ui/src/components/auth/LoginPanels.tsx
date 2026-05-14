import mLogo from "../../assets/M_LOGO.png";
import logo1 from "../../../../../electron/logo1.png";
import { MdFlashOn, MdWifiOff, MdSync, MdTrendingUp } from "react-icons/md";
import { useAuth } from "../../context/AuthContext";

// export function BrandPanel() {
//   const { isServerOnline, isNetworkOnline } = useAuth();

//   const posFeatures = [
//     { name: "Lightning Fast", icon: MdFlashOn, color: "text-amber-400" },
//     { name: "Offline First", icon: MdWifiOff, color: "text-blue-400" },
//     { name: "Auto Sync", icon: MdSync, color: "text-emerald-400" },
//     { name: "High Volume", icon: MdTrendingUp, color: "text-purple-400" },
//   ];

//   return (
//     <div className="hidden md:flex flex-col justify-center items-center text-white p-12 w-1/2 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/50 relative overflow-hidden">
//       {/* Subtle top accent line */}
//       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />

//       {/* Performance-friendly geometric grid background */}
//       <div
//         className="absolute inset-0 opacity-[0.03] pointer-events-none"
//         style={{
//           backgroundImage:
//             "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
//           backgroundSize: "24px 24px",
//         }}
//       />

//       {/* Status Indicator */}
//       <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 shadow-sm">
//         <span
//           className={`w-2 h-2 rounded-full ${
//             isServerOnline
//               ? "bg-emerald-500"
//               : isNetworkOnline
//                 ? "bg-amber-500"
//                 : "bg-rose-500"
//           }`}
//         />
//         <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">
//           {isServerOnline
//             ? "Online"
//             : isNetworkOnline
//               ? "Server Down"
//               : "Offline"}
//         </span>
//       </div>

//       <div className="relative z-10 flex flex-col items-center">
//         <div className="mb-8 p-3 rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
//           <img src={logo1} alt="Logo" className="w-16 h-16 object-contain" />
//         </div>

//         <h2 className="font-extrabold mb-4 text-4xl text-white tracking-tight drop-shadow-sm">
//           Market99 POS
//         </h2>

//         <div className="w-12 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-6 shadow-sm" />

//         <p className="text-center text-slate-300 text-lg max-w-sm leading-relaxed mb-10">
//           Exclusively designed for Market99 retail operations with{" "}
//           <strong className="text-amber-400 font-semibold">
//             offline billing
//           </strong>
//           .
//         </p>

//         <div className="flex flex-wrap justify-center gap-3">
//           {posFeatures.map((feature) => {
//             const Icon = feature.icon;
//             return (
//               <span
//                 key={feature.name}
//                 className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold tracking-wider uppercase bg-slate-800/90 text-slate-200 rounded-md border border-slate-700 shadow-sm"
//               >
//                 <Icon size={14} className={feature.color} />
//                 {feature.name}
//               </span>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// }

export function BrandPanel() {
  const { isServerOnline, isNetworkOnline } = useAuth();

  const posFeatures = [
    { name: "Lightning Fast", icon: MdFlashOn, color: "text-amber-300" },
    { name: "Offline First", icon: MdWifiOff, color: "text-blue-300" },
    { name: "Auto Sync", icon: MdSync, color: "text-emerald-300" },
    { name: "High Volume", icon: MdTrendingUp, color: "text-purple-300" },
  ];

  return (
    <div className="hidden md:flex flex-col justify-center items-center text-white p-12 w-1/2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-r border-slate-700/50 relative overflow-hidden">
      {/* Static gradient orbs - no animation */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Static top accent line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

      {/* Static geometric grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Status Indicator - no animation */}
      <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 shadow-sm">
        <div className="relative w-2 h-2">
          <div
            className={`absolute inset-0 rounded-full ${
              isServerOnline
                ? "bg-emerald-500"
                : isNetworkOnline
                  ? "bg-amber-500"
                  : "bg-rose-500"
            }`}
          />
        </div>
        <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">
          {isServerOnline
            ? "Online"
            : isNetworkOnline
              ? "Server Down"
              : "Offline"}
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo container - no animation */}
        <div className="mb-8">
          <div className="p-3 rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
            <img src={logo1} alt="Logo" className="w-16 h-16 object-contain" />
          </div>
        </div>

        {/* Title with subtle gradient */}
        <h2 className="font-extrabold mb-4 text-4xl tracking-tight drop-shadow-sm">
          <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Market99 POS
          </span>
        </h2>

        {/* Static divider */}
        <div className="w-12 h-1 bg-slate-700 rounded-full mb-6" />

        {/* Description */}
        <p className="text-center text-slate-400 text-[15px] max-w-sm leading-relaxed mb-10">
          Exclusively designed for{" "}
          <strong className="text-slate-200 font-medium">
            Market99 retail operations
          </strong>{" "}
          with{" "}
          <strong className="text-blue-300 font-medium">offline billing</strong>
          .
        </p>

        {/* Feature tags - static with minimal hover effect */}
        <div className="flex flex-wrap justify-center gap-3.5">
          {posFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <span
                key={feature.name}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium tracking-wide bg-slate-800/40 text-slate-300 rounded-xl border border-slate-700/50 shadow-sm transition-all duration-300 hover:bg-slate-800 hover:text-white"
              >
                <Icon size={16} className={`${feature.color} opacity-90`} />
                {feature.name}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LoginHeader() {
  return (
    <>
      <div className="text-center mb-6">
        <img src={mLogo} alt="Logo" className="h-12 object-contain mx-auto" />
      </div>
      <div className="mb-6 text-center">
        <h4 className="font-bold text-2xl text-gray-800">Sign In</h4>
        <p className="text-gray-500 text-sm mt-1">
          Enter your credentials to access the terminal
        </p>
      </div>
    </>
  );
}

export function LoginFooter({
  onResetDatabase,
}: {
  onResetDatabase: () => void;
}) {
  return (
    <div className="mt-8 text-center">
      <small className="text-gray-400 block mb-2">
        v1.0.0 | Support: info@market99.com
      </small>
      <button
        type="button"
        // className="hidden text-sm text-red-500 hover:text-red-700 font-medium transition"
        className="text-sm text-red-500 hover:text-red-700 font-medium transition"
        onClick={onResetDatabase}
      >
        Reset Database
      </button>
    </div>
  );
}
