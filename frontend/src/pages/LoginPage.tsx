import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../lib/authStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      setTokens(res.data.access_token, res.data.refresh_token);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "That email and password don't match our records.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper grid md:grid-cols-[1.3fr_1fr]">
      <div className="hidden md:flex flex-col justify-between px-14 py-12 border-r-2 border-ink">
        <span className="font-mono text-xs tracking-[0.2em] uppercase text-ink/60">
          Self-Study Registrar
        </span>
        <div>
          <h1 className="font-display text-6xl leading-[1.05] text-ink">
            Every subject
            <br />
            you teach yourself
            <br />
            deserves a record.
          </h1>
          <p className="font-body text-ink/60 mt-6 max-w-sm">
            Log the goal, draft the syllabus, keep the ledger. No instructor required.
          </p>
        </div>
        <span className="font-mono text-xs text-ink/40">EST. session-based, JWT-secured</span>
      </div>

      <div className="flex items-center justify-center px-8 py-16">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="font-display text-3xl text-ink">Sign in</h2>
            <p className="font-mono text-xs text-ink/50 mt-1 uppercase tracking-wide">
              Access your transcript
            </p>
          </div>

          {error && (
            <p className="font-mono text-xs text-oxblood border-l-2 border-oxblood pl-3">{error}</p>
          )}

          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wide text-ink/60">Email</span>
            <input
              className="w-full bg-transparent border-b-2 border-ink/30 focus:border-brass py-2 outline-none font-body transition-colors"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wide text-ink/60">Password</span>
            <input
              className="w-full bg-transparent border-b-2 border-ink/30 focus:border-brass py-2 outline-none font-body transition-colors"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-ink text-paper font-mono text-xs uppercase tracking-wide py-3 hover:bg-oxblood transition-colors disabled:opacity-50"
          >
            {pending ? "Verifying..." : "Log in"}
          </button>

          <p className="font-body text-sm text-ink/60">
            New here?{" "}
            <Link to="/signup" className="text-indigo underline underline-offset-2">
              Register an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
