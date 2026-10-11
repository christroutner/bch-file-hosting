/*
  Resolve the API base URL for the hosting web app.

  Precedence, highest first:

  1. HOSTING_API_URL — the canonical name shared with the CLI and other
     consumers.
  2. REACT_APP_HOSTING_API_URL — the Create React App build mirror, because a
     CRA build only inlines REACT_APP_* variables into the bundle.
  3. REACT_APP_API_URL — the deprecated name, kept as a fallback.

  With none set the documented default is used.
*/

const DEFAULT_API_URL = 'http://localhost:5050'

const API_URL_ENV_NAMES = [
  'HOSTING_API_URL',
  'REACT_APP_HOSTING_API_URL',
  'REACT_APP_API_URL'
]

// The first variable that is set to a non-empty value, in precedence order.
function resolveApiUrl (env = {}) {
  for (const name of API_URL_ENV_NAMES) {
    if (env[name]) return env[name]
  }
  return DEFAULT_API_URL
}

module.exports = { resolveApiUrl, DEFAULT_API_URL }
