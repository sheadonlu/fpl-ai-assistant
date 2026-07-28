import { Router } from 'express';
import { getBootstrapData, getManagerInfo, getManagerTeam } from '../services/fplService.js';

const router = Router();

// GET /api/fpl/bootstrap
router.get('/bootstrap', async (req, res) => {
  try {
    const data = await getBootstrapData();
    res.json({
      players: data.elements.map(p => ({
        id: p.id,
        name: `${p.first_name} ${p.second_name}`,
        team: p.team,
        position: p.element_type,
        price: p.now_cost / 10,
        form: p.form,
        totalPoints: p.total_points,
        selectedBy: p.selected_by_percent,
      })),
      gameweeks: data.events.map(e => ({
        id: e.id,
        name: e.name,
        isCurrent: e.is_current,
        isNext: e.is_next,
        finished: e.finished,
      })),
      teams: data.teams.map(t => ({
        id: t.id,
        name: t.name,
        shortName: t.short_name,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fpl/manager/:teamId
router.get('/manager/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;

    const bootstrap = await getBootstrapData();
    const currentGW = bootstrap.events.find(e => e.is_current)?.id
      ?? bootstrap.events.find(e => e.is_next)?.id
      ?? bootstrap.events[bootstrap.events.length - 1]?.id;

    const [managerInfo, teamPicks] = await Promise.all([
      getManagerInfo(teamId),
      getManagerTeam(teamId, currentGW),
    ]);

    const playerMap = Object.fromEntries(
      bootstrap.elements.map(p => [p.id, p])
    );

    const enrichedPicks = teamPicks.picks.map(pick => {
      const player = playerMap[pick.element];
      return {
        playerId: pick.element,
        name: `${player.first_name} ${player.second_name}`,
        position: player.element_type,
        team: player.team,
        price: player.now_cost / 10,
        form: player.form,
        totalPoints: player.total_points,
        isCaptain: pick.is_captain,
        isViceCaptain: pick.is_vice_captain,
        multiplier: pick.multiplier,
      };
    });

    res.json({
      manager: {
        name: `${managerInfo.player_first_name} ${managerInfo.player_last_name}`,
        teamName: managerInfo.name,
        totalPoints: managerInfo.summary_overall_points,
        overallRank: managerInfo.summary_overall_rank,
        gameweek: currentGW,
      },
      squad: enrichedPicks,
      transfers: {
        made: teamPicks.entry_history.event_transfers,
        cost: teamPicks.entry_history.event_transfers_cost,
        bank: teamPicks.entry_history.bank / 10,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;