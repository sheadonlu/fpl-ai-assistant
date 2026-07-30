import { Router } from 'express';
import { getBootstrapData, getManagerInfo, getManagerTeam } from '../services/fplService.js';
import { getAIAdvice, getChatReply } from '../services/aiService.js';
import { scorePlayers } from '../services/scoring/scoringAdapter.js';

function sanitizeJsonString(str) {
  return str.replace(/"(?:[^"\\]|\\.)*"/gs, (match) => {
    return match.replace(/[\u0000-\u001F]/g, (ch) => {
      if (ch === '\n') return '\\n';
      if (ch === '\r') return '\\r';
      if (ch === '\t') return '\\t';
      return '';
    });
  });
}

const router = Router();

// How many top-form players (outside the user's squad) to run through the
// scoring engine as transfer candidates. Kept modest because each one costs
// an extra element-summary API call — raise this once you've got caching
// or a DB layer in front of the FPL API.
const CANDIDATE_SHORTLIST_SIZE = 40;

// Shared helper — builds squad + scored candidate context from FPL data
async function buildSquadContext(teamId) {
  const bootstrap = await getBootstrapData();
  const currentGW = bootstrap.events.find(e => e.is_current)?.id
    ?? bootstrap.events.find(e => e.is_next)?.id;
  // The gameweek whose fixtures matter for the FixtureModifier term — the
  // next one to be played, which may differ from currentGW mid-season.
  const nextGW = bootstrap.events.find(e => e.is_next)?.id ?? currentGW;

  const [managerInfo, teamPicks] = await Promise.all([
    getManagerInfo(teamId),
    getManagerTeam(teamId, currentGW),
  ]);

  const playerMap = Object.fromEntries(
    bootstrap.elements.map(p => [p.id, p])
  );

  const squadElements = teamPicks.picks
    .map(pick => playerMap[pick.element])
    .filter(Boolean);

  const candidateElements = bootstrap.elements
    .filter(p => p.status !== 'u')
    .sort((a, b) => parseFloat(b.form) - parseFloat(a.form))
    .slice(0, CANDIDATE_SHORTLIST_SIZE);

  const scoresById = await scorePlayers(bootstrap, { currentGW, nextGW }, squadElements, candidateElements);

  const positionName = (elementType) => ['', 'GK', 'DEF', 'MID', 'FWD'][elementType];

  const squad = teamPicks.picks.map(pick => {
    const player = playerMap[pick.element];
    const score = scoresById.get(pick.element);
    return {
      name: `${player.first_name} ${player.second_name}`,
      position: positionName(player.element_type),
      team: bootstrap.teams.find(t => t.id === player.team)?.name,
      price: player.now_cost / 10,
      isCaptain: pick.is_captain,
      isViceCaptain: pick.is_vice_captain,
      multiplier: pick.multiplier,
      expectedPoints: score?.expectedPoints ?? null,
      breakdown: score?.breakdown ?? null,
      captaincy: score?.captaincy
        ? { safeScore: score.captaincy.safeScore, differentialScore: score.captaincy.differentialScore }
        : null,
    };
  });

  const availablePlayers = candidateElements.map(p => {
    const score = scoresById.get(p.id);
    return {
      id: p.id,
      name: `${p.first_name} ${p.second_name}`,
      position: positionName(p.element_type),
      team: bootstrap.teams.find(t => t.id === p.team)?.name ?? 'Unknown',
      price: p.now_cost / 10,
      expectedPoints: score?.expectedPoints ?? null,
      breakdown: score?.breakdown ?? null,
    };
  })
  // Rank the shortlist by our computed expected points rather than raw
  // FPL "form", since expectedPoints already incorporates form + fixture
  // + underlying xG/xA + minutes risk.
  .sort((a, b) => (b.expectedPoints ?? 0) - (a.expectedPoints ?? 0));

  return { bootstrap, currentGW, managerInfo, teamPicks, squad, availablePlayers };
}

// Formats a player line for the prompt, including the computed breakdown
// so the LLM explains the score instead of inventing its own analysis.
function formatPlayerLine(p, { includeCaptaincy = false } = {}) {
  const base = `- ${p.name} (${p.position}, ${p.team}) £${p.price}m | ` +
    `Expected Points: ${p.expectedPoints ?? 'N/A'} ` +
    `[form: ${p.breakdown?.formScore ?? 'N/A'}, ` +
    `attacking threat: ${p.breakdown?.attackingThreat ?? 'N/A'}, ` +
    `fixture modifier: ${p.breakdown?.fixtureModifier ?? 'N/A'}, ` +
    `minutes probability: ${p.breakdown?.minutesProbability ?? 'N/A'}]`;

  if (includeCaptaincy && p.captaincy) {
    return `${base} | Captaincy — safe: ${p.captaincy.safeScore}, differential: ${p.captaincy.differentialScore}`;
  }
  return base;
}

function buildPromptContext({ managerInfo, currentGW, teamPicks, squad, availablePlayers }) {
  return `
Manager: ${managerInfo.player_first_name} ${managerInfo.player_last_name}
Team name: ${managerInfo.name}
Gameweek: ${currentGW}
Bank: £${teamPicks.entry_history.bank / 10}m

Their current squad (multiplier 0 = bench, 1 = playing, 2 = captain).
Each player's Expected Points score is pre-computed from form, underlying
attacking stats (xG/xA), fixture difficulty, and minutes risk — treat it as
ground truth and explain your reasoning using these numbers, don't invent
your own point estimates:
${squad.map(p => `${formatPlayerLine(p, { includeCaptaincy: true })} | Multiplier: ${p.multiplier}`).join('\n')}

Top transfer candidates this gameweek, ranked by computed Expected Points
(already accounts for form, fixture, and underlying stats):
${availablePlayers.map(p => formatPlayerLine(p)).join('\n')}

Only suggest players from the transfer candidates list above when recommending transfers. Do not suggest players not on this list.
Base captaincy and transfer reasoning on the Expected Points and breakdown values given — do not fabricate statistics not shown here.
  `.trim();
}

// POST /api/ai/advice/:teamId
router.post('/advice/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const context = await buildSquadContext(teamId);

    const prompt = `
You are an expert Fantasy Premier League assistant.

${buildPromptContext(context)}

Respond with ONLY a valid JSON object, no other text, using exactly this shape:
{
  "captainPick": "markdown-formatted recommended starting XI and captain choice, with reasons",
  "transferAdvice": "markdown-formatted transfer suggestions based on Expected Points and value",
  "chipStrategy": "markdown-formatted chip timing and wildcard planning advice",
  "fixtureView": "markdown-formatted notes on upcoming fixture difficulty for their squad"
}

Every field must contain relevant content only for that category — do not mix categories together.
If you have nothing relevant for a category, write "No specific advice for this category." for that field instead of leaving it blank.
    `.trim();

    const raw = await getAIAdvice(prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const sanitized = sanitizeJsonString(cleaned);
    const advice = JSON.parse(sanitized);
    res.json({ advice });

  } catch (err) {
    console.error('Advice route error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/chat/:teamId
router.post('/chat/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { messages, userMessage } = req.body;

    const context = await buildSquadContext(teamId);

    const systemPrompt = `
You are an expert Fantasy Premier League assistant.

${buildPromptContext(context)}

Answer questions about their team, suggest transfers, compare players, advise on captaincy, and give general FPL strategy advice. Be concise and direct. Use bullet points where helpful.
    `.trim();

    const updatedMessages = [...messages, { role: 'user', content: userMessage }];
    const reply = await getChatReply(systemPrompt, updatedMessages);

    res.json({
      reply,
      messages: [...updatedMessages, { role: 'assistant', content: reply }],
    });

  } catch (err) {
    console.error('Chat route error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;