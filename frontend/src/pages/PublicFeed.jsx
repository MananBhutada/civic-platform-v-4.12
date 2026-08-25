import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api, apiError } from '../api/client';

const CATEGORIES = ['all','pothole','garbage','streetlight','water_leakage','drainage','illegal_dumping'];
const CAT_ICONS  = { pothole:'🕳️', garbage:'🗑️', streetlight:'💡', water_leakage:'💧', drainage:'🌊', illegal_dumping:'⚠️' };
const STATUS_COLOR = { reported:'--stamp-blue', verified:'--seal', assigned:'--stamp-blue', in_progress:'--seal', resolved:'--stamp-green', rejected:'--stamp-red' };

export default function PublicFeed() {
  const { isAuthenticated } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [category, setCategory]     = useState('all');
  const [sort, setSort]             = useState('priority');
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(true);

  useEffect(() => {
    setComplaints([]);
    setPage(1);
    setHasMore(true);
  }, [category, sort]);

  useEffect(() => {
    fetchComplaints();
  }, [category, sort, page]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12, sort });
      if (category !== 'all') params.append('category', category);

      // Public endpoint — no auth token needed.
      // VITE_API_URL already includes the /api prefix (see api/client.js,
      // the app-wide convention) — appending '/api/...' here duplicated
      // it into /api/api/complaints/public, which 404'd silently and
      // made the feed always look empty.
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/complaints/public?${params}`);
      const data = await res.json();
      const list = data.complaints || [];

      setComplaints(prev => page === 1 ? list : [...prev, ...list]);
      setHasMore(list.length === 12);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplaintClick = (id) => {
    if (isAuthenticated) {
      navigate(`/citizen/complaints/${id}`);
    } else {
      navigate(`/public/complaints/${id}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>

      {/* ── NAV ───────────────────────────────────────────── */}
      <nav style={{
        background: 'var(--nav-bg)',
        color: 'var(--nav-text)',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-pop)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--seal)' }}>
            नगर
          </span>
          <span style={{ fontSize: 14, opacity: 0.7 }}>Civic Register</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            title="Toggle dark mode"
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 20,
              color: 'var(--nav-text)',
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {isAuthenticated ? (
            <Link to="/citizen" style={{
              background: 'var(--seal)',
              color: '#fff',
              padding: '6px 16px',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}>
              Dashboard →
            </Link>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/login" style={{
                color: 'var(--nav-text)',
                padding: '6px 14px',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontSize: 14,
                border: '1px solid rgba(255,255,255,0.3)',
              }}>
                Sign in
              </Link>
              <Link to="/register" style={{
                background: 'var(--seal)',
                color: '#fff',
                padding: '6px 16px',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 600,
              }}>
                Report Issue
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────── */}
      <div style={{
        background: 'var(--ink)',
        color: '#fff',
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36,
          color: 'var(--seal)',
          marginBottom: 12,
        }}>
          Public Issue Register
        </h1>
        <p style={{ fontSize: 16, opacity: 0.8, maxWidth: 520, margin: '0 auto 24px' }}>
          Browse civic complaints reported by citizens in your area.
          Sign in to file a complaint or upvote existing issues.
        </p>
        {!isAuthenticated && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              background: 'var(--seal)',
              color: '#fff',
              padding: '10px 24px',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 15,
            }}>
              + Report an Issue
            </Link>
            <Link to="/login" style={{
              background: 'transparent',
              color: '#fff',
              padding: '10px 24px',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              fontSize: 15,
              border: '1px solid rgba(255,255,255,0.4)',
            }}>
              Sign In
            </Link>
          </div>
        )}
      </div>

      {/* ── FILTERS ───────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--line)',
        padding: '12px 24px',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'center',
        position: 'sticky',
        top: 56,
        zIndex: 90,
      }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: '1px solid var(--line)',
                background: category === cat ? 'var(--ink)' : 'transparent',
                color: category === cat ? '#fff' : 'var(--text)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: category === cat ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {cat === 'all' ? '📋 All' : `${CAT_ICONS[cat]} ${cat.replace('_', ' ')}`}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{
            padding: '5px 10px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--line)',
            background: 'var(--bg-card)',
            color: 'var(--text)',
            fontSize: 13,
          }}
        >
          <option value="priority">Priority</option>
          <option value="recent">Most Recent</option>
        </select>
      </div>

      {/* ── COMPLAINT GRID ────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        {loading && complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-faint)' }}>
            Loading complaints...
          </div>
        ) : complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-faint)' }}>
            No complaints found for this filter.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}>
            {complaints.map(c => (
              <div
                key={c.id}
                onClick={() => handleComplaintClick(c.id)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 16,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-card)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-pop)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                }}
              >
                {/* Image */}
                {c.image_url && (
                  <img
                    src={c.image_url}
                    alt="complaint"
                    style={{
                      width: '100%',
                      height: 160,
                      objectFit: 'cover',
                      borderRadius: 'var(--radius)',
                      marginBottom: 12,
                    }}
                  />
                )}

                {/* Category + Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{
                    fontSize: 12,
                    background: 'var(--seal-soft)',
                    color: 'var(--seal-2)',
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontWeight: 600,
                  }}>
                    {CAT_ICONS[c.category] || '📋'} {(c.category || 'unknown').replace('_', ' ')}
                  </span>
                  <span style={{
                    fontSize: 12,
                    color: `var(${STATUS_COLOR[c.status] || '--text-soft'})`,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}>
                    {c.status}
                  </span>
                </div>

                {/* Title */}
                <h3 style={{
                  fontSize: 15,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--ink)',
                  marginBottom: 6,
                  lineHeight: 1.4,
                }}>
                  {c.title}
                </h3>

                {/* Address */}
                {c.address && (
                  <p style={{
                    fontSize: 12,
                    color: 'var(--text-faint)',
                    marginBottom: 4,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    📍 {c.address}
                  </p>
                )}

                {/* Concerned department — was fetched by the backend but never rendered */}
                {c.department_name && (
                  <p style={{
                    fontSize: 12,
                    color: 'var(--seal-2)',
                    marginBottom: 8,
                    fontWeight: 600,
                  }}>
                    🏛️ {c.department_name}
                  </p>
                )}

                {/* Footer */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: '1px solid var(--line)',
                  fontSize: 12,
                  color: 'var(--text-soft)',
                }}>
                  <span>👍 {c.upvote_count || 0} supporters</span>
                  <span>⚡ Priority {Math.round(c.priority_score || 0)}</span>
                  <span>{new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                </div>

                {/* Sign in prompt for unauthenticated users */}
                {!isAuthenticated && (
                  <div style={{
                    marginTop: 10,
                    padding: '6px 10px',
                    background: 'var(--seal-soft)',
                    borderRadius: 'var(--radius)',
                    fontSize: 12,
                    color: 'var(--seal-2)',
                    textAlign: 'center',
                  }}>
                    <Link to="/login" style={{ color: 'var(--seal-2)', fontWeight: 600 }}>
                      Sign in
                    </Link> to upvote or file a similar complaint
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && complaints.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={loading}
              style={{
                padding: '10px 32px',
                background: 'var(--ink)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
