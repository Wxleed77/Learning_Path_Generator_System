import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api.post("/api/auth/signup", { name, email, password });
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Registration failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden overflow-hidden border-b border-zinc-800/80 bg-zinc-950/90 p-8 lg:flex lg:flex-col lg:justify-between lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_28%)]" />
          <div className="relative">
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-cyan-300/80">
              learning command center
            </p>
            <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-tight text-zinc-100">
              Open a study file. Define the route. Track every checkpoint.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-zinc-400">
              One account gives you a persistent archive of study paths, weekly milestones, and completion history.
            </p>
          </div>

          <div className="relative mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">archive depth</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">Full</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">access</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">Secure</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-16 sm:px-10 lg:px-12">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/80 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-8">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">new account</p>
              <h2 className="mt-2 text-3xl font-semibold text-zinc-100">Register</h2>
              <p className="mt-2 text-sm text-zinc-400">Create a workspace for your next study run.</p>
            </div>

            {error && (
              <p className="mt-5 border-l border-rose-400/60 pl-3 font-mono text-xs text-rose-300">{error}</p>
            )}

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">Name</span>
                <input
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-400"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">Email</span>
                <input
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-400"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">Password</span>
                <input
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-400"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-6 w-full rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Opening file..." : "Create account"}
            </button>

            <p className="mt-5 text-sm text-zinc-400">
              Already registered?{" "}
              <Link to="/login" className="text-cyan-300 underline underline-offset-2">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
