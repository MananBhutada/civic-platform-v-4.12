import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { officersApi, apiError } from '../../api/client';
import { Loader, EmptyState } from '../../components/Common';
import { useToast } from '../../context/ToastContext';

export default function LeaveReview() {
  const toast = useToast();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const load = () => {
    setLoading(true);
    officersApi.listLeaves(filter ? { status: filter } : {}).then(({ data }) => setLeaves(data.leaves || [])).finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const decide = async (id, decision) => {
    try {
      await officersApi.reviewLeave(id, decision);
      toast.success(`Leave ${decision}.`);
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  return (
    <AppShell title="Leave Requests" subtitle="Review time-off requests from field officers">
      <div className="filter-bar">
        {['pending', 'approved', 'rejected', ''].map((f) => (
          <button key={f || 'all'} className={`pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f ? f[0].toUpperCase() + f.slice(1) : 'All'}
          </button>
        ))}
      </div>
      {loading ? <Loader /> : leaves.length === 0 ? (
        <EmptyState title="No leave requests" body="Nothing to review right now." />
      ) : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Officer</th><th>Dates</th><th>Reason</th><th>Status</th><th /></tr></thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id}>
                  <td>{l.officer_name}</td>
                  <td>{l.start_date} → {l.end_date}</td>
                  <td>{l.reason || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{l.status}</td>
                  <td>
                    {l.status === 'pending' && (
                      <div className="row gap-8">
                        <button className="btn btn-seal btn-sm" onClick={() => decide(l.id, 'approved')}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => decide(l.id, 'rejected')}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
