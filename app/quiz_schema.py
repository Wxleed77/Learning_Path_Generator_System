"""
Pydantic schema for enforcing the quiz LLM output shape.
Used by quiz_llm_client.py to validate responses from OpenRouter.
"""
from pydantic import BaseModel, Field


class QuizQuestionItem(BaseModel):
    question: str
    options: list[str] = Field(min_length=2, max_length=6)
    correctAnswerIndex: int = Field(ge=0, le=5)
    explanation: str


class QuizLLMOutput(BaseModel):
    questions: list[QuizQuestionItem] = Field(min_length=1, max_length=20)