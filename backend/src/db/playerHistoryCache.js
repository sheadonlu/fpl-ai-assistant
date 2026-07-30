// db/playerHistoryCache.js
//
// Cache repository sitting in front of the FPL element-summary endpoint.
// Staleness rule: a gameweek marked `finished` by the FPL API is permanent
// and cached forever. Only the current in-progress gameweek's row can
// still change, so it gets a TTL and is refetched if stale.

import { pool } from './pool.js';

const LIVE_GAMEWEEK_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetches cached rows for the given players across the given round range.
 * Returns Map<playerId, Map<round, row>> for easy per-player lookups.
 */
export async function getCachedRounds(playerIds, minRound, maxRound) {
  if (playerIds.length === 0) return new Map();

  const { rows } = await pool.query(
    `SELECT player_id, gameweek, minutes, points, xg, xa, is_finished, fetched_at
     FROM player_gameweek_history
     WHERE player_id = ANY($1) AND gameweek BETWEEN $2 AND $3`,
    [playerIds, minRound, maxRound]
  );

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.player_id)) map.set(row.player_id, new Map());
    map.get(row.player_id).set(row.gameweek, row);
  }
  return map;
}

/**
 * Determines which players need a fresh API call: either they're missing
 * a required (finished) round entirely, or their current-gameweek row is
 * older than the live TTL.
 */
export function findStalePlayers({
  playerIds,
  requiredRounds,
  currentGameweek,
  finishedGameweeks,
  cachedByPlayer,
}) {
  const stale = [];
  const now = Date.now();

  for (const playerId of playerIds) {
    const cachedRounds = cachedByPlayer.get(playerId) ?? new Map();
    let needsRefetch = false;

    for (const round of requiredRounds) {
      const cachedRow = cachedRounds.get(round);
      const isFinishedRound = finishedGameweeks.has(round);

      if (!cachedRow) {
        // Missing data entirely — always worth fetching, finished or not
        // (if it's the live gameweek and simply hasn't happened yet,
        // the API will just return whatever exists so far).
        needsRefetch = true;
        break;
      }

      if (round === currentGameweek && !isFinishedRound) {
        const age = now - new Date(cachedRow.fetched_at).getTime();
        if (age > LIVE_GAMEWEEK_TTL_MS) {
          needsRefetch = true;
          break;
        }
      }
    }

    if (needsRefetch) stale.push(playerId);
  }

  return stale;
}

/**
 * Upserts a player's full history (as returned by the FPL element-summary
 * endpoint) into the cache. Safe to call with the full season history —
 * ON CONFLICT keeps this idempotent.
 */
export async function upsertPlayerHistory(playerId, historyRows, finishedGameweeks) {
  if (!historyRows || historyRows.length === 0) return;

  const values = [];
  const placeholders = [];
  let i = 1;

  for (const gw of historyRows) {
    const isFinished = finishedGameweeks.has(gw.round);
    placeholders.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, now())`);
    values.push(
      playerId,
      gw.round,
      gw.minutes ?? 0,
      gw.total_points ?? 0,
      parseFloat(gw.expected_goals ?? 0),
      parseFloat(gw.expected_assists ?? 0),
      isFinished
    );
  }

  await pool.query(
    `INSERT INTO player_gameweek_history
       (player_id, gameweek, minutes, points, xg, xa, is_finished, fetched_at)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (player_id, gameweek) DO UPDATE SET
       minutes = EXCLUDED.minutes,
       points = EXCLUDED.points,
       xg = EXCLUDED.xg,
       xa = EXCLUDED.xa,
       is_finished = EXCLUDED.is_finished,
       fetched_at = EXCLUDED.fetched_at`,
    values
  );
}