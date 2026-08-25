import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { authApi, apiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { email, type } = location.state || {};
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    timerRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [cooldown]);

  if (!email || !type) {
    return <Navigate to="/login" replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const call = type === 'register' ? authApi.verifyRegisterOtp : authApi.verifyLoginOtp;
      const { data } = await call({ email, otp });
      login(data.token, data.user);
      const role = data.user.role;
      if (role === 'citizen') navigate('/citizen');
      else if (role === 'officer') navigate('/officer');
      else navigate('/admin');
    } catch (err) {
      setError(apiError(err, 'Could not verify that code.'));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    setInfo('');
    try {
      await authApi.resendOtp({ email, type });
      setInfo(`A fresh code was sent to ${email}.`);
      setCooldown(30);
    } catch (err) {
      setError(apiError(err, 'Could not resend the code.'));
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-seal">✓</div>
        <h1>Verify it's you</h1>
        <p className="sub">Enter the 6-digit code sent to <strong>{email}</strong></p>

        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-error" style={{ background: 'var(--stamp-green-soft)', color: 'var(--stamp-green)' }}>{info}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Verification code</label>
            <input
              className="auth-otp-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus
            />
            <div className="hint">Codes expire after 10 minutes and lock after 3 wrong tries.</div>
          </div>
          <button className="btn btn-seal btn-block" disabled={loading || otp.length !== 6} type="submit">
            {loading ? 'Verifying…' : 'Verify & continue'}
          </button>
        </form>

        <div className="auth-foot">
          Didn't get a code?{' '}
          <button
            className="btn btn-ghost btn-sm"
            onClick={resend}
            disabled={cooldown > 0}
            style={{ marginLeft: 4 }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  );
}
