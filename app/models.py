import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    skill_level = Column(String, default="beginner")  # beginner/intermediate/advanced
    created_at = Column(DateTime, default=datetime.utcnow)


class LearningGoal(Base):
    __tablename__ = "learning_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    current_skill_level = Column(String, nullable=False)  # beginner/intermediate/advanced
    hours_per_week = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class LearningPlan(Base):
    __tablename__ = "learning_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("learning_goals.id"), nullable=False)
    current_version_id = Column(UUID(as_uuid=True), ForeignKey("roadmap_versions.id"), nullable=True)
    status = Column(String, default="active")  # active/completed/abandoned
    created_at = Column(DateTime, default=datetime.utcnow)


class RoadmapVersion(Base):
    __tablename__ = "roadmap_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("learning_plans.id"), nullable=False)
    version_number = Column(Integer, default=1)
    raw_llm_output = Column(JSON, nullable=True)  # audit trail; null for stub-generated versions
    reason_for_regeneration = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class WeeklyPlan(Base):
    __tablename__ = "weekly_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_version_id = Column(UUID(as_uuid=True), ForeignKey("roadmap_versions.id"), nullable=False)
    week_number = Column(Integer, nullable=False)
    theme = Column(String, nullable=False)
    estimated_hours = Column(Integer, nullable=False)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    weekly_plan_id = Column(UUID(as_uuid=True), ForeignKey("weekly_plans.id"), nullable=False)
    type = Column(String, nullable=False)  # topic/project/quiz/milestone
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)
    order_index = Column(Integer, default=0)


class Resource(Base):
    __tablename__ = "resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    url = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)  # video/article/course/doc/repo
    source = Column(String, default="generated")  # generated vs curated


class Progress(Base):
    __tablename__ = "progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    status = Column(String, default="not_started")  # not_started/in_progress/completed
    completed_at = Column(DateTime, nullable=True)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
