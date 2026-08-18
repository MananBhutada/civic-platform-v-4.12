export function Loader({ label = 'Loading register…' }) {
  return (
    <div className="loader-line">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ glyph = '\u2732', title, body }) {
  return (
    <div className="empty">
      <div className="glyph">{glyph}</div>
      <h3>{title}</h3>
      {body && <p className="faint">{body}</p>}
    </div>
  );
}

export const STATUS_LABELS = {
  reported: 'Reported',
  verified: 'Verified',
  assigned: 'Assigned',
  accepted: 'Accepted',
  work_started: 'Work Started',
  in_progress: 'In Progress',
  under_inspection: 'Under Inspection',
  resolved: 'Resolved',
  citizen_verification: 'Awaiting Your Verification',
  closed: 'Closed',
  reopened: 'Reopened',
  rejected: 'Rejected',
};

export function StatusStamp({ status }) {
  if (!status) return null;
  return (
    <span className={`stamp stamp-${status}`}>
      <span className="dot" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function PriorityChip({ score }) {
  if (score === null || score === undefined) return null;
  const band = score >= 75 ? 'high' : score >= 40 ? 'medium' : 'low';
  const label = band === 'high' ? 'High' : band === 'medium' ? 'Medium' : 'Low';
  return <span className={`priority-chip priority-${band}`}>{label} · {Math.round(score)}</span>;
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Modal({ title, onClose, children, width }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={width ? { maxWidth: width } : undefined}>
        <div className="modal-head">
          <h3 style={{ fontSize: 16 }}>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
