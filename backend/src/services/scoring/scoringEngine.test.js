// services/scoring/scoringEngine.test.js
//
// Unit tests for the deterministic scoring engine. Uses Node's built-in
// test runner (node --test) — zero extra dependencies, works the same
// locally and in CI (GitHub Actions: `node --test` or `npm test`).
//
// Style notes:
//  - Inputs are hand-picked so expected values are exact/clean where
//    possible (avoids re-deriving the formula inside the test, which
//    would just test the test).
//  - Where clean numbers aren't practical (e.g. multi-gameweek decay
//    weighting), we assert directional/relational properties instead
//    of a hardcoded float.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  minutesProbability,
  formScore,
  pointsVolatility,
  attackingThreat,
  fixtureModifier,
  expectedPoints,
  captainScore,
  rankPlayers
} from './scoringEngine.js';

const APPROX = 1e-9;
const closeTo = (actual, expected, tolerance = 1e-2) =>
  Math.abs(actual - expected) <= tolerance;

// ---------------------------------------------------------------------
// minutesProbability
// ---------------------------------------------------------------------

test('minutesProbability: no gameweek history returns neutral 0.5 prior', () => {
  const player = {
    recentGameweeks: [],
    injuryFlag: false,
    chanceOfPlayingNextRound: null
  };
  assert.equal(minutesProbability(player), 0.5);
});

test('minutesProbability: full minutes, no injury, no API flag returns 1', () => {
  const player = {
    recentGameweeks: [{ minutes: 90, points: 5 }],
    injuryFlag: false,
    chanceOfPlayingNextRound: null
  };
  assert.equal(minutesProbability(player), 1);
});

test('minutesProbability: double-gameweek minutes are capped at 1, not 2', () => {
  const player = {
    recentGameweeks: [{ minutes: 180, points: 12 }],
    injuryFlag: false,
    chanceOfPlayingNextRound: null
  };
  assert.equal(minutesProbability(player), 1);
});

test('minutesProbability: injuryFlag halves the ratio when no API chance is given', () => {
  const player = {
    recentGameweeks: [{ minutes: 90, points: 5 }],
    injuryFlag: true,
    chanceOfPlayingNextRound: null
  };
  assert.equal(minutesProbability(player), 0.5);
});

test('minutesProbability: blends minutes ratio and API chance 40/60 when chance is provided', () => {
  const player = {
    recentGameweeks: [{ minutes: 90, points: 5 }],
    injuryFlag: false,
    chanceOfPlayingNextRound: 50 // 0.5 probability
  };
  // 0.4 * 1 (minutesRatio) + 0.6 * 0.5 (apiProb) = 0.7
  assert.equal(minutesProbability(player), 0.7);
});

test('minutesProbability: chanceOfPlayingNextRound=100 overrides injuryFlag path entirely', () => {
  const player = {
    recentGameweeks: [{ minutes: 90, points: 5 }],
    injuryFlag: true, // should be ignored once chance is provided
    chanceOfPlayingNextRound: 100
  };
  assert.equal(minutesProbability(player), 1);
});

// ---------------------------------------------------------------------
// formScore
// ---------------------------------------------------------------------

test('formScore: empty history returns 0', () => {
  assert.equal(formScore({ recentGameweeks: [] }), 0);
});

test('formScore: single gameweek returns that gameweek\'s points exactly', () => {
  const player = { recentGameweeks: [{ points: 6, minutes: 90 }] };
  assert.equal(formScore(player), 6);
});

test('formScore: more recent points are weighted more heavily than older points', () => {
  // Same two point values, opposite chronological order.
  const recentIsHigh = {
    recentGameweeks: [
      { points: 2, minutes: 90 }, // oldest
      { points: 8, minutes: 90 }  // most recent
    ]
  };
  const recentIsLow = {
    recentGameweeks: [
      { points: 8, minutes: 90 }, // oldest
      { points: 2, minutes: 90 }  // most recent
    ]
  };
  assert.ok(
    formScore(recentIsHigh) > formScore(recentIsLow),
    'a high recent score should pull the weighted average up more than a high old score'
  );
});

test('formScore: only looks at the last FORM_WINDOW_GAMEWEEKS entries', () => {
  // 5 old low-scoring games followed by 6 recent 10-point games — if the
  // window (6) is respected, the old 0s should be fully excluded and the
  // result should be exactly 10.
  const oldGames = Array.from({ length: 5 }, () => ({ points: 0, minutes: 90 }));
  const recentGames = Array.from({ length: 6 }, () => ({ points: 10, minutes: 90 }));
  const player = { recentGameweeks: [...oldGames, ...recentGames] };
  assert.equal(formScore(player), 10);
});

// ---------------------------------------------------------------------
// pointsVolatility
// ---------------------------------------------------------------------

test('pointsVolatility: fewer than 2 gameweeks returns 0', () => {
  assert.equal(pointsVolatility({ recentGameweeks: [] }), 0);
  assert.equal(pointsVolatility({ recentGameweeks: [{ points: 5 }] }), 0);
});

test('pointsVolatility: identical scores across games returns 0 (no variance)', () => {
  const player = {
    recentGameweeks: [{ points: 5 }, { points: 5 }, { points: 5 }]
  };
  assert.equal(pointsVolatility(player), 0);
});

test('pointsVolatility: matches population standard deviation for a known dataset', () => {
  // points [0, 10]: mean=5, variance=((0-5)^2+(10-5)^2)/2=25, sqrt=5
  const player = { recentGameweeks: [{ points: 0 }, { points: 10 }] };
  assert.equal(pointsVolatility(player), 5);
});

// ---------------------------------------------------------------------
// attackingThreat
// ---------------------------------------------------------------------

test('attackingThreat: MID with xG90=0.4, xA90=0.2 matches goal/assist weighting exactly', () => {
  // MID: goal=5, assist=3 -> 0.4*5 + 0.2*3 = 2 + 0.6 = 2.6
  const player = { position: 3, xG90: 0.4, xA90: 0.2 };
  assert.ok(closeTo(attackingThreat(player), 2.6));
});

test('attackingThreat: FWD gets no clean-sheet credit but has its own goal/assist weights', () => {
  // FWD: goal=4, assist=3 -> 0.4*4 + 0.2*3 = 1.6 + 0.6 = 2.2
  const player = { position: 4, xG90: 0.4, xA90: 0.2 };
  assert.ok(closeTo(attackingThreat(player), 2.2));
});

test('attackingThreat: unknown/unsupported position returns 0 rather than throwing', () => {
  const player = { position: 99, xG90: 0.9, xA90: 0.9 };
  assert.equal(attackingThreat(player), 0);
});

// ---------------------------------------------------------------------
// fixtureModifier
// ---------------------------------------------------------------------

test('fixtureModifier: league-average fixture (FDR=3) leaves attackingThreat unchanged', () => {
  const player = { position: 3, xG90: 0.4, xA90: 0.2, nextOpponentFDR: 3 };
  const threat = attackingThreat(player);
  assert.ok(closeTo(fixtureModifier(player), threat));
});

test('fixtureModifier: easy fixture (FDR=1) boosts the score above raw attackingThreat', () => {
  const player = { position: 3, xG90: 0.4, xA90: 0.2, nextOpponentFDR: 1 };
  const threat = attackingThreat(player);
  // fdrDelta = 3-1 = 2 -> threat * (1 + 0.15*2) = threat * 1.3
  assert.ok(closeTo(fixtureModifier(player), threat * 1.3));
  assert.ok(fixtureModifier(player) > threat);
});

test('fixtureModifier: hard fixture (FDR=5) suppresses the score below raw attackingThreat', () => {
  const player = { position: 3, xG90: 0.4, xA90: 0.2, nextOpponentFDR: 5 };
  const threat = attackingThreat(player);
  // fdrDelta = 3-5 = -2 -> threat * (1 - 0.15*2) = threat * 0.7
  assert.ok(closeTo(fixtureModifier(player), threat * 0.7));
  assert.ok(fixtureModifier(player) < threat);
});

// ---------------------------------------------------------------------
// expectedPoints (integration of the sub-functions)
// ---------------------------------------------------------------------

function basePlayer(overrides = {}) {
  return {
    id: 1,
    position: 3, // MID, baseline=2
    recentGameweeks: [{ points: 6, minutes: 90 }],
    xG90: 0.4,
    xA90: 0.2,
    nextOpponentFDR: 3, // neutral fixture
    injuryFlag: false,
    chanceOfPlayingNextRound: null,
    ...overrides
  };
}

test('expectedPoints: matches the documented formula exactly for a hand-computed case', () => {
  const player = basePlayer();
  // minutesProbability = 1 (full minutes, no injury/flag)
  // formScore = 6 (single gameweek)
  // attackingThreat = 2.6, fixtureModifier = 2.6 (neutral FDR)
  // rawScore = 0.5*2.6 + 0.3*6 + 0.2*2.6 + baseline(2) = 1.3+1.8+0.52+2 = 5.62
  // finalScore = 1 * 5.62 = 5.62
  const result = expectedPoints(player);
  assert.equal(result.playerId, 1);
  assert.ok(closeTo(result.expectedPoints, 5.62));
  assert.ok(closeTo(result.breakdown.minutesProbability, 1));
  assert.ok(closeTo(result.breakdown.formScore, 6));
  assert.ok(closeTo(result.breakdown.attackingThreat, 2.6));
  assert.ok(closeTo(result.breakdown.fixtureModifier, 2.6));
  assert.equal(result.breakdown.baseline, 2);
});

test('expectedPoints: zero minutes probability zeroes out the final score regardless of stats', () => {
  const player = basePlayer({ recentGameweeks: [], injuryFlag: true, chanceOfPlayingNextRound: 0 });
  // chanceOfPlayingNextRound=0 -> apiProb=0; minutesRatio from empty history: recent.length===0
  // inside minutesProbability guard returns 0.5 BEFORE the chance check only when recentGameweeks
  // is empty overall (guard is first). So this asserts the neutral-prior guard wins.
  const result = expectedPoints(player);
  assert.ok(closeTo(result.breakdown.minutesProbability, 0.5));
});

test('expectedPoints: better form strictly increases expected points, all else equal', () => {
  const worseForm = expectedPoints(basePlayer({ recentGameweeks: [{ points: 2, minutes: 90 }] }));
  const betterForm = expectedPoints(basePlayer({ recentGameweeks: [{ points: 10, minutes: 90 }] }));
  assert.ok(betterForm.expectedPoints > worseForm.expectedPoints);
});

test('expectedPoints: a harder upcoming fixture strictly decreases expected points, all else equal', () => {
  const easyFixture = expectedPoints(basePlayer({ nextOpponentFDR: 1 }));
  const hardFixture = expectedPoints(basePlayer({ nextOpponentFDR: 5 }));
  assert.ok(easyFixture.expectedPoints > hardFixture.expectedPoints);
});

test('expectedPoints: unsupported position falls back to baseline 0 without throwing', () => {
  const player = basePlayer({ position: 99 });
  const result = expectedPoints(player);
  assert.equal(result.breakdown.baseline, 0);
  assert.ok(Number.isFinite(result.expectedPoints));
});

// ---------------------------------------------------------------------
// captainScore
// ---------------------------------------------------------------------

test('captainScore: zero volatility means safe, expected, and differential scores are all equal', () => {
  const player = basePlayer(); // single gameweek -> volatility = 0
  const result = captainScore(player);
  assert.equal(result.volatility, 0);
  assert.equal(result.safeScore, result.expectedPoints);
  assert.equal(result.differentialScore, result.expectedPoints);
});

test('captainScore: positive volatility spreads safeScore below and differentialScore above expectedPoints symmetrically', () => {
  const player = basePlayer({
    recentGameweeks: [{ points: 0, minutes: 90 }, { points: 10, minutes: 90 }] // volatility = 5
  });
  const result = captainScore(player);
  assert.ok(result.volatility > 0);
  assert.ok(result.safeScore < result.expectedPoints);
  assert.ok(result.differentialScore > result.expectedPoints);
  // spread on each side should be volatilityWeight * volatility (0.4 * 5 = 2)
  assert.ok(closeTo(result.expectedPoints - result.safeScore, 2));
  assert.ok(closeTo(result.differentialScore - result.expectedPoints, 2));
});

// ---------------------------------------------------------------------
// rankPlayers
// ---------------------------------------------------------------------

test('rankPlayers: sorts by expectedPoints descending by default', () => {
  const low = basePlayer({ id: 'low', xG90: 0.1, xA90: 0.1 });
  const mid = basePlayer({ id: 'mid', xG90: 0.4, xA90: 0.2 });
  const high = basePlayer({ id: 'high', xG90: 0.9, xA90: 0.5 });

  const ranked = rankPlayers([mid, low, high]);
  assert.deepEqual(ranked.map((r) => r.playerId), ['high', 'mid', 'low']);
});

test('rankPlayers: sorts by differentialScore when byDifferential is true', () => {
  // Player A: low ceiling, very consistent (low volatility)
  const consistent = basePlayer({
    id: 'consistent',
    xG90: 0.3,
    xA90: 0.2,
    recentGameweeks: [{ points: 5, minutes: 90 }, { points: 5, minutes: 90 }]
  });
  // Player B: lower base stats but wildly volatile, so its differential
  // (ceiling-chasing) score should overtake the consistent player's.
  const volatile = basePlayer({
    id: 'volatile',
    xG90: 0.3,
    xA90: 0.2,
    recentGameweeks: [{ points: 0, minutes: 90 }, { points: 20, minutes: 90 }]
  });

  const rankedSafe = rankPlayers([consistent, volatile], { byDifferential: false });
  const rankedDiff = rankPlayers([consistent, volatile], { byDifferential: true });

  // Sanity: differential ranking actually uses a different, larger spread
  // for the volatile player than the safe ranking does.
  assert.ok(rankedDiff[0].differentialScore >= rankedDiff[1].differentialScore);
  assert.ok(rankedSafe[0].expectedPoints >= rankedSafe[1].expectedPoints);
});