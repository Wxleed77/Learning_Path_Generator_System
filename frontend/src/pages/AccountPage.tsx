import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../lib/authStore";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  skill_level: string;
}

export default function AccountPage() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clear);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit profile state
  const [editName, setEditName] = useState("");
  const [editSkill, setEditSkill] = useState("beginner");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Password change state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<UserProfile>("/api/users/me")
      .then((res) => {
        setProfile(res.data);
        setEditName(res.data.name);
        setEditSkill(res.data.skill_level);
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await api.patch<UserProfile>("/api/users/me", {
        name: editName.trim(),
        skill_level: editSkill,
      });
      setProfile(res.data);
      setSaveMsg("Profile updated");
    } catch {
      setSaveMsg("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwMsg("Passwords do not match");
      return;
    }
    if (newPw.length < 6) {
      setPwMsg("Password must be at least 6 characters");
      return;
    }
    setChangingPw(true);
    setPwMsg(null);
    try {
      await api.patch("/api/users/me/password", {
        current_password: currentPw,
        new_password: newPw,
      });
      setPwMsg("Password changed successfully");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      setPwMsg(err?.response?.data?.detail ?? "Failed to change password");
    } finally {
      setChangingPw(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Are you absolutely sure?\n\nAll your learning paths, progress, quiz attempts, and account data will be permanently deleted. This cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.delete("/api/users/me");
      clearAuth();
      navigate("/login");
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || "Unknown error";
      alert(`Failed to delete account: ${detail}`);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-zinc-400">Loading profile…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-rose-300">{error ?? "Profile not found"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to="/dashboard"
        className="mb-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500 transition hover:text-cyan-300"
      >
        <span>&larr;</span> back to dashboard
      </Link>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8">
        <div className="mb-2 inline-block rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-200">
          account
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-100">Account settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Logged in as <span className="text-zinc-200 font-medium">{profile.email}</span>
        </p>
      </div>

      {/* Profile section */}
      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">profile</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">email</label>
            <input
              value={profile.email}
              disabled
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-500 outline-none"
            />
            <p className="mt-1 text-[10px] text-zinc-600">Email cannot be changed</p>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">skill level</label>
            <select
              value={editSkill}
              onChange={(e) => setEditSkill(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-cyan-400"
            >
              <option value="beginner">beginner</option>
              <option value="intermediate">intermediate</option>
              <option value="advanced">advanced</option>
            </select>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "saving…" : "save changes"}
          </button>
          {saveMsg && (
            <p className={`text-sm ${saveMsg.includes("Failed") ? "text-rose-300" : "text-emerald-300"}`}>
              {saveMsg}
            </p>
          )}
        </div>
      </div>

      {/* Password section */}
      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">change password</h2>

        <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">current password</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">new password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">confirm new password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={changingPw}
            className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changingPw ? "changing…" : "change password"}
          </button>
          {pwMsg && (
            <p className={`text-sm ${pwMsg.includes("successfully") ? "text-emerald-300" : "text-rose-300"}`}>
              {pwMsg}
            </p>
          )}
        </form>
      </div>

      {/* Danger zone */}
      <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/5 p-6 sm:p-8">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-rose-400">danger zone</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-rose-300 border-t-transparent" />
              deleting…
            </>
          ) : (
            "delete account"
          )}
        </button>
      </div>
    </div>
  );
}