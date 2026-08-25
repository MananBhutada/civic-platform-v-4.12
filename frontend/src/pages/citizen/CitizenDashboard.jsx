import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { citizenApi, complaintsApi } from '../../api/client';
import { Loader } from '../../components/Common';
import ComplaintLedger from '../../components/ComplaintLedger';
import { useAuth } from '../../context/AuthContext';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [d, r] = await Promise.all([
          citizenApi.dashboard(),
          complaintsApi.my({ limit: 5, sort: 'recent' }),
        ]);
        setDash(d.data);
        setRecent(r.data.complaints || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusCounts = Object.fromEntries((dash?.complaints_by_status || []).map((s) => [s.status, Number(s.count)]));
  const totalFiled = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const pending = totalFiled - (statusCounts.resolved || 0) - (statusCounts.closed || 0) - (statusCounts.rejected || 0);

  return (
    <AppShell title={`Namaste, ${user?.name?.split(' ')[0] || 'Citizen'}`} subtitle="Your civic activity, at a glance">
      {loading ? <Loader /> : (
        <>
          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            <div className="card stat-tile">
              <div className="eyebrow">Filed</div>
              <div className="val">{totalFiled}</div>
              <div className="label">Total complaints</div>
            </div>
            <div className="card stat-tile">
              <div className="eyebrow">Open</div>
              <div className="val">{pending}</div>
              <div className="label">Awaiting resolution</div>
            </div>
            <div className="card stat-tile">
              <div className="eyebrow">Reputation</div>
              <div className="val">{dash?.reputation?.score ?? '—'}</div>
              <div className="label">Civic trust score</div>
            </div>
            <div className="card stat-tile">
              <div className="eyebrow">Saved</div>
              <div className="val">{dash?.bookmark_count ?? 0}</div>
              <div className="label">Bookmarked reports</div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
            <div className="card card-pad">
              <div className="row space-between" style={{ marginBottom: 14 }}>
                <div>
                  <div className="eyebrow">Latest entries</div>
                  <h2 className="section-title">Your recent complaints</h2>
                </div>
                <Link to="/citizen/my" className="btn btn-ghost btn-sm">View all</Link>
              </div>
              <ComplaintLedger
                complaints={recent}
                emptyTitle="No complaints filed yet"
                emptyBody="Spotted a pothole or an overflowing bin nearby? File your first report."
              />
            </div>

            <div className="stack gap-16">
              <div className="card card-pad">
                <div className="eyebrow">Quick action</div>
                <h2 className="section-title" style={{ marginBottom: 10 }}>Report a new issue</h2>
                <p className="faint" style={{ marginBottom: 14 }}>Photos and your location help officers verify and resolve issues faster.</p>
                <Link to="/citizen/new" className="btn btn-seal btn-block">File a complaint</Link>
              </div>
              <div className="card card-pad">
                <div className="eyebrow">Reputation breakdown</div>
                <div className="stack gap-8" style={{ marginTop: 10, fontSize: 13 }}>
                  <div className="row space-between"><span className="muted">Resolved reports filed</span><strong>{dash?.reputation?.resolved_complaints_filed ?? 0}</strong></div>
                  <div className="row space-between"><span className="muted">Community confirmations given</span><strong>{dash?.reputation?.community_confirmations_given ?? 0}</strong></div>
                  <div className="row space-between"><span className="muted">Feedback submitted</span><strong>{dash?.reputation?.feedback_given ?? 0}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
