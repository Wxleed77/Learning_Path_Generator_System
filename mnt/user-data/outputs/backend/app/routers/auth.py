import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=schemas.UserOut, status_code=201)
def signup(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        name=payload.name,
        email=payload.email,
        hashed_password=auth.hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.TokenPair)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = auth.create_access_token(user.id)
    refresh_token, expires_at = auth.create_refresh_token(user.id)

    db.add(models.RefreshToken(user_id=user.id, token=refresh_token, expires_at=expires_at))
    db.commit()

    return schemas.TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=schemas.TokenPair)
def refresh(payload: schemas.RefreshRequest, db: Session = Depends(get_db)):
    stored = db.query(models.RefreshToken).filter(
        models.RefreshToken.token == payload.refresh_token
    ).first()
    if not stored:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    decoded = auth.decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = uuid.UUID(decoded["sub"])
    new_access = auth.create_access_token(user_id)
    new_refresh, expires_at = auth.create_refresh_token(user_id)

    db.delete(stored)
    db.add(models.RefreshToken(user_id=user_id, token=new_refresh, expires_at=expires_at))
    db.commit()

    return schemas.TokenPair(access_token=new_access, refresh_token=new_refresh)
