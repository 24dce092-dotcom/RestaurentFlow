import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tagger from "@dhiwise/component-tagger";

// https://vitejs.dev/config/
export default defineConfig({
  // This changes the out put dir from dist to build
  // comment this out if that isn't relevant for your project
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 2000,
  },
  plugins: [tsconfigPaths(), react(), tagger()],
  server: {
  port: 5173,
    host: "0.0.0.0",
  // Allow Vite to auto-select the next free port if requested port is busy
  strictPort: false,
    proxy: {
      '/api': {
        // Allow configuring backend URL via environment. Useful when backend runs on a different port in dev.
        // Prefer BACKEND_URL, then VITE_BACKEND_URL (for consistency with client). Default to 5001 where backend is running now.
        target: process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  }
});