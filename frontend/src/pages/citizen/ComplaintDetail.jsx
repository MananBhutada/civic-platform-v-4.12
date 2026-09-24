import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import {
  complaintsApi, communityApi, evidenceApi, uploadApi, adminApi, apiError,
} from '../../api/client';
import { Loader, StatusStamp, PriorityChip, timeAgo, STATUS_LABELS } from '../../components/Common';
import { categoryLabel } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const basePathForRole = (role) => (role === 'citizen' ? '/citizen' : role === 'officer' ? '/officer' : '/admin');

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const basePath = basePathForRole(user?.role);

  const [complaint, setComplaint] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [comments, setComments] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, cm, ev] = await Promise.all([
      complaintsApi.get(id),
      communityApi.listComments(id).catch(() => ({ data: { comments: [] } })),
      evidenceApi.list(id).catch(() => ({ data: { evidence: [] } })),
    ]);
    setComplaint(c.data.complaint);
    setTimeline(c.data.timeline || []);
    setComments(cm.data.comments || []);
    setEvidence(ev.data.evidence || []);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setBusy(true);
    try { await load(); } finally { setBusy(false); }
  };

  if (loading) {
    return <AppShell title="Complaint"><Loader /></AppShell>;
  }
  if (!complaint) {
    return <AppShell title="Not found"><p>This complaint could not be found.</p></AppShell>;
  }

  const isOwner = complaint.user_id === user?.id;
  const isAssignedOfficer = complaint.assigned_officer_id === user?.id;
  const isGovStaff = ['admin', 'department', 'officer'].includes(user?.role);

  return (
    <AppShell title={complaint.title} subtitle={`Filed ${timeAgo(complaint.created_at)} · ${complaint.reporter_name || 'Citizen'}`}>
      <div className="row space-between" style={{ marginBottom: 16 }}>
        <Link to={`${basePath}${basePath === '/admin' ? '/complaints' : basePath === '/citizen' ? '/my' : ''}`} className="btn btn-ghost btn-sm">{'\u2190'} Back to list</Link>
        <div className="row gap-8">
          <PriorityChip score={complaint.priority_score} />
          <StatusStamp status={complaint.status} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
        <div className="stack gap-16">
          <div className="card card-pad">
            {complaint.image_url && (
              <img src={complaint.image_url} alt={complaint.title} style={{ width: '100%', borderRadius: 6, marginBottom: 16, maxHeight: 340, objectFit: 'cover' }} />
            )}
            <div className="eyebrow">{categoryLabel(complaint.category)}</div>
            <h2 className="section-title" style={{ margin: '4px 0 10px', fontSize: 20 }}>{complaint.title}</h2>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>{complaint.description}</p>
            <hr className="rule" />
            <div className="grid grid-2" style={{ fontSize: 12.5 }}>
              <div><span className="muted">Address</span><div>{complaint.address || '—'}</div></div>
              <div><span className="muted">Ward</span><div>{complaint.ward || '—'}, {complaint.city || '—'}</div></div>
              <div><span className="muted">Department</span><div>{complaint.department_name || 'Not yet assigned'}</div></div>
              <div><span className="muted">Case ID</span><div className="mono">{complaint.id.slice(0, 8)}</div></div>
            </div>
            {isGovStaff && (
              <>
                <hr className="rule" />
                <div className="row gap-8">
                  <a className="btn btn-ghost btn-sm" href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`} target="_blank" rel="noreferrer">Open in Maps</a>
                </div>
              </>
            )}
          </div>

          <div className="card card-pad">
            <div className="eyebrow">Register trail</div>
            <h3 className="section-title" style={{ marginBottom: 14 }}>Status timeline</h3>
            <Timeline timeline={timeline} />
          </div>

          <EvidenceSection evidence={evidence} />

          <CommentsSection complaintId={id} comments={comments} onPosted={refresh} />
        </div>

        <div className="stack gap-16">
          {user?.role === 'citizen' && (
            <CitizenActions complaint={complaint} isOwner={isOwner} onChanged={refresh} toast={toast} busy={busy} />
          )}
          {user?.role === 'officer' && (
            <OfficerActions complaint={complaint} isAssignedOfficer={isAssignedOfficer} onChanged={refresh} toast={toast} />
          )}
          {(user?.role === 'admin' || user?.role === 'department') && (
            <AdminActions complaint={complaint} onChanged={refresh} toast={toast} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Timeline({ timeline }) {
  if (!timeline.length) return <p className="faint">No entries yet.</p>;
  return (
    <div className="timeline">
      {timeline.map((t) => (
        <div key={t.id} className="timeline-item">
          <div className="when">{new Date(t.created_at).toLocaleString('en-IN')}</div>
          <div className="what">{STATUS_LABELS[t.status] || t.status}{t.updated_by_name ? ` · ${t.updated_by_name}` : ''}</div>
          {t.remarks && <div className="remarks">{t.remarks}</div>}
        </div>
      ))}
    </div>
  );
}

function EvidenceSection({ evidence }) {
  if (!evidence.length) return null;
  return (
    <div className="card card-pad">
      <div className="eyebrow">Field proof</div>
      <h3 className="section-title" style={{ marginBottom: 14 }}>Before / after evidence</h3>
      <div className="grid grid-2">
        {evidence.map((e) => (
          <div key={e.id}>
            <img src={e.image_url} alt={e.type} style={{ width: '100%', borderRadius: 6, marginBottom: 6 }} />
            <div className="row space-between">
              <span className="faint" style={{ textTransform: 'capitalize' }}>{e.type} · {e.officer_name}</span>
              {e.gps_verified !== null && (
                <span className="faint">{e.gps_verified ? 'GPS ✓' : 'GPS mismatch'}</span>
              )}
            </div>
            {e.notes && <div className="faint">{e.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentsSection({ complaintId, comments, onPosted }) {
  const [text, setText] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [posting, setPosting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      await communityApi.addComment(complaintId, { comment: text.trim(), is_confirmation: confirm });
      setText('');
      setConfirm(false);
      onPosted();
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="card card-pad">
      <div className="eyebrow">Community verification</div>
      <h3 className="section-title" style={{ marginBottom: 14 }}>
        Comments {comments.length ? `(${comments.length})` : ''}
      </h3>
      <div className="stack gap-12" style={{ marginBottom: 16 }}>
        {comments.length === 0 && <p className="faint">No comments yet — be the first to weigh in.</p>}
        {comments.map((c) => (
          <div key={c.id} style={{ borderBottom: '1px dashed var(--line)', paddingBottom: 10 }}>
            <div className="row space-between">
              <strong style={{ fontSize: 12.5 }}>{c.user_name}</strong>
              <span className="faint">{timeAgo(c.created_at)}</span>
            </div>
            <p style={{ fontSize: 13, margin: '4px 0 0' }}>{c.comment}</p>
            {c.is_confirmation && <span className="stamp stamp-resolved" style={{ marginTop: 6 }}>Confirmed on ground</span>}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="stack gap-8">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an update or confirmation…" style={{ minHeight: 64 }} />
        <label className="row gap-8" style={{ fontSize: 12.5 }}>
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} style={{ width: 'auto' }} />
          I can confirm this issue on the ground
        </label>
        <button className="btn btn-ghost" disabled={posting} type="submit">{posting ? 'Posting…' : 'Post comment'}</button>
      </form>
    </div>
  );
}

function CitizenActions({ complaint, isOwner, onChanged, toast }) {
  const [busy, setBusy] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');

  const upvote = async () => {
    setBusy(true);
    try {
      await complaintsApi.upvote(complaint.id);
      toast.success('Upvoted — priority raised.');
      onChanged();
    } catch (err) {
      toast.error(apiError(err, 'Could not upvote this complaint.'));
    } finally { setBusy(false); }
  };

  const bookmark = async () => {
    setBusy(true);
    try {
      const { data } = await communityApi.toggleBookmark(complaint.id);
      setBookmarked(data.bookmarked);
      toast.success(data.bookmarked ? 'Bookmarked.' : 'Removed from bookmarks.');
    } catch (err) {
      toast.error(apiError(err));
    } finally { setBusy(false); }
  };

  const withdraw = async () => {
    if (!window.confirm('Withdraw this complaint? This marks it as rejected.')) return;
    setBusy(true);
    try {
      await complaintsApi.remove(complaint.id);
      toast.success('Complaint withdrawn.');
      onChanged();
    } catch (err) {
      toast.error(apiError(err));
    } finally { setBusy(false); }
  };

  const verify = async (confirmed) => {
    setBusy(true);
    try {
      await complaintsApi.citizenVerify(complaint.id, { confirmed, remarks: confirmed ? 'Confirmed by citizen' : 'Disputed by citizen' });
      toast.success(confirmed ? 'Marked as closed. Thanks for confirming!' : 'Reopened — an officer will revisit this.');
      onChanged();
    } catch (err) {
      toast.error(apiError(err));
    } finally { setBusy(false); }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await complaintsApi.feedback(complaint.id, { rating, comment: feedback });
      toast.success('Feedback recorded. Thank you.');
    } catch (err) {
      toast.error(apiError(err));
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="card card-pad">
        <div className="eyebrow">Actions</div>
        <div className="stack gap-8" style={{ marginTop: 10 }}>
          <button className="btn btn-ghost" onClick={upvote} disabled={busy}>{'\u2605'} Upvote this report</button>
          <button className="btn btn-ghost" onClick={bookmark} disabled={busy}>{bookmarked ? 'Remove bookmark' : 'Bookmark this report'}</button>
          {isOwner && complaint.status === 'reported' && (
            <button className="btn btn-danger" onClick={withdraw} disabled={busy}>Withdraw complaint</button>
          )}
        </div>
      </div>

      {isOwner && (complaint.status === 'resolved' || complaint.status === 'citizen_verification') && (
        <div className="card card-pad">
          <div className="eyebrow">Your confirmation needed</div>
          <h3 className="section-title" style={{ marginBottom: 10 }}>Is this actually fixed?</h3>
          <p className="faint" style={{ marginBottom: 12 }}>An officer marked this resolved. Confirm to close it, or reopen if the issue remains.</p>
          <div className="row gap-8">
            <button className="btn btn-seal" onClick={() => verify(true)} disabled={busy}>Yes, it's fixed</button>
            <button className="btn btn-danger" onClick={() => verify(false)} disabled={busy}>Not fixed — reopen</button>
          </div>
        </div>
      )}

      {isOwner && complaint.status === 'resolved' && (
        <div className="card card-pad">
          <div className="eyebrow">Rate the resolution</div>
          <h3 className="section-title" style={{ marginBottom: 10 }}>Leave feedback</h3>
          <form onSubmit={submitFeedback} className="stack gap-10">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Rating</label>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {'\u2605'.repeat(n)}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Comment <span className="faint">(optional)</span></label>
              <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="How was the resolution handled?" />
            </div>
            <button className="btn btn-ghost" disabled={busy} type="submit">Submit feedback</button>
          </form>
        </div>
      )}
    </>
  );
}

function OfficerActions({ complaint, isAssignedOfficer, onChanged, toast }) {
  const [busy, setBusy] = useState(false);
  const [remarks, setRemarks] = useState('');
  const fileRef = useRef(null);
  const [evidenceType, setEvidenceType] = useState('before');

  const run = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      onChanged();
    } catch (err) {
      toast.error(apiError(err, 'Action failed.'));
    } finally { setBusy(false); }
  };

  const uploadEvidence = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const up = await uploadApi.complaintImage(file);
      let coords = {};
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }; resolve(); },
            () => resolve(),
            { timeout: 6000 }
          );
        });
      }
      await evidenceApi.upload(complaint.id, { type: evidenceType, image_url: up.data.image_url, ...coords });
      toast.success(`${evidenceType === 'before' ? 'Before' : 'After'} photo attached.`);
      onChanged();
    } catch (err) {
      toast.error(apiError(err, 'Could not upload evidence.'));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!isAssignedOfficer) {
    return (
      <div className="card card-pad">
        <div className="eyebrow">Field actions</div>
        <p className="faint" style={{ marginTop: 8 }}>This complaint is not assigned to you, so actions are read-only here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="card card-pad">
        <div className="eyebrow">Field actions</div>
        <h3 className="section-title" style={{ marginBottom: 10 }}>Move this complaint forward</h3>
        <div className="field">
          <label>Remarks <span className="faint">(optional)</span></label>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Notes for the register" style={{ minHeight: 60 }} />
        </div>
        <div className="stack gap-8">
          {complaint.status === 'assigned' && (
            <button className="btn btn-seal" disabled={busy} onClick={() => run(() => complaintsApi.accept(complaint.id), 'Accepted. Get to it!')}>Accept assignment</button>
          )}
          {complaint.status === 'accepted' && (
            <button className="btn btn-seal" disabled={busy} onClick={() => run(() => complaintsApi.startWork(complaint.id, { remarks }), 'Work started.')}>Start work</button>
          )}
          {(complaint.status === 'work_started' || complaint.status === 'in_progress') && (
            <>
              <button className="btn btn-ghost" disabled={busy} onClick={() => run(() => complaintsApi.submitInspection(complaint.id, { remarks }), 'Submitted for inspection.')}>Submit for inspection</button>
              <button className="btn btn-seal" disabled={busy} onClick={() => run(() => complaintsApi.resolve(complaint.id, { remarks }), 'Marked resolved.')}>Mark resolved</button>
            </>
          )}
          {complaint.status === 'under_inspection' && (
            <button className="btn btn-seal" disabled={busy} onClick={() => run(() => complaintsApi.resolve(complaint.id, { remarks }), 'Marked resolved.')}>Mark resolved</button>
          )}
          {['resolved', 'closed', 'citizen_verification', 'rejected'].includes(complaint.status) && (
            <p className="faint">No further field action needed at this stage.</p>
          )}
        </div>
      </div>

      <div className="card card-pad">
        <div className="eyebrow">Evidence</div>
        <h3 className="section-title" style={{ marginBottom: 10 }}>Attach before/after photo</h3>
        <div className="field">
          <label>Photo type</label>
          <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)}>
            <option value="before">Before</option>
            <option value="after">After (required to resolve)</option>
          </select>
        </div>
        <button className="btn btn-ghost btn-block" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? 'Uploading…' : `Upload ${evidenceType} photo`}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadEvidence} />
      </div>
    </>
  );
}

function AdminActions({ complaint, onChanged, toast }) {
  const [busy, setBusy] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [deptId, setDeptId] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    adminApi.departments().then(({ data }) => setDepartments(data || [])).catch(() => {});
  }, []);

  const assignDept = async () => {
    if (!deptId) return;
    setBusy(true);
    try {
      await adminApi.assignDepartment(complaint.id, deptId);
      toast.success('Department assigned.');
      onChanged();
    } catch (err) {
      toast.error(apiError(err));
    } finally { setBusy(false); }
  };

  const reject = async () => {
    if (!window.confirm('Reject this complaint?')) return;
    setBusy(true);
    try {
      await complaintsApi.updateStatus(complaint.id, { status: 'rejected', remarks: remarks || 'Rejected by governance staff' });
      toast.success('Complaint rejected.');
      onChanged();
    } catch (err) {
      toast.error(apiError(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="card card-pad">
      <div className="eyebrow">Governance actions</div>
      <h3 className="section-title" style={{ marginBottom: 10 }}>Route &amp; oversee</h3>

      {!complaint.assigned_department_id && (
        <div className="field">
          <label>Assign department</label>
          <select value={deptId} onChange={(e) => setDeptId(e.target.value)}>
            <option value="">Select department…</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="btn btn-seal btn-sm" style={{ marginTop: 8 }} disabled={busy || !deptId} onClick={assignDept}>Assign department</button>
        </div>
      )}

      {!['closed', 'rejected', 'resolved'].includes(complaint.status) && (
        <>
          <hr className="rule" />
          <div className="field">
            <label>Reject this complaint</label>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Reason for rejection" style={{ minHeight: 50 }} />
            <button className="btn btn-danger btn-sm" style={{ marginTop: 8 }} disabled={busy} onClick={reject}>Reject complaint</button>
          </div>
        </>
      )}
    </div>
  );
}
