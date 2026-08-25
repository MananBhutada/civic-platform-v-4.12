-- ============================================================
-- Seed: road authorities (for pothole routing)
-- ------------------------------------------------------------
-- roadAuthorityService.js resolves every pothole complaint's road to
-- an authority_type ('NHAI' for national highways, 'LOCAL_MUNICIPAL'
-- for everything else), then looks up a contact here. Without a row,
-- it silently falls back to the NHAI_EMAIL / DEFAULT_MUNICIPAL_EMAIL
-- env vars and a generic name ("Local Municipal Authority") — this
-- file gives the municipal fallback an actual name: NMC.
--
-- Run once:  psql civic_platform -f db/seed_road_authorities.sql
-- Safe to re-run — ON CONFLICT skips rows that already exist.
-- ============================================================

INSERT INTO road_authorities (authority_type, authority_name, email, city)
VALUES
  ('LOCAL_MUNICIPAL', 'NMC', 'civicissuereportingplatform@gmail.com', NULL),
  ('NHAI',             'National Highways Authority of India', 'aashikohad05@gmail.com', NULL)
ON CONFLICT (authority_type, city) DO NOTHING;
