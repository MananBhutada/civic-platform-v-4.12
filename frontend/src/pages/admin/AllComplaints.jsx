import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { complaintsApi } from '../../api/client';
import { Loader } from '../../components/Common';
import ComplaintLedger from '../../components/ComplaintLedger';
import { CATEGORIES } from '../../utils/constants';

const STATUSES = ['', 'reported', 'verified', 'assigned', 'accepted', 'work_started', 'under_inspection', 'resolved', 'citizen_verification', 'closed', 'reopened', 'rejected'];

export default function AllComplaints() {
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 60, sort: 'priority' };
    if (status) params.status = status;
    if (category) params.category = category;

    const call = q.trim().length >= 2
      ? complaintsApi.search({ q: q.trim(), status: status || undefined, category: category || undefined, limit: 60 })
      : complaintsApi.list(params);

    call.then(({ data }) => setComplaints(data.complaints || [])).finally(() => setLoading(false));
  }, [status, category, q]);

  return (
    <AppShell title="All Complaints" subtitle="Every entry in the civic register">
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="grid grid-3">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Search</label>
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or description…" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All statuses'}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? <Loader /> : (
        <ComplaintLedger complaints={complaints} basePath="/admin" emptyTitle="No complaints match these filters" />
      )}
    </AppShell>
  );
}
