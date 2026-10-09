/*
  Unit tests for configuration loading.
*/

import { assert } from 'chai'

import { selectConfig } from '../../../config/index.js'
import { toNumber, toBool, toList } from '../../../config/env/common.js'

describe('#config', () => {
  describe('#selectConfig', () => {
    it('should load the development config by default', () => {
      const config = selectConfig()

      assert.equal(config.env, 'development')
      assert.property(config, 'usdPerMbYear')
      assert.property(config, 'version')
    })

    it('should load the test config', () => {
      const config = selectConfig('test')

      assert.equal(config.env, 'test')
      assert.include(config.levelDbPath, 'tmp/test')
    })

    it('should load the production config', () => {
      const config = selectConfig('production')

      assert.equal(config.env, 'production')
    })

    it('should throw for an unknown environment', () => {
      assert.throws(() => selectConfig('prod'), /Unknown SVC_ENV 'prod'/)
    })
  })

  describe('#toNumber', () => {
    it('should return the fallback when unset or empty', () => {
      assert.equal(toNumber(undefined, 5), 5)
      assert.equal(toNumber('', 5), 5)
    })

    it('should parse a numeric string', () => {
      assert.equal(toNumber('0.02', 5), 0.02)
    })

    it('should throw on a non-numeric string', () => {
      assert.throws(() => toNumber('abc', 5), /Expected a number but got 'abc'/)
    })
  })

  describe('#toBool', () => {
    it('should return the fallback when unset or empty', () => {
      assert.isTrue(toBool(undefined, true))
      assert.isFalse(toBool('', false))
    })

    it('should parse true and false', () => {
      assert.isTrue(toBool('true', false))
      assert.isFalse(toBool('false', true))
    })
  })

  describe('#toList', () => {
    it('should return the fallback when unset', () => {
      assert.deepEqual(toList(undefined, ['a']), ['a'])
    })

    it('should split, trim, and drop empty entries', () => {
      assert.deepEqual(toList(' a, b ,,c ', []), ['a', 'b', 'c'])
    })

    it('should return an empty list for an empty string', () => {
      assert.deepEqual(toList('', ['a']), [])
    })
  })
})
