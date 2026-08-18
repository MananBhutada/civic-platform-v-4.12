import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, apiError } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';

// VITE_API_URL already includes the /api prefix — see api/client.js.
const GOOGLE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`;

export default function Register() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [form, setForm]   = useState({ name:'', email:'', password:'', role:'citizen' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      navigate('/verify-otp', { state: { email: data.email || form.email, type: 'register' } });
    } catch (err) {
      setError(apiError(err, 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell" style={{ position:'relative' }}>

      {/* Dark mode toggle */}
      <button
        onClick={toggle}
        style={{
          position:'absolute', top:16, right:16,
          background:'var(--paper-2)', border:'1px solid var(--line)',
          borderRadius:20, padding:'4px 12px',
          cursor:'pointer', fontSize:16, color:'var(--text)',
        }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="auth-card">
        <div className="auth-seal">N</div>
        <h1>Create account</h1>
        <p className="sub">Join the Nagar civic register</p>

        {error && <div className="auth-error">{error}</div>}

        {/* Google Sign Up — first */}
        <a
          href={GOOGLE_URL}
          style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            width:'100%', padding:'10px 16px', marginBottom:16,
            border:'1px solid var(--line)', borderRadius:'var(--radius)',
            background:'var(--paper-3)', color:'var(--text)',
            textDecoration:'none', fontSize:14, fontWeight:500,
            cursor:'pointer', transition:'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--paper-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--paper-3)'}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
          </svg>
          Sign up with Google
        </a>

        {/* Divider */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ flex:1, height:1, background:'var(--line)' }} />
          <span style={{ fontSize:12, color:'var(--text-faint)' }}>or with email</span>
          <div style={{ flex:1, height:1, background:'var(--line)' }} />
        </div>

        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Full name</label>
            <input type="text" name="name" required value={form.name} onChange={onChange} placeholder="Your name" />
          </div>
          <div className="field">
            <label>Email address</label>
            <input type="email" name="email" required value={form.email} onChange={onChange} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" name="password" required minLength={6} value={form.password} onChange={onChange} placeholder="At least 6 characters" />
          </div>
          <button className="btn btn-seal btn-block" disabled={loading} type="submit">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="auth-foot" style={{ marginTop:16 }}>
          <Link to="/feed" style={{ color:'var(--text-soft)', fontSize:13 }}>
            ← Browse issues without signing in
          </Link>
        </div>

        <div className="auth-foot">
          Already registered? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
