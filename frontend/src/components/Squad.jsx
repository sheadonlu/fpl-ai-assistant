const POSITIONS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

function Squad({ squad }) {
  const starting = squad.filter(p => p.multiplier > 0);
  const bench = squad.filter(p => p.multiplier === 0);

  return (
    <div>
      <h2>Starting XI</h2>
      {starting.map(player => (
        <div key={player.playerId}>
          <span>{POSITIONS[player.position]}</span>
          <span>{player.name}</span>
          <span>£{player.price}m</span>
          <span>Form: {player.form}</span>
          <span>{player.totalPoints}pts</span>
          {player.isCaptain && <span>(C)</span>}
          {player.isViceCaptain && <span>(VC)</span>}
        </div>
      ))}

      <h2>Bench</h2>
      {bench.map(player => (
        <div key={player.playerId}>
          <span>{POSITIONS[player.position]}</span>
          <span>{player.name}</span>
          <span>£{player.price}m</span>
          <span>Form: {player.form}</span>
          <span>{player.totalPoints}pts</span>
        </div>
      ))}
    </div>
  );
}

export default Squad;