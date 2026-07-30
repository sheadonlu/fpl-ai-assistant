// services/scoring/scoringAdapter.js
//
// Bridges raw FPL API data (bootstrap elements + per-player history +
// fixtures) into the shape scoringEngine.js expects, and batches the extra
// network calls needed (element-summary per player, fixtures per event).
//
// Deliberately scoped: only fetches per-gameweek history for a bounded set
// of players (the user's squad + a shortlist of transfer candidates), not
// every player in the game, to avoid hundreds of FPL API calls per request.

import { getElementSummary, getFixturesForEvent } from '../fplService.js';
import { expectedPoints, captainScore } from './scoringEngine.js';
import { FORM_WINDOW_GAMEWEEKS, LEAGUE_AVG_FDR } from './constants.js';

/**
 * Builds a map of teamId -> next-fixture difficulty rating (1-5) from the
 * FPL fixtures endpoint for a given gameweek. Teams with no fixture that
 * gameweek (blank gameweeks, rare) fall back to the league-average FDR.
 */
async function buildFixtureDifficultyMap(nextGW, allTeamIds) {
  const fixtures = await getFixturesForEvent(nextGW);
  const map = new Map();

  for (const fixture of fixtures) {
    if (fixture.team_h != null) map.set(fixture.team_h, fixture.team_h_difficulty ?? LEAGUE_AVG_FDR);
    if (fixture.team_a != null) map.set(fixture.team_a, fixture.team_a_difficulty ?? LEAGUE_AVG_FDR);
  }

  // Fill in any team with no fixture found (blank GW, postponed match, etc.)
  for (const teamId of allTeamIds) {
    if (!map.has(teamId)) map.set(teamId, LEAGUE_AVG_FDR);
  }

  return map;
}

/**
 * Converts a raw FPL bootstrap `element` (player) plus its element-summary
 * history into the object shape scoringEngine.js's functions expect.
 */
function toEnginePlayer(element, history, fixtureDifficultyMap) {
  const recentGameweeks = (history ?? [])
    .slice(-FORM_WINDOW_GAMEWEEKS)
    .map((gw) => ({
      minutes: gw.minutes ?? 0,
      points: gw.total_points ?? 0,
      xG: parseFloat(gw.expected_goals ?? 0),
      xA: parseFloat(gw.expected_assists ?? 0),
    }));

  // bootstrap already gives season-level per-90 xG/xA rates directly —
  // no need to derive these from history.
  const xG90 = parseFloat(element.expected_goals_per_90 ?? 0);
  const xA90 = parseFloat(element.expected_assists_per_90 ?? 0);

  const chanceOfPlayingNextRound =
    element.chance_of_playing_next_round === null ||
    element.chance_of_playing_next_round === undefined
      ? null
      : Number(element.chance_of_playing_next_round);

  return {
    id: element.id,
    position: element.element_type,
    recentGameweeks,
    xG90,
    xA90,
    nextOpponentFDR: fixtureDifficultyMap.get(element.team) ?? LEAGUE_AVG_FDR,
    injuryFlag: element.status !== 'a', // 'a' = available/fit per FPL API
    chanceOfPlayingNextRound,
  };
}

/**
 * Fetches element-summary history for a list of player IDs in parallel,
 * keyed by player id. A failed individual fetch resolves to an empty
 * history rather than rejecting the whole batch (see getElementSummary's
 * own try/catch — this is just the batching layer).
 */
async function fetchHistoriesById(playerIds) {
  const uniqueIds = [...new Set(playerIds)];
  const results = await Promise.all(
    uniqueIds.map(async (id) => {
      const summary = await getElementSummary(id);
      return [id, summary.history ?? []];
    })
  );
  return new Map(results);
}

/**
 * Main entry point: given the bootstrap data, the next gameweek number,
 * and two lists of raw FPL elements (the user's squad, and a shortlist of
 * transfer candidates), returns expected-points + captaincy scores for
 * both groups, keyed by player id.
 *
 * @param {object} bootstrap - result of getBootstrapData()
 * @param {number} nextGW - upcoming gameweek id
 * @param {object[]} squadElements - raw bootstrap elements for the squad
 * @param {object[]} candidateElements - raw bootstrap elements for the shortlist
 */
export async function scorePlayers(bootstrap, nextGW, squadElements, candidateElements) {
  const allElements = [...squadElements, ...candidateElements];
  const allTeamIds = bootstrap.teams.map((t) => t.id);

  const [fixtureDifficultyMap, historyMap] = await Promise.all([
    buildFixtureDifficultyMap(nextGW, allTeamIds),
    fetchHistoriesById(allElements.map((e) => e.id)),
  ]);

  const scoreOne = (element) => {
    const enginePlayer = toEnginePlayer(
      element,
      historyMap.get(element.id),
      fixtureDifficultyMap
    );
    return {
      ...expectedPoints(enginePlayer),
      captaincy: captainScore(enginePlayer),
    };
  };

  const scoresById = new Map();
  for (const element of allElements) {
    scoresById.set(element.id, scoreOne(element));
  }

  return scoresById;
}