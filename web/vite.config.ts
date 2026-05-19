import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:3001",
      "/d": "http://127.0.0.1:3001"
    }
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "login.html"),
        app: resolve(__dirname, "app.html"),
        admin: resolve(__dirname, "admin.html")
      }
    }
  }
});
