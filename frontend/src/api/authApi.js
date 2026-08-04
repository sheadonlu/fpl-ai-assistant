import axios from 'axios';
import { API_BASE } from '../config';

function toError(err, fallback) {
  return new Error(err.response?.data?.error ?? fallback, { cause: err });
}

export async function registerRequest(email, password) {
  try {
    const { data } = await axios.post(`${API_BASE}/auth/register`, { email, password });
    return data;
  } catch (err) {
    throw toError(err, 'Could not create your account. Please try again.');
  }
}

export async function loginRequest(email, password) {
  try {
    const { data } = await axios.post(`${API_BASE}/auth/login`, { email, password });
    return data;
  } catch (err) {
    throw toError(err, 'Could not log in. Please try again.');
  }
}

export async function getTeams(token) {
  try {
    const { data } = await axios.get(`${API_BASE}/auth/teams`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.teams;
  } catch (err) {
    throw toError(err, 'Could not load saved teams.');
  }
}

export async function saveTeam(token, fplTeamId, nickname) {
  try {
    const { data } = await axios.post(
      `${API_BASE}/auth/teams`,
      { fplTeamId, nickname },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data.team;
  } catch (err) {
    throw toError(err, 'Could not save this team.');
  }
}

export async function deleteTeam(token, id) {
  try {
    await axios.delete(`${API_BASE}/auth/teams/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw toError(err, 'Could not delete this team.');
  }
}
