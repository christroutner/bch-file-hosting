/*
  Property tests for the web API base URL resolver (src/services/api-url.js).

  Invariants: the resolver returns the first non-empty value in the fixed
  precedence HOSTING_API_URL, REACT_APP_HOSTING_API_URL, REACT_APP_API_URL,
  otherwise the documented default. Values are returned verbatim, unrelated
  environment variables are ignored, and resolution is deterministic and
  side-effect free.

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { resolveApiUrl, DEFAULT_API_URL } = require('../../src/services/api-url')
const { forAll, integerBetween, randomString } = require('./lib/harness')

const PRECEDENCE = [
  'HOSTING_API_URL',
  'REACT_APP_HOSTING_API_URL',
  'REACT_APP_API_URL'
]

const URL_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-_:/?'

// 0 = absent, 1 = empty string, 2 = a non-empty random value.
function generateEnv (random) {
  const env = {}
  for (const name of PRECEDENCE) {
    const mode = integerBetween(random, 0, 2)
    if (mode === 1) env[name] = ''
    else if (mode === 2) env[name] = randomString(random, 1, 48, URL_ALPHABET)
  }

  // Decoy variables that must never influence the result.
  env.PORT = randomString(random, 0, 6)
  env.REACT_APP_OTHER = randomString(random, 0, 12, URL_ALPHABET)

  return env
}

function expected (env) {
  for (const name of PRECEDENCE) {
    if (env[name]) return env[name]
  }
  return DEFAULT_API_URL
}

test('property: the first non-empty precedence variable wins, else the default', () => {
  forAll({
    seed: 1,
    runs: 500,
    generate: generateEnv,
    property: (env) => {
      assert.equal(resolveApiUrl(env), expected(env))
    }
  })
})

test('property: a non-empty canonical value always wins', () => {
  forAll({
    seed: 2,
    runs: 300,
    generate: (random) => {
      const env = generateEnv(random)
      env.HOSTING_API_URL = randomString(random, 1, 48, URL_ALPHABET)
      return env
    },
    property: (env) => {
      assert.equal(resolveApiUrl(env), env.HOSTING_API_URL)
    }
  })
})

test('property: the result is a string drawn verbatim from the precedence names or the default', () => {
  forAll({
    seed: 3,
    runs: 300,
    generate: generateEnv,
    property: (env) => {
      const result = resolveApiUrl(env)
      assert.equal(typeof result, 'string')

      if (result !== DEFAULT_API_URL) {
        assert.ok(PRECEDENCE.some((name) => env[name] === result))
      }
    }
  })
})

test('property: resolution is deterministic and does not mutate the environment', () => {
  forAll({
    seed: 4,
    runs: 300,
    generate: generateEnv,
    property: (env) => {
      const snapshot = { ...env }
      assert.equal(resolveApiUrl(env), resolveApiUrl(env))
      assert.deepEqual(env, snapshot)
    }
  })
})

test('property: an all-absent or all-empty environment yields the default', () => {
  forAll({
    seed: 5,
    runs: 200,
    generate: (random) => {
      const env = {}
      for (const name of PRECEDENCE) {
        if (integerBetween(random, 0, 1) === 1) env[name] = ''
      }
      return env
    },
    property: (env) => {
      assert.equal(resolveApiUrl(env), DEFAULT_API_URL)
    }
  })
})
