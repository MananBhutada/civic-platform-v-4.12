import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const STATUS_COLOR = { reported:'--stamp-blue', verified:'--seal', assigned:'--stamp-blue', in_progress:'--seal', resolved:'--stamp-green', rejected:'--stamp-red' };

export default function PublicComplaintDetail() {
  const { id } = useParams();
  const { theme, toggle } = useTheme();

  const [complaint, setComplaint] = useState(null);
  const [timeline, setTimeline]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res  = await fetch(`${base}/complaints/public/${id}`);
        if (res.status === 404) { setNotFound(true); return; }
        const data = await res.json();
        setComplaint(data.complaint);
        setTimeline(data.timeline || []);
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>
      <nav style={{
        background: 'var(--nav-bg)', color: 'var(--nav-text)', padding: '0 24px',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, boxShadow: 'var(--shadow-pop)',
      }}>
        <Link to="/feed" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--seal)' }}>नगर</span>
          <span style={{ fontSize: 14, opacity: 0.7, color: 'var(--nav-text)' }}>← Back to feed</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={toggle} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, color: 'var(--nav-text)', padding: '4px 12px', cursor: 'pointer', fontSize: 16 }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link to="/login" style={{ color: 'var(--nav-text)', padding: '6px 14px', borderRadius: 'var(--radius)', textDecoration: 'none', fontSize: 14, border: '1px solid rgba(255,255,255,0.3)' }}>
            Sign in
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-faint)' }}>Loading complaint...</div>
        )}

        {!loading && notFound && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ color: 'var(--text-faint)', marginBottom: 16 }}>This complaint doesn't exist, or has been removed.</p>
            <Link to="/feed" style={{ color: 'var(--seal-2)', fontWeight: 600 }}>← Back to public feed</Link>
          </div>
        )}

        {!loading && complaint && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-card)',
          }}>
            {complaint.image_url && (
              <img src={complaint.image_url} alt="complaint"
                style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 'var(--radius)', marginBottom: 16 }} />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, background: 'var(--seal-soft)', color: 'var(--seal-2)', padding: '2px 10px', borderRadius: 10, fontWeight: 600 }}>
                {(complaint.category || 'unknown').replace('_', ' ')}
              </span>
              <span style={{ fontSize: 12, color: `var(${STATUS_COLOR[complaint.status] || '--text-soft'})`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                {complaint.status}
              </span>
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>
              {complaint.title}
            </h1>

            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 16 }}>
              {complaint.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, marginBottom: 16 }}>
              {complaint.address && <div><span style={{ color: 'var(--text-faint)' }}>Location: </span>{complaint.address}</div>}
              <div><span style={{ color: 'var(--text-faint)' }}>Department: </span>{complaint.department_name || 'Not yet assigned'}</div>
              <div><span style={{ color: 'var(--text-faint)' }}>Reported: </span>{new Date(complaint.created_at).toLocaleDateString('en-IN')}</div>
              <div><span style={{ color: 'var(--text-faint)' }}>Supporters: </span>👍 {complaint.upvote_count || 0}</div>
            </div>

            {timeline.length > 0 && (
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, marginBottom: 10, color: 'var(--ink)' }}>Status timeline</h3>
                {timeline.map((t, i) => (
                  <div key={i} style={{ fontSize: 13, marginBottom: 6, color: 'var(--text-soft)' }}>
                    <strong style={{ textTransform: 'uppercase', color: 'var(--seal-2)' }}>{t.status}</strong>
                    {t.remarks ? ` — ${t.remarks}` : ''}
                    <span style={{ color: 'var(--text-faint)' }}> ({new Date(t.created_at).toLocaleDateString('en-IN')})</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: 'var(--seal-soft)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13, textAlign: 'center' }}>
              <Link to="/login" style={{ color: 'var(--seal-2)', fontWeight: 600 }}>Sign in</Link> to upvote this complaint or file a similar one.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
