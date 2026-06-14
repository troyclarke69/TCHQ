# TCHQ — Freelance Developer Portfolio
* ********************************************************************* *

Minimal, sleek portfolio website with:

- React (TypeScript) + Tailwind CSS frontend
- FastAPI backend (Python)
- Postgres database
- JWT-protected admin API (to manage projects/testimonials)
- Contact form stored in Postgres

Began: 06-02-2026 (Cursor)

* ********************************************************************* *

# Run Project - FULL (Docker)

* cd C:\Users\tclar\TCHQ
  docker compose up --build

* Startup order (Compose handles this):

  Postgres (db) — port 5432                             (* Docker or Neon)
  Backend (backend) — waits on db, port 8000             (* Docker or Fly)
  Frontend (frontend) — waits on backend, port 5173  (* Docker or Netlify)

* ********************************************************************* *

## Local development (Docker Compose)

  ## Use this when you want hot reload without rebuilding images. 

1. Database only
  cd C:\Users\tclar\TCHQ
  docker compose up -d db

2. Backend (FastAPI)
  cd C:\Users\tclar\TCHQ\backend
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
  pip install -r requirements.txt
    $env:DATABASE_URL = "postgresql+asyncpg://postgres:**************@localhost:5432/tchq"
    $env:CORS_ORIGINS = "http://localhost:5173"
    $env:JWT_SECRET = "dev-secret-change-me"
    $env:ADMIN_EMAIL = "admin@example.com"
    $env:ADMIN_PASSWORD = "**************************"
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

-On first start the API creates tables and seeds sample projects/testimonials.

3. Frontend (React + Vite)

In a second terminal:
  cd C:\Users\tclar\TCHQ\frontend
  npm install (if necessary)
  $env:VITE_API_PROXY_TARGET = "http://localhost:8000"
  npm run dev

Vite proxies /api/* to the backend (vite.config.ts).

* ********************************************************************* *

* Service URL:
## Frontend
http://localhost:5173

## Admin dashboard
http://localhost:5173/admin

## Backend - API docs
http://localhost:8000/docs

http://localhost:8000/api/health

Stop: Ctrl+C, then optionally:
docker compose down

* ********************************************************************* *

# Quick checks

## Backend
curl http://localhost:8000/api/health
# Admin login (default creds from compose / .env.example)
curl -X POST http://localhost:8000/api/admin/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@example.com","password":"******************"}'

## Production-style frontend build (optional)
cd C:\Users\tclar\TCHQ\frontend
npm install
npm run build
npm run preview
preview still needs the API reachable (proxy or a deployed backend). For production you’d usually serve the dist/ folder behind nginx and point the API at a real host instead of the Vite dev proxy.

Default admin (dev only): admin@example.com / admin — change via ADMIN_EMAIL / ADMIN_PASSWORD in docker-compose.yml or a .env file copied from .env.example.

## Environment
Compose sets defaults for local dev. If you want to override, copy `.env.example` to `.env` and edit.

* ********************************************************************* *

# QUERY DOCKER DB
Querying Postgres in Docker
Your Compose DB service is db, database tchq, user/password postgres / ********.

  ## Option 1 — psql inside the container (simplest)

cd C:\Users\tclar\TCHQ
docker compose exec db psql -U postgres -d tchq
Then run SQL:

\dt    (-- list tables)
SELECT * FROM contact_messages ORDER BY created_at DESC;
SELECT * FROM projects;
SELECT * FROM testimonials;
\q     (-- quit)

  ## Option 2 — one-liner from PowerShell
docker compose exec db psql -U postgres -d tchq -c "SELECT id, name, email, left(message, 40) AS message, created_at FROM contact_messages ORDER BY created_at DESC;"

Option 3 — GUI on the host (DBeaver, pgAdmin, etc.)
Because port 5432 is published in docker-compose.yml:

Setting	Value
Host
localhost
Port
5432
Database
tchq
User
postgres
Password
P***************

Option 4 — if the container name differs

docker ps
docker exec -it tchq-db-1 psql -U postgres -d tchq
(Use the actual name from docker ps if it isn’t tchq-db-1.)

Your contact rows should be in contact_messages with columns id, name, email, message, created_at.

* ********************************************************************* *

# FLY NOTES

cd backend
fly launch --no-deploy
fly secrets set DATABASE_URL="postgresql://user:pass@host:5432/db" 
ANOTHER_SECRET="value"
fly deploy

* ********************************************************************* *

* LifeDocs:
Gemini convo: "can you connect to a http database from API running in docker"
