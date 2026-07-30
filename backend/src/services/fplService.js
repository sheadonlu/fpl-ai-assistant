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

// NEW — per-player gameweek-by-gameweek history (minutes, points, xG, xA).
// Used by the scoring engine for form decay and volatility, since bootstrap
// only gives season-aggregate stats, not a per-gameweek breakdown.
export async function getElementSummary(playerId) {
  if (USE_MOCK) {
    // Fabricate a plausible 6-gameweek history so scoring math has something
    // to chew on in mock mode. Deterministic-ish based on playerId so
    // different mock players don't all score identically.
    const seed = playerId % 5;
    return {
      history: Array.from({ length: 6 }, (_, i) => ({
        round: i + 1,
        minutes: 90,
        total_points: 3 + seed + (i % 3),
        expected_goals: (0.1 + seed * 0.05).toFixed(2),
        expected_assists: (0.05 + seed * 0.03).toFixed(2),
      })),
    };
  }

  try {
    const { data } = await axios.get(`${FPL_BASE}/element-summary/${playerId}/`);
    return data;
  } catch (err) {
    // Don't let one player's history call take down the whole request —
    // the adapter treats a null history as "no data, use neutral priors".
    console.error(`Failed to fetch element-summary for player ${playerId}:`, err.message);
    return { history: [] };
  }
}

// NEW — fixtures for a given gameweek, used to build a team-id -> FDR map
// for the fixture-difficulty term in the scoring engine.
export async function getFixturesForEvent(eventId) {
  if (USE_MOCK) {
    // Two fabricated fixtures covering mock team ids 1-4 at moderate difficulty.
    return [
      { team_h: 1, team_a: 2, team_h_difficulty: 3, team_a_difficulty: 3 },
      { team_h: 3, team_a: 4, team_h_difficulty: 2, team_a_difficulty: 4 },
    ];
  }

  try {
    const { data } = await axios.get(`${FPL_BASE}/fixtures/?event=${eventId}`);
    return data;
  } catch (err) {
    console.error(`Failed to fetch fixtures for event ${eventId}:`, err.message);
    return [];
  }
}