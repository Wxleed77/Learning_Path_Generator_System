from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from .users import get_current_user

router = APIRouter(prefix="/api/progress", tags=["progress"])


def _assert_task_ownership(db: Session, task_id: str, user_id) -> models.Task:
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    wp = db.query(models.WeeklyPlan).filter(models.WeeklyPlan.id == task.weekly_plan_id).first()
    version = db.query(models.RoadmapVersion).filter(models.RoadmapVersion.id == wp.plan_version_id).first()
    plan = db.query(models.LearningPlan).filter(models.LearningPlan.id == version.plan_id).first()
    goal = db.query(models.LearningGoal).filter(models.LearningGoal.id == plan.goal_id).first()

    if not goal or goal.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not the owner of this task")
    return task


@router.patch("/{task_id}", response_model=schemas.ProgressOut)
def update_progress(
    task_id: str,
    payload: schemas.ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = _assert_task_ownership(db, task_id, current_user.id)

    progress = db.query(models.Progress).filter(
        models.Progress.task_id == task.id,
        models.Progress.user_id == current_user.id,
    ).first()

    now = datetime.utcnow() if payload.status == "completed" else None

    if progress:
        progress.status = payload.status
        progress.completed_at = now
    else:
        progress = models.Progress(
            user_id=current_user.id, task_id=task.id, status=payload.status, completed_at=now
        )
        db.add(progress)

    db.commit()
    db.refresh(progress)

    return schemas.ProgressOut(taskId=task.id, status=progress.status, updatedAt=progress.completed_at)
