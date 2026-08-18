import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AppShell } from '../../components/AppShell';
import { govAnalyticsApi, client } from '../../api/client';
import { Loader } from '../../components/Common';
import { useToast } from '../../context/ToastContext';

export default function Analytics() {
  const toast = useToast();
  const [civicHealth, setCivicHealth] = useState(null);
  const [deptEfficiency, setDeptEfficiency] = useState(null);
  const [hotspots, setHotspots] = useState(null);
  const [trust, setTrust] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      govAnalyticsApi.civicHealth(),
      govAnalyticsApi.departmentEfficiency(),
      govAnalyticsApi.hotspots(),
      govAnalyticsApi.trustScore(),
    ]).then(([ch, de, hs, tr]) => {
      setCivicHealth(ch.data);
      setDeptEfficiency(de.data);
      setHotspots(hs.data);
      setTrust(tr.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <AppShell title="Analytics"><Loader /></AppShell>;

  const wardChartData = (civicHealth?.wards || []).slice(0, 12).map((w) => ({
    name: w.ward || `Ward ${w.ward_id}`, score: Math.round(w.health_score),
  }));

  const downloadCsv = async () => {
    try {
      const res = await client.get('/analytics/export.csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'complaints_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not export the CSV.');
    }
  };

  return (
    <AppShell title="Analytics" subtitle="Civic Health Index, department efficiency & trust metrics">
      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card stat-tile">
          <div className="eyebrow">City average</div>
          <div className="val">{civicHealth?.city_avg ?? civicHealth?.health_score ?? '—'}</div>
          <div className="label">Civic Health Index</div>
        </div>
        <div className="card stat-tile">
          <div className="eyebrow">Citizen trust</div>
          <div className="val">{trust?.trust_score ?? trust?.score ?? '—'}</div>
          <div className="label">Trust score</div>
        </div>
        <div className="card stat-tile">
          <div className="eyebrow">Hotspots</div>
          <div className="val">{hotspots?.hotspots?.length ?? 0}</div>
          <div className="label">Recurring problem areas</div>
        </div>
      </div>

      {wardChartData.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 20 }}>
          <div className="eyebrow">By ward</div>
          <h3 className="section-title" style={{ marginBottom: 14 }}>Civic Health Index</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={wardChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" fill="#C68A1E" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card card-pad">
          <div className="eyebrow">Performance</div>
          <h3 className="section-title" style={{ marginBottom: 12 }}>Department efficiency</h3>
          <table className="data-table">
            <thead><tr><th>Department</th><th>Resolved</th><th>Avg hrs</th><th>SLA %</th></tr></thead>
            <tbody>
              {(deptEfficiency?.departments || []).map((d, i) => (
                <tr key={i}>
                  <td>{d.department_name}</td>
                  <td>{d.resolved ?? d.total_resolved ?? '—'}</td>
                  <td>{d.avg_resolution_hours ?? '—'}</td>
                  <td>{d.sla_compliance_pct ?? d.sla_met_pct ?? '—'}</td>
                </tr>
              ))}
              {!deptEfficiency?.departments && deptEfficiency && (
                <tr>
                  <td>{deptEfficiency.department_name || 'Department'}</td>
                  <td>{deptEfficiency.resolved ?? '—'}</td>
                  <td>{deptEfficiency.avg_resolution_hours ?? '—'}</td>
                  <td>{deptEfficiency.sla_compliance_pct ?? '—'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card card-pad">
          <div className="eyebrow">Recurring issues</div>
          <h3 className="section-title" style={{ marginBottom: 12 }}>Hotspots</h3>
          <table className="data-table">
            <thead><tr><th>Location</th><th>Category</th><th>Occurrences</th></tr></thead>
            <tbody>
              {(hotspots?.hotspots || []).slice(0, 10).map((h, i) => (
                <tr key={i}>
                  <td>{h.ward || h.location || h.area || '—'}</td>
                  <td>{h.category || '—'}</td>
                  <td>{h.occurrences || h.count || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 20 }}>
        <div className="row space-between">
          <div>
            <div className="eyebrow">Export</div>
            <h3 className="section-title">Download raw data</h3>
          </div>
          <button className="btn btn-ghost" onClick={downloadCsv}>Download complaints.csv</button>
        </div>
      </div>
    </AppShell>
  );
}
