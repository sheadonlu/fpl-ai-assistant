const POSITIONS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

export default function Ticker({ squad = [], managerData }) {
  const starting = squad.filter(p => p.multiplier > 0);

  const items = [
    managerData?.totalPoints != null &&
      `Total · ${managerData.totalPoints.toLocaleString()} pts`,
    managerData?.overallRank &&
      `Rank · ${Number(managerData.overallRank).toLocaleString()}`,
    managerData?.teamName &&
      `Team · ${managerData.teamName}`,
    ...starting.map(p => `${p.name} · ${POSITIONS[p.position]} · ${p.form} form`),
  ].filter(Boolean);

  const fallback = [
    'FPL AI · Squad Intelligence',
    'Captain Picks · Transfer Advice',
    'Fixture Difficulty Ratings',
    'Chip Strategy · Wildcard Timing',
    'Live GW Points · Form Data',
  ];

  const display = items.length > 0 ? items : fallback;
  const doubled = [...display, ...display];

  return (
    <div className="fpl-ticker" aria-hidden="true">
      <div className="fpl-ticker-track">
        {doubled.map((item, i) => (
          <div key={i} className="fpl-ticker-item">
            <span className="fpl-ticker-dot" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}