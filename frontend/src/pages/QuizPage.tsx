import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useGenerateQuiz, useSubmitQuiz, useQuizAttempts, QuizQuestion, QuizFeedback } from "../hooks/useQuiz";

type Phase = "intro" | "taking" | "results";

export default function QuizPage() {
  const { taskId } = useParams<{ taskId: string }>();

  const [phase, setPhase] = useState<Phase>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    threshold: number;
    feedback: QuizFeedback[];
    totalQuestions: number;
    correctAnswers: number;
  } | null>(null);

  const generateQuiz = useGenerateQuiz();
  const submitQuiz = useSubmitQuiz();
  const { data: attempts } = useQuizAttempts(taskId ?? null);

  const questions: QuizQuestion[] = generateQuiz.data?.questions ?? [];
  const totalQuestions = questions.length;
  const allAnswered = Object.keys(answers).length === totalQuestions && totalQuestions > 0;

  function handleStart() {
    if (!taskId) return;
    generateQuiz.mutate(taskId, {
      onSuccess: () => {
        setPhase("taking");
        setCurrentQ(0);
        setAnswers({});
        setResult(null);
      },
    });
  }

  function handleSelectOption(questionId: string, optionIndex: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  function handleNext() {
    if (currentQ < totalQuestions - 1) {
      setCurrentQ((prev) => prev + 1);
    }
  }

  function handlePrev() {
    if (currentQ > 0) {
      setCurrentQ((prev) => prev - 1);
    }
  }

  async function handleSubmit() {
    if (!taskId) return;
    try {
      const res = await submitQuiz.mutateAsync({ taskId, questions, answers });
      setResult(res);
      setPhase("results");
    } catch {
      // handled by mutation error state
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Loading / error states for generate
  if (!taskId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-zinc-400">No task specified. <Link to="/dashboard" className="text-cyan-300 underline">Go to dashboard</Link></p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back link */}
      <Link
        to="/dashboard"
        className="mb-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500 transition hover:text-cyan-300"
      >
        <span>&larr;</span> back to dashboard
      </Link>

      {/* INTRO PHASE */}
      {phase === "intro" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8">
          <div className="mb-2 inline-block rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-200">
            adaptive quiz
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-zinc-100">Weekly Checkpoint</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
            Test your understanding of this week's material. You'll get 5 questions covering the key topics and projects.
            A score of <span className="text-cyan-200">70% or higher</span> passes the checkpoint.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">questions</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-100">5</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">passing score</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-400">70%</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">attempts</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-100">{attempts?.length ?? 0}</p>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={generateQuiz.isPending}
            className="mt-6 w-full rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateQuiz.isPending ? "generating questions…" : "start quiz"}
          </button>
          {generateQuiz.isError && (
            <p className="mt-3 text-sm text-rose-300">Failed to generate quiz. Please try again.</p>
          )}

          {/* Past attempts */}
          {attempts && attempts.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">past attempts</p>
              <div className="space-y-2">
                {attempts.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${
                          att.passed ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      <span className="text-sm text-zinc-300">
                        Score: <span className="font-semibold">{att.score}%</span>
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">{formatDate(att.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAKING PHASE */}
      {phase === "taking" && questions.length > 0 && (
        <div className="space-y-6">
          {/* Progress bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-2 rounded-full bg-zinc-800">
                <div
                  className="h-2 rounded-full bg-cyan-400 transition-all"
                  style={{ width: `${(Object.keys(answers).length / totalQuestions) * 100}%` }}
                />
              </div>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
              {Object.keys(answers).length}/{totalQuestions}
            </span>
          </div>

          {/* Question card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                question {currentQ + 1} of {totalQuestions}
              </span>
              <div className="flex gap-1">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQ(i)}
                    className={`h-2 w-6 rounded-full transition ${
                      answers[q.id] !== undefined
                        ? "bg-cyan-400"
                        : i === currentQ
                        ? "bg-zinc-500"
                        : "bg-zinc-800"
                    }`}
                  />
                ))}
              </div>
            </div>

            <h2 className="mt-6 text-lg font-semibold leading-relaxed text-zinc-100">
              {questions[currentQ]?.question}
            </h2>

            <div className="mt-6 space-y-3">
              {questions[currentQ]?.options.map((option, optIndex) => (
                <button
                  key={optIndex}
                  onClick={() => handleSelectOption(questions[currentQ].id, optIndex)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    answers[questions[currentQ].id] === optIndex
                      ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
                      : "border-zinc-800 bg-zinc-950/70 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <span className="mr-3 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    {String.fromCharCode(65 + optIndex)}
                  </span>
                  {option}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={currentQ === 0}
                className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                previous
              </button>

              {currentQ < totalQuestions - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={answers[questions[currentQ]?.id] === undefined}
                  className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered || submitQuiz.isPending}
                  className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-6 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitQuiz.isPending ? "submitting…" : "submit all"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESULTS PHASE */}
      {phase === "results" && result && (
        <div className="space-y-6">
          {/* Score card */}
          <div
            className={`rounded-2xl border p-6 sm:p-8 text-center ${
              result.passed
                ? "border-emerald-400/30 bg-emerald-500/10"
                : "border-amber-400/30 bg-amber-500/10"
            }`}
          >
            <div className="mb-2 inline-block rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-400">
              {result.passed ? "passed" : "needs review"}
            </div>
            <h1 className="mt-4 text-5xl font-bold text-zinc-100">{result.score}%</h1>
            <p className="mt-2 text-sm text-zinc-400">
              {result.correctAnswers} of {result.totalQuestions} correct &middot; threshold {result.threshold}%
            </p>

            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={handleStart}
                className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-200 transition hover:bg-cyan-500/20"
              >
                retry quiz
              </button>
              <Link
                to="/dashboard"
                className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-400 transition hover:text-zinc-200"
              >
                back to dashboard
              </Link>
            </div>
          </div>

          {/* Per-question feedback */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">detailed feedback</h2>
            <div className="mt-4 space-y-4">
              {result.feedback.map((fb, index) => (
                <div
                  key={fb.questionId}
                  className={`rounded-xl border p-4 ${
                    fb.isCorrect
                      ? "border-emerald-400/20 bg-emerald-500/5"
                      : "border-rose-400/20 bg-rose-500/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        fb.isCorrect
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {fb.isCorrect ? "✓" : "✗"}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                      Q{index + 1}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-zinc-100">{fb.question}</p>

                  <div className="mt-3 space-y-1.5">
                    {fb.options.map((opt, optIndex) => {
                      const isCorrectOption = optIndex === fb.correctAnswerIndex;
                      const isSelected = optIndex === fb.userAnswer;
                      let className = "rounded-lg border px-3 py-1.5 text-xs ";
                      if (isSelected && isCorrectOption) {
                        className += "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
                      } else if (isSelected && !isCorrectOption) {
                        className += "border-rose-400/40 bg-rose-500/10 text-rose-200";
                      } else if (isCorrectOption) {
                        className += "border-emerald-400/20 bg-emerald-500/5 text-emerald-300/70";
                      } else {
                        className += "border-zinc-800 bg-zinc-950/50 text-zinc-400";
                      }
                      return (
                        <div key={optIndex} className={className}>
                          <span className="mr-2 font-mono text-[9px] uppercase tracking-[0.2em]">
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          {opt}
                          {isCorrectOption && !isSelected && (
                            <span className="ml-2 text-[9px] text-emerald-400">(correct answer)</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-xs italic text-zinc-500">{fb.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Generate error state */}
      {phase === "taking" && generateQuiz.isError && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-center">
          <p className="text-rose-200">Failed to generate quiz questions.</p>
          <button
            onClick={handleStart}
            className="mt-4 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-300"
          >
            try again
          </button>
        </div>
      )}

      {/* Submit error */}
      {submitQuiz.isError && (
        <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          Failed to submit quiz. Please try again.
        </div>
      )}
    </div>
  );
}