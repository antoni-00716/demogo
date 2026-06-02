import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminDashboard } from "./pages/AdminDashboard";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { UserDashboard } from "./pages/UserDashboard";
import "./styles/global.css";
import "./styles/home.css";
import "./styles/auth.css";
import "./styles/dashboard.css";

function resolvePage() {
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith("/admin.html")) return <AdminDashboard />;
  if (path.endsWith("/app.html")) return <UserDashboard />;
  if (path.endsWith("/login.html")) return <LoginPage />;
  return <HomePage />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>{resolvePage()}</StrictMode>
);
