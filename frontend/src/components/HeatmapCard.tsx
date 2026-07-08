import { HeatmapPoint } from "../lib/types";

interface HeatmapCardProps {
  data: HeatmapPoint[];
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function HeatmapCard({ data }: HeatmapCardProps) {
  const points = data ?? [];
  const byDate = new Map(points.map((item) => [item.date, item.count]));
  const today = new Date();
  const cells = Array.from({ length: 35 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (34 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, count: byDate.get(key) ?? 0, date };
  });

  function getColor(count: number) {
    if (count >= 4) return "bg-emerald-500";
    if (count >= 2) return "bg-emerald-400/80";
    if (count >= 1) return "bg-emerald-300/70";
    return "bg-zinc-800";
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">consistency graph</p>
          <h3 className="mt-1 text-xl font-semibold text-zinc-100">Completion heatmap</h3>
        </div>
        <div className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-400">
          35 day view
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-3">
        <div className="flex flex-col justify-between text-[10px] uppercase tracking-[0.24em] text-zinc-500">
          {days.map((day) => (
            <span key={day} className="h-4">
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-flow-col grid-rows-7 gap-1.5">
          {cells.map((cell) => (
            <div
              key={cell.key}
              className={`h-3.5 w-3.5 rounded-sm border border-zinc-800/70 ${getColor(cell.count)}`}
              title={`${cell.key}: ${cell.count} completions`}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em]">Legend</span>
        <div className="flex gap-1">
          {[0, 1, 2, 4].map((count) => (
            <span key={count} className={`h-2.5 w-2.5 rounded-sm ${getColor(count)}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
