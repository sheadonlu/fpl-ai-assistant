// src/services/authService.js
//
// Pure(ish) auth helpers — password hashing and JWT sign/verify.
// No DB or Express dependencies in here on purpose, so this file can be
// unit tested in isolation the same way scoringEngine.js is.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set — add it to your .env file');
  }
  return secret;
}

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

export function generateToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

// Throws (jwt.verify's native behavior) if the token is invalid, tampered,
// or expired. Callers (the auth middleware) are expected to catch this.
export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}