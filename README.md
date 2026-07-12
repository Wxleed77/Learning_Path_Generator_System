# Learning Path Generator

A full-stack web application that generates personalized, week-by-week study roadmaps using LLMs. Users enter a learning goal, their skill level, and available hours per week, and the app produces a structured plan with topics, projects, resources, quizzes, and milestones — then tracks progress as they work through it.

Built as a portfolio project demonstrating full-stack development (FastAPI + React) with AI integration (Groq + OpenRouter).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3, FastAPI, SQLAlchemy ORM, Uvicorn |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **State / Data** | TanStack Query, Zustand, Axios |
| **Database** | PostgreSQL (hosted on Supabase) |
| **Auth** | JWT (access + refresh tokens), bcrypt |
| **LLM (roadmap)** | Groq API — `llama-3.3-70b-versatile` |
| **LLM (quiz)** | OpenRouter — `openai/gpt-4o-mini` (free tier) |
| **Deployment** | Vercel (frontend), Render (backend), Supabase (DB) |

---

## Features

- **Email/password authentication** — signup, login, JWT access + refresh token rotation, auto-refresh on 401
- **LLM-generated roadmaps** — enter a goal (e.g. "become a backend developer"), skill level, and weekly hours; the LLM returns a multi-week plan with topics, projects, resources, quizzes, and milestones
- **Structured data model** — roadmaps are persisted relationally (goal → plan → version → weekly plans → tasks → resources), not as raw LLM text
- **Progress tracking** — mark tasks as not started / in progress / completed; completion percentage per week
- **Roadmap history** — sidebar lists all previously generated plans with completion stats; switch between them
- **Week navigation** — click through weeks to view each week's tasks
- **Consistency heatmap** — 35-day calendar grid showing days with completed tasks
- **Inline quiz checkpoints** — per-week quiz (2 questions) generated via Groq, graded server-side, with adaptive re-planning on low scores
- **Dedicated quiz page** — standalone `/quiz/:taskId` route with 5 questions generated via OpenRouter, one-at-a-time answering, per-question feedback, past attempt history
- **Account management** — view/edit profile (name, skill level), change password, delete account (cascades all user data)
- **Dark UI** — consistent dark "command center" design system with Tailwind CSS

---

## Architecture Overview

### Data Model

```
User
 └─ LearningGoal (title, skill_level, hours_per_week)
     └─ LearningPlan (status: active/completed)
         └─ RoadmapVersion (version_number, raw_llm_output for audit)
             └─ WeeklyPlan (week_number, theme, estimated_hours)
                 └─ Task (type: topic/project/quiz/milestone, title, description)
                     └─ Resource (url, resource_type)
                     └─ Progress (status, completed_at) — per user
                     └─ QuizAttempt (questions, answers, score, passed) — per user
```

### LLM Generation Flow

1. User submits a goal → `POST /api/roadmap/generate`
2. Backend builds a structured prompt with the goal, skill level, and hours
3. Calls Groq API with `response_format: json_object`
4. Validates the response against a Pydantic schema (`RoadmapLLMOutput`)
5. If validation fails, retries up to 3 times with the error fed back to the model
6. Persists the validated output into the relational model (plan → version → weeks → tasks → resources)
7. Returns the structured roadmap to the frontend

Quiz generation follows the same pattern but uses OpenRouter instead of Groq, and the prompt is built from the actual week's topic/project task content (not just the theme).

---

## Project Structure

```
LearningPathGenerator/
├── app/                          # FastAPI backend
│   ├── main.py                   # App entry point, CORS, router registration
│   ├── database.py               # SQLAlchemy engine + session
│   ├── models.py                 # ORM models (User, LearningGoal, Task, Progress, etc.)
│   ├── schemas.py                # Pydantic request/response schemas
│   ├── auth.py                   # JWT creation, verification, password hashing
│   ├── llm_client.py             # Groq API client for roadmap generation
│   ├── llm_schema.py             # Pydantic schema for roadmap LLM output
│   ├── quiz_llm_client.py        # OpenRouter API client for quiz generation
│   ├── quiz_schema.py            # Pydantic schema for quiz LLM output
│   ├── roadmap_stub.py           # Stub generator (used when no API key is set)
│   └── routers/
│       ├── auth.py               # POST /api/auth/signup, /login, /refresh
│       ├── users.py              # GET/PATCH/DELETE /api/users/me
│       ├── roadmap.py            # POST /api/roadmap/generate, GET /history, GET /weekly-plan
│       ├── progress.py           # GET /api/progress/heatmap, PATCH /api/progress/{task_id}
│       ├── quizzes.py            # Legacy inline quiz (Groq) — generate + submit
│       └── quiz.py               # Dedicated quiz (OpenRouter) — generate + submit + attempts
├── frontend/                     # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx               # Router setup
│   │   ├── main.tsx              # React entry point
│   │   ├── index.css             # Tailwind imports + base styles
│   │   ├── lib/
│   │   │   ├── api.ts            # Axios instance with JWT interceptor
│   │   │   ├── authStore.ts      # Zustand store for auth tokens
│   │   │   ├── planStore.ts      # Zustand store for current plan
│   │   │   ├── types.ts          # TypeScript interfaces
│   │   │   └── courseCode.ts     # Utility for course code generation
│   │   ├── hooks/
│   │   │   ├── useRoadmap.ts     # TanStack Query hooks for roadmap/progress
│   │   │   ├── useQuiz.ts        # TanStack Query hooks for quiz endpoints
│   │   │   └── RequireAuth.tsx   # Auth guard component
│   │   ├── components/
│   │   │   ├── AppLayout.tsx     # Navbar + layout wrapper
│   │   │   ├── HeatmapCard.tsx   # 35-day consistency heatmap
│   │   │   ├── QuizPanel.tsx     # Inline quiz panel (legacy)
│   │   │   ├── StampCheckbox.tsx # Animated stamp checkbox
│   │   │   └── Spinner.tsx       # Loading spinner SVG
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── SignupPage.tsx
│   │       ├── DashboardPage.tsx # Main dashboard with roadmap view
│   │       ├── GoalFormPage.tsx  # New goal form
│   │       ├── QuizPage.tsx      # Dedicated quiz page
│   │       └── AccountPage.tsx   # Account settings
│   ├── vercel.json               # SPA rewrites for Vercel
│   └── vite.config.ts
├── .env.example                  # Required environment variables
├── render.yaml                   # Render deployment blueprint
└── requirements.txt              # Python dependencies
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A Supabase PostgreSQL database (free tier)
- A Groq API key (free at https://console.groq.com)
- An OpenRouter API key (free at https://openrouter.ai/keys)

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/your-username/LearningPathGenerator.git
cd LearningPathGenerator

# Create and activate a virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and fill in your values
cp .env.example .env
```

Edit `.env` with your credentials:

```env
connection_string="postgresql://postgres.USER:PASSWORD@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
JWT_SECRET="your-secret-key"
GROQ_API_KEY="gsk-..."
OPENROUTER_API_KEY="sk-or-v1-..."
```

```bash
# Start the backend server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. The health check is at `http://localhost:8000/health`.

### Frontend Setup

```bash
cd frontend
npm install
```

```bash
# Start the dev server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## Environment Variables

### Backend (`app/`)

| Variable | Required | Description | Where to Get It |
|---|---|---|---|
| `connection_string` | Yes | PostgreSQL connection string | Supabase dashboard → Project Settings → Database |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens | Generate a random string |
| `JWT_ALGORITHM` | No | JWT signing algorithm (default: HS256) | — |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Access token lifetime (default: 30) | — |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | Refresh token lifetime (default: 7) | — |
| `GROQ_API_KEY` | Yes | API key for Groq (roadmap generation) | https://console.groq.com |
| `GROQ_MODEL` | No | Groq model (default: llama-3.3-70b-versatile) | — |
| `OPENROUTER_API_KEY` | Yes | API key for OpenRouter (quiz generation) | https://openrouter.ai/keys |
| `OPENROUTER_MODEL` | No | OpenRouter model (default: openai/gpt-4o-mini) | — |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: localhost:5173) | Set to your Vercel URL in production |

### Frontend (`frontend/`)

| Variable | Required | Description | Where to Get It |
|---|---|---|---|
| `VITE_API_URL` | No | Backend API base URL (default: http://127.0.0.1:8000) | Your deployed backend URL |

---

## API Overview

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create a new user account |
| `POST` | `/api/auth/login` | Login, returns access + refresh tokens |
| `POST` | `/api/auth/refresh` | Refresh an expired access token |
| `GET` | `/api/users/me` | Get current user profile |
| `PATCH` | `/api/users/me` | Update name / skill level |
| `PATCH` | `/api/users/me/password` | Change password |
| `DELETE` | `/api/users/me` | Delete account and all associated data |
| `POST` | `/api/roadmap/generate` | Generate a new learning roadmap via LLM |
| `GET` | `/api/roadmap/history` | List all user's roadmaps with stats |
| `GET` | `/api/roadmap/{planId}/weekly-plan` | Get a specific week's tasks |
| `GET` | `/api/progress/heatmap` | Get completion data for the heatmap |
| `PATCH` | `/api/progress/{taskId}` | Update task progress status |
| `POST` | `/api/quizzes/generate` | Generate inline quiz (Groq, 2 questions) |
| `POST` | `/api/quizzes/submit` | Submit inline quiz answers |
| `POST` | `/api/quiz/{taskId}/generate` | Generate dedicated quiz (OpenRouter, 5 questions) |
| `POST` | `/api/quiz/{taskId}/submit` | Submit dedicated quiz answers |
| `GET` | `/api/quiz/{taskId}/attempts` | List past quiz attempts for a task |
| `GET` | `/health` | Health check |

---

## Deployment

### Frontend (Vercel)

1. Push the repository to GitHub
2. Import the project in Vercel
3. Set **Root Directory** to `frontend`
4. Framework preset: **Vite**
5. Build command: `npm run build`
6. Output directory: `dist`
7. Add environment variable: `VITE_API_URL` = your deployed backend URL

### Backend (Render — free tier)

1. In Render dashboard, click **New +** → **Web Service**
2. Connect your public GitHub repository
3. **Runtime**: Python 3
4. **Build Command**: `pip install -r requirements.txt`
5. **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. **Plan**: Free
7. Add all environment variables listed in the table above
8. Set `CORS_ORIGINS` to your Vercel frontend URL

**Note:** Render's free tier spins down after 15 minutes of inactivity. The first request after idle will take ~30 seconds to wake up. You can use a free cron service (e.g. cron-job.org) to ping `/health` every 10 minutes to keep it warm.

### Database (Supabase)

1. Create a free Supabase project at https://supabase.com
2. Go to **Project Settings** → **Database** → copy the connection string
3. Use it as the `connection_string` environment variable
4. Tables are auto-created on first startup via `Base.metadata.create_all()`

---

