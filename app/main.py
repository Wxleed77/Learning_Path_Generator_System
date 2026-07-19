import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from dotenv import load_dotenv
from .database import Base, engine
from .routers import auth, users, roadmap, progress, quizzes, quiz

load_dotenv()

# Migration: drop old quiz_attempts table so it's recreated with new schema
# (task_id, questions, answers, passed instead of old roadmap_id/week_number)
with engine.connect() as conn:
    conn.execute(text("DROP TABLE IF EXISTS quiz_attempts CASCADE"))
    conn.commit()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Learning Path Generator API")

# Allow specific frontend origins + localhost for dev
#CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
#origins = [o.strip() for o in CORS_ORIGINS.split(",")]
# Replace the old CORS_ORIGINS lines with this:
origins = [
    "https://peronalized-learning-system.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(roadmap.router)
app.include_router(progress.router)
app.include_router(quizzes.router)
app.include_router(quiz.router)


@app.get("/health")
def health():
    return {"status": "ok"}