import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { complaintsApi } from '../../api/client';
import { Loader } from '../../components/Common';
import ComplaintLedger from '../../components/ComplaintLedger';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'reported', label: 'Reported' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'work_started', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
];

export default function MyComplaints() {
  const [status, setStatus] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    complaintsApi.my({ status: status || undefined, limit: 50 })
      .then(({ data }) => { setComplaints(data.complaints || []); setTotal(data.total || 0); })
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <AppShell title="My Complaints" subtitle={`${total} entr${total === 1 ? 'y' : 'ies'} under your name`}>
      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button key={f.value} className={`pill ${status === f.value ? 'active' : ''}`} onClick={() => setStatus(f.value)}>
            {f.label}
          </button>
        ))}
      </div>
      {loading ? <Loader /> : (
        <ComplaintLedger
          complaints={complaints}
          emptyTitle="Nothing here"
          emptyBody="No complaints match this filter yet."
        />
      )}
    </AppShell>
  );
}
