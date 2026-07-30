// services/scoring/constants.js
// Tunable weights and FPL scoring rules. Centralized so they can later be
// exposed as sliders in the frontend or fit via regression on historical
// gameweek data instead of hand-picked.

export const WEIGHTS = {
  attackingThreat: 0.5, // w1
  form: 0.3,            // w2
  fixture: 0.2,         // w3
  fixtureSensitivity: 0.15, // alpha: how strongly FDR scales attacking threat
  formDecay: 0.75,      // recency decay for form calculation (0-1, higher = slower decay)
  volatilityWeight: 0.4 // beta: how much variance boosts "differential captain" score
};

// FPL points awarded per goal / assist / clean sheet by position.
// element_type from the FPL API: 1=GK, 2=DEF, 3=MID, 4=FWD
export const POSITION_SCORING = {
  1: { goal: 6, assist: 3, cleanSheet: 4, baseline: 2 }, // GK
  2: { goal: 6, assist: 3, cleanSheet: 4, baseline: 2 }, // DEF
  3: { goal: 5, assist: 3, cleanSheet: 1, baseline: 2 }, // MID
  4: { goal: 4, assist: 3, cleanSheet: 0, baseline: 2 }  // FWD
};

export const FORM_WINDOW_GAMEWEEKS = 6; // recent GWs feeding form/volatility
export const LEAGUE_AVG_FDR = 3;        // midpoint of FPL's 1-5 difficulty scale