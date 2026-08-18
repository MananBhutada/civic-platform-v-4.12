import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { officersApi, adminApi, apiError } from '../../api/client';
import { Loader, EmptyState, Modal } from '../../components/Common';
import { OFFICER_RANKS } from '../../utils/constants';
import { useToast } from '../../context/ToastContext';

export default function Officers() {
  const toast = useToast();
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([officersApi.list(), adminApi.departments()])
      .then(([o, d]) => { setOfficers(o.data.officers || []); setDepartments(d.data || []); })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <AppShell title="Officers" subtitle="Field staff directory and workload">
      <div className="row space-between" style={{ marginBottom: 16 }}>
        <div className="faint">{officers.length} officer{officers.length === 1 ? '' : 's'} on record</div>
        <button className="btn btn-seal" onClick={() => setShowCreate(true)}>+ Add officer</button>
      </div>

      {loading ? <Loader /> : officers.length === 0 ? (
        <EmptyState title="No officers yet" body="Add your first field officer to start assigning complaints." />
      ) : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Rank</th><th>Department</th><th>Active</th><th>Available</th></tr></thead>
            <tbody>
              {officers.map((o) => (
                <tr key={o.id}>
                  <td>{o.name}<div className="faint">{o.email}</div></td>
                  <td style={{ textTransform: 'capitalize' }}>{(o.officer_rank || '').replace('_', ' ')}</td>
                  <td>{o.department_name || '—'}</td>
                  <td>{o.active_complaints}</td>
                  <td>{o.is_available ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateOfficerModal departments={departments} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} toast={toast} />
      )}
    </AppShell>
  );
}

function CreateOfficerModal({ departments, onClose, onCreated, toast }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', department_id: '', officer_rank: 'officer', max_active_complaints: 15 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await officersApi.create(form);
      toast.success('Officer account created.');
      onCreated();
    } catch (err) {
      setError(apiError(err, 'Could not create the officer.'));
    } finally { setSubmitting(false); }
  };

  return (
    <Modal title="Add a new officer" onClose={onClose}>
      {error && <div className="auth-error">{error}</div>}
      <form onSubmit={submit}>
        <div className="field"><label>Full name</label><input required name="name" value={form.name} onChange={onChange} /></div>
        <div className="grid grid-2">
          <div className="field"><label>Email</label><input required type="email" name="email" value={form.email} onChange={onChange} /></div>
          <div className="field"><label>Phone</label><input name="phone" value={form.phone} onChange={onChange} /></div>
        </div>
        <div className="field"><label>Temporary password</label><input required type="password" minLength={6} name="password" value={form.password} onChange={onChange} /></div>
        <div className="grid grid-2">
          <div className="field">
            <label>Department</label>
            <select required name="department_id" value={form.department_id} onChange={onChange}>
              <option value="">Select…</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Rank</label>
            <select name="officer_rank" value={form.officer_rank} onChange={onChange}>
              {OFFICER_RANKS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Max active complaints</label>
          <input type="number" name="max_active_complaints" min={1} value={form.max_active_complaints} onChange={onChange} />
        </div>
        <button className="btn btn-seal btn-block" disabled={submitting} type="submit">{submitting ? 'Creating…' : 'Create officer account'}</button>
      </form>
    </Modal>
  );
}
