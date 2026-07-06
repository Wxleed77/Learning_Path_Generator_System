from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..roadmap_stub import generate_stub_roadmap
from .users import get_current_user

router = APIRouter(prefix="/api/roadmap", tags=["roadmap"])


@router.post("/generate", response_model=schemas.RoadmapOut, status_code=201)
def generate_roadmap(
    payload: schemas.RoadmapGenerateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # 1. Persist the goal
    goal = models.LearningGoal(
        user_id=current_user.id,
        title=payload.goalTitle,
        current_skill_level=payload.skillLevel,
        hours_per_week=payload.hoursPerWeek,
    )
    db.add(goal)
    db.flush()  # get goal.id without committing yet

    # 2. Create the plan (no version yet)
    plan = models.LearningPlan(goal_id=goal.id, status="active")
    db.add(plan)
    db.flush()

    # 3. Stub-generate the roadmap content (Phase 3 swaps this for a real LLM call)
    roadmap = generate_stub_roadmap(payload.goalTitle, payload.skillLevel, payload.hoursPerWeek)

    version = models.RoadmapVersion(
        plan_id=plan.id,
        version_number=1,
        raw_llm_output=None,  # nothing to audit yet — stub, not a real model call
        reason_for_regeneration=None,
    )
    db.add(version)
    db.flush()

    plan.current_version_id = version.id

    # 4. Persist weeks + tasks
    week_rows = []
    for week in roadmap["weeks"]:
        wp = models.WeeklyPlan(
            plan_version_id=version.id,
            week_number=week["weekNumber"],
            theme=week["theme"],
            estimated_hours=week["estimatedHours"],
        )
        db.add(wp)
        db.flush()

        task_rows = []
        for idx, task in enumerate(week["tasks"]):
            t = models.Task(
                weekly_plan_id=wp.id,
                type=task["type"],
                title=task["title"],
                description=task["description"],
                difficulty=task["difficulty"],
                order_index=idx,
            )
            db.add(t)
            task_rows.append(t)

        week_rows.append((wp, task_rows))

    db.commit()

    return schemas.RoadmapOut(
        planId=plan.id,
        versionId=version.id,
        totalWeeks=roadmap["totalWeeks"],
        weeks=[
            schemas.WeekOut(
                weekNumber=wp.week_number,
                theme=wp.theme,
                estimatedHours=wp.estimated_hours,
                tasks=[schemas.TaskOut.model_validate(t) for t in tasks],
            )
            for wp, tasks in week_rows
        ],
    )


@router.get("/{plan_id}/weekly-plan")
def get_weekly_plan(
    plan_id: str,
    week: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plan = db.query(models.LearningPlan).filter(models.LearningPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    goal = db.query(models.LearningGoal).filter(models.LearningGoal.id == plan.goal_id).first()
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the owner of this plan")

    wp = db.query(models.WeeklyPlan).filter(
        models.WeeklyPlan.plan_version_id == plan.current_version_id,
        models.WeeklyPlan.week_number == week,
    ).first()
    if not wp:
        raise HTTPException(status_code=404, detail="Week not found")

    tasks = db.query(models.Task).filter(models.Task.weekly_plan_id == wp.id).order_by(models.Task.order_index).all()

    return {
        "week": wp.week_number,
        "theme": wp.theme,
        "tasks": [schemas.TaskOut.model_validate(t) for t in tasks],
    }
