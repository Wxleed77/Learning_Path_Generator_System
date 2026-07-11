import { useState, useEffect } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../lib/authStore";
import { usePlanStore } from "../lib/planStore";
import { api } from "../lib/api";

export default function AppLayout() {
  const clearAuth = useAuthStore((s) => s.clear);
  const clearPlan = usePlanStore((s) => s.clear);
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/api/users/me")
      .then((res) => setUserEmail(res.data.email))
      .catch(() => {});
  }, []);

  function handleLogout() {
    clearAuth();
    clearPlan();
    navigate("/login");
  }

  const navLinks = [
    { to: "/dashboard", label: "dashboard" },
    { to: "/goal", label: "new run" },
    { to: "/account", label: "account" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="font-mono text-[11px] uppercase tracking-[0.32em] text-zinc-300">
              learning command center
            </Link>
            <nav className="hidden items-center gap-5 sm:flex">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] transition ${
                      isActive
                        ? "text-cyan-300"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600 md:inline">
                {userEmail}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 transition hover:text-rose-300"
            >
              log out
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <nav className="mt-2 flex gap-4 sm:hidden">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`font-mono text-[10px] uppercase tracking-[0.2em] transition ${
                  isActive
                    ? "text-cyan-300"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
