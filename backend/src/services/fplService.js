import axios from 'axios';

const FPL_BASE = 'https://fantasy.premierleague.com/api';

export async function getBootstrapData() {
  const { data } = await axios.get(`${FPL_BASE}/bootstrap-static/`);
  return data;
}

export async function getManagerInfo(teamId) {
  const { data } = await axios.get(`${FPL_BASE}/entry/${teamId}/`);
  return data;
}

export async function getManagerTeam(teamId, gameweek) {
  const { data } = await axios.get(`${FPL_BASE}/entry/${teamId}/event/${gameweek}/picks/`);
  return data;
}