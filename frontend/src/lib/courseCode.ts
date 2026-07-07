const LEVEL_CODE: Record<string, number> = { beginner: 101, intermediate: 201, advanced: 301 };

export function courseCode(title: string, level: string): string {
  const initials = title
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return `${initials || "SLF"}-${LEVEL_CODE[level] ?? 101}`;
}
