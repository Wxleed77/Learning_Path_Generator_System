import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="max-w-2xl mx-auto px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/50">New enrollment</p>
      <h1 className="font-display text-4xl mt-2 mb-10">Draft a course of study</h1>

      {generate.isPending && (
        <div className="mb-8 border-l-2 border-brass pl-4">
          <p className="font-mono text-xs uppercase tracking-wide text-ink/60">Compiling syllabus…</p>
          <p className="font-body text-sm text-ink/50 mt-1">
            The registrar is generating a week-by-week plan. This takes a few seconds.
          </p>
        </div>
      )}

      {generate.isError && (
        <p className="font-mono text-xs text-oxblood border-l-2 border-oxblood pl-4 mb-8">
          {(generate.error as any)?.response?.data?.detail ??
            "Syllabus generation failed. Try again."}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-[1fr_auto] gap-6 items-end border-b-2 border-ink pb-6">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wide text-ink/60">
              Subject / goal
            </span>
            <input
              className="w-full bg-transparent border-b-2 border-ink/30 focus:border-brass py-2 outline-none font-display text-xl transition-colors"
              placeholder="Become a backend developer"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              required
              maxLength={200}
            />
          </label>
          <div className="text-right pb-2">
            <span className="font-mono text-xs uppercase tracking-wide text-ink/40 block">Code</span>
            <span className="font-mono text-lg text-brass">{preview}</span>
          </div>
        </div>

        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wide text-ink/60">
            Current skill level
          </span>
          <select
            className="w-full bg-transparent border-b-2 border-ink/30 focus:border-brass py-2 outline-none font-body transition-colors"
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>

        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wide text-ink/60">
            Hours per week
          </span>
          <input
            className="w-full bg-transparent border-b-2 border-ink/30 focus:border-brass py-2 outline-none font-body transition-colors"
            type="number"
            min={1}
            max={80}
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(Number(e.target.value))}
            required
          />
        </label>

        <button
          type="submit"
          disabled={generate.isPending}
          className="w-full bg-ink text-paper font-mono text-xs uppercase tracking-wide py-3 hover:bg-oxblood transition-colors disabled:opacity-50"
        >
          {generate.isPending ? "Compiling syllabus…" : "Draft syllabus"}
        </button>
      </form>
    </div>
  );
}
