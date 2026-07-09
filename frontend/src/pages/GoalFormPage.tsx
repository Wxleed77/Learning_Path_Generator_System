import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGenerateRoadmap } from "../hooks/useRoadmap";
import { usePlanStore } from "../lib/planStore";
import { courseCode } from "../lib/courseCode";

export default function GoalFormPage() {
  const [goalTitle, setGoalTitle] = useState("");
  const [skillLevel, setSkillLevel] = useState("beginner");
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const generate = useGenerateRoadmap();
  const setPlan = usePlanStore((s) => s.setPlan);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await generate.mutateAsync({ goalTitle, skillLevel, hoursPerWeek });
    setPlan({ planId: result.planId, totalWeeks: result.totalWeeks, goalTitle, skillLevel, hoursPerWeek });
    navigate("/dashboard");
  }

  const preview = goalTitle.trim() ? courseCode(goalTitle, skillLevel) : "———";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden overflow-hidden border-b border-zinc-800/80 bg-zinc-950/90 p-8 lg:flex lg:flex-col lg:justify-between lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_28%)]" />
          <div className="relative">
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-cyan-300/80">new study run</p>
            <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-tight text-zinc-100">Design your next learning objective.</h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-zinc-400">Provide a clear goal, your current level, and your weekly availability. We'll generate a structured roadmap.</p>
          </div>

          <div className="relative mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">week planner</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">Dynamic</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">re-plan on quiz</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">Adaptive</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-16 sm:px-10 lg:px-12">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/80 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-8">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">generation terminal</p>
              <h2 className="mt-2 text-3xl font-semibold text-zinc-100">Draft a path</h2>
              <p className="mt-2 text-sm text-zinc-400">Feed the engine your study goal to generate a week-by-week plan.</p>
            </div>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">Subject / Goal</span>
                <input
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-400"
                  placeholder="Become a backend developer"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  required
                  maxLength={200}
                />
              </label>

              <div>
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">Preview Code</span>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-3">
                  <span className="font-mono text-sm text-cyan-300">{preview}</span>
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">Current Skill Level</span>
                <select
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-400"
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value)}
                >
                  <option value="beginner">beginner</option>
                  <option value="intermediate">intermediate</option>
                  <option value="advanced">advanced</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">Hours Per Week</span>
                <input
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-400"
                  type="number"
                  min={1}
                  max={80}
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                  required
                />
              </label>
            </div>

            {generate.isPending && (
              <div className="mt-5 border-l border-cyan-400/60 pl-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300">Compiling…</p>
                <p className="mt-1 text-xs text-zinc-400">The engine is generating your week-by-week plan. This takes a moment.</p>
              </div>
            )}

            {generate.isError && (
              <p className="mt-5 border-l border-rose-400/60 pl-3 font-mono text-xs text-rose-300">
                {(generate.error as any)?.response?.data?.detail ?? "Path generation failed. Try again."}
              </p>
            )}

            <button
              type="submit"
              disabled={generate.isPending || !goalTitle.trim()}
              className="mt-6 w-full rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generate.isPending ? "Generating..." : "Generate roadmap"}
            </button>

            <p className="mt-5 text-sm text-zinc-400">
              <Link to="/dashboard" className="text-cyan-300 underline underline-offset-2">
                Back to dashboard
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
