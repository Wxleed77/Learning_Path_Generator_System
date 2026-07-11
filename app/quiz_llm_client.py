"""
Quiz generation via OpenRouter's OpenAI-compatible API.
Separate from the roadmap-generation LLM (Groq) to keep concerns isolated.
Uses a free model on OpenRouter (verified at https://openrouter.ai/models).
Falls back gracefully if the API key is not set.
"""
import os
import json
import requests
from pydantic import ValidationError
from dotenv import load_dotenv
from .quiz_schema import QuizLLMOutput

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

MAX_RETRIES = 3


def build_quiz_prompt(
    theme: str,
    week_number: int,
    tasks_context: str,
    skill_level: str,
    question_count: int,
) -> str:
    return f"""You are an expert learning coach. Generate {question_count} multiple-choice quiz questions
that test understanding of the specific topics listed below.

Week {week_number} Theme: {theme}
Learner's Skill Level: {skill_level}

Content to quiz on:
{tasks_context}

IMPORTANT: Generate questions that test understanding of the specific topics listed above.
Do NOT generate generic questions unrelated to this content.

Return ONLY valid JSON matching exactly this shape (no markdown, no prose):
{{
  "questions": [
    {{
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Why this is the correct answer"
    }}
  ]
}}

Rules:
- correctAnswerIndex must be 0-3 (0-based index into the options array)
- Provide exactly 4 options per question
- Questions should be appropriate for {skill_level} level learners
- Output nothing but the JSON object."""


def _call_openrouter(messages: list[dict]) -> str:
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set in .env")

    resp = requests.post(
        OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "Learning Path Generator",
        },
        json={
            "model": OPENROUTER_MODEL,
            "messages": messages,
            "temperature": 0.4,
            "response_format": {"type": "json_object"},
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def generate_quiz_via_llm(
    theme: str,
    week_number: int,
    tasks_context: str,
    skill_level: str,
    question_count: int = 5,
) -> dict:
    """Returns a dict validated against QuizLLMOutput.
    Raises RuntimeError after MAX_RETRIES failed attempts."""
    prompt = build_quiz_prompt(theme, week_number, tasks_context, skill_level, question_count)
    messages = [{"role": "user", "content": prompt}]
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            raw = _call_openrouter(messages)
            parsed = json.loads(raw)
            validated = QuizLLMOutput.model_validate(parsed)
            return validated.model_dump()
        except (json.JSONDecodeError, ValidationError, requests.RequestException) as e:
            last_error = str(e)
            messages.append({
                "role": "user",
                "content": f"Your previous response was invalid: {last_error}. "
                           f"Return ONLY the corrected JSON object, matching the exact schema, nothing else.",
            })

    raise RuntimeError(f"Quiz LLM failed to produce valid output after {MAX_RETRIES} attempts: {last_error}")