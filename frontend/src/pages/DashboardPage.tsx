import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlanStore } from "../lib/planStore";
import { useGenerateRoadmap, useUpdateProgress, useUserRoadmaps, useWeeklyPlan } from "../hooks/useRoadmap";
import { courseCode } from "../lib/courseCode";
import { Task } from "../lib/types";

const TYPE_LABEL: Record<Task["type"], string> = {
  topic: "Topic",
  project: "Project",
  quiz: "Quiz",
  milestone: "Milestone",
};

function getStatusBadge(status: Task["status"]) {
  switch (status) {
    case "completed":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
    case "in_progress":
      return "border-amber-400/40 bg-amber-500/10 text-amber-300";
    default:
      return "border-zinc-700 bg-zinc-900/80 text-zinc-400";
  }
}

function getNodeAccent(type: Task["type"]) {
  switch (type) {
    case "milestone":
      return "border-amber-400 bg-amber-500/20";
    case "quiz":
      return "border-cyan-400 bg-cyan-500/20";
    default:
      return "border-emerald-400 bg-emerald-500/20";
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { planId, totalWeeks, goalTitle, skillLevel, hoursPerWeek, setPlan } = usePlanStore();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(planId);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [draftGoal, setDraftGoal] = useState("");
  const [draftSkill, setDraftSkill] = useState("beginner");
  const [draftHours, setDraftHours] = useState(10);

  const generate = useGenerateRoadmap();
  const { data: historyData, isLoading: isHistoryLoading } = useUserRoadmaps();
  const { data, isLoading, isError } = useWeeklyPlan(selectedPlanId, selectedWeek);
  const updateProgress = useUpdateProgress(selectedPlanId, selectedWeek);

  useEffect(() => {
    if (planId && selectedPlanId !== planId) {
      setSelectedPlanId(planId);
    }
  }, [planId, selectedPlanId]);

  useEffect(() => {
    if (!selectedPlanId && historyData?.length) {
      const first = historyData[0];
      setSelectedPlanId(first.planId);
      setSelectedWeek(1);
    }
  }, [historyData, selectedPlanId]);

  const history = historyData ?? [];

  const selectedPlan = useMemo(() => {
    const fromHistory = history.find((item) => item.planId === selectedPlanId);
    if (fromHistory) {
      return fromHistory;
    }

    if (selectedPlanId && selectedPlanId === planId) {
      return {
        planId,
        goalTitle,
        skillLevel,
        hoursPerWeek,
        totalWeeks,
        completedTasks: 0,
        totalTasks: 0,
        createdAt: new Date().toISOString(),
        status: "active",
      };
    }

    return null;
  }, [history, selectedPlanId, planId, goalTitle, skillLevel, hoursPerWeek, totalWeeks]);

  const completed = data?.tasks.filter((task) => task.status === "completed").length ?? 0;
  const total = data?.tasks.length ?? 0;
  const completionPct = total ? Math.round((completed / total) * 100) : 0;
  const trackedHours = history.reduce((sum, item) => sum + item.hoursPerWeek * item.totalWeeks, 0);
  const hasHistory = history.length > 0;

  async function handleCreatePath(event: React.FormEvent) {
    event.preventDefault();
    const result = await generate.mutateAsync({
      goalTitle: draftGoal.trim(),
      skillLevel: draftSkill,
      hoursPerWeek: draftHours,
    });

    setPlan({
      planId: result.planId,
      totalWeeks: result.totalWeeks,
      goalTitle: draftGoal.trim(),
      skillLevel: draftSkill,
      hoursPerWeek: draftHours,
    });
    setSelectedPlanId(result.planId);
    setSelectedWeek(1);
    navigate("/dashboard");
  }

  function handleSelectPlan(item: { planId: string; goalTitle: string; skillLevel: string; hoursPerWeek: number; totalWeeks: number }) {
    setSelectedPlanId(item.planId);
    setSelectedWeek(1);
    setPlan({
      planId: item.planId,
      totalWeeks: item.totalWeeks,
      goalTitle: item.goalTitle,
      skillLevel: item.skillLevel,
      hoursPerWeek: item.hoursPerWeek,
    });
  }

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">
                analytics command center
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-zinc-100 sm:text-3xl">
                {selectedPlan ? selectedPlan.goalTitle : "Roadmap studio"}
              </h1>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-400">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              {selectedPlan ? `${selectedPlan.totalWeeks} weeks • ${selectedPlan.hoursPerWeek} hrs/wk` : "Awaiting first route"}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
          <aside className="space-y-4 xl:sticky xl:top-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                    learning history
                  </p>
                  <h2 className="mt-1 text-lg text-zinc-100">Saved paths</h2>
                </div>
                <button
                  onClick={() => navigate("/goal")}
                  className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-200 transition hover:bg-cyan-500/20"
                >
                  new run
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {isHistoryLoading && <p className="text-sm text-zinc-500">Syncing archive…</p>}

                {!isHistoryLoading && !hasHistory && (
                  <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 p-4 text-sm text-zinc-400">
                    No saved paths yet. Generate your first study graph to start populating this command log.
                  </div>
                )}

                {history.map((item) => {
                  const isActive = item.planId === selectedPlanId;
                  return (
                    <button
                      key={item.planId}
                      onClick={() => handleSelectPlan(item)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isActive
                          ? "border-cyan-400/40 bg-cyan-500/10"
                          : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-zinc-100">{item.goalTitle}</p>
                        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                          {item.skillLevel}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                        <span>{item.totalWeeks} weeks</span>
                        <span>{item.completedTasks}/{item.totalTasks} tasks</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">signal board</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">paths generated</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-100">{history.length}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">hours tracked</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-100">{trackedHours}</p>
                </div>
              </div>
            </div>
          </aside>

          <main className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-6">
            {selectedPlan ? (
              <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">
                      active path
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-zinc-100">{selectedPlan.goalTitle}</h2>
                    <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                      {courseCode(selectedPlan.goalTitle, selectedPlan.skillLevel)} • {selectedPlan.hoursPerWeek} hrs/week • {selectedPlan.totalWeeks} weeks
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-400">
                    <div className="flex items-center justify-between gap-4">
                      <span>Week {selectedWeek}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                        {data?.theme ?? "loading"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Array.from({ length: selectedPlan.totalWeeks }, (_, index) => index + 1).map((week) => (
                        <button
                          key={week}
                          onClick={() => setSelectedWeek(week)}
                          className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.24em] transition ${
                            week === selectedWeek
                              ? "bg-cyan-500/20 text-cyan-200"
                              : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"
                          }`}
                        >
                          wk {String(week).padStart(2, "0")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">completion</p>
                    <p className="mt-3 text-3xl font-semibold text-zinc-100">{completionPct}%</p>
                    <div className="mt-3 h-2 rounded-full bg-zinc-800">
                      <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${completionPct}%` }} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">next checkpoint</p>
                    <p className="mt-3 text-lg font-semibold text-zinc-100">{data?.tasks.find((task) => task.status !== "completed")?.title ?? "All systems green"}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">time budget</p>
                    <p className="mt-3 text-3xl font-semibold text-zinc-100">{selectedPlan.hoursPerWeek}h</p>
                    <p className="mt-2 text-sm text-zinc-400">Tracked weekly load for this study plan.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">node graph</p>
                      <h3 className="mt-1 text-xl font-semibold text-zinc-100">{data?.theme ?? "Week pipeline"}</h3>
                    </div>
                    <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-400">
                      {completed}/{total} checkpoints
                    </span>
                  </div>

                  {isLoading && <p className="text-sm text-zinc-500">Loading current graph…</p>}
                  {isError && <p className="text-sm text-rose-300">The graph could not be loaded. Try choosing the week again.</p>}

                  {data && (
                    <div className="mx-auto w-full max-w-3xl space-y-3 border-l border-zinc-800/80 pl-6">
                      {data.tasks.map((task) => (
                        <div key={task.id} className="relative">
                          <span className={`absolute -left-[1.18rem] top-4 h-3.5 w-3.5 rounded-full border ${getNodeAccent(task.type)}`} />
                          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.24em] ${getStatusBadge(task.status)}`}>
                                    {task.status === "completed" ? "done" : task.status === "in_progress" ? "active" : "queued"}
                                  </span>
                                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                                    {TYPE_LABEL[task.type]}
                                  </span>
                                </div>
                                <h4 className="mt-2 text-lg font-semibold text-zinc-100">{task.title}</h4>
                                {task.description && <p className="mt-2 text-sm text-zinc-400">{task.description}</p>}
                              </div>
                              <button
                                onClick={() =>
                                  updateProgress.mutate({
                                    taskId: task.id,
                                    status: task.status === "completed" ? "not_started" : "completed",
                                  })
                                }
                                className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.24em] transition ${
                                  task.status === "completed"
                                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                                    : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-cyan-400/30 hover:text-cyan-200"
                                }`}
                              >
                                {task.status === "completed" ? "reset" : "complete"}
                              </button>
                            </div>

                            {task.resources.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {task.resources.map((resource, index) => (
                                  <a
                                    key={`${task.id}-${index}`}
                                    href={resource.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-400 transition hover:text-cyan-200"
                                  >
                                    {resource.resource_type}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mx-auto grid max-w-4xl gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">empty state</p>
                    <h2 className="mt-2 text-2xl font-semibold text-zinc-100">No active path yet.</h2>
                    <p className="mt-3 text-sm text-zinc-400">
                      Your workspace is waiting for a first study objective. Generate a path and it will appear here as an adaptive graph with milestones, progress, and checkpoints.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">total paths generated</p>
                      <p className="mt-2 text-3xl font-semibold text-zinc-100">{history.length}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">hours tracked</p>
                      <p className="mt-2 text-3xl font-semibold text-zinc-100">{trackedHours}</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCreatePath} className="rounded-2xl border border-cyan-400/20 bg-zinc-900/80 p-5">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">generation terminal</p>
                    <h3 className="mt-2 text-xl font-semibold text-zinc-100">Draft a new learning graph</h3>
                    <p className="mt-2 text-sm text-zinc-400">Feed the engine a subject, level, and weekly capacity to create a structured path.</p>
                  </div>

                  <div className="mt-4 space-y-4">
                    <label className="block">
                      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">subject / goal</span>
                      <input
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none ring-0 transition focus:border-cyan-400"
                        placeholder="Build a data pipeline in Python"
                        value={draftGoal}
                        onChange={(event) => setDraftGoal(event.target.value)}
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">skill level</span>
                      <select
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-cyan-400"
                        value={draftSkill}
                        onChange={(event) => setDraftSkill(event.target.value)}
                      >
                        <option value="beginner">beginner</option>
                        <option value="intermediate">intermediate</option>
                        <option value="advanced">advanced</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">hours per week</span>
                      <input
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-cyan-400"
                        type="number"
                        min={1}
                        max={80}
                        value={draftHours}
                        onChange={(event) => setDraftHours(Number(event.target.value))}
                        required
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={generate.isPending || !draftGoal.trim()}
                    className="mt-5 w-full rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {generate.isPending ? "compiling path…" : "generate path"}
                  </button>
                  {generate.isError && (
                    <p className="mt-3 text-sm text-rose-300">
                      {(generate.error as any)?.response?.data?.detail ?? "Path generation failed. Try again."}
                    </p>
                  )}
                </form>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
