# MVP Setup — Road Identification & Authority Routing

This document covers ONLY what's needed to run and demo the MVP flow:

```
citizen submits complaint (lat/lng)
  -> reverse geocode -> road name + road type
  -> road authority classification (NHAI vs local/municipal)
  -> authority contact email lookup
  -> complaint persisted
  -> email sent to the authority
  -> API response reports what happened at each step
```

Every other feature in this repo (image verification, ML classification,
ward/PostGIS routing, SLA escalation, BullMQ/Redis, Socket.IO, audit logs,
governance analytics, etc.) is untouched and still works as before — this
flow was added alongside it, not instead of it.

## 1. Required environment variables

Copy `backend/.env.example` to `backend/.env` and fill in at least:

```
DATABASE_URL=postgresql://user:pass@host:5432/civic_platform
JWT_SECRET=<any long random string>
EMAIL_MODE=console        # <- use this for the demo, see below
```

For the road-authority flow specifically:

```
NHAI_EMAIL=                  # contact email for NHAI-classified complaints
DEFAULT_MUNICIPAL_EMAIL=     # contact email used when no city-specific
                              # entry exists in road_authorities
```

Both are optional. If left blank, the system does NOT invent an address —
routing will report `AUTHORITY_EMAIL_NOT_CONFIGURED` instead of pretending
an email was sent. This is intentional (see "Assumptions" below).

Everything else in `.env.example` (Cloudinary, Redis, ML service URL,
Google OAuth) is optional for this specific flow — the app degrades
gracefully if any of them are missing or unreachable.

## 2. Database setup

```bash
createdb civic_platform            # if it doesn't exist yet
psql civic_platform -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql civic_platform -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql civic_platform -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

DATABASE_URL=postgresql://user:pass@host:5432/civic_platform \
  bash db/migrate.sh
```

**This fixes a real bug**: `npm run db:migrate` previously ran only
`schema.sql` and silently skipped every `migration_*.sql` file, including
the new road-authority migration. `db/migrate.sh` now applies `schema.sql`
then every `migration_NNN_*.sql` in order.

It's genuinely re-run-safe — this was verified against a real
PostgreSQL/PostGIS instance, not just read: the first version of this
script re-ran `schema.sql` unconditionally, which failed with
`relation "users" already exists` on a second run, since (unlike every
`migration_*.sql` file) `schema.sql`'s `CREATE TABLE` statements have no
`IF NOT EXISTS` guard. The script now checks whether the base schema is
already applied and skips straight to the migrations if so — confirmed by
actually running `db/migrate.sh` twice in a row against a live database.

`npm run db:migrate` (from `backend/`) now calls this script.

### (Optional) seed an example NHAI mapping for the demo

The `road_authority_mappings` table starts empty — nothing is pre-classified
as NHAI out of the box, on purpose (see "Assumptions"). To make a specific
road resolve to NHAI for a demo:

```sql
INSERT INTO road_authority_mappings (road_name, city, authority_type)
VALUES ('Wardha Road', 'Nagpur', 'NHAI');
```

Any complaint whose reverse-geocoded road matches `Wardha Road` in `Nagpur`
(case-insensitive) will now route to NHAI. Everything else falls back to
`LOCAL_MUNICIPAL`.

## 3. Start the backend

```bash
cd backend
npm install
npm start          # or: npm run dev
```

You should see:
```
✅  Civic Platform API running on http://localhost:5000
🔌  Socket.IO attached on the same port
📖  Swagger docs at http://localhost:5000/api-docs
```

Check it's alive: `curl http://localhost:5000/health`

## 4. Run tests

```bash
cd backend
npm test
```

This runs all three suites, including the new one:
- `tests/complaint.test.js` — image-verification pipeline (pre-existing)
- `tests/geoRouting.test.js` — ward/PostGIS routing (pre-existing)
- `tests/roadAuthority.test.js` — **new**: road resolution, NHAI routing,
  municipal routing, authority email dispatch, and failure handling
  (missing email / email send failure / routing service error — none of
  these crash complaint creation).

## 5. Demonstrate the road-routing flow

1. Register/log in as a citizen (existing auth flow, unchanged).
2. `POST /api/complaints` with a real lat/lng, e.g.:

   ```json
   {
     "title": "Pothole near Wardha Road",
     "description": "Large pothole causing traffic issues",
     "latitude": 21.1245,
     "longitude": 79.0575
   }
   ```

3. The response now includes a `routing` and `notification` block:

   ```json
   {
     "is_duplicate": false,
     "complaint": { "id": "...", "title": "...", "...": "..." },
     "ml": { "...": "..." },
     "routing": {
       "road_name": "Wardha Road",
       "authority_type": "NHAI",
       "authority_name": "National Highways Authority of India",
       "authority_email": "nhai@example.gov.in",
       "confidence": "high",
       "source": "explicit_mapping",
       "status": "ROUTED"
     },
     "notification": { "email_sent": true }
   }
   ```

4. With `EMAIL_MODE=console`, the email is printed to the backend's stdout
   instead of actually being sent — you'll see the full subject/recipient/
   body logged right there, which is enough to demo the flow without real
   SMTP credentials. Set `EMAIL_MODE=smtp` + `EMAIL_USER`/`EMAIL_PASS` to
   send for real.

5. Try a coordinate with no NHAI mapping — you'll get
   `authority_type: "LOCAL_MUNICIPAL"`. Try one with no `DEFAULT_MUNICIPAL_EMAIL`
   configured — you'll get `status: "AUTHORITY_EMAIL_NOT_CONFIGURED"` and
   `email_sent: false`, and the complaint is still created either way.

## 6. Files changed

| File | Change |
|---|---|
| `db/migration_007_road_authority.sql` | **New.** Adds `road_*` columns to `complaints`, plus `road_authorities` (contacts) and `road_authority_mappings` (explicit road→authority) tables. |
| `db/migrate.sh` | **New.** Deterministic migration runner (schema.sql + all migration_*.sql). |
| `backend/src/services/roadAuthorityService.js` | **New.** 3-tier priority resolver: explicit mapping → road metadata pattern → municipal fallback. Never guesses NHAI from road type alone. |
| `backend/src/services/geocodingService.js` | Extended `reverseGeocode()` to also return `road` and `roadType` from Nominatim's `address.road`/`address.highway` fields. Existing fields (`address`, `city`, `ward`, `state`, `postcode`) unchanged. |
| `backend/src/services/emailService.js` | Added `sendAuthorityComplaintEmail()`. Existing email functions unchanged. |
| `backend/src/controllers/complaintsController.js` | `createComplaint()`: now always reverse-geocodes (previously skipped if address/city were already supplied), resolves road authority, stores routing result on the complaint, sends the authority email (awaited, failure-tolerant), and returns `routing`/`notification` in the response. Existing response fields (`is_duplicate`, `complaint`, `ml`) unchanged. |
| `backend/package.json` | `db:migrate` now runs `db/migrate.sh` instead of only `schema.sql`. |
| `backend/.env.example` | **New** (none existed in this repo). Documents every env var the app reads, including `NHAI_EMAIL` / `DEFAULT_MUNICIPAL_EMAIL`. |
| `backend/tests/roadAuthority.test.js` | **New.** Covers all 5 required test scenarios. |

**Merged in afterward, alongside the existing frontend** (see root `README.md`):

| File | Change |
|---|---|
| `frontend/` | **New to this backend** — the full citizen/officer/admin React app, merged in unchanged from a separate build. Talks to this backend as-is; `NewComplaint.jsx` only reads `is_duplicate`/`complaint`/image-verification fields from `POST /complaints`, so the additive `routing`/`notification` fields don't affect it. |
| `db/migrate.sh` | **Bug fix.** Was not actually re-run-safe — see §2 above. Now checks whether the base schema is already applied before running `schema.sql`. |
| `docker-compose.yml` | **Bug fix.** The `postgres` service previously bind-mounted `./db` into `/docker-entrypoint-initdb.d`, which Postgres processes alphabetically — `migration_001_*.sql` would run before `schema.sql` on a fresh container and fail. Replaced with a one-off `migrate` service that runs the tested `db/migrate.sh` instead. Also wired `backend`/`sla-worker` to wait for `migrate` to finish, and exposed `NHAI_EMAIL`/`DEFAULT_MUNICIPAL_EMAIL` on the `backend` service. |
| `backend/src/config/passport.js`, `backend/src/db/index.js` | Minor robustness fixes carried over from this backend's development: Google OAuth strategy registration is now skipped (not crash-on-boot) when credentials aren't configured, and DB SSL is controlled by an explicit `DATABASE_SSL` env var instead of being inferred from `NODE_ENV`. |
| `README.md` (root) | Rewritten to cover the full stack (frontend + backend + ML service) with both Docker and manual setup paths — the previous root README only covered backend/ML-service. |

Nothing else was touched — ward/PostGIS routing, image verification,
ML service, Redis/BullMQ, Socket.IO, Swagger, auth, and every other
controller/service/route are byte-for-byte as they were.

## 7. Assumptions made about road-authority classification

This is deliberately conservative — the goal is a demoable, honest MVP,
not a claim that road ownership in India is fully known:

- **No road is auto-classified as NHAI from road type alone.** OSM's
  `highway=primary` is extremely common for ordinary city roads and is
  NOT treated as an NHAI signal. Only `motorway`/`trunk` **combined with**
  a name that looks like a national highway (`NH-44`, `National Highway 47`,
  etc.) is treated as a medium-confidence NHAI signal.
- **The only high-confidence NHAI classification is an explicit, manually
  entered mapping** in `road_authority_mappings`. This table starts empty.
- **Everything else falls back to `LOCAL_MUNICIPAL`** once a city is known.
  If no city can be determined at all, routing honestly reports
  `AUTHORITY_NOT_RESOLVED` rather than guessing.
- **No email address is ever fabricated.** If neither the `road_authorities`
  table nor the relevant environment variable has a configured email, the
  API reports `AUTHORITY_EMAIL_NOT_CONFIGURED` and `email_sent: false` —
  the complaint is still created either way.
- Reverse geocoding is done via the free OpenStreetMap Nominatim API
  (already used elsewhere in this project) — it's rate-limited and not
  always accurate for road names in every region, which is why every
  failure path degrades gracefully instead of blocking complaint creation.
