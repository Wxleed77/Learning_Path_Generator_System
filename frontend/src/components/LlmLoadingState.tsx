import { useState, useEffect, useRef } from "react";

interface Phase {
  label: string;
  duration: number; // ms to show this phase before cycling
}

interface LlmLoadingStateProps {
  phases: Phase[];
  variant?: "default" | "scanline";
  className?: string;
}

const defaultPhases: Phase[] = [
  { label: "analyzing goal parameters", duration: 1500 },
  { label: "drafting week structure", duration: 1800 },
  { label: "sourcing learning resources", duration: 2000 },
  { label: "generating quiz questions", duration: 1600 },
  { label: "validating output schema", duration: 1200 },
];

export default function LlmLoadingState({
  phases = defaultPhases,
  variant = "default",
  className = "",
}: LlmLoadingStateProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phases.length === 0) return;

    const current = phases[phaseIndex];
    const timeout = setTimeout(() => {
      setPhaseIndex((prev) => (prev + 1) % phases.length);
    }, current.duration);

    return () => clearTimeout(timeout);
  }, [phaseIndex, phases]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const currentPhase = phases[phaseIndex] || phases[0];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Terminal-style status line */}
      <div className="flex items-center gap-2 font-mono text-[11px] text-cyan-300/80">
        <span className="text-zinc-600">{">"}</span>
        <span className="animate-pulse">{currentPhase.label}</span>
        <span className="inline-block w-[1px] h-4 bg-cyan-300/60 motion-safe:animate-pulse" />
      </div>

      {/* Animated scanline bar */}
      {variant === "scanline" && (
        <div className="relative h-1 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent motion-safe:animate-[scan_2s_ease-in-out_infinite]"
            style={{ filter: "blur(2px)" }}
          />
        </div>
      )}

      {/* Segmented indeterminate bar */}
      {variant === "default" && (
        <div className="relative h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-cyan-500/40 via-cyan-400/70 to-cyan-500/40 motion-safe:animate-[indeterminate_1.8s_ease-in-out_infinite]" />
        </div>
      )}

      {/* Subtle node placeholders that pulse in sequence */}
      <div className="flex items-center gap-2 pt-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full border border-zinc-700 transition-all duration-700"
            style={{
              backgroundColor:
                i === phaseIndex % 5
                  ? "rgba(34, 211, 238, 0.3)"
                  : "transparent",
              borderColor:
                i === phaseIndex % 5
                  ? "rgba(34, 211, 238, 0.5)"
                  : "rgba(63, 63, 70, 1)",
              transitionDelay: `${i * 120}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}