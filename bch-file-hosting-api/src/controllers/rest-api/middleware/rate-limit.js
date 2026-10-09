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
