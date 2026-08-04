import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { getTeams, deleteTeam as deleteTeamRequest } from '../api/authApi';

export default function TeamIdForm({ onSubmit, loading, error }) {
  const [teamId, setTeamId] = useState('');
  const { token, isAuthed } = useAuth();
  const [savedTeams, setSavedTeams] = useState([]);
  const [teamsError, setTeamsError] = useState(null);

  useEffect(() => {
    if (!isAuthed) return;
    getTeams(token)
      .then(setSavedTeams)
      .catch(err => setTeamsError(err.message));
  }, [isAuthed, token]);

  function handleSubmit(e) {
    e.preventDefault();
    if (teamId.trim()) onSubmit(teamId.trim());
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit(e);
  }

  async function handleDeleteSaved(e, id) {
    e.stopPropagation();
    try {
      await deleteTeamRequest(token, id);
      setSavedTeams(teams => teams.filter(t => t.id !== id));
    } catch (err) {
      setTeamsError(err.message);
    }
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
          {isAuthed && savedTeams.length > 0 && (
            <div className="fpl-saved-teams">
              <span className="fpl-hero-form-label">Your saved teams</span>
              <ul className="fpl-saved-teams-list">
                {savedTeams.map(t => (
                  <li key={t.id} className="fpl-saved-team" onClick={() => onSubmit(String(t.fpl_team_id))}>
                    <span>{t.nickname || `Team ${t.fpl_team_id}`}</span>
                    <button
                      className="fpl-saved-team-delete"
                      onClick={e => handleDeleteSaved(e, t.id)}
                      aria-label="Remove saved team"
                      type="button"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {teamsError && <span className="fpl-hero-error">{teamsError}</span>}

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
