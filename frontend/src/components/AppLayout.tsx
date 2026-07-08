import { useNavigate, Outlet, Link } from "react-router-dom";
import { useAuthStore } from "../lib/authStore";
import { usePlanStore } from "../lib/planStore";

export default function AppLayout() {
  const clearAuth = useAuthStore((s) => s.clear);
  const clearPlan = usePlanStore((s) => s.clear);
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    clearPlan();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/dashboard" className="font-mono text-[11px] uppercase tracking-[0.32em] text-zinc-300">
            learning command center
          </Link>
          <nav className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-400">
            <Link to="/goal" className="transition-colors hover:text-cyan-300">
              new run
            </Link>
            <button onClick={handleLogout} className="transition-colors hover:text-cyan-300">
              log out
            </button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
