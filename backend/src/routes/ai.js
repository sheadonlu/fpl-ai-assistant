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

  return { bootstrap, currentGW, managerInfo, teamPicks, squad };
}

// POST /api/ai/advice/:teamId
router.post('/advice/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { bootstrap, currentGW, managerInfo, teamPicks, squad } = await buildSquadContext(teamId);

    const prompt = `
      You are an expert Fantasy Premier League assistant.

      Manager: ${managerInfo.player_first_name} ${managerInfo.player_last_name}
      Team name: ${managerInfo.name}
      Gameweek: ${currentGW}
      Bank: £${teamPicks.entry_history.bank / 10}m

      Their current squad (multiplier 0 = bench, 1 = playing, 2 = captain):
      ${squad.map(p => `- ${p.name} (${p.position}, ${p.team}) £${p.price}m | Form: ${p.form} | Total pts: ${p.totalPoints} | Multiplier: ${p.multiplier}`).join('\n')}

      Please give:
      1. Recommended starting XI and captain choice with reasons
      2. Any transfer suggestions based on form and value
      3. Key things to watch this gameweek
    `;

    const advice = await getAIAdvice(prompt);
    res.json({ advice });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/chat/:teamId
router.post('/chat/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { messages, userMessage } = req.body;

    const { currentGW, managerInfo, teamPicks, squad } = await buildSquadContext(teamId);

    const systemPrompt = `
You are an expert Fantasy Premier League assistant.

Manager: ${managerInfo.player_first_name} ${managerInfo.player_last_name}
Team name: ${managerInfo.name}
Gameweek: ${currentGW}
Bank: £${teamPicks.entry_history.bank / 10}m

Their current squad (multiplier 0 = bench, 1 = playing, 2 = captain):
${squad.map(p => `- ${p.name} (${p.position}, ${p.team}) £${p.price}m | Form: ${p.form} | Total pts: ${p.totalPoints} | Multiplier: ${p.multiplier}`).join('\n')}

Answer questions about their team, suggest transfers, compare players, advise on captaincy, and give general FPL strategy advice. Be concise and direct. Use bullet points where helpful.
    `.trim();

    const updatedMessages = [...messages, { role: 'user', content: userMessage }];
    const reply = await getChatReply(systemPrompt, updatedMessages);

    res.json({
      reply,
      messages: [...updatedMessages, { role: 'assistant', content: reply }],
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;