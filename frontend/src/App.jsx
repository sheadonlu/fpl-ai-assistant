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

  if (loading) return <p>Loading your team...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>FPL AI Assistant</h1>
      {!managerData ? (
        <TeamIdForm onSubmit={handleTeamSubmit} />
      ) : (
        <div>
          <h2>{managerData.manager.teamName}</h2>
          <p>Gameweek {managerData.manager.gameweek} — {managerData.manager.totalPoints} pts overall</p>
          <p>Rank: {managerData.manager.overallRank?.toLocaleString()}</p>
          <Squad squad={managerData.squad} />
          <AIAdvice teamId={managerData.teamId} />
        </div>
      )}
    </div>
  );
}

export default App;