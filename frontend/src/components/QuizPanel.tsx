import { useEffect, useMemo, useState } from "react";
import { useGenerateQuiz, useSubmitQuiz } from "../hooks/useRoadmap";
import LlmLoadingState from "./LlmLoadingState";

interface QuizPanelProps {
  roadmapId: string;
  weekNumber: number;
}

export default function QuizPanel({ roadmapId, weekNumber }: QuizPanelProps) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [rerouted, setRerouted] = useState(false);
  const generateQuiz = useGenerateQuiz();
  const submitQuiz = useSubmitQuiz();

  const questions = useMemo(() => generateQuiz.data?.questions ?? [], [generateQuiz.data]);

  useEffect(() => {
    setSelected({});
    setSubmitted(false);
    setMessage(null);
    setScore(null);
    setRerouted(false);
    generateQuiz.mutate({ roadmapId, weekNumber, count: 2 });
  }, [roadmapId, weekNumber]);

  function handleSelect(questionId: string, option: string) {
    setSelected((prev) => ({ ...prev, [questionId]: option }));
  }

  async function handleSubmit() {
    const responses = questions.map((question) => ({
      questionId: question.id,
      selectedOption: selected[question.id] ?? "",
      correctOption: question.correctOption,
    }));

    const result = await submitQuiz.mutateAsync({ roadmapId, weekNumber, responses });
    setSubmitted(true);
    setScore(result.score);
    setRerouted(result.rerouted);
    setMessage(result.message);
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">adaptive quiz</p>
          <h3 className="mt-1 text-xl font-semibold text-zinc-100">Week {weekNumber} checkpoint</h3>
        </div>
        <div className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-400">
          {questions.length} questions
        </div>
      </div>

      {generateQuiz.isPending && (
        <div className="mt-4 rounded-xl border border-cyan-400/20 bg-zinc-900/80 px-4 py-4">
          <LlmLoadingState
            phases={[
              { label: "generating quiz questions", duration: 1800 },
              { label: "analyzing week content", duration: 1500 },
              { label: "validating question schema", duration: 1200 },
            ]}
            variant="default"
          />
        </div>
      )}
      {generateQuiz.isError && <p className="mt-4 text-sm text-rose-300">Quiz generation failed. Try again.</p>}

      {!generateQuiz.isPending && questions.length > 0 && (
        <div className="mt-4 space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">Q{index + 1}</p>
              <p className="mt-2 text-sm text-zinc-100">{question.prompt}</p>
              <div className="mt-3 space-y-2">
                {question.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(question.id, option)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      selected[question.id] === option
                        ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
                        : "border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitQuiz.isPending || Object.keys(selected).length < questions.length}
            className="w-full rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitQuiz.isPending ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400/60" />
                grading…
              </span>
            ) : (
              "Submit quiz"
            )}
          </button>
        </div>
      )}

      {submitted && (
        <div className={`mt-4 rounded-xl border p-4 ${rerouted ? "border-amber-400/30 bg-amber-500/10" : "border-emerald-400/30 bg-emerald-500/10"}`}>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">result</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">Score: {score}%</p>
          <p className="mt-1 text-sm text-zinc-400">{message}</p>
        </div>
      )}
    </div>
  );
}
