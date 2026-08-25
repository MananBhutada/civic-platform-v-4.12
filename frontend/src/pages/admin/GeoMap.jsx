import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AppShell } from '../../components/AppShell';
import { geoApi } from '../../api/client';
import { Loader } from '../../components/Common';
import { categoryLabel, CATEGORIES } from '../../utils/constants';

const priorityColor = (score) => (score >= 75 ? '#8C2F2F' : score >= 40 ? '#C68A1E' : '#3F6B4B');

export default function GeoMap() {
  const [features, setFeatures] = useState([]);
  const [wards, setWards] = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      geoApi.complaintsGeoJSON(category ? { category } : {}),
      geoApi.wardStats(),
    ]).then(([g, w]) => {
      setFeatures(g.data.features || []);
      setWards(w.data.wards || []);
    }).finally(() => setLoading(false));
  }, [category]);

  const center = features.length
    ? [features[0].geometry.coordinates[1], features[0].geometry.coordinates[0]]
    : [21.1458, 79.0882]; // Nagpur as a sane default centre

  return (
    <AppShell title="GIS Map" subtitle="Complaint locations across the city">
      <div className="filter-bar">
        <button className={`pill ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>All categories</button>
        {CATEGORIES.map((c) => (
          <button key={c.value} className={`pill ${category === c.value ? 'active' : ''}`} onClick={() => setCategory(c.value)}>{c.label}</button>
        ))}
      </div>

      {loading ? <Loader /> : (
        <>
          <div className="map-box" style={{ height: 480, marginBottom: 20 }}>
            <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {features.map((f) => (
                <CircleMarker
                  key={f.properties.id}
                  center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                  radius={6}
                  pathOptions={{ color: priorityColor(f.properties.priority_score), fillColor: priorityColor(f.properties.priority_score), fillOpacity: 0.7 }}
                >
                  <Popup>
                    <strong>{f.properties.title}</strong><br />
                    {categoryLabel(f.properties.category)} · {f.properties.status}<br />
                    Priority: {Math.round(f.properties.priority_score)}<br />
                    <Link to={`/admin/complaints/${f.properties.id}`}>View complaint →</Link>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          <div className="card card-pad">
            <div className="eyebrow">Choropleth data</div>
            <h3 className="section-title" style={{ marginBottom: 12 }}>Ward statistics</h3>
            <table className="data-table">
              <thead><tr><th>Ward</th><th>Total</th><th>Pending</th><th>Avg. priority</th></tr></thead>
              <tbody>
                {wards.map((w) => (
                  <tr key={w.ward_id || w.ward}>
                    <td>{w.ward || '—'}</td>
                    <td>{w.total}</td>
                    <td>{w.pending}</td>
                    <td>{w.avg_priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
