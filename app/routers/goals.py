from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from .users import get_current_user

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.get("/common", response_model=list[schemas.CommonGoalOut])
def list_common_goals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.CommonGoal)
        .order_by(models.CommonGoal.sort_order, models.CommonGoal.title)
        .all()
    )
