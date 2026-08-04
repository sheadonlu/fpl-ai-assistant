import { useAuth } from '../context/useAuth';

export default function Nav({ teamId, managerData, onLoginClick, onSaveTeam, saved, saving }) {
  const { user, isAuthed, logout } = useAuth();

  return (
    <nav className="fpl-nav">
      <a href="#" className="fpl-nav-logo">
        FPL <span>AI</span>
      </a>

      {teamId && (
        <ul className="fpl-nav-links">
          <li><a href="#squad">Squad</a></li>
          <li><a href="#advice">Advice</a></li>
          <li><a href="#chat">Chat</a></li>
        </ul>
      )}

      <div className="fpl-nav-right">
        <div className="fpl-nav-meta">
          {managerData ? (
            <>
              <strong>{managerData.teamName || managerData.name || 'My Team'}</strong>
              <br />
              GW{managerData.gameweek || '—'} · {managerData.totalPoints ?? '—'}pts
            </>
          ) : (
            <>FPL Intelligence</>
          )}
        </div>

        {teamId && isAuthed && (
          <button
            className="fpl-nav-save"
            onClick={onSaveTeam}
            disabled={saving || saved}
            type="button"
          >
            {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save team'}
          </button>
        )}

        <div className="fpl-nav-auth">
          {isAuthed ? (
            <>
              <span className="fpl-nav-auth-email">{user.email}</span>
              <button className="fpl-nav-auth-btn" onClick={logout} type="button">Log out</button>
            </>
          ) : (
            <button className="fpl-nav-auth-btn" onClick={onLoginClick} type="button">Log in</button>
          )}
        </div>
      </div>
    </nav>
  );
}
