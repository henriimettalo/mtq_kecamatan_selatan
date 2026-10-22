import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react()],
  resolve: { alias: {
    "@": fileURLToPath(new URL("./client", import.meta.url)),
    "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
  } },
  server: { port: 5173, proxy: {
    "/api": "http://127.0.0.1:3000",
    "/admin/files": "http://127.0.0.1:3000",
    "/admin/export": "http://127.0.0.1:3000",
  } },
  build: { outDir: "dist", target: "es2022" },
});
