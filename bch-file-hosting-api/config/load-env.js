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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T02:23:35.518Z","module_hash":"013b66dc753a984cd1af787f3daf28791fd93da43a1e323391488108562b2a6b","functions":[{"id":"func/loadEnv","name":"loadEnv","line":9,"end_line":14,"hash":"bf5a1cba857aa13403b18af0bb8478ad5355b5be1eb3e6585b1c8fddd5df8641"}]}
// mutate4javascript-manifest-end
