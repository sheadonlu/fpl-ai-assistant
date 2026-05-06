import { useState } from 'react';

function TeamIdForm({ onSubmit }) {
  const [teamId, setTeamId] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (teamId.trim()) onSubmit(teamId);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-2">Enter your FPL Team ID</h2>
        <p className="text-gray-400 text-sm mb-6">
          Find your ID on the FPL website → Points → check the URL
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="number"
            placeholder="e.g. 1234567"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg px-4 py-3 transition-colors"
          >
            Load My Team
          </button>
        </form>
      </div>
    </div>
  );
}

export default TeamIdForm;