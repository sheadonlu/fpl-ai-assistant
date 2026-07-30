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
import {
  getCachedRounds,
  findStalePlayers,
  upsertPlayerHistory,
} from '../../db/playerHistoryCache.js';

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
 * Cache-aware history fetch. Checks Postgres first; only calls the FPL
 * element-summary endpoint for players missing required (finished)
 * gameweeks, or whose current-gameweek row is past the live TTL.
 * Finished gameweeks are cached forever — see playerHistoryCache.js for
 * the staleness rule.
 *
 * Returns Map<playerId, historyArray> in the same shape as the raw FPL
 * element-summary `history` field, so toEnginePlayer() doesn't need to
 * know or care whether data came from cache or a live call.
 */
async function fetchHistoriesById(playerIds, currentGameweek, finishedGameweeks) {
  const uniqueIds = [...new Set(playerIds)];
  const minRound = Math.max(1, currentGameweek - FORM_WINDOW_GAMEWEEKS + 1);
  const maxRound = currentGameweek;
  const requiredRounds = [];
  for (let r = minRound; r <= maxRound; r++) requiredRounds.push(r);

  const cachedByPlayer = await getCachedRounds(uniqueIds, minRound, maxRound);

  const stalePlayerIds = findStalePlayers({
    playerIds: uniqueIds,
    requiredRounds,
    currentGameweek,
    finishedGameweeks,
    cachedByPlayer,
  });

  // Refetch only the players whose cache is missing or stale — this is
  // the whole point of the cache: most requests should hit zero or a
  // handful of live calls instead of 40+.
  if (stalePlayerIds.length > 0) {
    await Promise.all(
      stalePlayerIds.map(async (id) => {
        const summary = await getElementSummary(id);
        const history = summary.history ?? [];
        await upsertPlayerHistory(id, history, finishedGameweeks);
        // Update the in-memory cache map so we don't need a second DB
        // round-trip to read back what we just wrote.
        const roundMap = new Map(
          history
            .filter((gw) => gw.round >= minRound && gw.round <= maxRound)
            .map((gw) => [
              gw.round,
              {
                player_id: id,
                gameweek: gw.round,
                minutes: gw.minutes ?? 0,
                points: gw.total_points ?? 0,
                xg: parseFloat(gw.expected_goals ?? 0),
                xa: parseFloat(gw.expected_assists ?? 0),
              },
            ])
        );
        cachedByPlayer.set(id, roundMap);
      })
    );
  }

  // Reconstruct the array shape toEnginePlayer() expects from whatever
  // rows we now have (cached + freshly fetched), sorted oldest to newest.
  const result = new Map();
  for (const id of uniqueIds) {
    const roundMap = cachedByPlayer.get(id) ?? new Map();
    const history = requiredRounds
      .filter((round) => roundMap.has(round))
      .sort((a, b) => a - b)
      .map((round) => {
        const row = roundMap.get(round);
        return {
          round,
          minutes: row.minutes,
          total_points: row.points,
          expected_goals: row.xg,
          expected_assists: row.xa,
        };
      });
    result.set(id, history);
  }

  return result;
}

/**
 * Main entry point: given the bootstrap data, the current + next gameweek
 * numbers, and two lists of raw FPL elements (the user's squad, and a
 * shortlist of transfer candidates), returns expected-points + captaincy
 * scores for both groups, keyed by player id.
 *
 * @param {object} bootstrap - result of getBootstrapData()
 * @param {object} gameweeks - { currentGW, nextGW }
 * @param {object[]} squadElements - raw bootstrap elements for the squad
 * @param {object[]} candidateElements - raw bootstrap elements for the shortlist
 */
export async function scorePlayers(bootstrap, { currentGW, nextGW }, squadElements, candidateElements) {
  const allElements = [...squadElements, ...candidateElements];
  const allTeamIds = bootstrap.teams.map((t) => t.id);

  const finishedGameweeks = new Set(
    bootstrap.events.filter((e) => e.finished).map((e) => e.id)
  );

  const [fixtureDifficultyMap, historyMap] = await Promise.all([
    buildFixtureDifficultyMap(nextGW, allTeamIds),
    fetchHistoriesById(allElements.map((e) => e.id), currentGW, finishedGameweeks),
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