"""
Dedicated quiz endpoints using OpenRouter for generation.
Separate from the legacy /api/quizzes router (which uses Groq).
"""
import json
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..quiz_llm_client import generate_quiz_via_llm
from .users import get_current_user

router = APIRouter(prefix="/api/quiz", tags=["quiz"])


def _parse_task_id(task_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(task_id)
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=404, detail="Task not found")


def _get_week_context_for_quiz(db: Session, task_id: uuid.UUID, user_id) -> dict[str, Any]:
    """Fetch the weekly plan + all topic/project tasks for quiz context."""
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    weekly_plan = db.query(models.WeeklyPlan).filter(models.WeeklyPlan.id == task.weekly_plan_id).first()
    if not weekly_plan:
        raise HTTPException(status_code=404, detail="Weekly plan not found")

    # Verify ownership through the plan chain
    version = db.query(models.RoadmapVersion).filter(models.RoadmapVersion.id == weekly_plan.plan_version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Roadmap version not found")
    plan = db.query(models.LearningPlan).filter(models.LearningPlan.id == version.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Learning plan not found")
    goal = db.query(models.LearningGoal).filter(models.LearningGoal.id == plan.goal_id).first()
    if not goal or goal.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not the owner of this task")

    # Get all topic/project tasks for this week to build context
    week_tasks = (
        db.query(models.Task)
        .filter(
            models.Task.weekly_plan_id == weekly_plan.id,
            models.Task.type.in_(["topic", "project"]),
        )
        .order_by(models.Task.order_index)
        .all()
    )

    tasks_context = "\n\n".join(
        f"Title: {t.title}\nDescription: {t.description or '(no description)'}"
        for t in week_tasks
    )

    return {
        "plan_id": plan.id,
        "goal_id": goal.id,
        "weekly_plan_id": weekly_plan.id,
        "week_number": weekly_plan.week_number,
        "theme": weekly_plan.theme,
        "skill_level": goal.current_skill_level,
        "tasks_context": tasks_context,
        "task": task,
    }


@router.post("/{task_id}/generate")
def generate_quiz(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Generate quiz questions for a given quiz-type task using OpenRouter.

    The correct answers are stored server-side and never sent to the client,
    so grading cannot be influenced by the request body.
    """
    task_uuid = _parse_task_id(task_id)
    ctx = _get_week_context_for_quiz(db, task_uuid, current_user.id)

    llm_result = generate_quiz_via_llm(
        theme=ctx["theme"],
        week_number=ctx["week_number"],
        tasks_context=ctx["tasks_context"],
        skill_level=ctx["skill_level"],
        question_count=5,
    )

    questions = llm_result["questions"]

    # Replace any previously generated questions for this task/session.
    db.query(models.GeneratedQuizQuestion).filter(
        models.GeneratedQuizQuestion.user_id == current_user.id,
        models.GeneratedQuizQuestion.task_id == task_uuid,
    ).delete()

    for i, q in enumerate(questions):
        db.add(
            models.GeneratedQuizQuestion(
                user_id=current_user.id,
                task_id=task_uuid,
                position=i,
                question_id=f"q{i+1}",
                question=q["question"],
                options=q["options"],
                correct_answer_index=q["correctAnswerIndex"],
                explanation=q.get("explanation"),
            )
        )
    db.commit()

    return {
        "taskId": task_id,
        "weekNumber": ctx["week_number"],
        "theme": ctx["theme"],
        "questions": [
            {
                "id": f"q{i+1}",
                "question": q["question"],
                "options": q["options"],
                "explanation": q.get("explanation"),
            }
            for i, q in enumerate(questions)
        ],
    }


@router.post("/{task_id}/submit")
def submit_quiz(
    task_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Grade submitted answers against the server-stored questions.

    Any `questions` supplied in the request body are ignored for grading.
    """
    task_uuid = _parse_task_id(task_id)
    _get_week_context_for_quiz(db, task_uuid, current_user.id)

    answers = payload.get("answers", {})
    if not answers:
        raise HTTPException(status_code=400, detail="Missing answers")

    stored_questions = (
        db.query(models.GeneratedQuizQuestion)
        .filter(
            models.GeneratedQuizQuestion.user_id == current_user.id,
            models.GeneratedQuizQuestion.task_id == task_uuid,
        )
        .order_by(models.GeneratedQuizQuestion.position)
        .all()
    )
    if not stored_questions:
        raise HTTPException(
            status_code=400,
            detail="No quiz session found for this task. Please regenerate the quiz.",
        )

    total = len(stored_questions)
    correct = 0
    per_question_feedback = []

    for sq in stored_questions:
        user_answer = answers.get(sq.question_id, -1)
        is_correct = user_answer == sq.correct_answer_index
        if is_correct:
            correct += 1
        per_question_feedback.append({
            "questionId": sq.question_id,
            "question": sq.question,
            "options": sq.options,
            "correctAnswerIndex": sq.correct_answer_index,
            "userAnswer": user_answer,
            "isCorrect": is_correct,
            "explanation": sq.explanation or "",
        })

    score = round((correct / total) * 100) if total else 0
    passed_val = "true" if score >= 70 else "false"

    attempt = models.QuizAttempt(
        user_id=current_user.id,
        task_id=task_uuid,
        questions=[
            {
                "id": sq.question_id,
                "question": sq.question,
                "options": sq.options,
                "correctAnswerIndex": sq.correct_answer_index,
            }
            for sq in stored_questions
        ],
        answers=answers,
        score=score,
        passed=passed_val,
        created_at=datetime.utcnow(),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return {
        "attemptId": str(attempt.id),
        "score": score,
        "passed": passed_val == "true",
        "threshold": 70,
        "feedback": per_question_feedback,
        "totalQuestions": total,
        "correctAnswers": correct,
    }


@router.get("/{task_id}/attempts")
def list_attempts(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List past quiz attempts for a given task."""
    task_uuid = _parse_task_id(task_id)
    # Verify task exists and belongs to the current user
    _get_week_context_for_quiz(db, task_uuid, current_user.id)

    attempts = (
        db.query(models.QuizAttempt)
        .filter(
            models.QuizAttempt.task_id == task_uuid,
            models.QuizAttempt.user_id == current_user.id,
        )
        .order_by(models.QuizAttempt.created_at.desc())
        .all()
    )

    return [
        {
            "id": str(a.id),
            "score": a.score,
            "passed": a.passed == "true",
            "questions": a.questions,
            "answers": a.answers,
            "createdAt": a.created_at.isoformat(),
        }
        for a in attempts
    ]