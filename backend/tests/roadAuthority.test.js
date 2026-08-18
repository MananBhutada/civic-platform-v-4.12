// Run with: npm test (jest), from backend/
// Covers the MVP road -> authority -> email routing flow end to end
// without a live Postgres, live Nominatim, or live SMTP.

// ── Test 1: road resolution (geocodingService) ────────────────
describe('geocodingService — road resolution', () => {
  jest.mock('axios');
  const axios = require('axios');
  const { reverseGeocode } = require('../src/services/geocodingService');

  afterEach(() => jest.clearAllMocks());

  test('extracts road name and road type from Nominatim address fields', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        display_name: '123, Wardha Road, Dharampeth, Nagpur, Maharashtra, 440010, India',
        address: {
          road: 'Wardha Road',
          highway: 'trunk',
          suburb: 'Dharampeth',
          city: 'Nagpur',
          state: 'Maharashtra',
          postcode: '440010',
          country: 'India',
        },
      },
    });

    const geo = await reverseGeocode(21.1458, 79.0882);

    expect(geo.road).toBe('Wardha Road');
    expect(geo.roadType).toBe('trunk');
    expect(geo.city).toBe('Nagpur');
  });

  test('falls back to null road (not the full display_name) when no name-bearing tag exists', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        display_name: 'Unnamed Road, Some District, Maharashtra, India',
        address: { state: 'Maharashtra', country: 'India' },
      },
    });

    const geo = await reverseGeocode(21.0, 79.0);
    expect(geo.road).toBeNull();
  });

  test('fails soft (returns null) instead of throwing when Nominatim is unreachable', async () => {
    axios.get.mockRejectedValueOnce(new Error('timeout'));
    const geo = await reverseGeocode(21.0, 79.0);
    expect(geo).toBeNull();
  });
});

// ── Tests 2 & 3: NHAI vs municipal routing (roadAuthorityService) ──
describe('roadAuthorityService — authority classification', () => {
  jest.mock('../src/db', () => ({ query: jest.fn() }));
  const db = require('../src/db');
  const { resolveRoadAuthority } = require('../src/services/roadAuthorityService');

  const OLD_ENV = process.env;
  beforeEach(() => { process.env = { ...OLD_ENV }; });
  afterEach(() => { jest.clearAllMocks(); process.env = OLD_ENV; });

  test('Test 2 — explicit mapping routes a known road to NHAI with its configured email', async () => {
    process.env.NHAI_EMAIL = 'nhai-fallback@example.gov.in';
    db.query
      .mockResolvedValueOnce({ rows: [{ authority_type: 'NHAI' }] }) // road_authority_mappings hit
      .mockResolvedValueOnce({ rows: [] });                          // road_authorities: no DB row, fall back to env

    const routing = await resolveRoadAuthority({
      roadName: 'NH-44', roadType: 'trunk', city: 'Nagpur', state: 'Maharashtra',
    });

    expect(routing.authorityType).toBe('NHAI');
    expect(routing.source).toBe('explicit_mapping');
    expect(routing.confidence).toBe('high');
    expect(routing.authorityEmail).toBe('nhai-fallback@example.gov.in');
    expect(routing.status).toBe('ROUTED');
  });

  test('Test 2b — road metadata alone (motorway/trunk + NH-pattern name) also classifies as NHAI', async () => {
    process.env.NHAI_EMAIL = 'nhai@example.gov.in';
    db.query
      .mockResolvedValueOnce({ rows: [] }) // no explicit mapping
      .mockResolvedValueOnce({ rows: [] }); // no DB contact row -> env fallback

    const routing = await resolveRoadAuthority({
      roadName: 'National Highway 47', roadType: 'motorway', city: 'Nagpur',
    });

    expect(routing.authorityType).toBe('NHAI');
    expect(routing.source).toBe('road_metadata_pattern');
    expect(routing.confidence).toBe('medium');
  });

  test('an ordinary "primary" road is NEVER auto-classified as NHAI just from road type', async () => {
    process.env.DEFAULT_MUNICIPAL_EMAIL = 'municipal@example.gov.in';
    db.query
      .mockResolvedValueOnce({ rows: [] }) // no explicit mapping
      .mockResolvedValueOnce({ rows: [] }); // no DB contact -> env fallback

    const routing = await resolveRoadAuthority({
      roadName: 'College Road', roadType: 'primary', city: 'Nagpur',
    });

    expect(routing.authorityType).toBe('LOCAL_MUNICIPAL');
  });

  test('Test 3 — an ordinary local road with no NHAI signal falls back to the configured municipal email', async () => {
    process.env.DEFAULT_MUNICIPAL_EMAIL = 'municipal@example.gov.in';
    db.query
      .mockResolvedValueOnce({ rows: [] }) // no explicit mapping
      .mockResolvedValueOnce({ rows: [] }); // no DB contact row -> env fallback

    const routing = await resolveRoadAuthority({
      roadName: 'MG Road', roadType: 'residential', city: 'Nagpur',
    });

    expect(routing.authorityType).toBe('LOCAL_MUNICIPAL');
    expect(routing.source).toBe('municipal_fallback');
    expect(routing.authorityEmail).toBe('municipal@example.gov.in');
    expect(routing.status).toBe('ROUTED');
  });

  test('Test 5a — no road name at all resolves to AUTHORITY_NOT_RESOLVED, never crashes', async () => {
    const routing = await resolveRoadAuthority({ roadName: null, roadType: null, city: 'Nagpur' });
    expect(routing.status).toBe('AUTHORITY_NOT_RESOLVED');
    expect(routing.authorityType).toBeNull();
  });

  test('Test 5b — authority resolved but no email configured anywhere returns AUTHORITY_EMAIL_NOT_CONFIGURED, never fabricates an address', async () => {
    delete process.env.DEFAULT_MUNICIPAL_EMAIL;
    db.query
      .mockResolvedValueOnce({ rows: [] }) // no explicit mapping
      .mockResolvedValueOnce({ rows: [] }); // no DB contact, no env var either

    const routing = await resolveRoadAuthority({ roadName: 'Some Street', roadType: 'residential', city: 'Nagpur' });

    expect(routing.authorityType).toBe('LOCAL_MUNICIPAL');
    expect(routing.authorityEmail).toBeNull();
    expect(routing.status).toBe('AUTHORITY_EMAIL_NOT_CONFIGURED');
  });

  test('a DB error on the mappings table falls through gracefully instead of throwing', async () => {
    process.env.DEFAULT_MUNICIPAL_EMAIL = 'municipal@example.gov.in';
    db.query
      .mockRejectedValueOnce(new Error('relation "road_authority_mappings" does not exist'))
      .mockResolvedValueOnce({ rows: [] });

    const routing = await resolveRoadAuthority({ roadName: 'Some Street', roadType: 'residential', city: 'Nagpur' });
    expect(routing.status).toBe('ROUTED');
    expect(routing.authorityType).toBe('LOCAL_MUNICIPAL');
  });
});

// ── Tests 4 & 5: full createComplaint flow — email dispatch + failure handling ──
describe('createComplaint — road authority email dispatch', () => {
  jest.mock('axios');
  jest.mock('../src/db', () => ({ query: jest.fn() }));
  jest.mock('../src/services/geocodingService', () => ({ reverseGeocode: jest.fn() }));
  jest.mock('../src/services/roadAuthorityService', () => ({ resolveRoadAuthority: jest.fn() }));
  jest.mock('../src/services/emailService', () => ({ sendAuthorityComplaintEmail: jest.fn() }));
  jest.mock('../src/controllers/notificationController', () => ({
    notifyComplaintSubmitted: jest.fn().mockResolvedValue(undefined),
    notifyStatusUpdate: jest.fn(),
    notifyUpvote: jest.fn(),
  }));
  jest.mock('../src/realtime/socket', () => ({ emitComplaintCreated: jest.fn() }));

  const axios = require('axios');
  const db = require('../src/db');
  const { reverseGeocode } = require('../src/services/geocodingService');
  const { resolveRoadAuthority } = require('../src/services/roadAuthorityService');
  const { sendAuthorityComplaintEmail } = require('../src/services/emailService');
  const { createComplaint } = require('../src/controllers/complaintsController');

  const fakeComplaint = {
    id: 'complaint-uuid-1', title: 'Pothole on NH-44', description: 'Deep pothole causing accidents',
    latitude: 21.1458, longitude: 79.0882, city: 'Nagpur', ward: null, category: 'pothole', image_url: null,
  };

  function buildReqRes(body) {
    const req = { body, user: { id: 'user-1' }, file: undefined };
    const res = { statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    return { req, res };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    axios.post.mockRejectedValue(new Error('ML service unavailable')); // ML down — must not block routing
    db.query.mockImplementation((sql) => {
      if (sql.includes('INSERT INTO complaints')) return Promise.resolve({ rows: [fakeComplaint] });
      return Promise.resolve({ rows: [] });
    });
  });

  test('Test 4 — a ROUTED result triggers sendAuthorityComplaintEmail with the resolved recipient', async () => {
    reverseGeocode.mockResolvedValue({ road: 'NH-44', roadType: 'trunk', city: 'Nagpur', state: 'Maharashtra' });
    resolveRoadAuthority.mockResolvedValue({
      roadName: 'NH-44', authorityType: 'NHAI', authorityName: 'National Highways Authority of India',
      authorityEmail: 'nhai@example.gov.in', confidence: 'high', source: 'explicit_mapping', status: 'ROUTED',
    });
    sendAuthorityComplaintEmail.mockResolvedValue({ accepted: ['nhai@example.gov.in'] });

    const { req, res } = buildReqRes({ title: 'Pothole on NH-44', description: 'Deep pothole', latitude: '21.1458', longitude: '79.0882' });
    await createComplaint(req, res);

    expect(sendAuthorityComplaintEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'nhai@example.gov.in' })
    );
    expect(res.statusCode).toBe(201);
    expect(res.body.routing.authority_type).toBe('NHAI');
    expect(res.body.routing.status).toBe('ROUTED');
    expect(res.body.notification.email_sent).toBe(true);
  });

  test('Test 5 — email failure does not crash complaint creation; complaint is still returned with email_sent:false', async () => {
    reverseGeocode.mockResolvedValue({ road: 'MG Road', roadType: 'residential', city: 'Nagpur' });
    resolveRoadAuthority.mockResolvedValue({
      roadName: 'MG Road', authorityType: 'LOCAL_MUNICIPAL', authorityName: 'Local Municipal Authority',
      authorityEmail: 'municipal@example.gov.in', confidence: 'low', source: 'municipal_fallback', status: 'ROUTED',
    });
    sendAuthorityComplaintEmail.mockRejectedValue(new Error('SMTP connection refused'));

    const { req, res } = buildReqRes({ title: 'Garbage pile', description: 'Uncollected garbage', latitude: '21.14', longitude: '79.08' });
    await createComplaint(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.complaint.id).toBe('complaint-uuid-1');
    expect(res.body.notification.email_sent).toBe(false);
  });

  test('AUTHORITY_EMAIL_NOT_CONFIGURED never calls sendMail and is reported honestly, not as success', async () => {
    reverseGeocode.mockResolvedValue({ road: 'Some Street', roadType: 'residential', city: 'Nagpur' });
    resolveRoadAuthority.mockResolvedValue({
      roadName: 'Some Street', authorityType: 'LOCAL_MUNICIPAL', authorityName: 'Local Municipal Authority',
      authorityEmail: null, confidence: 'low', source: 'municipal_fallback', status: 'AUTHORITY_EMAIL_NOT_CONFIGURED',
    });

    const { req, res } = buildReqRes({ title: 'Streetlight out', description: 'Dark street at night', latitude: '21.14', longitude: '79.08' });
    await createComplaint(req, res);

    expect(sendAuthorityComplaintEmail).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.body.routing.status).toBe('AUTHORITY_EMAIL_NOT_CONFIGURED');
    expect(res.body.notification.email_sent).toBe(false);
  });

  test('a geocoding/routing failure does not crash complaint creation (graceful degradation)', async () => {
    reverseGeocode.mockResolvedValue(null); // Nominatim down
    resolveRoadAuthority.mockRejectedValue(new Error('unexpected routing error'));

    const { req, res } = buildReqRes({ title: 'Water leak', description: 'Pipe burst', latitude: '21.14', longitude: '79.08' });
    await createComplaint(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.routing.status).toBe('AUTHORITY_NOT_RESOLVED');
    expect(res.body.complaint.id).toBe('complaint-uuid-1');
  });
});
