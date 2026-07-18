# Backend Deployment — Back4app Container-as-a-Service

This document covers deploying the FastAPI backend on Back4app's free-tier
Container-as-a-Service. The frontend (Vercel) and database (Supabase) are
assumed to already be running.

---

## Prerequisites

- A GitHub repository containing this code (public or private — Back4app
  supports both)
- A Supabase PostgreSQL database (free tier) — you already have the
  `CONNECTION_STRING`
- A Groq API key — https://console.groq.com
- An OpenRouter API key — https://openrouter.ai/keys
- Your Vercel frontend URL (e.g. `https://your-app.vercel.app`)

---

## Environment Variables

Set these in the Back4app dashboard under **Environment Variables** (never
commit them to the repo):

| Variable | Required | Description |
|---|---|---|
| `CONNECTION_STRING` | Yes | Full PostgreSQL connection string from Supabase (Project Settings → Database) |
| `JWT_SECRET` | Yes | Random secret string for signing JWT tokens |
| `JWT_ALGORITHM` | No | Default: `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Default: `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | Default: `7` |
| `GROQ_API_KEY` | Yes | API key from https://console.groq.com |
| `GROQ_MODEL` | No | Default: `llama-3.3-70b-versatile` |
| `OPENROUTER_API_KEY` | Yes | API key from https://openrouter.ai/keys |
| `OPENROUTER_MODEL` | No | Default: `openai/gpt-4o-mini` |
| `CORS_ORIGINS` | Yes | **Your Vercel frontend URL** — e.g. `https://your-app.vercel.app` (comma-separated if multiple) |

---

## Deployment Steps

### 1. Push to GitHub

```bash
git add .
git commit -m "Add Dockerfile for Back4app deployment"
git push
```

### 2. Create the Back4app Container

1. Log in to https://www.back4app.com/container
2. Click **Create New App** → **Container as a Service**
3. Connect your GitHub repository
4. **Root Directory**: leave blank (the Dockerfile is at repo root)
5. **Branch**: `main` (or your deployment branch)
6. **Plan**: Free (256MB RAM, 600 active hours/month)
7. Click **Create**

Back4app will detect the `Dockerfile`, build the image, and deploy it.

### 3. Set Environment Variables

After the first deploy attempt (it will fail because env vars aren't set yet):

1. Go to your app's dashboard → **Environment Variables**
2. Add every variable from the table above
3. Back4app will automatically redeploy

### 4. Update CORS

Once the backend is deployed, you'll get a URL like
`https://my-app.back4app.io`. Make sure the frontend's `VITE_API_URL` env var
on Vercel points to this URL.

Also verify that `CORS_ORIGINS` on Back4app includes your Vercel frontend URL.

---

## Health Check

The app exposes `GET /health` returning `{"status": "ok"}`. The Dockerfile
includes a `HEALTHCHECK` instruction that pings this endpoint every 30 seconds.

---

## Notes

- **Cold starts**: Back4app's free tier may spin down after inactivity. The
  first request after idle may take a few seconds.
- **Logs**: View real-time logs in Back4app dashboard → **Logs** tab.
- **Redeploy**: After pushing new code to GitHub, trigger a redeploy from the
  Back4app dashboard → **Build & Deploy** → **Deploy**.
- **Database migrations**: Tables are auto-created on startup via
  `Base.metadata.create_all()`. No manual migration step needed.