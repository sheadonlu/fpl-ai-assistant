export default function Nav({ teamId, managerData }) {
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
    </nav>
  );
}