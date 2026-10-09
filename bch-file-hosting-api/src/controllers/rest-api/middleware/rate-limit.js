/*
  Per-IP rate limit for the public routes.
*/

import { rateLimit } from 'express-rate-limit'

export function createRateLimiter ({ config }) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: config.rateLimitPerMin,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ success: false, error: 'Too many requests. Try again in a minute.' })
    }
  })
}

export default createRateLimiter

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:27:43.643Z","module_hash":"22112638b0d37b4f18ae548563f3614c0aaae339c4239e90efac7af315cffc2f","functions":[{"id":"func/createRateLimiter","name":"createRateLimiter","line":7,"end_line":17,"hash":"f422d97faf34a54f05041cb5d584df0aafe6286ce93d8a9f240c75f8e5aa5ed5"}]}
// mutate4javascript-manifest-end
