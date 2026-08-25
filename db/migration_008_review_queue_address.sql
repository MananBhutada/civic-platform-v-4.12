-- ============================================================
-- Migration 008 — Landmark/address on review_queue
-- ------------------------------------------------------------
-- complaints.address already existed, but review_queue (the manual
-- review path — trust score 60-79) never had it, so a landmark/address
-- captured at submission time had nowhere to be carried through to the
-- eventual complaint record once an admin approved it.
-- Purely additive, safe to run multiple times.
-- ============================================================
ALTER TABLE review_queue ADD COLUMN IF NOT EXISTS address TEXT;
