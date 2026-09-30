import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Loaded explicitly (rather than relying on process.env) so a frontend/.env
  // file works for the dev-server proxy too, not just the client bundle.
  // Falls back to localhost:8000 -- the right default when running
  // `npm run dev` directly on the host with a local backend, as opposed to
  // "backend", which only resolves inside the docker-compose network.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  };
});

