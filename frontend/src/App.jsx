import { useState } from 'react';
import axios from 'axios';
import { API_BASE } from './config';
import TeamIdForm from './components/TeamIdForm';
import Squad from './components/Squad';
import AIAdvice from './components/AIAdvice';

function App() {
  const [managerData, setManagerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleTeamSubmit(teamId) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_BASE}/fpl/manager/${teamId}`);
      setManagerData({ ...data, teamId });
    } catch {
      setError('Could not find that team ID. Please check and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white text-xl">Loading your team...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-red-400 text-xl">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold text-green-400">FPL AI Assistant</h1>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        {!managerData ? (
          <TeamIdForm onSubmit={handleTeamSubmit} />
        ) : (
          <div className="space-y-8">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-2xl font-bold text-green-400">{managerData.manager.teamName}</h2>
              <p className="text-gray-400 mt-1">{managerData.manager.name}</p>
              <div className="flex gap-6 mt-4">
                <div>
                  <p className="text-gray-400 text-sm">Gameweek</p>
                  <p className="text-white font-semibold">{managerData.manager.gameweek}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Points</p>
                  <p className="text-white font-semibold">{managerData.manager.totalPoints}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Overall Rank</p>
                  <p className="text-white font-semibold">{managerData.manager.overallRank?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Bank</p>
                  <p className="text-white font-semibold">£{managerData.transfers.bank}m</p>
                </div>
              </div>
            </div>
            <Squad squad={managerData.squad} />
            <AIAdvice teamId={managerData.teamId} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;