/**import axios from 'axios';

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
}*/

import axios from 'axios';

const FPL_BASE = 'https://fantasy.premierleague.com/api';
const USE_MOCK = process.env.USE_MOCK_DATA === 'true';

export async function getBootstrapData() {
  const { data } = await axios.get(`${FPL_BASE}/bootstrap-static/`);
  return data;
}

export async function getManagerInfo(teamId) {
  if (USE_MOCK) {
    return {
      player_first_name: 'Test',
      player_last_name: 'Manager',
      name: 'Test FC',
      summary_overall_points: 542,
      summary_overall_rank: 128394,
    };
  }

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
  if (USE_MOCK) {
    // Picks reference real player IDs from bootstrap so Squad/AI Advice render properly.
    // These are placeholder IDs — swap in real ones after checking your bootstrap data if needed.
    return {
      picks: [
        { element: 1,  is_captain: true,  is_vice_captain: false, multiplier: 2 },
        { element: 2,  is_captain: false, is_vice_captain: true,  multiplier: 1 },
        { element: 3,  is_captain: false, is_vice_captain: false, multiplier: 1 },
        { element: 4,  is_captain: false, is_vice_captain: false, multiplier: 1 },
        { element: 5,  is_captain: false, is_vice_captain: false, multiplier: 1 },
        { element: 6,  is_captain: false, is_vice_captain: false, multiplier: 1 },
        { element: 7,  is_captain: false, is_vice_captain: false, multiplier: 1 },
        { element: 8,  is_captain: false, is_vice_captain: false, multiplier: 1 },
        { element: 9,  is_captain: false, is_vice_captain: false, multiplier: 1 },
        { element: 10, is_captain: false, is_vice_captain: false, multiplier: 1 },
        { element: 11, is_captain: false, is_vice_captain: false, multiplier: 1 },
      ],
      entry_history: {
        event_transfers: 1,
        event_transfers_cost: 0,
        bank: 5,
      },
    };
  }

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