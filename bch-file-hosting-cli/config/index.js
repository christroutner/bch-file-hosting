/*
  App-wide configuration for the bch-file-hosting CLI.

  Values come from the environment, loaded from `.env` in development. Unit
  tests run with `SVC_ENV=test`, which skips `.env` so tests never depend on a
  developer's local settings.
*/

// Global npm libraries
import dotenv from 'dotenv'

if (process.env.SVC_ENV !== 'test') {
  dotenv.config({ quiet: true })
}

const config = {
  // Base URL of the bch-file-hosting REST API.
  apiUrl: process.env.HOSTING_API_URL || 'http://localhost:5050'
}

export default config
