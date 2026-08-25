import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { auditApi } from '../../api/client';
import { Loader, EmptyState, timeAgo } from '../../components/Common';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    auditApi.list({ action: action || undefined, limit: 60 })
      .then(({ data }) => { setLogs(data.logs || []); setTotal(data.total || 0); })
      .finally(() => setLoading(false));
  }, [action]);

  return (
    <AppShell title="Audit Log" subtitle={`${total} recorded governance actions (append-only)`}>
      <div className="field" style={{ maxWidth: 320, marginBottom: 18 }}>
        <label>Filter by action</label>
        <input type="text" value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. complaint.status_changed" />
      </div>
      {loading ? <Loader /> : logs.length === 0 ? (
        <EmptyState title="No audit entries" body="Governance actions will appear here as they happen." />
      ) : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Actor</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="mono">{timeAgo(l.created_at)}</td>
                  <td>{l.action}</td>
                  <td>{l.entity_type} <span className="faint mono">{String(l.entity_id).slice(0, 8)}</span></td>
                  <td>{l.actor_name || 'System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
