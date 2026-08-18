import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { officersApi, apiError } from '../../api/client';
import { Loader, StatusStamp, PriorityChip, EmptyState } from '../../components/Common';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function OfficerDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [workload, setWorkload] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      officersApi.workload(user.id),
      officersApi.performance(user.id),
    ]).then(([w, p]) => {
      setWorkload(w.data);
      setPerformance(p.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [user.id]);

  const toggleAvailability = async () => {
    setToggling(true);
    try {
      const { data } = await officersApi.setAvailability(user.id, !available);
      setAvailable(data.officer.is_available);
      toast.success(data.officer.is_available ? 'Marked available for new assignments.' : 'Marked unavailable.');
    } catch (err) {
      toast.error(apiError(err));
    } finally { setToggling(false); }
  };

  return (
    <AppShell title="My Workload" subtitle="Complaints assigned to you, ordered by priority">
      {loading ? <Loader /> : (
        <>
          <div className="grid grid-4" style={{ marginBottom: 22 }}>
            <div className="card stat-tile">
              <div className="eyebrow">Active</div>
              <div className="val">{workload?.active_count ?? 0}</div>
              <div className="label">Open assignments</div>
            </div>
            <div className="card stat-tile">
              <div className="eyebrow">Resolved</div>
              <div className="val">{performance?.resolved ?? 0}</div>
              <div className="label">Total resolved</div>
            </div>
            <div className="card stat-tile">
              <div className="eyebrow">SLA met</div>
              <div className="val">{performance?.sla_met ?? 0}</div>
              <div className="label">On-time closures</div>
            </div>
            <div className="card stat-tile">
              <div className="eyebrow">Rating</div>
              <div className="val">{performance?.avg_rating ?? '—'}</div>
              <div className="label">Citizen feedback avg</div>
            </div>
          </div>

          <div className="row space-between" style={{ marginBottom: 14 }}>
            <div>
              <div className="eyebrow">Assigned to me</div>
              <h2 className="section-title">Open complaints</h2>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={toggleAvailability} disabled={toggling}>
              {available ? 'Mark myself unavailable' : 'Mark myself available'}
            </button>
          </div>

          {(!workload?.complaints || workload.complaints.length === 0) ? (
            <EmptyState glyph="\u2713" title="Nothing pending" body="You're all caught up — new assignments will appear here." />
          ) : (
            <div className="ledger">
              {workload.complaints.map((c) => (
                <Link key={c.id} to={`/officer/complaints/${c.id}`} className="ledger-row">
                  <span className="ledger-idx mono">{c.category}</span>
                  <div>
                    <div className="ledger-title">{c.title}</div>
                    {c.sla_resolution_due_at && (
                      <div className="ledger-meta">Due {new Date(c.sla_resolution_due_at).toLocaleDateString('en-IN')}</div>
                    )}
                  </div>
                  <PriorityChip score={c.priority_score} />
                  <StatusStamp status={c.status} />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
