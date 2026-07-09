from pydantic import BaseModel, Field


class ResourceItem(BaseModel):
    title: str
    type: str
    url: str
    estimatedMinutes: int


class TopicItem(BaseModel):
    title: str
    description: str
    estimatedHours: int


class ProjectItem(BaseModel):
    title: str
    description: str
    difficulty: str


class QuizMeta(BaseModel):
    questionCount: int = 3
    topicsCovered: list[str] = Field(default_factory=list)
    passingScore: int = 70


class WeekItem(BaseModel):
    weekNumber: int
    theme: str
    estimatedHours: int
    difficulty: str = "beginner"
    topics: list[TopicItem] = Field(default_factory=list)
    resources: list[ResourceItem] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    quiz: QuizMeta = Field(default_factory=QuizMeta)
    milestone: str = "Complete all tasks"


class RoadmapLLMOutput(BaseModel):
    totalWeeks: int
    weeks: list[WeekItem]
