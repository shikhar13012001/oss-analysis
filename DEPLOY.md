# Deployment

This repo has two deployable services:

1. Backend worker: Telegram listener + repo analysis pipeline
2. Frontend web app: Next.js website

## Recommended shape

- Deploy the backend as a long-running worker container.
- Deploy the frontend as a web container.
- Use `TELEGRAM_SESSION_STRING` for backend deployment so login does not require an interactive terminal on the server.

## 1. Generate a Telegram session string

Run this once on your local machine:

```powershell
.\venv\Scripts\python.exe -m bot.print_session_string
```

Log in with your Telegram account when prompted. The script prints a long session string.

Put that string into:

```env
TELEGRAM_SESSION_STRING=...
```

For remote deployment, this is preferred over shipping a `.session` file.

## 2. Required environment variables

Backend:

```env
TELEGRAM_CHANNEL_URL=https://t.me/github_repos
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...
TELEGRAM_PHONE=+919555607181
TELEGRAM_SESSION_STRING=...
TELEGRAM_CHANNEL_BACKFILL_LIMIT=10

OLLAMA_API_KEY=...
OLLAMA_HOST=https://ollama.com
OLLAMA_MODEL=gpt-oss:20b

GITHUB_TOKEN=...

SANITY_PROJECT_ID=...
SANITY_DATASET=production
SANITY_API_VERSION=2024-01-01
SANITY_WRITE_TOKEN=...
```

Frontend:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=...
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
SANITY_API_READ_TOKEN=...
```

## 3. Docker Compose deployment

From repo root:

```powershell
docker compose -f docker-compose.prod.yml up --build -d
```

This starts:

- `backend`: `python -m bot.channel_listener`
- `frontend`: Next.js app on `http://localhost:3000`

## 4. Individual container deploys

Backend:

```powershell
docker build -f Dockerfile.backend -t hermes-backend .
docker run -d --name hermes-backend --env-file .env hermes-backend
```

Frontend:

```powershell
docker build ^
  --build-arg NEXT_PUBLIC_SANITY_PROJECT_ID=%NEXT_PUBLIC_SANITY_PROJECT_ID% ^
  --build-arg NEXT_PUBLIC_SANITY_DATASET=%NEXT_PUBLIC_SANITY_DATASET% ^
  --build-arg NEXT_PUBLIC_SANITY_API_VERSION=%NEXT_PUBLIC_SANITY_API_VERSION% ^
  --build-arg SANITY_API_READ_TOKEN=%SANITY_API_READ_TOKEN% ^
  -f website/Dockerfile -t hermes-frontend website

docker run -d --name hermes-frontend -p 3000:3000 --env-file .env hermes-frontend
```

## Notes

- The backend is a worker, not an HTTP API.
- The frontend bakes `NEXT_PUBLIC_*` values at build time, so pass them as Docker build args.
- If you change `NEXT_PUBLIC_*` values, rebuild the frontend container.
