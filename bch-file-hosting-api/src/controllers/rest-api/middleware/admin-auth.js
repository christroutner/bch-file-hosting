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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:27:19.530Z","module_hash":"c104a96f7ab7097c4297c8baed7a75d6c0e5991a8a532a7406698cbb4302b973","functions":[{"id":"func/safeEqual","name":"safeEqual","line":9,"end_line":13,"hash":"608ff2edafbe0a2d3ba88c1dbdb19503d8aea10aea341304d943ee0dfd2ec97c"},{"id":"func/createAdminAuth","name":"createAdminAuth","line":15,"end_line":28,"hash":"0eb94197918057b243cf7943fcc7e5c54f4ac510481d7a5682995afbf5db5921"}]}
// mutate4javascript-manifest-end
