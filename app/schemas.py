from pydantic import BaseModel, EmailStr, constr, conint
from typing import Literal
from datetime import datetime, date
import uuid


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    skill_level: str

    class Config:
        from_attributes = True


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class RoadmapGenerateRequest(BaseModel):
    goalTitle: constr(strip_whitespace=True, min_length=1, max_length=200)
    skillLevel: Literal["beginner", "intermediate", "advanced"]
    hoursPerWeek: conint(ge=1, le=80)


class ResourceOut(BaseModel):
    url: str
    resource_type: str

    class Config:
        from_attributes = True


class TaskOut(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    description: str | None = None
    difficulty: str | None = None
    status: str = "not_started"
    resources: list[ResourceOut] = []

    class Config:
        from_attributes = True


class WeekOut(BaseModel):
    weekNumber: int
    theme: str
    estimatedHours: int
    tasks: list[TaskOut]


class RoadmapOut(BaseModel):
    planId: uuid.UUID
    versionId: uuid.UUID
    totalWeeks: int
    weeks: list[WeekOut]


class ProgressUpdate(BaseModel):
    status: Literal["not_started", "in_progress", "completed"]


class ProgressOut(BaseModel):
    taskId: uuid.UUID
    status: str
    updatedAt: datetime | None = None


class HeatmapPointOut(BaseModel):
    date: date
    count: int


class QuizQuestionOut(BaseModel):
    id: str
    prompt: str
    options: list[str]
    correctOption: str
    explanation: str | None = None


class QuizGenerationRequest(BaseModel):
    roadmapId: uuid.UUID
    weekNumber: int
    count: int = 1


class QuizGenerationOut(BaseModel):
    roadmapId: uuid.UUID
    weekNumber: int
    questions: list[QuizQuestionOut]


class QuizResponseItem(BaseModel):
    questionId: str
    selectedOption: str
    correctOption: str


class QuizSubmissionRequest(BaseModel):
    roadmapId: uuid.UUID
    weekNumber: int
    responses: list[QuizResponseItem]


class QuizSubmissionOut(BaseModel):
    score: int
    passed: bool
    rerouted: bool
    message: str


class UserRoadmapSummaryOut(BaseModel):
    planId: uuid.UUID
    goalTitle: str
    skillLevel: str
    hoursPerWeek: int
    totalWeeks: int
    completedTasks: int
    totalTasks: int
    createdAt: datetime
    status: str

    class Config:
        from_attributes = True
