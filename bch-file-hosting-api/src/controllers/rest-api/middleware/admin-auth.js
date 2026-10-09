/*
  Protects /admin routes with the x-api-key header. Admin routes are disabled
  (503) when ADMIN_API_KEY is not configured.
*/

import { createHash, timingSafeEqual } from 'crypto'

// Hash both values so they have equal length for timingSafeEqual.
function safeEqual (a, b) {
  const hashA = createHash('sha256').update(a).digest()
  const hashB = createHash('sha256').update(b).digest()
  return timingSafeEqual(hashA, hashB)
}

export function createAdminAuth ({ config }) {
  return function adminAuth (req, res, next) {
    if (!config.adminApiKey) {
      return res.status(503).json({ success: false, error: 'Admin API is disabled. Set ADMIN_API_KEY to enable it.' })
    }

    const provided = req.get('x-api-key')
    if (!provided || !safeEqual(provided, config.adminApiKey)) {
      return res.status(401).json({ success: false, error: 'Invalid or missing x-api-key header' })
    }

    return next()
  }
}

export default createAdminAuth
