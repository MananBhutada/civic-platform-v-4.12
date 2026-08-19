# Civic Issue Platform — "Nagar Register"

A localized, AI-assisted civic complaint management system: citizens report
issues with GPS + a photo, the backend classifies and routes them (by ward
*and* by road authority), officers work them through a full lifecycle, and
admins get governance analytics on top.

```
civic-platform/
├── frontend/     ← React 19 + Vite citizen/officer/admin app ("Nagar Register")
├── backend/      ← Node.js + Express API (PostgreSQL + PostGIS)
├── ml-service/   ← Python FastAPI classification/trust-scoring service
├── db/           ← Schema + migrations + migrate.sh (deterministic DB setup)
├── docker-compose.yml
└── MVP_SETUP.md  ← Deep-dive on the road-authority routing flow specifically
```

## What's implemented

- **Auth**: register/login with OTP verification, JWT, optional Google OAuth.
- **Complaint filing**: geolocation + photo, duplicate detection (ML +
  rule-based fallback), automatic category/priority/severity scoring.
- **Routing — two independent, complementary layers**:
  - *Ward routing* (PostGIS polygon containment) → department/officer email.
  - *Road-authority routing* (new): reverse-geocodes the road name, classifies
    it as **NHAI** (national highway) or **local/municipal**, looks up a
    configured contact, and emails that authority. See `MVP_SETUP.md` for the
    full design and the honesty guarantees (it never fabricates a government
    email — see "Assumptions" there).
- **Image verification pipeline**: Cloudinary upload → ML trust scoring →
  auto-approve / manual review queue / reject, independent of the plain
  complaint flow.
- **Full complaint lifecycle**: assign → accept → start work → inspection →
  resolve → citizen verification, with SLA deadlines, auto-escalation
  (BullMQ/Redis worker), and an append-only audit log.
- **Officer & admin tooling**: workload/performance views, leave requests,
  GIS map + heatmap, Civic Health Index, department efficiency, hotspots,
  global search, CSV export.
- **Frontend**: role-based routing for citizen/officer/admin, Leaflet map,
  Recharts analytics, Socket.IO live updates, toast notifications. See
  `frontend/README.md` for the full feature list.

Everything above works independently — the road-authority flow doesn't
require ML/Redis/Cloudinary to be up, and vice versa. See `MVP_SETUP.md` §7
for the specific degradation guarantees.

## Quick start — Docker Compose (recommended)

```bash
docker compose up -d
```

This builds and starts, in order: `postgres` → `migrate` (applies the full
schema, one-shot) → `redis` / `ml-service` → `backend` / `sla-worker` →
`frontend`.

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api — health check at
  http://localhost:5000/health
- Swagger docs: http://localhost:5000/api-docs
- ML service: http://localhost:8000

Email defaults to `EMAIL_MODE=console` — emails print to
`docker compose logs backend` instead of requiring real SMTP credentials.
To see the road-authority feature actually resolve to `NHAI`/email
addresses, set `NHAI_EMAIL` / `DEFAULT_MUNICIPAL_EMAIL` in the `backend`
service's environment block in `docker-compose.yml` (or an `.env` file)
before starting.

**Re-running `docker compose up`** on an existing setup is safe — `migrate`
re-applies cleanly (every migration is idempotent) and the other services
just restart against the existing data.

## Quick start — running services manually (no Docker)

Useful for active development, or if Docker isn't available.

### 1. Database

```bash
createdb civic_platform
psql civic_platform -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql civic_platform -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql civic_platform -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

DATABASE_URL=postgresql://user:pass@localhost:5432/civic_platform bash db/migrate.sh
```

`db/migrate.sh` applies `schema.sql` then every `migration_*.sql` in order,
and is safe to re-run (it detects an already-applied base schema and skips
straight to the migrations).

### 2. Backend

```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL at minimum; everything
                           # else has a documented default or degrades
                           # gracefully if left blank — see the comments
                           # in .env.example
npm install
npm run dev                # http://localhost:5000
```

### 3. ML service (optional — the core complaint/routing flow works without it)

```bash
cd ml-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend
cp .env.example .env       # points at http://localhost:5000/api by default
npm install
npm run dev                 # http://localhost:3000
```

## Running tests

```bash
cd backend
npm test
```

Runs three suites (`complaint.test.js`, `geoRouting.test.js`,
`roadAuthority.test.js`) — 24 tests, all mocked (no live DB/network needed).

## Demonstrating the road-authority routing flow

See `MVP_SETUP.md` for the full walkthrough, including the exact request/
response shape and how to seed a demo NHAI mapping. Short version:

1. Register/log in as a citizen.
2. `POST /api/complaints` with a real `latitude`/`longitude` (or use the
   "File a complaint" form in the frontend, which captures GPS automatically).
3. The response includes a `routing` block: road name, `authority_type`
   (`NHAI` / `LOCAL_MUNICIPAL`), resolved contact email, and a `status`
   (`ROUTED` / `AUTHORITY_EMAIL_NOT_CONFIGURED` / `AUTHORITY_NOT_RESOLVED`).
4. With `EMAIL_MODE=console`, watch the backend logs — the full authority
   email (subject, recipient, body) prints there.

## Notes on what's been verified

The road-authority routing code (`backend/src/services/roadAuthorityService.js`,
`geocodingService.js`, `emailService.js`, and the `complaintsController.js`
integration) has been run — not just unit-tested — against a real
PostgreSQL + PostGIS instance: migrations applied cleanly, a real citizen
registered and filed a real complaint through a real running server, and
all classification paths (explicit NHAI mapping, municipal fallback, the
"don't guess NHAI from road type alone" rule, no-config handling) were
exercised directly against that database. `db/migrate.sh` was also
confirmed to be safely re-runnable, which an earlier version was not.

What hasn't been exercised in this environment: a real Nominatim reverse-
geocode call (network-restricted in the environment this was verified in)
and real SMTP delivery. Both paths fail gracefully by design — reverse-geocode
failure just means `road_name` comes back `null` and routing falls through to
`AUTHORITY_NOT_RESOLVED` rather than crashing complaint creation — but you
should expect to see that specific fallback the first time you try it live,
rather than an NHAI/municipal classification, until Nominatim is reachable
from wherever you deploy this.

## Deployment (student-project stack)

- **Frontend**: Vercel / Netlify (or the included `frontend/Dockerfile` + any
  static host / nginx).
- **Backend**: Render / Railway (set `DATABASE_URL` + the env vars in
  `backend/.env.example`).
- **ML service**: Render (separate service), or omit — the core flow
  degrades gracefully without it.
- **Database**: Supabase or Render PostgreSQL (PostGIS enabled).
- **Images**: Cloudinary (free tier) — optional, only needed for photo uploads.



---------------------------------------------------------------------------------------------------------------------------------------------------------------
Multiple unit test done. Initially set of 82 tests were performed!
