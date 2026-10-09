/*
  Shared JSON response helper for the REST controllers. Every success body has
  a `success: true` flag merged with the use-case result.
*/

export function sendSuccess (res, result = {}) {
  res.json({ success: true, ...result })
}

export default { sendSuccess }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:22:57.782Z","module_hash":"e36eb0bad2776b47acbd2a375483882b5d1d5f4ccd524dd9f4b510916e0dee81","functions":[{"id":"func/sendSuccess","name":"sendSuccess","line":6,"end_line":8,"hash":"c8eff66a70749601e8ff2e8c64217f130f95a70238147d959a31b5d14c4237cb"}]}
// mutate4javascript-manifest-end
