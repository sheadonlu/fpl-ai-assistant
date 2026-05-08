const POSITIONS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

function PlayerCard({ player, isBench }) {
  const posLabel = POSITIONS[player.position] || '?';

  return (
    <div className="fpl-player-card">
      <div className="fpl-player-shirt">
        {posLabel}
        {player.isCaptain && (
          <span className="fpl-player-shirt-badge captain">C</span>
        )}
        {player.isViceCaptain && !player.isCaptain && (
          <span className="fpl-player-shirt-badge vice">V</span>
        )}
      </div>
      <div className="fpl-player-name" title={player.name}>
        {player.name.split(' ').pop()}
      </div>
      <div className={`fpl-player-pts${isBench ? ' bench' : ''}`}>
        {player.totalPoints}
      </div>
    </div>
  );
}

function PitchRow({ players, label, isBench }) {
  if (!players.length) return null;
  return (
    <>
      <div className="fpl-pitch-label">{label}</div>
      <div className="fpl-pitch-row">
        {players.map(p => (
          <PlayerCard key={p.playerId} player={p} isBench={isBench} />
        ))}
      </div>
    </>
  );
}

export default function Squad({ squad, manager, transfers }) {
  const starting = squad.filter(p => p.multiplier > 0);
  const bench    = squad.filter(p => p.multiplier === 0);

  const gks  = starting.filter(p => p.position === 1);
  const defs = starting.filter(p => p.position === 2);
  const mids = starting.filter(p => p.position === 3);
  const fwds = starting.filter(p => p.position === 4);

  const totPts = manager?.totalPoints;
  const rank   = manager?.overallRank;
  const bank   = transfers?.bank != null ? `£${transfers.bank}m` : '—';

  return (
    <>
      {/* Stats row */}
      <div className="fpl-stats-row">
        <div className="fpl-stat-cell">
          <div className="fpl-stat-label">Total Points</div>
          <div className="fpl-stat-value green">{totPts?.toLocaleString() ?? '—'}</div>
          <div className="fpl-stat-sub">Overall</div>
        </div>
        <div className="fpl-stat-cell">
          <div className="fpl-stat-label">Overall Rank</div>
          <div className="fpl-stat-value">{rank?.toLocaleString() ?? '—'}</div>
          <div className="fpl-stat-sub">Global position</div>
        </div>
        <div className="fpl-stat-cell">
          <div className="fpl-stat-label">In the Bank</div>
          <div className="fpl-stat-value green">{bank}</div>
          <div className="fpl-stat-sub">Available budget</div>
        </div>
        <div className="fpl-stat-cell">
          <div className="fpl-stat-label">Manager</div>
          <div className="fpl-stat-value" style={{ fontSize: '1.4rem' }}>
            {manager?.name ?? '—'}
          </div>
          <div className="fpl-stat-sub">GW{manager?.gameweek ?? '—'}</div>
        </div>
      </div>

      {/* Pitch */}
      <div className="fpl-pitch">
        <PitchRow players={gks}  label="Goalkeeper" />

        {defs.length > 0 && <hr className="fpl-pitch-divider" />}
        <PitchRow players={defs} label="Defenders" />

        {mids.length > 0 && <hr className="fpl-pitch-divider" />}
        <PitchRow players={mids} label="Midfielders" />

        {fwds.length > 0 && <hr className="fpl-pitch-divider" />}
        <PitchRow players={fwds} label="Forwards" />

        {bench.length > 0 && (
          <>
            <hr className="fpl-pitch-divider" style={{ marginTop: '2rem' }} />
            <PitchRow players={bench} label="Bench" isBench />
          </>
        )}
      </div>
    </>
  );
}