-- ============================================================
-- Seed: default departments
-- ------------------------------------------------------------
-- The complaint auto-routing logic (complaintsController.js /
-- imageVerificationController.js) matches a complaint's predicted
-- category against departments.categories, and its ward_id against
-- departments.ward_id (NULL = handles every ward as a fallback).
--
-- Without at least one row per category, assigned_department_id stays
-- NULL forever and "concerned department" never appears anywhere in
-- the app. Run this once against your database:
--   psql civic_platform -f db/seed_departments.sql
-- Safe to re-run — it skips rows that already exist by name.
-- ============================================================

-- Rename already-seeded 'Roads & Potholes Department' to NMC (safe if it
-- doesn't exist — affects 0 rows). Run this before the INSERT below so a
-- second run of this file doesn't create a duplicate NMC row.
UPDATE departments
   SET name = 'NMC', categories = ARRAY['pothole']
 WHERE name = 'Roads & Potholes Department';

INSERT INTO departments (name, contact_email, categories, ward_id)
SELECT * FROM (VALUES
  ('NMC',                               'nmc@civic.gov.in',        ARRAY['pothole'],          NULL::INT),
  ('Sanitation Department',            'sanitation@civic.gov.in', ARRAY['garbage','illegal_dumping'], NULL::INT),
  ('Electrical Department',            'electrical@civic.gov.in', ARRAY['streetlight'],      NULL::INT),
  ('Water Supply Department',          'water@civic.gov.in',      ARRAY['water_leakage'],    NULL::INT),
  ('Drainage & Sewerage Department',   'drainage@civic.gov.in',   ARRAY['drainage'],          NULL::INT),
  ('General Civic Grievance Cell',     'grievance@civic.gov.in',  NULL::TEXT[],                NULL::INT)
) AS v(name, contact_email, categories, ward_id)
WHERE NOT EXISTS (
  SELECT 1 FROM departments d WHERE d.name = v.name
);
