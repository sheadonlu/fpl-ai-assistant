// src/middleware/requireAuth.js
//
// Protects a route: expects `Authorization: Bearer <token>`.
// On success, attaches `req.user = { id, email }` and calls next().
// On failure, responds 401 and does not call next().

import { verifyToken } from '../services/authService.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}