import { useState } from 'react';

function TeamIdForm({ onSubmit }) {
  const [teamId, setTeamId] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (teamId.trim()) onSubmit(teamId);
  }

  return (
    <div>
      <h2>Enter your FPL Team ID</h2>
      <p>Find your ID by going to the FPL website → Points → check the URL</p>
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          placeholder="e.g. 1234567"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        />
        <button type="submit">Load My Team</button>
      </form>
    </div>
  );
}

export default TeamIdForm;