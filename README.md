# Calm Table

Calm Table is a full-stack restaurant web application built with Next.js, Django REST Framework, and CI/CD workflows.

## Repository Layout

```text
calm-table/
├── .github/workflows/
├── backend/
├── frontend/
└── README.md
```

## Quick Start

1. Copy env templates:
   - `cp backend/.env.example backend/.env`
   - `cp frontend/.env.example frontend/.env`

### Backend Setup

1. `cd backend`
2. Create and activate a virtual environment:
   - `python -m venv venv`
   - On Windows: `venv\Scripts\activate`
   - On macOS/Linux: `source venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt`
4. Run migrations: `python manage.py migrate`
5. Start server: `python manage.py runserver`

### Frontend Setup

1. `cd frontend`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`

### Access the Application

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/`
- Django admin: `http://localhost:8000/admin/`

Dev admin login:
- Username: `admin@calmtable.mw`
- Email (for staff dashboard login): `admin@calmtable.mw`
- Password: `password123`

## Notes

- Do not commit secrets. Use `.env` files locally and CI/CD secrets in GitHub.
- Admin user is auto-created on startup when `CREATE_SUPERUSER=True` in `backend/.env`.
- Roles:
  - `admin` / staff users can access Django admin and staff dashboard.
  - `customer` users must register/sign in to book tables, checkout cart orders, and submit menu reviews.

- **Homepage Content:** The "Homepage Settings" singleton in Django admin lets staff update all text and images used on the landing page. New fields such as hero background, reservation banner background, about section image and gallery images can be changed by supplying a URL or path.
