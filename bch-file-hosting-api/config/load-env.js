/*
  Loads .env into process.env, except under SVC_ENV=test so unit tests never
  pick up a developer's local settings or secrets. This must be imported
  before any module that reads process.env.
*/

import dotenv from 'dotenv'

export function loadEnv (env = process.env, load = dotenv.config) {
  if (env.SVC_ENV === 'test') return false

  load({ quiet: true })
  return true
}

loadEnv()
