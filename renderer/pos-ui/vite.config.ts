// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// export default defineConfig({
//   plugins: [react()],
//   base: "./", // 🔥 MUST be root for Electron
//   server: {
//     port: 5173,
//     strictPort: true,
//     host: "localhost",
//   },
// });

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],

  // 👇 KEY FIX
  // dev  → http://localhost:5173  → "/"
  // build → file:// (Electron)    → "./"
  base: command === "build" ? "./" : "/",

  server: {
    port: 5173,
    strictPort: true,
    host: "localhost",
  },
}));

// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import tailwindcss from "@tailwindcss/vite";

// export default defineConfig(({ command }) => ({
//   plugins: [
//     react(),
//     tailwindcss(), // ✅ Tailwind plugin added
//   ],

//   // dev → http://localhost:5173
//   // build → file:// (Electron)
//   base: command === "build" ? "./" : "/",

//   server: {
//     port: 5173,
//     strictPort: true,
//     host: "localhost",
//   },
// }));
