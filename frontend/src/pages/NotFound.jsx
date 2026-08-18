import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-seal">?</div>
        <h1>Page not found</h1>
        <p className="sub">This entry does not exist in the register.</p>
        <Link className="btn btn-seal btn-block" to="/">Return home</Link>
      </div>
    </div>
  );
}
