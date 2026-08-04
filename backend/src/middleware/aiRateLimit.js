// src/middleware/aiRateLimit.js
//
// Per-IP throttle on the AI routes — each call spends the paid Groq API
// quota, so this caps how fast any single client can burn through it.

import rateLimit from 'express-rate-limit';

export const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests from this IP. Please try again later.' },
});
