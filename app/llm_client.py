"""
Phase 3: real roadmap generation via Groq's OpenAI-compatible API.
Builds a structured prompt, forces JSON output, validates against
RoadmapLLMOutput, and retries with the validation error fed back to
the model if the first attempt doesn't conform.
"""
import os
import json
import requests
from pydantic import ValidationError
from dotenv import load_dotenv
from .llm_schema import RoadmapLLMOutput

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

MAX_RETRIES = 3


def build_prompt(goal_title: str, skill_level: str, hours_per_week: int) -> str:
    return f"""You are a curriculum designer. Generate a week-by-week learning roadmap.

Goal: "{goal_title}"
Learner's current skill level: {skill_level}
Available hours per week: {hours_per_week}

Return ONLY valid JSON matching exactly this shape (no markdown, no prose):
{{
  "totalWeeks": <int>,
  "weeks": [
    {{
      "weekNumber": <int>,
      "theme": <string>,
      "estimatedHours": <int>,
      "difficulty": "beginner"|"intermediate"|"advanced",
      "topics": [{{"title": <string>, "description": <string>, "estimatedHours": <int>}}],
      "resources": [{{"title": <string>, "type": "video"|"article"|"course"|"documentation"|"repo", "url": <string>, "estimatedMinutes": <int>}}],
      "projects": [{{"title": <string>, "description": <string>, "difficulty": <string>}}],
      "quiz": {{"questionCount": <int>, "topicsCovered": [<string>], "passingScore": <int>}},
      "milestone": <string>
    }}
  ]
}}

Rules: totalWeeks should realistically fit the goal given {hours_per_week} hrs/week.
Each week's estimatedHours should roughly equal {hours_per_week}. Keep resource URLs plausible
real-world documentation/course links. Output nothing but the JSON object."""


def _call_groq(messages: list[dict]) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not set in .env")

    resp = requests.post(
        GROQ_URL,
        headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": GROQ_MODEL,
            "messages": messages,
            "temperature": 0.4,
            "response_format": {"type": "json_object"},
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def generate_roadmap_via_llm(goal_title: str, skill_level: str, hours_per_week: int) -> dict:
    """Returns a dict already validated against RoadmapLLMOutput.
    Raises RuntimeError after MAX_RETRIES failed attempts (caller should return 502)."""
    prompt = build_prompt(goal_title, skill_level, hours_per_week)
    messages = [{"role": "user", "content": prompt}]
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            raw = _call_groq(messages)
            parsed = json.loads(raw)
            validated = RoadmapLLMOutput.model_validate(parsed)
            return validated.model_dump()
        except (json.JSONDecodeError, ValidationError, requests.RequestException) as e:
            last_error = str(e)
            messages.append({
                "role": "user",
                "content": f"Your previous response was invalid: {last_error}. "
                           f"Return ONLY the corrected JSON object, matching the exact schema, nothing else.",
            })

    raise RuntimeError(f"LLM failed to produce valid roadmap after {MAX_RETRIES} attempts: {last_error}")
