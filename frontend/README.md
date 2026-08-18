# Nagar Register — Frontend

A React (Vite) frontend for the civic-platform governance backend. Themed as a
municipal "gazette register" — status stamps, ledger-style lists, and a
navy/turmeric palette — rather than a generic SaaS dashboard.

## Stack

- React 19 + Vite
- react-router-dom v7 (role-based protected routes)
- axios (JWT bearer auth, auto-attached via interceptor)
- react-leaflet + Leaflet (GIS map)
- recharts (analytics charts)
- Plain CSS with design tokens (`src/styles/tokens.css`, `src/styles/global.css`) — no Tailwind/UI kit

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # adjust VITE_API_URL if your backend isn't on localhost:5000
npm run dev            # runs on http://localhost:3000
```

The dev server is pinned to **port 3000** in `vite.config.js` because the
backend's default `ALLOWED_ORIGINS` (see `backend/src/index.js`) is
`http://localhost:3000`. If you change the frontend port, also update
`ALLOWED_ORIGINS` in the backend's `.env`.

Make sure the backend is running (`cd ../backend && npm run dev`, default
port 5000) and that PostgreSQL/PostGIS is migrated per `db/schema.sql` +
`db/migration_005_governance.sql`.

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally on port 3000
```

## What's implemented

**Auth** — register → OTP verify, login → OTP verify, JWT stored in
localStorage, auto-redirect to `/login` on 401.

**Citizen**
- Dashboard (reputation, status breakdown, recent complaints)
- File a complaint (geolocation capture, photo upload, duplicate-detection
  flow with "upvote existing" vs "file anyway")
- My Complaints (status filter tabs)
- Nearby Reports (geolocation-based community feed)
- Bookmarks
- Complaint detail: timeline, comments/confirmations, upvote, bookmark,
  withdraw (while still `reported`), citizen verify (confirm/reopen) and
  feedback rating once resolved

**Officer**
- Workload dashboard (active count, resolved, SLA-met, feedback rating),
  availability toggle
- Leave requests (submit + history)
- Complaint detail: accept → start work → submit for inspection / resolve,
  before/after evidence photo upload with GPS capture

**Admin / Department**
- Governance overview (status/category breakdown, urgent queue, ward hotspots,
  ML service status)
- All Complaints (search + status/category filters)
- Officers directory + create-officer modal
- Leave request review (approve/reject)
- GIS map (Leaflet, priority-coloured markers, ward stats table)
- Analytics (Civic Health Index by ward, department efficiency, hotspots,
  trust score, authenticated CSV export)
- Audit log viewer
- Global search across complaints/citizens/officers/departments
- Complaint detail: assign department → assign/reassign officer, reject

**Shared**
- Notification bell (polls every 30s, mark read / mark all read)
- Toast notifications for every mutating action
- Role-based sidebar navigation and route guards

## Notes / follow-ups

- Officer accounts are created by admin/department staff (`/admin/officers`),
  not self-registered — matches the backend's `officerController.createOfficer`.
- The CSV export button uses an authenticated `axios` blob download (not a
  plain `<a href>`) since the endpoint requires a bearer token.
- `communityApi.nearby` doesn't return `vote_count`, so upvote counts aren't
  shown on the Nearby feed (only on lists that come from `/complaints`).
- A production build + nginx `Dockerfile` is included and wired into the
  root `docker-compose.yml` (`frontend` service, served on port 5173).
