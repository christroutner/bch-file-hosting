/*
  Merges the common settings with the settings for the environment selected by
  SVC_ENV (development, test, or production).
*/

import './load-env.js'

import common from './env/common.js'
import development from './env/development.js'
import test from './env/test.js'
import production from './env/production.js'

const envConfigs = { development, test, production }

export function selectConfig (svcEnv = 'development') {
  const envConfig = envConfigs[svcEnv]
  if (!envConfig) {
    throw new Error(
      `Unknown SVC_ENV '${svcEnv}'. Use one of: ${Object.keys(envConfigs).join(', ')}`
    )
  }

  return Object.assign({}, common, envConfig)
}

export default selectConfig(process.env.SVC_ENV)
