// ============================================================
// Road Authority Service
// ------------------------------------------------------------
// Resolves WHO is responsible for a road, given the road name/type
// that geocodingService.reverseGeocode() extracted from Nominatim.
//
// Deterministic 3-tier priority (never guesses silently):
//   1. Explicit mapping   — road_authority_mappings table (road+city
//                            was manually confirmed as NHAI/etc)
//   2. Road metadata       — OSM highway=motorway/trunk AND the road
//                            name itself looks like a national highway
//                            (e.g. "NH-44", "National Highway 47").
//                            A bare "primary" road is NEVER auto-classified
//                            as NHAI — that would be a guess, not a signal.
//   3. Municipal fallback  — always resolves if a city is known.
//
// Contact email lookup: road_authorities table first (lets an admin
// override without redeploying), then NHAI_EMAIL / DEFAULT_MUNICIPAL_EMAIL
// env vars. If neither has a value, the function says so explicitly
// (AUTHORITY_EMAIL_NOT_CONFIGURED) rather than inventing an address.
//
// This is independent of, and does not replace, the existing
// ward-based routing in geoRoutingService.js.
// ============================================================
const db = require('../db');

const NH_NAME_PATTERN = /\bNH[-\s]?\d+\b|national\s+highway/i;
const HIGHWAY_TYPES_STRONG = new Set(['motorway', 'trunk']);

/**
 * @param {{ roadName: string|null, roadType: string|null, city: string|null, state: string|null }} input
 * @returns {Promise<{
 *   roadName: string|null, authorityType: string|null, authorityName: string|null,
 *   authorityEmail: string|null, confidence: 'high'|'medium'|'low'|null,
 *   source: string|null, status: 'ROUTED'|'AUTHORITY_NOT_RESOLVED'|'AUTHORITY_EMAIL_NOT_CONFIGURED'
 * }>}
 */
async function resolveRoadAuthority({ roadName, roadType, city, state } = {}) {
  // Only bail immediately if we have neither a road name NOR a city —
  // there's genuinely nothing to route on. If a city IS known, fall
  // through to Priority 3 (municipal fallback) even when the road
  // itself is unnamed — very common for smaller residential streets
  // in Indian cities, and the doc-comment above always promised this
  // tier "always resolves if a city is known".
  if (!roadName && !city) {
    return {
      roadName: null, authorityType: null, authorityName: null,
      authorityEmail: null, confidence: null, source: null,
      status: 'AUTHORITY_NOT_RESOLVED',
    };
  }

  let authorityType = null;
  let confidence = null;
  let source = null;

  // ── Priority 1: explicit mapping (manually confirmed) ────────
  try {
    const { rows } = await db.query(
      `SELECT authority_type FROM road_authority_mappings
        WHERE active = true AND LOWER(road_name) = LOWER($1)
          AND (city IS NULL OR LOWER(city) = LOWER($2))
        ORDER BY city NULLS LAST
        LIMIT 1`,
      [roadName, city || null]
    );
    if (rows[0]) {
      authorityType = rows[0].authority_type;
      confidence = 'high';
      source = 'explicit_mapping';
    }
  } catch (err) {
    // Table missing / DB hiccup must never break complaint creation —
    // just fall through to the next priority tier.
    console.warn('road_authority_mappings lookup skipped:', err.message);
  }

  // ── Priority 2: road metadata signal (conservative) ──────────
  if (!authorityType && roadType && HIGHWAY_TYPES_STRONG.has(roadType) && NH_NAME_PATTERN.test(roadName)) {
    authorityType = 'NHAI';
    confidence = 'medium';
    source = 'road_metadata_pattern';
  }

  // ── Priority 3: municipal fallback ────────────────────────────
  if (!authorityType) {
    if (!city) {
      // No explicit mapping, no NH signal, and no city to fall back to —
      // there is genuinely nothing to route on.
      return {
        roadName, authorityType: null, authorityName: null,
        authorityEmail: null, confidence: null, source: null,
        status: 'AUTHORITY_NOT_RESOLVED',
      };
    }
    authorityType = 'LOCAL_MUNICIPAL';
    confidence = 'low';
    source = 'municipal_fallback';
  }

  const contact = await resolveAuthorityContact(authorityType, city);

  if (!contact) {
    return {
      roadName, authorityType, authorityName: defaultAuthorityName(authorityType),
      authorityEmail: null, confidence, source,
      status: 'AUTHORITY_EMAIL_NOT_CONFIGURED',
    };
  }

  return {
    roadName,
    authorityType,
    authorityName: contact.authority_name,
    authorityEmail: contact.email,
    confidence,
    source,
    status: 'ROUTED',
  };
}

/**
 * Looks up a contact for an authority type, city-specific row first,
 * then a city-agnostic row (city IS NULL), then env-var fallback.
 * Returns null if nothing is configured anywhere — callers must not
 * treat that as "email sent".
 */
async function resolveAuthorityContact(authorityType, city) {
  try {
    const { rows } = await db.query(
      `SELECT authority_name, email FROM road_authorities
        WHERE active = true AND authority_type = $1
          AND (city IS NULL OR LOWER(city) = LOWER($2))
        ORDER BY city NULLS LAST
        LIMIT 1`,
      [authorityType, city || null]
    );
    if (rows[0]?.email) return rows[0];
  } catch (err) {
    console.warn('road_authorities lookup skipped:', err.message);
  }

  // Env-var fallback — zero-config path for the MVP demo.
  const envEmail = authorityType === 'NHAI'
    ? process.env.NHAI_EMAIL
    : process.env.DEFAULT_MUNICIPAL_EMAIL;

  if (envEmail) {
    return { authority_name: defaultAuthorityName(authorityType), email: envEmail };
  }

  return null;
}

function defaultAuthorityName(authorityType) {
  if (authorityType === 'NHAI') return 'National Highways Authority of India';
  if (authorityType === 'LOCAL_MUNICIPAL') return 'Local Municipal Authority';
  return authorityType;
}

module.exports = { resolveRoadAuthority, resolveAuthorityContact };

// ── Shared helper: reverse-geocode → resolve authority → email ────
// Used by every complaint-creation path (plain, image-verified
// auto-approve, and review-queue approve) so the pothole → NMC/NHAI
// routing behaves identically no matter which path a complaint took
// to get created. Never throws — a routing/email failure must not
// block the complaint itself from being saved.
async function notifyRoadAuthorityIfPothole({ category, latitude, longitude, complaint }) {
  if (category !== 'pothole') {
    console.log(`Road authority notify SKIPPED for complaint #${complaint.id} — category is "${category}", not "pothole".`);
    return { status: 'SKIPPED_NOT_POTHOLE' };
  }
  if (latitude == null || longitude == null) {
    console.log(`Road authority notify SKIPPED for complaint #${complaint.id} — no lat/lng.`);
    return { status: 'SKIPPED_NO_LOCATION' };
  }

  try {
    const { reverseGeocode } = require('./geocodingService');
    const { sendAuthorityComplaintEmail } = require('./emailService');

    const geo = await reverseGeocode(latitude, longitude).catch(() => null);
    console.log(`Road authority geocode for complaint #${complaint.id} @ (${latitude}, ${longitude}):`, geo ? { road: geo.road, roadType: geo.roadType, city: geo.city } : 'null (geocode failed entirely)');
    const routing = await resolveRoadAuthority({
      roadName: geo?.road || null,
      roadType: geo?.roadType || null,
      city:     geo?.city || complaint.city || null,
      state:    geo?.state || null,
    });

    if (routing.status === 'ROUTED' && routing.authorityEmail) {
      await sendAuthorityComplaintEmail({ to: routing.authorityEmail, complaint, routing });
      console.log(`Road authority email sent for complaint #${complaint.id}: ${routing.authorityName} <${routing.authorityEmail}>`);
      return { ...routing, emailSent: true };
    }
    console.log(`Road authority NOT emailed for complaint #${complaint.id} — status: ${routing.status}, road: ${routing.roadName || 'unresolved'}`);
    return { ...routing, emailSent: false };
  } catch (err) {
    console.warn('notifyRoadAuthorityIfPothole failed (non-fatal):', err.message);
    return { status: 'ERROR', emailSent: false };
  }
}

module.exports.notifyRoadAuthorityIfPothole = notifyRoadAuthorityIfPothole;
