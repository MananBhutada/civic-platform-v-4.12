import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { adminApi } from '../../api/client';
import { Loader } from '../../components/Common';
import { categoryLabel } from '../../utils/constants';

export default function AdminDashboard() {
  const [dash, setDash] = useState(null);
  const [mlStatus, setMlStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.dashboard(),
      adminApi.mlStatus().catch((e) => e.response || { data: { status: 'offline' } }),
    ]).then(([d, ml]) => {
      setDash(d.data);
      setMlStatus(ml.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <AppShell title="Overview"><Loader /></AppShell>;

  const total = (dash?.by_status || []).reduce((a, s) => a + Number(s.count), 0);
  const resolved = Number((dash?.by_status || []).find((s) => s.status === 'resolved')?.count || 0);

  return (
    <AppShell title="Governance Overview" subtitle="City-wide complaint register at a glance">
      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="card stat-tile">
          <div className="eyebrow">Total</div>
          <div className="val">{total}</div>
          <div className="label">Complaints on file</div>
        </div>
        <div className="card stat-tile">
          <div className="eyebrow">Resolved</div>
          <div className="val">{resolved}</div>
          <div className="label">Successfully closed</div>
        </div>
        <div className="card stat-tile">
          <div className="eyebrow">Avg. resolution</div>
          <div className="val">{dash?.avg_resolution_hours ? `${dash.avg_resolution_hours}h` : '—'}</div>
          <div className="label">Time to resolve</div>
        </div>
        <div className="card stat-tile">
          <div className="eyebrow">ML service</div>
          <div className="val" style={{ fontSize: 20, color: mlStatus?.status === 'online' ? 'var(--stamp-green)' : 'var(--stamp-red)' }}>
            {mlStatus?.status === 'online' ? 'Online' : 'Offline'}
          </div>
          <div className="label">Classification engine</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card card-pad">
          <div className="eyebrow">Breakdown</div>
          <h3 className="section-title" style={{ marginBottom: 12 }}>By status</h3>
          <div className="stack gap-8">
            {(dash?.by_status || []).map((s) => (
              <div key={s.status} className="row space-between" style={{ fontSize: 13 }}>
                <span style={{ textTransform: 'capitalize' }}>{s.status.replace('_', ' ')}</span>
                <strong>{s.count}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-pad">
          <div className="eyebrow">Breakdown</div>
          <h3 className="section-title" style={{ marginBottom: 12 }}>By category</h3>
          <div className="stack gap-8">
            {(dash?.by_category || []).map((c) => (
              <div key={c.category} className="row space-between" style={{ fontSize: 13 }}>
                <span>{categoryLabel(c.category)}</span>
                <strong>{c.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 20 }}>
        <div className="row space-between" style={{ marginBottom: 12 }}>
          <div>
            <div className="eyebrow">Needs attention</div>
            <h3 className="section-title">Top urgent complaints</h3>
          </div>
          <Link to="/admin/complaints" className="btn btn-ghost btn-sm">View all complaints</Link>
        </div>
        <table className="data-table">
          <thead><tr><th>Title</th><th>Category</th><th>Ward</th><th>Priority</th><th>Status</th></tr></thead>
          <tbody>
            {(dash?.urgent || []).map((u) => (
              <tr key={u.id}>
                <td><Link to={`/admin/complaints/${u.id}`}>{u.title}</Link></td>
                <td>{categoryLabel(u.category)}</td>
                <td>{u.ward || '—'}</td>
                <td>{Math.round(u.priority_score)}</td>
                <td style={{ textTransform: 'capitalize' }}>{u.status.replace('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(dash?.ward_hotspots || []).length > 0 && (
        <div className="card card-pad" style={{ marginTop: 20 }}>
          <div className="eyebrow">Geography</div>
          <h3 className="section-title" style={{ marginBottom: 12 }}>Ward hotspots</h3>
          <table className="data-table">
            <thead><tr><th>Ward</th><th>Total</th><th>Unresolved</th></tr></thead>
            <tbody>
              {dash.ward_hotspots.map((w) => (
                <tr key={w.ward_id || w.ward}><td>{w.ward || '—'}</td><td>{w.total}</td><td>{w.unresolved}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
