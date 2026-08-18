import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import NotificationBell from './NotificationBell';

const NAV = {
  citizen: [
    { section: 'Register', links: [
      { to: '/citizen', label: 'Dashboard', icon: '\u2302' },
      { to: '/citizen/new', label: 'File a Complaint', icon: '\u270E' },
      { to: '/citizen/my', label: 'My Complaints', icon: '\u2630' },
      { to: '/citizen/nearby', label: 'Nearby Reports', icon: '\u2299' },
      { to: '/citizen/bookmarks', label: 'Bookmarked', icon: '\u2605' },
    ]},
  ],
  officer: [
    { section: 'Fieldwork', links: [
      { to: '/officer', label: 'My Workload', icon: '\u2302' },
      { to: '/officer/leave', label: 'Leave Requests', icon: '\u2696' },
    ]},
  ],
  admin: [
    { section: 'Governance', links: [
      { to: '/admin', label: 'Overview', icon: '\u2302' },
      { to: '/admin/complaints', label: 'All Complaints', icon: '\u2630' },
      { to: '/admin/review-queue', label: 'Review Queue', icon: '\u26A0' },
      { to: '/admin/officers', label: 'Officers', icon: '\u263A' },
      { to: '/admin/leaves', label: 'Leave Requests', icon: '\u2696' },
      { to: '/admin/map', label: 'GIS Map', icon: '\u2299' },
      { to: '/admin/analytics', label: 'Analytics', icon: '\u2637' },
      { to: '/admin/audit', label: 'Audit Log', icon: '\u2637' },
      { to: '/admin/search', label: 'Global Search', icon: '\u2315' },
    ]},
  ],
  department: [
    { section: 'Governance', links: [
      { to: '/admin', label: 'Overview', icon: '\u2302' },
      { to: '/admin/complaints', label: 'All Complaints', icon: '\u2630' },
      { to: '/admin/review-queue', label: 'Review Queue', icon: '\u26A0' },
      { to: '/admin/officers', label: 'Officers', icon: '\u263A' },
      { to: '/admin/leaves', label: 'Leave Requests', icon: '\u2696' },
      { to: '/admin/map', label: 'GIS Map', icon: '\u2299' },
      { to: '/admin/analytics', label: 'Analytics', icon: '\u2637' },
      { to: '/admin/search', label: 'Global Search', icon: '\u2315' },
    ]},
  ],
};

export function ProtectedRoute({ roles }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export function AppShell({ title, subtitle, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = NAV[user?.role] || [];

  const doLogout = async () => {
    try { await authApi.logout(); } catch { /* token may already be gone */ }
    logout();
    navigate('/login');
  };

  const initials = (user?.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="mark">
            <span className="mark-seal">N</span>
            <div>
              <div className="name">Nagar Register</div>
            </div>
          </div>
          <div className="tag">Civic Complaint Ledger</div>
        </div>
        <nav className="sidebar-nav">
          {nav.map((group) => (
            <div key={group.section}>
              <div className="sidebar-section-label">{group.section}</div>
              {group.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/citizen' || link.to === '/officer' || link.to === '/admin'}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="icon">{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-meta">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={doLogout}>Sign out of register</button>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="row gap-12">
            <button className="mobile-menu-btn" onClick={() => setMobileOpen((o) => !o)}>\u2261</button>
            <div>
              <h1>{title}</h1>
              {subtitle && <div className="subtitle">{subtitle}</div>}
            </div>
          </div>
          <div className="topbar-actions">
            <NotificationBell />
          </div>
        </header>
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
}
