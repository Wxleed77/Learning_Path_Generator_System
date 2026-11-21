from .database import SessionLocal
from .models import CommonGoal

# Curated starting set of popular learning goals. Seeding is idempotent:
# rows are only inserted when a title is not already present.
COMMON_GOALS: list[tuple[str, str, str]] = [
    ("Become a Backend Developer", "Backend", "APIs, databases, auth, and server-side architecture."),
    ("Become a Frontend Developer", "Frontend", "HTML, CSS, JavaScript, React, and UI engineering."),
    ("Become a Full-Stack Developer", "Full Stack", "End-to-end product work across client and server."),
    ("Learn DevOps", "DevOps", "CI/CD, infrastructure as code, monitoring, and release automation."),
    ("Learn Docker & Kubernetes", "DevOps", "Containers, orchestration, and deployment workflows."),
    ("Learn Cloud Computing (AWS)", "Cloud", "Core AWS services, IAM, networking, and cost-aware design."),
    ("Learn Data Science", "Data", "Python, statistics, data wrangling, and visualization."),
    ("Learn Machine Learning", "AI", "Supervised learning, model evaluation, and deployment."),
    ("Learn Mobile Development", "Mobile", "Cross-platform mobile apps with React Native."),
    ("Learn Cybersecurity", "Security", "Threat modeling, web security, and defensive practices."),
    ("Learn UI/UX Design", "Design", "Design systems, user research, and interaction design."),
    ("Learn Python", "Programming", "Python fundamentals through practical projects."),
    ("Learn JavaScript", "Programming", "Modern JavaScript, async patterns, and the DOM."),
    ("Learn SQL & Databases", "Data", "Relational modeling, queries, indexing, and performance."),
    ("Learn System Design", "Backend", "Scalable architecture, trade-offs, and distributed systems."),
]


def seed_common_goals() -> None:
    db = SessionLocal()
    try:
        existing = {title for (title,) in db.query(CommonGoal.title).all()}
        for order, (title, category, description) in enumerate(COMMON_GOALS):
            if title not in existing:
                db.add(
                    CommonGoal(
                        title=title,
                        category=category,
                        description=description,
                        sort_order=order,
                    )
                )
        db.commit()
    finally:
        db.close()
