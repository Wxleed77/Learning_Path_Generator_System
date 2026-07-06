"""
Stub roadmap generator for Phase 2.
Real LLM-based generation arrives in Phase 3 — this just produces a
deterministic, structurally-valid roadmap so the rest of the app
(persistence, dashboard, progress tracking) can be built against a
stable contract before the AI piece exists.
"""
import math

THEMES_BY_LEVEL = {
    "beginner": ["Fundamentals", "Core Syntax", "Basic Projects", "Testing Basics"],
    "intermediate": ["Architecture Patterns", "APIs & Integration", "Performance", "Real Projects"],
    "advanced": ["System Design", "Scaling", "Advanced Patterns", "Production Readiness"],
}


def generate_stub_roadmap(goal_title: str, skill_level: str, hours_per_week: int) -> dict:
    # naive heuristic: assume ~20 total hours of content per "unit" of goal complexity
    total_weeks = max(4, min(24, math.ceil(160 / max(hours_per_week, 1))))
    themes = THEMES_BY_LEVEL.get(skill_level, THEMES_BY_LEVEL["beginner"])

    weeks = []
    for i in range(1, total_weeks + 1):
        theme = themes[(i - 1) % len(themes)]
        weeks.append({
            "weekNumber": i,
            "theme": f"{theme} — {goal_title}",
            "estimatedHours": hours_per_week,
            "tasks": [
                {
                    "type": "topic",
                    "title": f"Week {i} core topic",
                    "description": f"Placeholder topic for '{goal_title}' (stub — Phase 3 replaces this)",
                    "difficulty": skill_level,
                },
                {
                    "type": "project",
                    "title": f"Week {i} mini-project",
                    "description": "Placeholder hands-on project",
                    "difficulty": skill_level,
                },
            ],
        })

    return {"totalWeeks": total_weeks, "weeks": weeks}
