import { useNavigate, Outlet, Link } from "react-router-dom";
import { useAuthStore } from "../lib/authStore";

export default function AppLayout() {
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  function handleLogout() {
    clear();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b-2 border-ink flex items-center justify-between px-6 py-4">
        <Link to="/dashboard" className="font-mono text-xs tracking-[0.2em] uppercase text-ink/70">
          Self-Study Registrar
        </Link>
        <nav className="flex items-center gap-6 font-mono text-xs tracking-wide uppercase">
          <Link to="/goal" className="text-indigo hover:text-oxblood transition-colors">
            New enrollment
          </Link>
          <button onClick={handleLogout} className="text-ink/60 hover:text-oxblood transition-colors">
            Log out
          </button>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
