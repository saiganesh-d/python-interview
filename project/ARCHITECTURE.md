# QuickNotes — Architecture & Talk Track

> Read this until you can say it without looking. This is what turns "I built a small app" into a confident full-stack story.

## The 90-second pitch (rehearse out loud)
> "QuickNotes is a full-stack notes app. The frontend is a React SPA built with Vite — it uses hooks for state and data fetching, and talks to a REST API. The backend is Django with Django REST Framework, exposing a JWT-authenticated `/api/notes/` endpoint. Each note belongs to a user, and the API filters every query by the authenticated user so people only ever see their own data. Locally it runs on SQLite; in production I'd point it at Postgres on RDS. For deployment, the React build is static files served from S3 behind CloudFront, and the Django API runs in containers behind an Application Load Balancer, with secrets injected via IAM roles. I kept it a monolith deliberately — it's the right call until there's a real bottleneck to justify splitting it."

## Request flow (be able to trace one request)
1. User submits the login form → React `POST /api/token/` with username/password.
2. Django (simplejwt) verifies credentials → returns a signed **access** + **refresh** token.
3. React stores the access token and sends `Authorization: Bearer <token>` on every API call.
4. `GET /api/notes/` → DRF `JWTAuthentication` validates the token (no DB session lookup — stateless).
5. `NoteViewSet.get_queryset()` filters `Note.objects.filter(owner=request.user)` → user isolation.
6. Serializer turns the queryset into JSON → paginated response → React renders the list.

## Key design decisions (and the trade-offs) — interviewers LOVE these
| Decision | Why | Trade-off / what I'd change |
|---|---|---|
| **JWT auth** (not sessions) | Stateless → scales horizontally, no shared session store | Harder to revoke tokens; mitigate with short access-token TTL + refresh |
| **ModelViewSet + Router** | Full CRUD with minimal code, consistent URLs | Less explicit than hand-written views; fine for standard CRUD |
| **Filter by `request.user` in `get_queryset`** | Security: per-user data isolation enforced server-side | Must remember it on every view; could centralize via a base class |
| **`owner` read-only in serializer** | Client can't forge another user's note | — |
| **SQLite local / Postgres prod** | Zero-setup dev; managed, robust prod DB (RDS) | Behaviour differences (e.g., constraints) — test against Postgres before release |
| **Monolith** | Fast to build & reason about for this scale | Would extract services only when a real scaling/ownership need appears |
| **Token in localStorage** | Simple for a demo | XSS-exposed; production prefers httpOnly cookies — I'd switch for real auth |

## Where each pillar shows up (point at the file)
- **Python/Django:** `notes/models.py`, `serializers.py`, `views.py` — ORM, validation, viewsets, the N+1-safe query pattern.
- **React:** `frontend/src/App.jsx` — `useState`, `useEffect` (with cleanup guard), controlled forms, list keys, loading/error states.
- **AWS:** `DEPLOY-AWS.md` — the full production topology.

## Likely follow-up questions (have answers ready)
- *"How would you handle token refresh?"* → Intercept 401s, call `/api/token/refresh/` with the refresh token, retry the request; if refresh fails, log out.
- *"How would you prevent the N+1 problem if a note had comments?"* → `prefetch_related('comments')` on the queryset.
- *"How would you scale this to 1M users?"* → Stateless API + Auto Scaling behind ALB, RDS read replicas, Redis cache for hot reads, CloudFront for the SPA, move search to Elasticsearch.
- *"How do you test it?"* → DRF `APITestCase`: test auth required, user isolation (user A can't see user B's notes), CRUD happy paths, validation errors.
- *"What about security?"* → JWT, server-side ownership filtering, `DEBUG=False`, secrets in env/Secrets Manager, HTTPS via ALB/CloudFront, CORS allow-list, ORM (no SQL injection).
