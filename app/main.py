from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import auth, users, roadmap, progress

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Learning Path Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(roadmap.router)
app.include_router(progress.router)


@app.get("/health")
def health():
    return {"status": "ok"}
