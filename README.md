# Calm Table

Calm Table is a full-stack restaurant web application built with Next.js, Django REST Framework, Docker, and CI/CD workflows.

## Repository Layout

```text
calm-table/
├── .github/workflows/
├── backend/
├── frontend/
├── nginx/
├── docker-compose.yml
├── docker-compose.dev.yml
└── README.md
```

## Quick Start (Docker)

1. Copy env templates:
   - `cp backend/.env.example backend/.env`
   - `cp frontend/.env.example frontend/.env`
2. Build and start services:
   - `docker compose up --build`
3. Access app endpoints:
   - Front door (nginx): `http://localhost`
   - Backend API (proxied): `http://localhost/api/`
   - Frontend (direct): `http://localhost:3000`

## Manual Setup (Without Docker)

### Backend

1. `cd backend`
2. Create and activate a virtualenv.
3. Install dependencies: `pip install -r requirements.txt`
4. Run migrations: `python manage.py migrate`
5. Start server: `python manage.py runserver`

### Frontend

1. `cd frontend`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`

## Notes

- Do not commit secrets. Use `.env` files locally and CI/CD secrets in GitHub.
- Docker and CI configs are scaffolded in STEP 1 and will be fully implemented in subsequent steps.
