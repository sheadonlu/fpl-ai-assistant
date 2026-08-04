import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { API_BASE } from '../config';
import { useAuth } from '../context/useAuth';

const CATEGORIES = [
  { key: 'captainPick',    label: 'Captain pick',    className: '' },
  { key: 'transferAdvice', label: 'Transfer advice', className: 'warn' },
  { key: 'chipStrategy',   label: 'Chip strategy',   className: '' },
  { key: 'fixtureView',    label: 'Fixture view',    className: 'neutral' },
];

const mdComponents = {
  p:      ({ children }) => <p>{children}</p>,
  ul:     ({ children }) => <ul>{children}</ul>,
  ol:     ({ children }) => <ol>{children}</ol>,
  li:     ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong>{children}</strong>,
  h2:     ({ children }) => <h2>{children}</h2>,
  h3:     ({ children }) => <h3>{children}</h3>,
};

export default function AIAdvice({ teamId, onLoginClick }) {
  const [advice, setAdvice]   = useState(null);
  const [loading, setLoading] = useState(false);
  const { token, isAuthed, logout } = useAuth();

  async function fetchAdvice() {
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${API_BASE}/ai/advice/${teamId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAdvice(data.advice);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        setAdvice({
          captainPick: 'Your session expired. Please log in again.',
          transferAdvice: '', chipStrategy: '', fixtureView: '',
        });
      } else {
        setAdvice({
          captainPick: 'Could not fetch advice. Please try again.',
          transferAdvice: '', chipStrategy: '', fixtureView: '',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthed) {
    return (
      <div className="fpl-advice-grid">
        <div className="fpl-advice-fetch-wrap">
          <button className="fpl-advice-fetch-btn" onClick={onLoginClick} type="button">
            Log in to generate AI analysis →
          </button>
          <span className="fpl-advice-fetch-hint">
            Squad analysis is available once you're logged in
          </span>
        </div>
      </div>
    );
  }

  if (!advice && !loading) {
    return (
      <div className="fpl-advice-grid">
        <div className="fpl-advice-fetch-wrap">
          <button className="fpl-advice-fetch-btn" onClick={fetchAdvice}>
            Generate AI Analysis →
          </button>
          <span className="fpl-advice-fetch-hint">
            Analyses your full squad, fixtures, and form in one go
          </span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fpl-advice-grid">
        <div className="fpl-advice-fetch-wrap">
          <span className="fpl-advice-fetch-hint" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Analysing your squad…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-advice-grid">
      {CATEGORIES.map(({ key, label, className }) => (
        <div className="fpl-advice-cell" key={key}>
          <div className={`fpl-advice-tag ${className}`}>{label}</div>
          {advice[key] ? (
            <div className="fpl-advice-body">
              <ReactMarkdown components={mdComponents}>
                {advice[key]}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="fpl-advice-body" style={{ color: 'var(--cream-dimmer)', fontStyle: 'italic' }}>
              No specific advice for this category.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
