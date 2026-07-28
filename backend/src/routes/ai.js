import { Router } from 'express';
import { getBootstrapData, getManagerInfo, getManagerTeam } from '../services/fplService.js';
import { getAIAdvice, getChatReply } from '../services/aiService.js';

const router = Router();

// Shared helper — builds squad array from FPL data
async function buildSquadContext(teamId) {
  const bootstrap = await getBootstrapData();
  const currentGW = bootstrap.events.find(e => e.is_current)?.id
    ?? bootstrap.events.find(e => e.is_next)?.id;

  const [managerInfo, teamPicks] = await Promise.all([
    getManagerInfo(teamId),
    getManagerTeam(teamId, currentGW),
  ]);

  const playerMap = Object.fromEntries(
    bootstrap.elements.map(p => [p.id, p])
  );

  const squad = teamPicks.picks.map(pick => {
    const player = playerMap[pick.element];
    return {
      name: `${player.first_name} ${player.second_name}`,
      position: ['', 'GK', 'DEF', 'MID', 'FWD'][player.element_type],
      team: bootstrap.teams.find(t => t.id === player.team)?.name,
      price: player.now_cost / 10,
      form: player.form,
      totalPoints: player.total_points,
      isCaptain: pick.is_captain,
      isViceCaptain: pick.is_vice_captain,
      multiplier: pick.multiplier,
    };
  });

  const availablePlayers = bootstrap.elements
  .filter(p => p.status !== 'u')
  .sort((a, b) => parseFloat(b.form) - parseFloat(a.form))
  .slice(0, 100)
  .map(p => ({
    name: `${p.first_name} ${p.second_name}`,
    position: ['', 'GK', 'DEF', 'MID', 'FWD'][p.element_type],
    team: bootstrap.teams.find(t => t.id === p.team)?.name ?? 'Unknown',
    price: p.now_cost / 10,
    form: p.form,
    totalPoints: p.total_points,
  }));

  return { bootstrap, currentGW, managerInfo, teamPicks, squad, availablePlayers }; // 👈 this was missing
}

// POST /api/ai/advice/:teamId
router.post('/advice/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { currentGW, managerInfo, teamPicks, squad, availablePlayers } = await buildSquadContext(teamId);

    const prompt = `
You are an expert Fantasy Premier League assistant.

Manager: ${managerInfo.player_first_name} ${managerInfo.player_last_name}
Team name: ${managerInfo.name}
Gameweek: ${currentGW}
Bank: £${teamPicks.entry_history.bank / 10}m

Their current squad (multiplier 0 = bench, 1 = playing, 2 = captain):
${squad.map(p => `- ${p.name} (${p.position}, ${p.team}) £${p.price}m | Form: ${p.form} | Total pts: ${p.totalPoints} | Multiplier: ${p.multiplier}`).join('\n')}

Available players in the game this season:
${availablePlayers.map(p => `- ${p.name} (${p.position}, ${p.team}) £${p.price}m | Form: ${p.form} | Total pts: ${p.totalPoints}`).join('\n')}

Only suggest players from the available players list above when recommending transfers. Do not suggest players not on this list.

Respond with ONLY a valid JSON object, no other text, using exactly this shape:
{
  "captainPick": "markdown-formatted recommended starting XI and captain choice, with reasons",
  "transferAdvice": "markdown-formatted transfer suggestions based on form and value",
  "chipStrategy": "markdown-formatted chip timing and wildcard planning advice",
  "fixtureView": "markdown-formatted notes on upcoming fixture difficulty for their squad"
}

Every field must contain relevant content only for that category — do not mix categories together.
If you have nothing relevant for a category, write "No specific advice for this category." for that field instead of leaving it blank.
    `.trim();

    const raw = await getAIAdvice(prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const advice = JSON.parse(cleaned);
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

    const { currentGW, managerInfo, teamPicks, squad, availablePlayers } = await buildSquadContext(teamId);

    const systemPrompt = `
You are an expert Fantasy Premier League assistant.

Manager: ${managerInfo.player_first_name} ${managerInfo.player_last_name}
Team name: ${managerInfo.name}
Gameweek: ${currentGW}
Bank: £${teamPicks.entry_history.bank / 10}m

Their current squad (multiplier 0 = bench, 1 = playing, 2 = captain):
${squad.map(p => `- ${p.name} (${p.position}, ${p.team}) £${p.price}m | Form: ${p.form} | Total pts: ${p.totalPoints} | Multiplier: ${p.multiplier}`).join('\n')}

Available players in the game this season:
${availablePlayers.map(p => `- ${p.name} (${p.position}, ${p.team}) £${p.price}m | Form: ${p.form} | Total pts: ${p.totalPoints}`).join('\n')}

Only suggest players from the available players list above when recommending transfers. Do not suggest players not on this list.
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