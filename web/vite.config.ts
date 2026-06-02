import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function stripSecureCookies(): Plugin {
  return {
    name: "strip-secure-cookies",
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        const orig = res.setHeader.bind(res);
        res.setHeader = function (name, value) {
          if (name.toLowerCase() === "set-cookie") {
            const strip = (s: string) => s.replace(/;\s*Secure/gi, "").replace(/;\s*SameSite=\w+/gi, "");
            if (typeof value === "string") value = strip(value);
            else if (Array.isArray(value)) value = value.map(strip);
          }
          return orig(name, value);
        };
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), stripSecureCookies()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        cookieDomainRewrite: { "*": "" }
      },
      "/d": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true
      }
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
