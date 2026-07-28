import { useState } from 'react';

export default function TeamIdForm({ onSubmit, loading, error }) {
  const [teamId, setTeamId] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (teamId.trim()) onSubmit(teamId.trim());
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit(e);
  }

  return (
    <div className="fpl-hero">
      <div className="fpl-hero-eyebrow">Fantasy Premier League Intelligence</div>

      <h1 className="fpl-hero-title">
        Your squad.<br />
        <em>Optimised.</em>
      </h1>

      <div className="fpl-hero-bottom">
        <p className="fpl-hero-copy">
          AI-powered squad analysis, transfer recommendations, and captain
          picks — built on live FPL data and fixture intelligence.
        </p>

        <div className="fpl-hero-form">
          <span className="fpl-hero-form-label">Enter your FPL Team ID</span>
          <div className="fpl-hero-input-row">
            <input
              className="fpl-hero-input"
              type="number"
              placeholder="e.g. 4829501"
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button
              className="fpl-hero-btn"
              onClick={handleSubmit}
              disabled={loading || !teamId.trim()}
            >
              {loading ? 'Loading...' : 'Analyse →'}
            </button>
          </div>
          {error && <span className="fpl-hero-error">{error}</span>}
        </div>
      </div>
    </div>
  );
}