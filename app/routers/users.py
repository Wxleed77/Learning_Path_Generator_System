import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> models.User:
    token = credentials.credentials
    decoded = auth.decode_token(token)
    if not decoded or decoded.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(models.User).filter(models.User.id == uuid.UUID(decoded["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=schemas.UserOut)
def update_profile(
    payload: schemas.UserUpdateProfile,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.name is not None:
        current_user.name = payload.name
    if payload.skill_level is not None:
        current_user.skill_level = payload.skill_level
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/me/password")
def update_password(
    payload: schemas.UserUpdatePassword,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not auth.verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = auth.hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.delete("/me")
def delete_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete the current user's account and all associated data."""
    user_id = current_user.id

    # Delete in dependency order to avoid FK violations
    # 1. Refresh tokens
    db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user_id).delete()

    # 2. Quiz attempts + quiz questions
    db.query(models.QuizAttempt).filter(models.QuizAttempt.user_id == user_id).delete()
    db.query(models.QuizQuestion).filter(models.QuizQuestion.user_id == user_id).delete()

    # 3. Progress records
    db.query(models.Progress).filter(models.Progress.user_id == user_id).delete()

    # 4. Learning goals → plans → versions → weekly plans → tasks → resources
    goals = db.query(models.LearningGoal).filter(models.LearningGoal.user_id == user_id).all()
    for goal in goals:
        plans = db.query(models.LearningPlan).filter(models.LearningPlan.goal_id == goal.id).all()
        for plan in plans:
            # Null out the FK reference before deleting versions
            plan.current_version_id = None
            db.flush()

            versions = db.query(models.RoadmapVersion).filter(models.RoadmapVersion.plan_id == plan.id).all()
            for version in versions:
                weekly_plans = db.query(models.WeeklyPlan).filter(models.WeeklyPlan.plan_version_id == version.id).all()
                for wp in weekly_plans:
                    tasks = db.query(models.Task).filter(models.Task.weekly_plan_id == wp.id).all()
                    for task in tasks:
                        db.query(models.Resource).filter(models.Resource.task_id == task.id).delete()
                        db.query(models.Progress).filter(models.Progress.task_id == task.id).delete()
                        db.query(models.QuizAttempt).filter(models.QuizAttempt.task_id == task.id).delete()
                    db.query(models.Task).filter(models.Task.weekly_plan_id == wp.id).delete()
                db.query(models.WeeklyPlan).filter(models.WeeklyPlan.plan_version_id == version.id).delete()
            db.query(models.RoadmapVersion).filter(models.RoadmapVersion.plan_id == plan.id).delete()
        db.query(models.LearningPlan).filter(models.LearningPlan.goal_id == goal.id).delete()
    db.query(models.LearningGoal).filter(models.LearningGoal.user_id == user_id).delete()

    # 5. Finally delete the user
    db.query(models.User).filter(models.User.id == user_id).delete()
    db.commit()

    return {"message": "Account deleted successfully"}
