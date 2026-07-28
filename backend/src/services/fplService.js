import axios from 'axios';

const FPL_BASE = 'https://fantasy.premierleague.com/api';

export async function getBootstrapData() {
  const { data } = await axios.get(`${FPL_BASE}/bootstrap-static/`);
  return data;
}

export async function getManagerInfo(teamId) {
  try {
    const { data } = await axios.get(`${FPL_BASE}/entry/${teamId}/`);
    return data;
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error('Manager not found — FPL may still be resetting data for the new season.');
    }
    throw err;
  }
}

export async function getManagerTeam(teamId, gameweek) {
  try {
    const { data } = await axios.get(`${FPL_BASE}/entry/${teamId}/event/${gameweek}/picks/`);
    return data;
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error('No picks found for this gameweek yet — this usually means the season hasn\'t started or the manager hasn\'t set a squad yet.');
    }
    throw err;
  }
}