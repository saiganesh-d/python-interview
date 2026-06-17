# Practice Project — "QuickNotes" (Django REST + React + AWS)

A small but **complete full-stack app**: JWT-authenticated Notes API (Django + DRF) and a React (Vite) frontend that consumes it. Built to be your **interview demo + talk track** — small enough to understand every line, complete enough to cover all three pillars.

```
project/
  backend/      Django + DRF + JWT  (the API)
  frontend/     React + Vite        (the UI)
  ARCHITECTURE.md   <- your talk track (READ THIS)
  DEPLOY-AWS.md     <- how this maps onto AWS
```

## What it demonstrates (talking points)
- **Backend:** Django models, DRF serializers + viewsets, JWT auth, per-user data isolation, pagination, search.
- **Frontend:** React hooks (`useState`/`useEffect`), data fetching with loading/error states, controlled forms, auth token handling.
- **AWS:** how each piece maps to S3/CloudFront, ALB, EC2/ECS, RDS, IAM (see `DEPLOY-AWS.md`).

---

## Run the backend (Python 3.10+)
```bash
cd backend
python -m venv venv
# Windows PowerShell:
venv\Scripts\Activate.ps1
# (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
python manage.py makemigrations notes
python manage.py migrate
python manage.py createsuperuser        # make a login
python manage.py runserver               # http://127.0.0.1:8000
```

Try the API:
- `POST http://127.0.0.1:8000/api/token/` with `{"username","password"}` → returns `access` + `refresh` tokens.
- `GET http://127.0.0.1:8000/api/notes/` with header `Authorization: Bearer <access>` → your notes.
- Admin UI: `http://127.0.0.1:8000/admin/`

## Run the frontend (Node 18+)
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```
Log in with the superuser you created; create/list/delete notes.

## If you only have time to do ONE thing
Read [`ARCHITECTURE.md`](./ARCHITECTURE.md), get the backend running, hit the API once, and rehearse the 90-second pitch. That alone makes you able to talk credibly about a full-stack app you built.
