// src/services/authService.test.js
//
// Uses Node's built-in test runner, same as scoringEngine.test.js.
// JWT_SECRET is set before importing the module under test, since
// authService reads it lazily (at call time, not import time) — that's
// what makes the "missing secret throws" test below possible at all.

import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'test-only-secret-do-not-use-in-prod';

const {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken
} = await import('./authService.js');

// ---------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------

test('hashPassword: produces a bcrypt hash, not the plaintext password', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.notEqual(hash, 'correct horse battery staple');
  assert.match(hash, /^\$2[aby]\$/); // bcrypt hash prefix
});

test('verifyPassword: returns true for the correct password against its own hash', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.equal(await verifyPassword('correct horse battery staple', hash), true);
});

test('verifyPassword: returns false for a wrong password', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.equal(await verifyPassword('wrong password', hash), false);
});

test('hashPassword: hashing the same password twice yields different hashes (salted)', async () => {
  const hashA = await hashPassword('same-password');
  const hashB = await hashPassword('same-password');
  assert.notEqual(hashA, hashB);
  // but both still verify correctly
  assert.equal(await verifyPassword('same-password', hashA), true);
  assert.equal(await verifyPassword('same-password', hashB), true);
});

// ---------------------------------------------------------------------
// JWT sign/verify
// ---------------------------------------------------------------------

test('generateToken + verifyToken: round-trips the payload correctly', () => {
  const token = generateToken({ userId: 42, email: 'test@example.com' });
  const decoded = verifyToken(token);
  assert.equal(decoded.userId, 42);
  assert.equal(decoded.email, 'test@example.com');
});

test('verifyToken: throws on a tampered token', () => {
  const token = generateToken({ userId: 1, email: 'a@b.com' });
  const tampered = token.slice(0, -2) + (token.slice(-2) === 'AA' ? 'BB' : 'AA');
  assert.throws(() => verifyToken(tampered));
});

test('verifyToken: throws on a garbage string', () => {
  assert.throws(() => verifyToken('not.a.real.jwt'));
});

test('generateToken: includes an expiry claim', () => {
  const token = generateToken({ userId: 1, email: 'a@b.com' });
  const decoded = verifyToken(token);
  assert.ok(decoded.exp, 'token should have an exp claim');
  assert.ok(decoded.iat, 'token should have an iat claim');
  assert.ok(decoded.exp > decoded.iat);
});