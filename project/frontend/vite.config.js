import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server proxies /api -> Django so the browser sees same-origin (no CORS pain).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
