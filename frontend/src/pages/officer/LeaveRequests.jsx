import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { officersApi, apiError } from '../../api/client';
import { Loader, EmptyState, timeAgo } from '../../components/Common';
import { useToast } from '../../context/ToastContext';

export default function LeaveRequests() {
  const toast = useToast();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    officersApi.listLeaves().then(({ data }) => setLeaves(data.leaves || [])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await officersApi.requestLeave(form);
      toast.success('Leave request submitted.');
      setForm({ start_date: '', end_date: '', reason: '' });
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally { setSubmitting(false); }
  };

  return (
    <AppShell title="Leave Requests" subtitle="Request time off and track approval status">
      <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', gap: 20, alignItems: 'start' }}>
        <div className="card card-pad">
          <div className="eyebrow">New request</div>
          <h3 className="section-title" style={{ marginBottom: 14 }}>Request leave</h3>
          <form onSubmit={submit}>
            <div className="grid grid-2">
              <div className="field">
                <label>Start date</label>
                <input type="date" required value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="field">
                <label>End date</label>
                <input type="date" required value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="field">
              <label>Reason <span className="faint">(optional)</span></label>
              <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
            <button className="btn btn-seal btn-block" disabled={submitting} type="submit">{submitting ? 'Submitting…' : 'Submit request'}</button>
          </form>
        </div>

        <div className="card card-pad">
          <div className="eyebrow">History</div>
          <h3 className="section-title" style={{ marginBottom: 14 }}>Your leave requests</h3>
          {loading ? <Loader /> : leaves.length === 0 ? (
            <EmptyState glyph="\u2600" title="No leave requested yet" />
          ) : (
            <table className="data-table">
              <thead><tr><th>Dates</th><th>Reason</th><th>Status</th><th>Filed</th></tr></thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id}>
                    <td>{l.start_date} → {l.end_date}</td>
                    <td>{l.reason || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{l.status}</td>
                    <td>{timeAgo(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
