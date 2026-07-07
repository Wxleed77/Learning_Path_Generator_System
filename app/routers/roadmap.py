from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..llm_client import generate_roadmap_via_llm
from .users import get_current_user

router = APIRouter(prefix="/api/roadmap", tags=["roadmap"])


def _persist_task_with_resources(db, weekly_plan_id, type_, title, description, difficulty, order_index, resources=None):
    task = models.Task(
        weekly_plan_id=weekly_plan_id,
        type=type_,
        title=title,
        description=description,
        difficulty=difficulty,
        order_index=order_index,
    )
    db.add(task)
    db.flush()
    for r in resources or []:
        db.add(models.Resource(task_id=task.id, url=r["url"], resource_type=r["type"], source="generated"))
    return task


def _build_task_out(db, task, status_by_task=None):
    resources = db.query(models.Resource).filter(models.Resource.task_id == task.id).all()
    status = (status_by_task or {}).get(task.id, "not_started")
    return schemas.TaskOut(
        id=task.id,
        type=task.type,
        title=task.title,
        description=task.description,
        difficulty=task.difficulty,
        status=status,
        resources=[schemas.ResourceOut(url=r.url, resource_type=r.resource_type) for r in resources],
    )


@router.post("/generate", response_model=schemas.RoadmapOut, status_code=201)
def generate_roadmap(
    payload: schemas.RoadmapGenerateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    goal = models.LearningGoal(
        user_id=current_user.id,
        title=payload.goalTitle,
        current_skill_level=payload.skillLevel,
        hours_per_week=payload.hoursPerWeek,
    )
    db.add(goal)
    db.flush()

    plan = models.LearningPlan(goal_id=goal.id, status="active")
    db.add(plan)
    db.flush()

    try:
        roadmap = generate_roadmap_via_llm(payload.goalTitle, payload.skillLevel, payload.hoursPerWeek)
    except RuntimeError as e:
        db.rollback()
        raise HTTPException(status_code=502, detail=str(e))

    version = models.RoadmapVersion(
        plan_id=plan.id,
        version_number=1,
        raw_llm_output=roadmap,
        reason_for_regeneration=None,
    )
    db.add(version)
    db.flush()
    plan.current_version_id = version.id

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

        tasks = []
        idx = 0
        for i, topic in enumerate(week["topics"]):
            res = week["resources"] if i == 0 else []
            tasks.append(_persist_task_with_resources(
                db, wp.id, "topic", topic["title"], topic["description"], week["difficulty"], idx, res
            ))
            idx += 1
        for project in week["projects"]:
            tasks.append(_persist_task_with_resources(
                db, wp.id, "project", project["title"], project["description"], project["difficulty"], idx
            ))
            idx += 1
        q = week["quiz"]
        tasks.append(_persist_task_with_resources(
            db, wp.id, "quiz", f"Week {week['weekNumber']} Quiz",
            f"{q['questionCount']} questions covering: {', '.join(q['topicsCovered'])}. Passing score: {q['passingScore']}%",
            week["difficulty"], idx
        ))
        idx += 1
        tasks.append(_persist_task_with_resources(
            db, wp.id, "milestone", "Milestone", week["milestone"], week["difficulty"], idx
        ))

        week_rows.append((wp, tasks))

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
                tasks=[_build_task_out(db, t) for t in tasks],
            )
            for wp, tasks in week_rows
        ],
    )


@router.get("/history", response_model=list[schemas.UserRoadmapSummaryOut])
def list_user_roadmaps(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    goals = db.query(models.LearningGoal).filter(models.LearningGoal.user_id == current_user.id).all()
    summaries = []

    for goal in goals:
        plans = db.query(models.LearningPlan).filter(models.LearningPlan.goal_id == goal.id).all()
        for plan in plans:
            version = db.query(models.RoadmapVersion).filter(models.RoadmapVersion.id == plan.current_version_id).first()
            if not version:
                continue

            weeks = db.query(models.WeeklyPlan).filter(models.WeeklyPlan.plan_version_id == version.id).all()
            tasks = []
            for week in weeks:
                tasks.extend(db.query(models.Task).filter(models.Task.weekly_plan_id == week.id).all())

            task_ids = [t.id for t in tasks]
            progress_rows = db.query(models.Progress).filter(
                models.Progress.task_id.in_(task_ids),
                models.Progress.user_id == current_user.id,
            ).all()
            status_by_task = {p.task_id: p.status for p in progress_rows}
            completed_tasks = sum(1 for status in status_by_task.values() if status == "completed")

            summaries.append(
                schemas.UserRoadmapSummaryOut(
                    planId=plan.id,
                    goalTitle=goal.title,
                    skillLevel=goal.current_skill_level,
                    hoursPerWeek=goal.hours_per_week,
                    totalWeeks=len(weeks),
                    completedTasks=completed_tasks,
                    totalTasks=len(tasks),
                    createdAt=goal.created_at,
                    status=plan.status,
                )
            )

    summaries.sort(key=lambda item: item.createdAt, reverse=True)
    return summaries


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
    task_ids = [t.id for t in tasks]
    progress_rows = db.query(models.Progress).filter(
        models.Progress.task_id.in_(task_ids), models.Progress.user_id == current_user.id
    ).all()
    status_by_task = {p.task_id: p.status for p in progress_rows}

    return {
        "week": wp.week_number,
        "theme": wp.theme,
        "tasks": [_build_task_out(db, t, status_by_task) for t in tasks],
    }
