import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { reviewQueueApi, apiError } from '../../api/client';
import { Loader, EmptyState } from '../../components/Common';
import { useToast } from '../../context/ToastContext';

export default function ReviewQueue() {
  const toast = useToast();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState('PENDING');

  const load = () => {
    setLoading(true);
    reviewQueueApi.list({ status })
      .then(({ data }) => setItems(data.items || []))
      .catch((err) => toast.error(apiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);

  const approve = async (id) => {
    try {
      await reviewQueueApi.approve(id);
      toast.success('Approved — complaint is now live on the public feed.');
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  const reject = async (id) => {
    const reason = window.prompt('Reason for rejecting this report (optional):') || '';
    try {
      await reviewQueueApi.reject(id, reason);
      toast.success('Rejected.');
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  return (
    <AppShell title="Manual Review Queue" subtitle="Reports with a borderline trust score (60–79) that need a human decision before going live">
      <div className="filter-bar">
        {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
          <button key={s} className={`pill ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
            {s[0] + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : items.length === 0 ? (
        <EmptyState title="Nothing here" body={`No ${status.toLowerCase()} items in the review queue.`} />
      ) : (
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {items.map((item) => (
            <div key={item.id} className="card" style={{ padding: 16 }}>
              {item.image_url && (
                <img src={item.image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{item.issue_type || 'unknown'}</span>
                <span style={{ fontSize: 12, color: item.trust_score >= 70 ? 'var(--seal-2)' : 'var(--stamp-red)' }}>
                  Trust: {item.trust_score}/100
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 8 }}>{item.title || item.description}</p>
              <p style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 12 }}>
                Reported by {item.reporter_name || 'Unknown'} · {new Date(item.created_at).toLocaleDateString('en-IN')}
              </p>
              {item.status === 'PENDING' && (
                <div className="row gap-8">
                  <button className="btn btn-seal btn-sm" onClick={() => approve(item.id)}>Approve</button>
                  <button className="btn btn-danger btn-sm" onClick={() => reject(item.id)}>Reject</button>
                </div>
              )}
              {item.status !== 'PENDING' && (
                <span style={{ fontSize: 12, textTransform: 'capitalize', color: 'var(--text-faint)' }}>{item.status.toLowerCase()}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
