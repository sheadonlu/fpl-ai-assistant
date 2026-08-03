// src/routes/auth.js
import { Router } from 'express';
import pool from '../db/pool.js';
import { hashPassword, verifyPassword, generateToken } from '../services/authService.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'That email address doesn\'t look valid' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const passwordHash = await hashPassword(password);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email.toLowerCase().trim(), passwordHash]
    );
    const user = rows[0];
    const token = generateToken({ userId: user.id, email: user.email });
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') {
      // unique_violation on email
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Something went wrong creating your account' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, email, password_hash FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    const user = rows[0];

    // Same error message whether the email doesn't exist or the password
    // is wrong — don't leak which one it was.
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({ userId: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong logging in' });
  }
});

// GET /api/auth/me — sanity check that a token is valid and see who it belongs to
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/teams — list the logged-in user's saved FPL team IDs
router.get('/teams', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, fpl_team_id, nickname, is_default
       FROM user_teams
       WHERE user_id = $1
       ORDER BY created_at`,
      [req.user.id]
    );
    res.json({ teams: rows });
  } catch (err) {
    console.error('List teams error:', err);
    res.status(500).json({ error: 'Could not load saved teams' });
  }
});

// POST /api/auth/teams — save (or update the nickname of) an FPL team ID for this user
router.post('/teams', requireAuth, async (req, res) => {
  const { fplTeamId, nickname } = req.body ?? {};

  if (!fplTeamId || !Number.isInteger(Number(fplTeamId))) {
    return res.status(400).json({ error: 'fplTeamId (integer) is required' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO user_teams (user_id, fpl_team_id, nickname)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, fpl_team_id)
       DO UPDATE SET nickname = EXCLUDED.nickname
       RETURNING id, fpl_team_id, nickname, is_default`,
      [req.user.id, Number(fplTeamId), nickname || null]
    );
    res.status(201).json({ team: rows[0] });
  } catch (err) {
    console.error('Save team error:', err);
    res.status(500).json({ error: 'Could not save team' });
  }
});

// DELETE /api/auth/teams/:id — remove a saved team
router.delete('/teams/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM user_teams WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Saved team not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Delete team error:', err);
    res.status(500).json({ error: 'Could not delete saved team' });
  }
});

export default router;