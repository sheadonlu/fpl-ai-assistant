// services/scoring/scoringEngine.js
//
// Deterministic scoring engine for FPL player evaluation.
// Every function here is a pure function of structured input data — no
// randomness, no LLM calls. The LLM layer should only ever receive the
// OUTPUT of these functions (expectedPoints + breakdown) and use it to
// generate natural-language explanations — never raw stats it has to
// interpret itself.
//
// Expected shape of a `player` object (see scoringAdapter.js for how raw
// FPL API data gets converted into this shape):
// {
//   id: number,
//   position: 1 | 2 | 3 | 4,
//   recentGameweeks: [ { minutes, points, xG, xA }, ... ], // oldest -> newest
//   xG90: number,
//   xA90: number,
//   nextOpponentFDR: number,        // 1 (easy) - 5 (hard)
//   injuryFlag: boolean,
//   chanceOfPlayingNextRound: number | null
// }

import {
  WEIGHTS,
  POSITION_SCORING,
  FORM_WINDOW_GAMEWEEKS,
  LEAGUE_AVG_FDR
} from './constants.js';

export function minutesProbability(player) {
  const recent = player.recentGameweeks.slice(-FORM_WINDOW_GAMEWEEKS);
  if (recent.length === 0) return 0.5; // no data — neutral prior

  const avgMinutes =
    recent.reduce((sum, gw) => sum + gw.minutes, 0) / recent.length;
  const minutesRatio = Math.min(avgMinutes / 90, 1);

  if (player.chanceOfPlayingNextRound !== null && player.chanceOfPlayingNextRound !== undefined) {
    const apiProb = player.chanceOfPlayingNextRound / 100;
    return 0.4 * minutesRatio + 0.6 * apiProb;
  }

  return player.injuryFlag ? minutesRatio * 0.5 : minutesRatio;
}

export function formScore(player) {
  const recent = player.recentGameweeks.slice(-FORM_WINDOW_GAMEWEEKS);
  if (recent.length === 0) return 0;

  const decay = WEIGHTS.formDecay;
  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = 0; i < recent.length; i++) {
    const gw = recent[recent.length - 1 - i]; // i=0 is most recent
    const weight = Math.pow(decay, i);
    weightedSum += gw.points * weight;
    weightTotal += weight;
  }

  return weightTotal > 0 ? weightedSum / weightTotal : 0;
}

export function pointsVolatility(player) {
  const recent = player.recentGameweeks.slice(-FORM_WINDOW_GAMEWEEKS);
  if (recent.length < 2) return 0;

  const mean = recent.reduce((sum, gw) => sum + gw.points, 0) / recent.length;
  const variance =
    recent.reduce((sum, gw) => sum + Math.pow(gw.points - mean, 2), 0) /
    recent.length;

  return Math.sqrt(variance);
}

export function attackingThreat(player) {
  const scoring = POSITION_SCORING[player.position];
  if (!scoring) return 0;
  return player.xG90 * scoring.goal + player.xA90 * scoring.assist;
}

export function fixtureModifier(player) {
  const threat = attackingThreat(player);
  const fdrDelta = LEAGUE_AVG_FDR - player.nextOpponentFDR;
  return threat * (1 + WEIGHTS.fixtureSensitivity * fdrDelta);
}

export function expectedPoints(player) {
  const scoring = POSITION_SCORING[player.position];
  const minsProb = minutesProbability(player);
  const form = formScore(player);
  const threat = attackingThreat(player);
  const fixture = fixtureModifier(player);
  const baseline = scoring ? scoring.baseline : 0;

  const rawScore =
    WEIGHTS.attackingThreat * threat +
    WEIGHTS.form * form +
    WEIGHTS.fixture * fixture +
    baseline;

  const finalScore = minsProb * rawScore;

  return {
    playerId: player.id,
    expectedPoints: Number(finalScore.toFixed(2)),
    breakdown: {
      minutesProbability: Number(minsProb.toFixed(2)),
      formScore: Number(form.toFixed(2)),
      attackingThreat: Number(threat.toFixed(2)),
      fixtureModifier: Number(fixture.toFixed(2)),
      baseline
    }
  };
}

export function captainScore(player) {
  const { expectedPoints: ep, breakdown } = expectedPoints(player);
  const volatility = pointsVolatility(player);

  return {
    playerId: player.id,
    expectedPoints: ep,
    volatility: Number(volatility.toFixed(2)),
    safeScore: Number((ep - WEIGHTS.volatilityWeight * volatility).toFixed(2)),
    differentialScore: Number(
      (ep + WEIGHTS.volatilityWeight * volatility).toFixed(2)
    ),
    breakdown
  };
}

export function rankPlayers(players, { byDifferential = false } = {}) {
  return players
    .map((p) => (byDifferential ? captainScore(p) : expectedPoints(p)))
    .sort((a, b) => {
      const aScore = byDifferential ? a.differentialScore : a.expectedPoints;
      const bScore = byDifferential ? b.differentialScore : b.expectedPoints;
      return bScore - aScore;
    });
}