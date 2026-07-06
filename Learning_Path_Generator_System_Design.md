# Personalized Learning Path Generator — Full System Design

*A technical design review, written the way a senior AI/software architect would present it before development begins.*

---

## 1. Project Overview

### Problem it solves
Most learners fail not from lack of motivation but from **decision fatigue**: "What do I learn first? Which resource is good? Am I even progressing?" Generic roadmaps (a static YouTube playlist or a roadmap.sh diagram) don't know the learner's current level, pace, or how they're actually performing. This project removes that friction by generating a roadmap tailored to the individual and then **adapting it continuously** as reality diverges from the plan.

### Target users
- Self-taught developers/students moving toward a specific goal (e.g., "become a backend developer in 4 months")
- Bootcamp/university students needing structure outside the classroom
- Career switchers with limited weekly hours who need realistic pacing
- Mentors/教育 platforms that want to white-label an adaptive curriculum engine

### Why it's valuable
- Converts a vague goal into a concrete, measurable, time-boxed plan
- Reduces the biggest failure mode in self-study: **wrong sequencing and unrealistic pacing**
- Creates a feedback loop (plan → do → measure → replan) that mirrors how good human mentors operate

### Why AI beats a static roadmap generator
| Static Roadmap | AI-Generated Adaptive Roadmap |
|---|---|
| One-size-fits-all sequence | Sequence conditioned on stated skill level + goal |
| Fixed pacing (e.g., "12 weeks") | Pacing computed from actual available hours/week |
| No feedback loop | Re-plans when quiz scores are low, hours change, or topics are already known |
| Resources hardcoded | Resources can be filtered/ranked/generated based on learning style |
| No milestone re-evaluation | Milestones shift dynamically based on real progress velocity |

The core AI value-add isn't "writing a plan" (any template can do that) — it's **reasoning about trade-offs under constraints** (time, prior knowledge, performance) and re-deriving the plan when those constraints change, which is what makes it a genuine agent-like system rather than a form-filler.

---

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│   React (Web) / React Native (optional mobile)                  │
└───────────────────────────────┬───────────────────────────────────┘
                                │ HTTPS (REST/JSON, JWT auth)
┌───────────────────────────────▼───────────────────────────────────┐
│                        API GATEWAY / BFF                          │
│   Rate limiting · Auth middleware · Request validation           │
└───────────────────────────────┬───────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Core Backend  │     │   AI Service     │     │  Notification    │
│  (Node/Nest or │◄───►│  (LLM Orchestr., │     │  Service (email/ │
│   FastAPI)     │     │  Prompt Builder, │     │  push, queued)   │
│                │     │  JSON Validator) │     │                  │
└───────┬────────┘     └────────┬─────────┘     └──────────────────┘
        │                       │
        ▼                       ▼
┌────────────────┐     ┌──────────────────┐
│  PostgreSQL     │     │  LLM Provider     │
│  (relational    │     │  (OpenAI/Claude/  │
│  source of truth)│     │  Gemini API)     │
└────────────────┘     └──────────────────┘
        │
        ▼
┌────────────────┐     ┌──────────────────┐
│  Redis Cache    │     │  Vector DB        │
│  (session,      │     │  (optional, for   │
│  rate limits)   │     │  resource search) │
└────────────────┘     └──────────────────┘
```

### Detailed Request Flow — "Generate Roadmap"

```
User fills form (skill level, goal, hours/week)
        │
        ▼
Frontend → POST /api/roadmap/generate
        │
        ▼
Backend validates input (schema, sane ranges: 1–80 hrs/week)
        │
        ▼
Backend builds structured prompt (goal + constraints + template)
        │
        ▼
AI Service calls LLM with function-calling / JSON-mode
        │
        ▼
LLM returns structured JSON (weeks → topics → resources → quizzes)
        │
        ▼
Backend validates JSON against schema (Zod/Pydantic)
   ├── Invalid → retry with corrective prompt (max 2 retries)
   └── Valid → persist to DB (LearningPlan, WeeklyPlan, Task rows)
        │
        ▼
Backend returns roadmap ID + summary to frontend
        │
        ▼
Frontend renders week-by-week dashboard
```

**Explaining each arrow:**
1. **Form → Backend**: raw user input, must never be trusted — validated server-side regardless of client-side checks.
2. **Backend → Prompt builder**: the backend, not the frontend, owns prompt construction so prompt logic/API keys never reach the client.
3. **Prompt → LLM**: sent with a strict system instruction demanding JSON-only output matching a schema.
4. **LLM → Validator**: LLM output is *never* trusted blindly — always schema-validated before touching the database.
5. **Validator → DB**: only validated, normalized data is persisted — this is what makes the system production-safe instead of a demo.
6. **DB → Frontend**: the frontend never talks to the LLM directly; this keeps cost, prompts, and API keys server-side and centralizes caching/rate-limiting.

---

## 3. Tech Stack — 100% Free / Open-Source Version

Every item below has a genuinely free tier (no credit card trap) or is fully open-source and self-hostable. Paid upgrade paths are noted only as "later, if needed" — not required to build or demo this project.

| Layer | Free Choice | Why it fits | Free-tier limits to know | Paid alternative (only if you outgrow free) |
|---|---|---|---|---|
| Frontend | **React + TypeScript** (open-source, always free) | Huge ecosystem, component reuse, strong typing catches schema mismatches early | None — it's a library, not a service | — |
| Backend | **Node.js (NestJS)** or **Python (FastAPI)** (both open-source) | NestJS = structured, testable, DI-based; FastAPI = tight Python/AI tooling fit | None — self-hosted code, free forever | — |
| Database | **Supabase (free tier Postgres)** or **Neon (free tier Postgres)** | Both give a real managed PostgreSQL with a generous free tier, so you get JSONB + relational integrity for $0 | Supabase free: 500MB DB, pauses after 1 week inactivity; Neon free: 0.5GB storage, always-on but limited compute | Supabase Pro / Neon paid tier when data grows |
| ORM | **Prisma (Node)** / **SQLAlchemy (Python)** (open-source) | Type-safe queries, built-in migrations | None | — |
| Auth | **Supabase Auth** (free, bundled with Supabase free tier) or **custom JWT + bcrypt** (fully free, self-built) | Supabase Auth gives email/password + social login free; custom JWT is the "build it yourself to learn it" path for a portfolio project | Supabase free tier auth: up to 50,000 monthly active users — more than enough for a portfolio project | Auth0/Clerk paid tiers only needed at real commercial scale |
| Hosting (Frontend) | **Vercel (free Hobby tier)** or **Netlify (free tier)** | Zero-config React deploys, free SSL, preview URLs per PR | Hobby tier: personal/non-commercial use, fair-use bandwidth limits | Pro tier only needed for commercial/team use |
| Hosting (Backend) | **Render (free tier)** or **Fly.io (free allowance)** | Free web services are enough to run a NestJS/FastAPI API for a portfolio project | Render free tier: service "spins down" after 15 min idle (cold start ~30–60s on next request) — fine for a demo, not for a paying product | Paid "always-on" tier once you have real users who can't tolerate cold starts |
| Storage | **Cloudflare R2 (free tier: 10GB storage + free egress)** or **Supabase Storage (bundled free tier)** | For optional file uploads (resume, certificates) | 10GB is plenty for a portfolio-scale app | Pay-as-you-go only past 10GB |
| Caching | **Upstash Redis (free tier)** | Serverless Redis with a genuinely free tier (~10,000 commands/day), great fit for caching + rate-limit counters | 10k commands/day is enough for demo/low-traffic use | Upstash pay-as-you-go past free quota |
| LLM Provider | **Google Gemini API (free tier)** or **Groq API (free tier, very fast open models)** or **local open-source models via Ollama** (100% free, runs on your own machine, no API cost ever) | Gemini's and Groq's free tiers both support JSON/structured output and are enough to build and demo the whole roadmap-generation flow at zero cost; Ollama (running Llama 3.1/Mistral locally) is the truly $0-forever option if you don't mind self-hosting the model | Gemini/Groq free tiers have daily/rate limits (fine for dev + demo, not for many concurrent paying users); Ollama needs a reasonably capable machine (8GB+ RAM) to run decent models well | OpenAI/Claude paid API only needed for production-grade reliability at real scale |
| Embeddings | **sentence-transformers (open-source, e.g. `all-MiniLM-L6-v2`)** run locally via Python — completely free, no API calls needed | Only needed if you build semantic resource search — running it locally avoids embedding API costs entirely | Slightly lower quality than top paid embedding models, but more than sufficient for this use case | OpenAI/Voyage embeddings only if quality becomes a bottleneck |
| Vector DB | **pgvector** (free extension inside your already-free Postgres) | No new infra, no new cost — reuses the same free database | None beyond your Postgres free-tier storage cap | Pinecone/Weaviate only at serious scale |
| UI Library | **Tailwind CSS + shadcn/ui** (both open-source, free) | Fast, consistent design system | None | — |
| Charts | **Recharts** (open-source, free) | Simple API for progress/velocity charts | None | — |
| State Management | **TanStack Query + Zustand** (both open-source, free) | React Query for server state/caching, Zustand for local UI state | None | — |
| Validation | **Zod** / **Pydantic** (both open-source, free) | Single source of truth for the roadmap JSON schema | None | — |
| Testing | **Vitest/Jest + Playwright** (all open-source, free) | Unit + end-to-end testing at no cost | GitHub Actions free minutes cover CI runs | — |
| Monitoring | **Sentry (free Developer tier)** | Real error tracking, ~5k errors/month free | Free tier caps events/month — fine for portfolio traffic | Team/Business tier at scale |
| CI/CD | **GitHub Actions** (free for public repos; generous free minutes for private) | Lint/test/build/deploy pipeline at $0 | ~2,000 free minutes/month on private repos | — |

**On the LLM provider (the piece people most assume "must" cost money):** start with **Google Gemini's free tier** for development and demoing — it handles structured/JSON output well and the free quota is enough to build and showcase the entire adaptive-roadmap flow. For a zero-dependency, never-rate-limited local option, run **Ollama with Llama 3.1 8B or Mistral 7B** on your own machine — completely free forever, just slower and needs a reasonably capable laptop/desktop.

---

## 4. Features

### Core MVP
| Feature | Purpose |
|---|---|
| **User Authentication** | Persistent identity so plans/progress can be saved and resumed |
| **Profile & Onboarding** | Capture skill level, goal, hours/week — the three generation inputs |
| **Goal Input Form** | Structured intake (dropdown skill level + free-text goal + numeric hours) reduces prompt ambiguity |
| **Roadmap Generation** | The core AI feature — produces the week-by-week JSON plan |
| **Weekly Dashboard** | Renders current week's topics/resources/tasks/quiz |
| **Progress Tracking** | Mark tasks complete, log quiz scores — the data that drives adaptation |

### Advanced Features
| Feature | Purpose |
|---|---|
| **AI Mentor Chat** | Conversational Q&A grounded in the user's current roadmap context (RAG over their own plan + resources) |
| **Adaptive Roadmaps** | Re-generates remaining weeks based on completed/failed items (see Section 9) |
| **Streak System** | Behavioral nudge — gamifies consistency, a proven retention lever (Duolingo-style) |
| **Calendar Integration** | Syncs weekly tasks to Google Calendar/ICS for time-blocking |
| **Notifications** | Reminders, "you're behind schedule," milestone celebrations |
| **Gamification** | XP, badges, levels — increases completion rates for self-directed learners |
| **Analytics Dashboard** | Velocity charts, time-per-topic, quiz score trends — value for both learner and, later, for admins/mentors |
| **Community Challenges** | Cohort-based accountability, leaderboard among users with the same goal |

**Recommendation:** ship the MVP core exactly as listed — it's the minimum needed to prove the adaptive loop works end-to-end. Add Adaptive Roadmaps and AI Mentor Chat next since they're the features that differentiate this from "ChatGPT wrapper" territory.

---

## 5. Database Design

### Entity list and purpose
- **Users** — identity, auth metadata, subscription tier
- **LearningGoals** — the stated objective ("become backend developer"), decoupled from Users so a user can pursue multiple goals over time
- **LearningPlans** — one generated roadmap instance tied to a goal (versioned — see RoadmapVersions)
- **WeeklyPlans** — the week-level breakdown of a plan
- **Tasks** — individual actionable items within a week (study a topic, build a project, take a quiz)
- **Resources** — links/materials attached to tasks, normalized so the same resource can be reused across plans
- **Progress** — join table tracking completion status/timestamps per task per user
- **QuizResults** — score history, used as the primary adaptation signal
- **Feedback** — free-text or structured user feedback ("I already know this") that triggers re-planning
- **RoadmapVersions** — every re-generation creates a new version, preserving history for analytics and rollback

### Schema (simplified)

```
Users
 ├── id (PK)
 ├── email
 ├── password_hash
 ├── created_at

LearningGoals
 ├── id (PK)
 ├── user_id (FK → Users.id)
 ├── title                 -- "Become a backend developer"
 ├── current_skill_level   -- enum: beginner/intermediate/advanced
 ├── hours_per_week
 ├── created_at

LearningPlans
 ├── id (PK)
 ├── goal_id (FK → LearningGoals.id)
 ├── current_version_id (FK → RoadmapVersions.id)
 ├── status                -- active/completed/abandoned
 ├── created_at

RoadmapVersions
 ├── id (PK)
 ├── plan_id (FK → LearningPlans.id)
 ├── version_number
 ├── raw_llm_output (JSONB)   -- audit trail of exactly what the model returned
 ├── reason_for_regeneration  -- nullable, e.g. "user reported prior knowledge"
 ├── created_at

WeeklyPlans
 ├── id (PK)
 ├── plan_version_id (FK → RoadmapVersions.id)
 ├── week_number
 ├── theme                 -- short label, e.g. "REST APIs & Auth"
 ├── estimated_hours

Tasks
 ├── id (PK)
 ├── weekly_plan_id (FK → WeeklyPlans.id)
 ├── type                  -- topic/project/quiz/milestone
 ├── title
 ├── description
 ├── difficulty
 ├── order_index

Resources
 ├── id (PK)
 ├── task_id (FK → Tasks.id)
 ├── url
 ├── resource_type         -- video/article/course/doc/repo
 ├── source                -- generated vs curated

Progress
 ├── id (PK)
 ├── user_id (FK → Users.id)
 ├── task_id (FK → Tasks.id)
 ├── status                -- not_started/in_progress/completed
 ├── completed_at

QuizResults
 ├── id (PK)
 ├── user_id (FK → Users.id)
 ├── task_id (FK → Tasks.id)  -- quiz-type task
 ├── score
 ├── max_score
 ├── submitted_at

Feedback
 ├── id (PK)
 ├── user_id (FK → Users.id)
 ├── plan_id (FK → LearningPlans.id)
 ├── feedback_type         -- "already_know" / "too_slow" / "too_hard" / "hours_changed"
 ├── content
 ├── created_at
```

**Why versioning matters:** treating each re-plan as an immutable `RoadmapVersion` rather than overwriting the plan in place gives you (a) an audit trail for debugging bad LLM outputs, (b) the ability to show "your plan evolved" analytics, and (c) safe rollback if a regeneration goes wrong.

---

## 6. Backend API Design

| Endpoint | Purpose | Request Body | Response | Key Validation | Possible Errors |
|---|---|---|---|---|---|
| `POST /api/roadmap/generate` | Create a new roadmap from goal inputs | `{ goalTitle, skillLevel, hoursPerWeek }` | `{ planId, versionId, weeks: [...] }` | skillLevel ∈ enum; hoursPerWeek 1–80; goalTitle non-empty, max length | 400 invalid input, 429 rate-limited, 502 LLM failure after retries |
| `GET /api/roadmap/:planId/weekly-plan?week=n` | Fetch a specific week's tasks/resources | — | `{ week, theme, tasks: [...] }` | planId ownership check | 403 not owner, 404 not found |
| `PATCH /api/progress/:taskId` | Update completion status of a task | `{ status }` | `{ taskId, status, updatedAt }` | status ∈ enum | 400 invalid status, 404 task not found |
| `POST /api/quiz/:taskId/submit` | Submit quiz answers/score | `{ answers } or { score, maxScore }` | `{ score, passed, feedbackTriggered }` | score ≤ maxScore | 400 malformed payload |
| `POST /api/feedback` | Submit structured feedback that may trigger re-planning | `{ planId, feedbackType, content }` | `{ regenerationQueued: bool }` | feedbackType ∈ enum | 404 plan not found |
| `GET /api/dashboard` | Aggregate view: current week, streak, overall progress % | — | `{ currentWeek, completionRate, streak, upcomingMilestone }` | auth required | 401 unauthenticated |

**Design principle:** mutation endpoints (`PATCH`, `POST /feedback`) never call the LLM synchronously in the request/response cycle — they enqueue a regeneration job (see Section 14, queues) and return immediately, so the user isn't blocked waiting on an LLM round-trip for a background operation.

---

## 7. AI Workflow

```
User goal + constraints
        │
        ▼
Prompt Builder assembles:
  - System prompt (role, output-format contract, constraints)
  - User context (skill level, hours/week, prior feedback if regenerating)
  - Few-shot example of correctly-shaped JSON
        │
        ▼
LLM call (JSON mode / tool-calling enforced schema)
        │
        ▼
Backend JSON Schema Validator (Zod/Pydantic)
        │
   ┌────┴────┐
   │         │
 valid    invalid
   │         │
   │         ▼
   │   Retry with corrective prompt
   │   ("Your previous output was invalid because X, return valid JSON only")
   │   (max 2 retries, then fallback to a safe default template)
   ▼
Persist to DB as new RoadmapVersion
        │
        ▼
Frontend renders roadmap
```

### Prompt engineering strategy
- **System prompt is a contract, not a suggestion**: explicitly state "Return ONLY valid JSON matching this schema. No prose, no markdown fences."
- **Constrain via structure, not hope**: use the provider's native structured-output / function-calling feature rather than asking nicely — this is the single biggest hallucination-reduction lever available.
- **Inject explicit numeric constraints**: total study hours across all weeks must not exceed `hoursPerWeek × totalWeeks` — state this as a hard rule in the prompt so the model self-checks its own arithmetic before returning.
- **Few-shot anchor**: include one complete, correctly-shaped example week in the prompt so the model pattern-matches structure exactly.

### Why structured JSON output is preferred
Free-text roadmaps are unparseable and unrenderable in a dashboard UI. Structured JSON lets the backend validate, store relationally, diff between versions, and render deterministically — free text would require a second "parse this into structure" LLM call, doubling cost and failure surface.

### Minimizing hallucinations
1. Use JSON-mode/tool-calling (schema enforcement at the API level, not just prompt-level).
2. Server-side schema validation as a hard gate — invalid JSON never reaches the database.
3. Numeric sanity checks post-generation (e.g., sum of weekly hours ≈ input hours/week × weeks; reject and retry if wildly off).
4. Keep resource URLs to a **curated allow-list where possible** rather than trusting the LLM to invent working links (see Section 10).
5. Log every raw LLM response (the `raw_llm_output` JSONB column) so bad outputs are debuggable, not silently swallowed.

---

## 8. JSON Schema (Roadmap Output Contract)

```json
{
  "totalWeeks": 12,
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Programming Fundamentals",
      "estimatedHours": 8,
      "difficulty": "beginner",
      "topics": [
        {
          "title": "Variables, control flow, functions",
          "description": "Core syntax and logic building blocks",
          "estimatedHours": 3
        }
      ],
      "resources": [
        {
          "title": "Python Basics — Official Docs",
          "type": "documentation",
          "url": "https://docs.python.org/3/tutorial/",
          "estimatedMinutes": 90
        }
      ],
      "projects": [
        {
          "title": "Build a CLI calculator",
          "description": "Apply control flow and functions",
          "difficulty": "beginner"
        }
      ],
      "quiz": {
        "questionCount": 5,
        "topicsCovered": ["variables", "loops", "functions"],
        "passingScore": 70
      },
      "milestone": "Comfortable writing basic scripts unaided"
    }
  ]
}
```

**Field explanations:**
- `totalWeeks` — derived from goal complexity ÷ hours/week; used by the frontend to render an overview timeline.
- `theme` — a human-readable week label for the dashboard header.
- `estimatedHours` — used both for display and for the numeric sanity-check described in Section 7.
- `topics` vs `projects` — kept separate because "learn X" and "build X" have different UI treatments (checklist vs. submission).
- `resources[].type` — drives icon/UI treatment and lets you later filter by preferred learning style (video-first learners vs. doc-first learners).
- `quiz` — intentionally metadata-only here; actual questions are generated on-demand when the user starts the quiz (keeps the initial roadmap payload small and avoids generating content the user may never reach if the plan changes).
- `milestone` — the "definition of done" for the week, used to compute completion-rate analytics.

---

## 9. Roadmap Adaptation

| Trigger | System Response |
|---|---|
| "I already know React basics" (feedback) | Backend marks related upcoming tasks as `skip-eligible`, sends a short verification quiz; if passed, those tasks are removed and remaining weeks are compressed/re-sequenced via a targeted regeneration call (only future weeks are regenerated — completed weeks are immutable history) |
| Studies 3 hrs instead of stated 10 | System detects sustained low completion velocity (e.g., 2 consecutive weeks <50% task completion), proposes a **re-pace**: recompute remaining weeks against the *observed* hours/week rather than the originally stated one |
| Fails quizzes repeatedly | Triggers a **reinforcement branch**: insert a remedial mini-week (extra practice resources on the failed topic) before advancing, rather than pushing forward on a weak foundation |
| Finishes early / high quiz scores | System offers to **accelerate**: pull forward next week's content or suggest a stretch/advanced project, keeping engagement high instead of leaving the user idle |

**Core adaptation principle:** never silently regenerate a user's entire plan. Always (a) detect the trigger, (b) explain *why* a change is proposed, and (c) let the user confirm before the new `RoadmapVersion` replaces the active one. This preserves trust and gives you a clean feedback-labeling signal for future model fine-tuning.

---

## 10. Resource Recommendation Strategy

**Hybrid approach — retrieve first, generate as fallback:**

| Source | Role |
|---|---|
| Curated resource database (seeded + admin-reviewed) | Primary source for foundational topics — guarantees working, high-quality links |
| Vector search over curated resources (pgvector) | Finds semantically relevant curated resources for a generated topic even if titles don't match exactly |
| LLM-generated resource *descriptions* (not invented URLs) | Used only when no curated match exists — the LLM describes *what kind* of resource to look for ("official documentation for X"), and a background job resolves it to a real, verified link before showing it to the user |

**Why not let the LLM generate URLs directly?** LLMs are known to hallucinate plausible-looking but broken or nonexistent URLs. Treating URL resolution as a separate, verifiable step (search API + link-check) is the single highest-leverage decision for product trustworthiness — a broken resource link is a fast way to lose user trust in the whole system.

**Resource types supported:** YouTube (via YouTube Data API for verified, currently-available videos), official documentation, curated course platforms (freeCodeCamp, MDN, official framework docs), GitHub repos (verified via GitHub API for star count/last-updated as a quality signal), and practice sites (LeetCode, HackerRank) for skill-specific drills.

---

## 11. Project Folder Structure

```
learning-path-generator/
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI (Dashboard, WeekCard, QuizModal)
│   │   ├── pages/            # Route-level views (Onboarding, Dashboard, Plan)
│   │   ├── hooks/             # useRoadmap, useProgress (React Query hooks)
│   │   ├── store/             # Zustand stores for local UI state
│   │   ├── lib/                # API client, schema types (shared with backend)
│   │   └── styles/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── goals/
│   │   │   ├── roadmap/         # generation, versioning, regeneration logic
│   │   │   ├── progress/
│   │   │   ├── quiz/
│   │   │   └── feedback/
│   │   ├── ai/
│   │   │   ├── promptBuilder.ts
│   │   │   ├── llmClient.ts
│   │   │   ├── schemaValidator.ts
│   │   │   └── retryPolicy.ts
│   │   ├── db/
│   │   │   ├── schema/            # Prisma models
│   │   │   └── migrations/
│   │   ├── queues/                 # background regeneration jobs
│   │   └── common/                 # guards, interceptors, DTOs
│   └── package.json
│
├── shared/
│   └── schemas/                    # Zod schemas used by both FE and BE
│
├── infra/
│   ├── docker-compose.yml
│   ├── terraform/ (optional, for AWS provisioning)
│   └── ci/                          # GitHub Actions workflows
│
└── README.md
```

**Why this structure:** `modules/` in the backend mirrors the domain boundaries from the database design (goals, roadmap, progress, quiz, feedback) so each module owns its own controller/service/repository — this is what lets the system evolve toward microservices later without a rewrite (Section 14). The `shared/schemas` folder is what keeps frontend types and backend validation from drifting apart.

---

## 12. Development Roadmap

| Phase | Scope | Difficulty | Est. Time |
|---|---|---|---|
| Phase 1 | Auth, user profile, DB schema, project scaffolding | Low | 1 week |
| Phase 2 | Goal input form, backend validation, plan/goal persistence (no AI yet — stub roadmap) | Low–Medium | 1 week |
| Phase 3 | LLM integration: prompt builder, schema validation, retry logic, real roadmap generation | High | 2 weeks |
| Phase 4 | Weekly dashboard UI, task/resource rendering, progress tracking (checkboxes → DB) | Medium | 1.5 weeks |
| Phase 5 | Quiz flow (on-demand quiz generation, scoring, QuizResults storage) | Medium | 1 week |
| Phase 6 | Adaptation engine: feedback endpoint, velocity detection, regeneration triggers, versioning | High | 2 weeks |
| Phase 7 | Analytics dashboard, streaks, notifications | Medium | 1.5 weeks |
| Phase 8 | AI Mentor Chat (RAG over user's own plan) | High | 2 weeks |
| Phase 9 | Polish, testing (unit + E2E), deployment, monitoring | Medium | 1.5 weeks |

**Total realistic solo-developer estimate:** ~13–14 weeks for a genuinely production-quality version (not a weekend hackathon clone). Phase 3 and Phase 6 are the highest-risk phases — budget slack time there specifically for prompt-iteration and edge-case handling.

---

## 13. Deployment

```
                     ┌─────────────────────┐
                     │   GitHub Actions     │
                     │  (free CI: lint,     │
                     │   test, build,       │
                     │   migrate)           │
                     └──────────┬───────────┘
                                │ on merge to main
              ┌─────────────────┼─────────────────┐
              ▼                                   ▼
     ┌─────────────────┐                 ┌──────────────────┐
     │ Vercel/Netlify   │                 │  Render/Fly.io     │
     │ (FE) — free tier │                 │  (BE) — free tier  │
     │ auto-deploy      │                 │  auto-deploy       │
     └─────────────────┘                 └─────────┬────────┘
                                                    │
                                    ┌───────────────┼────────────────┐
                                    ▼               ▼                ▼
                          ┌────────────────┐ ┌─────────────┐ ┌──────────────┐
                          │ Supabase/Neon   │ │ Upstash Redis│ │ Gemini/Groq  │
                          │ Postgres (free) │ │ (free tier)  │ │ free API /   │
                          │                 │ │              │ │ local Ollama │
                          └────────────────┘ └─────────────┘ └──────────────┘
```

- **Environment variables/secrets**: stored in the hosting platform's free secret manager (Vercel/Render env var dashboards — no cost), never committed; `.env.example` checked in for onboarding, actual `.env` gitignored.
- **CI/CD**: GitHub Actions (free tier) runs lint + unit tests + type-check on every PR; on merge to `main`, migrations run automatically before the new backend version goes live (migration-then-deploy ordering prevents schema-mismatch errors).
- **Monitoring**: Sentry free Developer tier for error tracking (both FE and BE), with LLM call failures tagged distinctly from regular app errors so you can see AI-specific reliability separately.
- **Logging**: structured JSON logs (pino/winston, both free/open-source) — for a portfolio-scale project, platform-native logs (Render/Fly.io dashboards, both free) are enough; a dedicated log aggregator (paid) is only worth adding once traffic grows.
- **Cold-start note**: free-tier backend hosting (Render/Fly.io) spins services down after idle periods, causing a ~30–60s delay on the first request after inactivity. This is a known, acceptable trade-off for a free/portfolio deployment — mention it in your README/demo so reviewers aren't confused by a slow first load.

---

## 14. Scaling to 100,000 Users

| Concern | Change at Scale |
|---|---|
| **Caching** | Cache identical-input roadmap generations (same goal + skill level + hours combo) in Redis with a TTL — many users will have near-identical initial requests, cutting LLM cost significantly |
| **Queues** | Move all regeneration and quiz-generation calls to a message queue (BullMQ/SQS) — decouples user-facing request latency from LLM latency/rate limits entirely |
| **Microservices** | Split the `ai/` module into its own service once LLM traffic dominates infra load — lets you scale AI workers independently from the core CRUD API |
| **Rate Limiting** | Per-user + global rate limits on `/generate` (expensive) distinct from cheap CRUD endpoints; token-bucket algorithm via Redis |
| **Load Balancers** | Standard horizontal scaling of stateless backend instances behind a load balancer (ALB/Nginx); sessions in Redis, not in-memory, so any instance can serve any request |
| **Database Scaling** | Read replicas for dashboard/analytics queries; connection pooling (PgBouncer); partition `Progress`/`QuizResults` tables by date range once they grow into the hundreds of millions of rows |
| **LLM Cost Optimization** | Use a cheaper/faster model for lightweight tasks (quiz question generation) and reserve the strongest model for full roadmap generation; batch regeneration checks nightly rather than real-time-checking every task completion; cache few-shot prompt prefixes if the provider supports prompt caching |

---

## 15. Future AI Improvements

| Feature | Worth Implementing? | Reasoning |
|---|---|---|
| **RAG over resources** | Yes | Directly improves resource relevance/accuracy — high value, moderate effort |
| **Memory (long-term user context)** | Yes | Lets the Mentor Chat and regenerations reference past struggles/preferences without re-explaining every time — meaningfully improves personalization |
| **AI Tutor (Socratic Q&A)** | Yes, as Phase 2 feature | Natural extension of Mentor Chat; high user-perceived value |
| **Personalized Quiz Generation** | Yes | Already part of MVP design (on-demand generation) — extend to adapt difficulty per-user over time |
| **Knowledge Graph of skills** | Yes, medium priority | Enables smarter prerequisite-checking ("can't learn X without Y") beyond what a flat JSON roadmap can express |
| **Agentic Workflows** (multi-step autonomous planning, e.g., an agent that browses the web to find fresh resources) | Selectively | Valuable for resource-freshness but adds cost/latency/failure surface — implement only after the core loop is rock solid |
| **Voice Assistant** | Low priority | Novel but doesn't address the core problem (planning + adaptation); nice-to-have, not core |
| **Interview Mode / Coding Sandbox** | Yes, if targeting job-seekers specifically | High value for the "become a developer" goal segment, less relevant for general learners |
| **Study Analytics (deep)** | Yes | Cheap to build once Progress/QuizResults exist; strong retention driver |

**Recommendation:** prioritize RAG + Memory + better Quiz personalization before agentic/voice features — they compound the core adaptive-loop value proposition rather than adding surface-level novelty.

---

## 16. Industry Perspective

### How close is this to real AI products?
This architecture is structurally very close to real production systems: **Khan Academy's Khanmigo**, **Duolingo Max**, and **Coursera Coach** all follow the same core pattern — structured LLM output, a relational source of truth, a feedback loop that triggers re-planning, and a RAG-based chat layer. The gap between this design and those products is scale/data (they have millions of learning-interaction data points to fine-tune on) — not architecture.

### Engineering practices professionals actually use here
- Schema-first LLM integration (never trusting raw text output)
- Versioned AI outputs for auditability (exactly what regulated/production AI systems require)
- Separating expensive/slow operations (LLM calls) into async queues rather than blocking request/response cycles
- Treating hallucination-mitigation as an engineering problem (validation, retries, curated fallbacks) rather than a prompting problem alone

### Making this stand out on a resume
- Emphasize the **adaptive feedback loop**, not just "I used an LLM to generate text" — this is the part that shows systems thinking, not just API-calling.
- Document the **JSON schema validation + retry strategy** explicitly — this is exactly what interviewers at AI-focused companies probe on, because it separates "played with the OpenAI API" from "built something production-considered."
- Include the **versioning/audit trail** design decision in your writeup — it signals you think about debuggability and trust, not just happy-path demos.
- Show a **cost-awareness narrative**: caching, model-tiering, queueing — this maps directly to what companies care about once an LLM feature goes from prototype to real traffic.

### Is it internship/FAANG-worthy?
Yes, if built with the rigor described above (schema validation, queuing, versioning, tests, monitoring) rather than as a single Next.js API route calling an LLM. The differentiator for FAANG/serious AI-company interviews is **not** "I generated a roadmap with GPT" — it's demonstrating you understand *why* structured output validation, async processing, and adaptation-triggering logic exist, and that you made deliberate trade-off decisions (documented in a design doc like this one) rather than defaulting to the first tutorial pattern you found.
