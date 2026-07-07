import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlanStore } from "../lib/planStore";
import { useWeeklyPlan, useUpdateProgress } from "../hooks/useRoadmap";
import { courseCode } from "../lib/courseCode";
import StampCheckbox from "../components/StampCheckbox";
import { Task } from "../lib/types";

const TYPE_LABEL: Record<Task["type"], string> = {
  topic: "Topic",
  project: "Project",
  quiz: "Quiz",
  milestone: "Milestone",
};

export default function DashboardPage() {
  const { planId, totalWeeks, goalTitle, skillLevel, hoursPerWeek } = usePlanStore();
  const [week, setWeek] = useState(1);
  const navigate = useNavigate();
  const { data, isLoading, isError } = useWeeklyPlan(planId, week);
  const updateProgress = useUpdateProgress(planId, week);

  if (!planId) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-wide text-ink/50">No open file</p>
        <h1 className="font-display text-3xl mt-3 mb-6">You haven't registered a course yet.</h1>
        <button
          className="bg-ink text-paper font-mono text-xs uppercase tracking-wide px-6 py-3 hover:bg-oxblood transition-colors"
          onClick={() => navigate("/goal")}
        >
          Draft your first syllabus
        </button>
      </div>
    );
  }

  const completed = data?.tasks.filter((t) => t.status === "completed").length ?? 0;
  const total = data?.tasks.length ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Course header */}
      <div className="border-b-2 border-ink pb-6 mb-8 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-brass">
            {courseCode(goalTitle, skillLevel)}
          </p>
          <h1 className="font-display text-4xl mt-1">{goalTitle || "Untitled course"}</h1>
        </div>
        <div className="font-mono text-xs text-ink/60 uppercase tracking-wide text-right space-y-1">
          <p>Level — {skillLevel}</p>
          <p>{hoursPerWeek} hrs / week</p>
          <p>
            Week {week} of {totalWeeks}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-[180px_1fr] gap-10">
        {/* Week rail */}
        <nav className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-wide text-ink/40 mb-2">Syllabus</p>
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
            <button
              key={w}
              onClick={() => setWeek(w)}
              className={`w-full text-left px-3 py-2 font-mono text-sm border-l-2 transition-colors ${
                w === week
                  ? "border-oxblood bg-ink text-paper"
                  : "border-ink/20 text-ink/60 hover:border-brass hover:text-ink"
              }`}
            >
              Week {String(w).padStart(2, "0")}
            </button>
          ))}
        </nav>

        {/* Weekly ledger */}
        <div>
          {isLoading && <p className="font-mono text-sm text-ink/50">Loading week {week}…</p>}
          {isError && (
            <p className="font-mono text-sm text-oxblood border-l-2 border-oxblood pl-4">
              Couldn't load this week. Try selecting it again.
            </p>
          )}

          {data && (
            <div>
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="font-display text-2xl">{data.theme}</h2>
                <span className="font-mono text-xs text-ink/50">
                  {completed} / {total} complete
                </span>
              </div>

              <div className="ledger-rule">
                {data.tasks.map((task) => (
                  <div key={task.id} className="flex gap-4 py-4">
                    <StampCheckbox
                      checked={task.status === "completed"}
                      onChange={(checked) =>
                        updateProgress.mutate({
                          taskId: task.id,
                          status: checked ? "completed" : "not_started",
                        })
                      }
                      label={`Mark "${task.title}" complete`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-indigo">
                        {TYPE_LABEL[task.type]}
                      </p>
                      <p
                        className={`font-display text-lg leading-snug ${
                          task.status === "completed" ? "line-through text-ink/40" : "text-ink"
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="font-body text-sm text-ink/60 mt-1">{task.description}</p>
                      )}
                      {task.resources.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                          {task.resources.map((r, i) => (
                            <li key={i}>
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-xs uppercase tracking-wide text-indigo underline underline-offset-2 hover:text-oxblood"
                              >
                                {r.resource_type} ↗
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
