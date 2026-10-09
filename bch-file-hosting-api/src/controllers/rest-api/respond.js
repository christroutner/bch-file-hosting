/*
  Shared JSON response helper for the REST controllers. Every success body has
  a `success: true` flag merged with the use-case result.
*/

export function sendSuccess (res, result = {}) {
  res.json({ success: true, ...result })
}

export default { sendSuccess }
