import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { searchApi } from '../../api/client';
import { Loader, EmptyState } from '../../components/Common';

export default function GlobalSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setLoading(true);
    try {
      const { data } = await searchApi.global(q.trim());
      setResults(data.results);
    } finally { setLoading(false); }
  };

  const sections = [
    { key: 'complaint', label: 'Complaints' },
    { key: 'citizen', label: 'Citizens' },
    { key: 'officer', label: 'Officers' },
    { key: 'department', label: 'Departments' },
  ];

  return (
    <AppShell title="Global Search" subtitle="Search across complaints, citizens, officers and departments">
      <form onSubmit={submit} className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="row gap-8">
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Complaint ID, name, ward, status…" style={{ flex: 1 }} />
          <button className="btn btn-seal" type="submit">Search</button>
        </div>
      </form>

      {loading && <Loader />}

      {results && sections.map(({ key, label }) => {
        const items = results[key] || [];
        if (!items.length) return null;
        return (
          <div key={key} className="card card-pad" style={{ marginBottom: 16 }}>
            <div className="eyebrow">{label}</div>
            <h3 className="section-title" style={{ marginBottom: 12 }}>{items.length} match{items.length === 1 ? '' : 'es'}</h3>
            <div className="stack gap-8">
              {items.map((it) => (
                <div key={it.id} className="row space-between" style={{ fontSize: 13, borderBottom: '1px dashed var(--line)', paddingBottom: 8 }}>
                  {key === 'complaint' ? (
                    <Link to={`/admin/complaints/${it.id}`}>{it.title}</Link>
                  ) : (
                    <span>{it.name}</span>
                  )}
                  <span className="faint">{it.email || it.status || it.ward || ''}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {results && sections.every(({ key }) => !(results[key] || []).length) && (
        <EmptyState title="No matches" body="Try a different search term." />
      )}
    </AppShell>
  );
}
