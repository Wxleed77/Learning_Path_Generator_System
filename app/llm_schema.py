from pydantic import BaseModel


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
    questionCount: int
    topicsCovered: list[str]
    passingScore: int


class WeekItem(BaseModel):
    weekNumber: int
    theme: str
    estimatedHours: int
    difficulty: str
    topics: list[TopicItem]
    resources: list[ResourceItem]
    projects: list[ProjectItem]
    quiz: QuizMeta
    milestone: str


class RoadmapLLMOutput(BaseModel):
    totalWeeks: int
    weeks: list[WeekItem]
