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
    <div className="min-h-screen bg-paper grid md:grid-cols-[1.3fr_1fr]">
      <div className="hidden md:flex flex-col justify-between px-14 py-12 border-r-2 border-ink">
        <span className="font-mono text-xs tracking-[0.2em] uppercase text-ink/60">
          Self-Study Registrar
        </span>
        <div>
          <h1 className="font-display text-6xl leading-[1.05] text-ink">
            Open a file.
            <br />
            Set the terms.
            <br />
            Show up weekly.
          </h1>
          <p className="font-body text-ink/60 mt-6 max-w-sm">
            One account, unlimited self-designed courses — each with its own syllabus and ledger.
          </p>
        </div>
        <span className="font-mono text-xs text-ink/40">EST. session-based, JWT-secured</span>
      </div>

      <div className="flex items-center justify-center px-8 py-16">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="font-display text-3xl text-ink">Register</h2>
            <p className="font-mono text-xs text-ink/50 mt-1 uppercase tracking-wide">
              Open your file
            </p>
          </div>

          {error && (
            <p className="font-mono text-xs text-oxblood border-l-2 border-oxblood pl-3">{error}</p>
          )}

          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wide text-ink/60">Name</span>
            <input
              className="w-full bg-transparent border-b-2 border-ink/30 focus:border-brass py-2 outline-none font-body transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

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
            {pending ? "Opening file..." : "Create account"}
          </button>

          <p className="font-body text-sm text-ink/60">
            Already registered?{" "}
            <Link to="/login" className="text-indigo underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
