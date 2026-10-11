/*
  Unit tests for the web API base URL resolver.

  The resolver is a pure function over an environment map, so the tests pin the
  precedence the web build relies on: the canonical HOSTING_API_URL, then the
  Create React App build mirror REACT_APP_HOSTING_API_URL, then the deprecated
  REACT_APP_API_URL, then the documented default. No process environment or
  network is touched.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { resolveApiUrl, DEFAULT_API_URL } = require('../../src/services/api-url')

test('defaults to the documented API base URL when the environment is empty', () => {
  assert.equal(resolveApiUrl({}), 'http://localhost:5050')
  assert.equal(DEFAULT_API_URL, 'http://localhost:5050')
})

test('uses the canonical HOSTING_API_URL when it is set', () => {
  const env = { HOSTING_API_URL: 'https://file-hosting-api.blippost.com' }

  assert.equal(resolveApiUrl(env), 'https://file-hosting-api.blippost.com')
})

test('uses the browser build mirror when the canonical name is absent', () => {
  const env = { REACT_APP_HOSTING_API_URL: 'http://10.0.0.7:5050' }

  assert.equal(resolveApiUrl(env), 'http://10.0.0.7:5050')
})

test('uses the deprecated fallback when only it is set', () => {
  const env = { REACT_APP_API_URL: 'http://localhost:6060' }

  assert.equal(resolveApiUrl(env), 'http://localhost:6060')
})

test('prefers the canonical HOSTING_API_URL over the mirror and the fallback', () => {
  const env = {
    HOSTING_API_URL: 'https://canonical.example.com',
    REACT_APP_HOSTING_API_URL: 'https://mirror.example.com',
    REACT_APP_API_URL: 'https://legacy.example.com'
  }

  assert.equal(resolveApiUrl(env), 'https://canonical.example.com')
})

test('prefers the browser build mirror over the deprecated fallback', () => {
  const env = {
    REACT_APP_HOSTING_API_URL: 'https://mirror.example.com',
    REACT_APP_API_URL: 'https://legacy.example.com'
  }

  assert.equal(resolveApiUrl(env), 'https://mirror.example.com')
})

test('skips an empty variable and falls through to the next name', () => {
  const env = {
    HOSTING_API_URL: '',
    REACT_APP_HOSTING_API_URL: 'http://mirror.local:5050',
    REACT_APP_API_URL: ''
  }

  assert.equal(resolveApiUrl(env), 'http://mirror.local:5050')
})
