import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://localhost:14000";
  const port = Number(env.VITE_PORT || 13511);

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      port,
      allowedHosts: true,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        "/storage": { target: apiTarget, changeOrigin: true }
      }
    },
    preview: {
      host: "0.0.0.0",
      port,
      allowedHosts: true
    }
  };
});
