import { useState } from 'react';
import { useAuth } from '../context/useAuth';

export default function AuthModal({ onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await register(email, password);
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fpl-modal-overlay" onClick={handleOverlayClick}>
      <div className="fpl-modal">
        <button className="fpl-modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="fpl-modal-tabs">
          <button
            className={`fpl-modal-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(null); }}
            type="button"
          >
            Log in
          </button>
          <button
            className={`fpl-modal-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(null); }}
            type="button"
          >
            Register
          </button>
        </div>

        <form className="fpl-modal-form" onSubmit={handleSubmit}>
          <label className="fpl-modal-label">
            Email
            <input
              className="fpl-modal-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              required
            />
          </label>

          <label className="fpl-modal-label">
            Password
            <input
              className="fpl-modal-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={mode === 'register' ? 8 : undefined}
              required
            />
          </label>

          {mode === 'register' && (
            <label className="fpl-modal-label">
              Confirm password
              <input
                className="fpl-modal-input"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </label>
          )}

          {error && <span className="fpl-hero-error">{error}</span>}

          <button className="fpl-hero-btn" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'register' ? 'Create account →' : 'Log in →'}
          </button>
        </form>
      </div>
    </div>
  );
}
