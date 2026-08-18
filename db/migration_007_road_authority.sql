-- ============================================================
-- Migration 007 — Road Identification & Road Authority Routing
-- ------------------------------------------------------------
-- MVP requirement: given a complaint's lat/lng, resolve the road
-- it's on and the authority (NHAI vs local/municipal) responsible
-- for it, then route the complaint email to that authority.
--
-- Purely additive: new nullable columns + two small config tables.
-- Nothing in schema.sql or migrations 001-006 is touched. Existing
-- ward-based routing (wards table, geoRoutingService.js) is left
-- completely alone and continues to work as-is; this is a parallel,
-- independent routing signal stored alongside it on `complaints`.
-- ============================================================

-- ── 1. Road/authority routing result, stored on the complaint ──
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS road_name              VARCHAR(200);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS road_type              VARCHAR(50);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS road_authority_type    VARCHAR(30);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS road_authority_name    VARCHAR(200);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS road_authority_email   VARCHAR(150);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS road_authority_source  VARCHAR(50);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS road_routing_status    VARCHAR(40);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS road_authority_email_sent BOOLEAN DEFAULT false;

-- ── 2. Authority contacts — who to email for each authority type ──
-- Kept intentionally tiny for the MVP: one row per authority type
-- (optionally scoped to a city). This table starts EMPTY. It is
-- OPTIONAL — roadAuthorityService.js checks this table first (so an
-- admin can configure/override contacts without a redeploy), and
-- falls back to NHAI_EMAIL / DEFAULT_MUNICIPAL_EMAIL env vars if no
-- matching row exists. No real or fake government email is ever
-- hardcoded into a SQL file.
CREATE TABLE IF NOT EXISTS road_authorities (
    id              SERIAL PRIMARY KEY,
    authority_type  VARCHAR(30)   NOT NULL,   -- 'NHAI' | 'LOCAL_MUNICIPAL' | ...
    authority_name  VARCHAR(200)  NOT NULL,
    email           VARCHAR(150),             -- NULL = not configured yet
    city            VARCHAR(100),             -- NULL = applies to all cities (e.g. NHAI is national)
    state           VARCHAR(100),
    active          BOOLEAN       DEFAULT true,
    created_at      TIMESTAMPTZ   DEFAULT NOW(),
    UNIQUE (authority_type, city)
);

-- ── 3. Explicit road -> authority mapping (Priority 1 signal) ──
-- Lets a demo/deployment declare "Wardha Road in Nagpur is NHAI"
-- without guessing from OSM tags. Empty by default; add rows as
-- known roads are confirmed. Matching is case-insensitive exact
-- match on (road_name, city) — see roadAuthorityService.js.
CREATE TABLE IF NOT EXISTS road_authority_mappings (
    id              SERIAL PRIMARY KEY,
    road_name       VARCHAR(200)  NOT NULL,
    city            VARCHAR(100),
    authority_type  VARCHAR(30)   NOT NULL,
    active          BOOLEAN       DEFAULT true,
    created_at      TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_road_mapping_lookup ON road_authority_mappings (LOWER(road_name), city);
