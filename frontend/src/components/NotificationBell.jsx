import { useEffect, useRef, useState, useCallback } from 'react';
import { notificationsApi } from '../api/client';
import { timeAgo } from './Common';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await notificationsApi.list({ limit: 15 });
      setItems(data.notifications || []);
      setUnread(data.unread_count || 0);
    } catch {
      /* silent — notification bell should never break the page */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const markRead = async (id) => {
    await notificationsApi.markRead(id);
    load();
  };

  const markAll = async () => {
    await notificationsApi.markAllRead();
    load();
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="notif-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        {'\u{1F514}'}
        {unread > 0 && <span className="count-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="row space-between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
            <strong style={{ fontSize: 12.5 }}>Notifications</strong>
            {unread > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAll}>Mark all read</button>
            )}
          </div>
          {items.length === 0 && (
            <div style={{ padding: 18, fontSize: 12.5, color: 'var(--text-soft)' }}>Nothing on file yet.</div>
          )}
          {items.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${!n.is_read ? 'unread' : ''}`}
              onClick={() => !n.is_read && markRead(n.id)}
              style={{ cursor: n.is_read ? 'default' : 'pointer' }}
            >
              <div className="t">{n.title || n.type || 'Update'}</div>
              <div>{n.message || n.body}</div>
              <div className="when">{timeAgo(n.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
