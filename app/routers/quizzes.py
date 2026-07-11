import json
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import SessionLocal, get_db
from ..llm_client import _call_groq
from .users import get_current_user

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])


def _build_week_context(db: Session, roadmap_id: str, week_number: int) -> dict[str, Any]:
    plan = db.query(models.LearningPlan).filter(models.LearningPlan.id == roadmap_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    version = db.query(models.RoadmapVersion).filter(models.RoadmapVersion.id == plan.current_version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Roadmap version not found")

    weekly_plan = db.query(models.WeeklyPlan).filter(
        models.WeeklyPlan.plan_version_id == version.id,
        models.WeeklyPlan.week_number == week_number,
    ).first()
    if not weekly_plan:
        raise HTTPException(status_code=404, detail="Week not found")

    tasks = db.query(models.Task).filter(models.Task.weekly_plan_id == weekly_plan.id).order_by(models.Task.order_index).all()
    return {
        "roadmapId": plan.id,
        "weekNumber": weekly_plan.week_number,
        "theme": weekly_plan.theme,
        "tasks": [
            {"title": task.title, "description": task.description, "type": task.type}
            for task in tasks
        ],
    }


@router.post("/generate", response_model=schemas.QuizGenerationOut)
def generate_quiz(
    payload: schemas.QuizGenerationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    context = _build_week_context(db, str(payload.roadmapId), payload.weekNumber)
    prompt = f"""You are an expert learning coach. Create {payload.count} multiple-choice quiz questions for a learner studying this week.

Roadmap: {context['roadmapId']}
Week {context['weekNumber']}: {context['theme']}
Tasks:
{json.dumps(context['tasks'], indent=2)}

Return JSON only with this shape:
{{
  "questions": [
    {{
      "id": "q1",
      "prompt": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctOption": "B",
      "explanation": "Why this answer is correct"
    }}
  ]
}}

Keep the questions focused on the week's concepts and make sure every correctOption is one of the options.
correctOption must match the exact text of the correct option, not the index or letter."""

    raw = _call_groq([{"role": "user", "content": prompt}])
    parsed = json.loads(raw)
    questions = parsed.get("questions", [])
    if not questions:
        raise HTTPException(status_code=502, detail="Quiz generation failed")

    # Store questions server-side so grading is done against stored correct answers
    for q in questions:
        existing = db.query(models.QuizQuestion).filter(
            models.QuizQuestion.user_id == current_user.id,
            models.QuizQuestion.roadmap_id == context["roadmapId"],
            models.QuizQuestion.week_number == context["weekNumber"],
            models.QuizQuestion.question_id == q["id"],
        ).first()
        if not existing:
            stored_q = models.QuizQuestion(
                user_id=current_user.id,
                roadmap_id=context["roadmapId"],
                week_number=context["weekNumber"],
                question_id=q["id"],
                prompt=q["prompt"],
                options=q["options"],
                correct_option=q["correctOption"],
                explanation=q.get("explanation"),
            )
            db.add(stored_q)
    db.commit()

    return schemas.QuizGenerationOut(
        roadmapId=context["roadmapId"],
        weekNumber=context["weekNumber"],
        questions=[
            schemas.QuizQuestionOut(
                id=q["id"],
                prompt=q["prompt"],
                options=q["options"],
                correctOption=q["correctOption"],
                explanation=q.get("explanation"),
            )
            for q in questions
        ],
    )


def _reroute_future_weeks(roadmap_id: str, week_number: int) -> None:
    db = SessionLocal()
    try:
        plan = db.query(models.LearningPlan).filter(models.LearningPlan.id == roadmap_id).first()
        if not plan:
            return

        version = db.query(models.RoadmapVersion).filter(models.RoadmapVersion.id == plan.current_version_id).first()
        if not version:
            return

        future_weeks = db.query(models.WeeklyPlan).filter(
            models.WeeklyPlan.plan_version_id == version.id,
            models.WeeklyPlan.week_number > week_number,
        ).order_by(models.WeeklyPlan.week_number).all()

        if not future_weeks:
            return

        prompt = f"""You are adjusting a personalized learning roadmap after a learner scored poorly on week {week_number} concepts.
The learner struggled with the material in week {week_number}; recalibrate pacing, deepen foundational support, and reduce difficulty for future weeks while keeping the roadmap practical.

Future weeks to revise:
{json.dumps([{"weekNumber": week.week_number, "theme": week.theme, "estimatedHours": week.estimated_hours} for week in future_weeks], indent=2)}

Return JSON only with this shape:
{{"revisedWeeks": [{{"weekNumber": 1, "theme": "string", "estimatedHours": 5}}]}}"""

        raw = _call_groq([{"role": "user", "content": prompt}])
        parsed = json.loads(raw)
        revised = parsed.get("revisedWeeks", [])
        if not revised:
            return
        for entry in revised:
            week = db.query(models.WeeklyPlan).filter(
                models.WeeklyPlan.plan_version_id == version.id,
                models.WeeklyPlan.week_number == entry.get("weekNumber"),
            ).first()
            if week:
                week.theme = entry.get("theme", week.theme)
                week.estimated_hours = int(entry.get("estimatedHours", week.estimated_hours))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


@router.post("/submit", response_model=schemas.QuizSubmissionOut)
def submit_quiz(
    payload: schemas.QuizSubmissionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plan = db.query(models.LearningPlan).filter(models.LearningPlan.id == str(payload.roadmapId)).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    if plan.goal_id is None:
        raise HTTPException(status_code=400, detail="Roadmap is not associated with a goal")

    # Look up stored questions for grading (server-authoritative correct answers)
    stored_questions = db.query(models.QuizQuestion).filter(
        models.QuizQuestion.user_id == current_user.id,
        models.QuizQuestion.roadmap_id == plan.id,
        models.QuizQuestion.week_number == payload.weekNumber,
    ).all()

    stored_by_qid: dict[str, models.QuizQuestion] = {}
    for sq in stored_questions:
        stored_by_qid[sq.question_id] = sq

    total_questions = len(payload.responses)
    correct_answers = 0
    for response in payload.responses:
        stored = stored_by_qid.get(response.questionId)
        if stored and response.selectedOption == stored.correct_option:
            correct_answers += 1

    score = round((correct_answers / total_questions) * 100) if total_questions else 0
    passed = score >= 50
    rerouted = False

    # Find the quiz task for this week to link the attempt properly
    weekly_plan = db.query(models.WeeklyPlan).filter(
        models.WeeklyPlan.plan_version_id == plan.current_version_id,
        models.WeeklyPlan.week_number == payload.weekNumber,
    ).first()
    quiz_task_id = None
    if weekly_plan:
        quiz_task = db.query(models.Task).filter(
            models.Task.weekly_plan_id == weekly_plan.id,
            models.Task.type == "quiz",
        ).first()
        if quiz_task:
            quiz_task_id = quiz_task.id

    # Build questions list from stored questions (for persistence)
    stored_questions_list = [
        {
            "id": sq.question_id,
            "question": sq.prompt,
            "options": sq.options,
            "correctAnswerIndex": sq.options.index(sq.correct_option) if sq.correct_option in sq.options else 0,
        }
        for sq in stored_questions
    ]
    # Build answers dict from responses
    answers_dict = {r.questionId: r.selectedOption for r in payload.responses}

    attempt = models.QuizAttempt(
        user_id=current_user.id,
        task_id=quiz_task_id,
        questions=stored_questions_list,
        answers=answers_dict,
        score=score,
        passed="true" if passed else "false",
        created_at=datetime.utcnow(),
    )
    db.add(attempt)
    db.commit()

    if not passed:
        rerouted = True
        background_tasks.add_task(_reroute_future_weeks, str(payload.roadmapId), payload.weekNumber)

    return schemas.QuizSubmissionOut(
        score=score,
        passed=passed,
        rerouted=rerouted,
        message="Quiz passed. Your roadmap stays on course." if passed else "Quiz below threshold. Future weeks are being recalibrated.",
    )