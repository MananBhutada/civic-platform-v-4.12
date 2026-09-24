import { BrowserRouter, Routes, Route, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/AppShell';

import Login       from './pages/auth/Login';
import Register    from './pages/auth/Register';
import VerifyOtp   from './pages/auth/VerifyOtp';
import PublicFeed  from './pages/PublicFeed';
import PublicComplaintDetail from './pages/PublicComplaintDetail';
import RoleRedirect from './pages/RoleRedirect';
import NotFound    from './pages/NotFound';

import CitizenDashboard from './pages/citizen/CitizenDashboard';
import NewComplaint     from './pages/citizen/NewComplaint';
import MyComplaints     from './pages/citizen/MyComplaints';
import Nearby           from './pages/citizen/Nearby';
import Bookmarks        from './pages/citizen/Bookmarks';
import ComplaintDetail  from './pages/citizen/ComplaintDetail';

// Officer/Leave-approval features fully removed — out of scope for
// the pothole → NMC/NHAI bridge (pages and backend routes deleted).
import AdminDashboard   from './pages/admin/AdminDashboard';
import AllComplaints    from './pages/admin/AllComplaints';
import ReviewQueue      from './pages/admin/ReviewQueue';
import GeoMap           from './pages/admin/GeoMap';
import Analytics        from './pages/admin/Analytics';
import AuditLog         from './pages/admin/AuditLog';
import GlobalSearch     from './pages/admin/GlobalSearch';

// ── Google OAuth callback handler ─────────────────────────────
// After Google login, backend redirects to /oauth-success?token=...
function OAuthSuccess() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate  = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (!token) { navigate('/login'); return; }

    // Decode JWT payload to get user info
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Fetch full user profile using the token
      // VITE_API_URL already includes the /api prefix — see api/client.js.
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          login(token, data.user);
          navigate('/');
        } else {
          navigate('/login');
        }
      })
      .catch(() => navigate('/login'));
    } catch {
      navigate('/login');
    }
  }, []);

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-faint)' }}>
      Signing you in with Google...
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* ── Public routes (no login needed) ─────── */}
              <Route path="/feed"          element={<PublicFeed />} />
              <Route path="/public/complaints/:id" element={<PublicComplaintDetail />} />
              <Route path="/login"         element={<Login />} />
              <Route path="/register"      element={<Register />} />
              <Route path="/verify-otp"    element={<VerifyOtp />} />
              <Route path="/oauth-success" element={<OAuthSuccess />} />
              <Route path="/"              element={<RoleRedirect />} />

              {/* ── Citizen (login required) ─────────────── */}
              <Route element={<ProtectedRoute roles={['citizen']} />}>
                <Route path="/citizen"                  element={<CitizenDashboard />} />
                <Route path="/citizen/new"              element={<NewComplaint />} />
                <Route path="/citizen/my"               element={<MyComplaints />} />
                <Route path="/citizen/nearby"           element={<Nearby />} />
                <Route path="/citizen/bookmarks"        element={<Bookmarks />} />
                <Route path="/citizen/complaints/:id"   element={<ComplaintDetail />} />
              </Route>

              {/* Officer role/dashboard removed — out of scope for the
                  pothole → NMC/NHAI bridge (see git history for prior
                  OfficerDashboard.jsx / LeaveRequests.jsx). */}

              {/* ── Admin / Department ───────────────────── */}
              <Route element={<ProtectedRoute roles={['admin','department']} />}>
                <Route path="/admin"                    element={<AdminDashboard />} />
                <Route path="/admin/complaints"         element={<AllComplaints />} />
                <Route path="/admin/review-queue"       element={<ReviewQueue />} />
                <Route path="/admin/complaints/:id"     element={<ComplaintDetail />} />
                <Route path="/admin/map"                element={<GeoMap />} />
                <Route path="/admin/analytics"          element={<Analytics />} />
                <Route path="/admin/audit"              element={<AuditLog />} />
                <Route path="/admin/search"             element={<GlobalSearch />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
