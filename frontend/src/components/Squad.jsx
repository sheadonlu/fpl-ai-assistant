const POSITIONS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

const POSITION_COLORS = {
  1: 'bg-yellow-500',
  2: 'bg-blue-500',
  3: 'bg-green-500',
  4: 'bg-red-500',
};

function PlayerCard({ player }) {
  return (
    <div className={`bg-gray-800 rounded-lg p-3 border ${player.isCaptain ? 'border-green-500' : 'border-gray-700'} flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <span className={`${POSITION_COLORS[player.position]} text-black text-xs font-bold px-2 py-1 rounded`}>
          {POSITIONS[player.position]}
        </span>
        <div>
          <p className="text-white font-medium text-sm">
            {player.name}
            {player.isCaptain && <span className="ml-2 text-green-400 text-xs">(C)</span>}
            {player.isViceCaptain && <span className="ml-2 text-yellow-400 text-xs">(VC)</span>}
          </p>
          <p className="text-gray-400 text-xs">Form: {player.form}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-white text-sm font-semibold">{player.totalPoints}pts</p>
        <p className="text-gray-400 text-xs">£{player.price}m</p>
      </div>
    </div>
  );
}

function Squad({ squad }) {
  const starting = squad.filter(p => p.multiplier > 0);
  const bench = squad.filter(p => p.multiplier === 0);

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-bold text-white mb-4">Starting XI</h2>
        <div className="space-y-2">
          {starting.map(player => (
            <PlayerCard key={player.playerId} player={player} />
          ))}
        </div>
      </div>
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-bold text-white mb-4">Bench</h2>
        <div className="space-y-2">
          {bench.map(player => (
            <PlayerCard key={player.playerId} player={player} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Squad;