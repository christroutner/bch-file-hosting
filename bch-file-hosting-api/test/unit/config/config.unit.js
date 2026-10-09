/*
  Unit tests for configuration loading.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import { selectConfig } from '../../../config/index.js'
import { toNumber, toBool, toList } from '../../../config/env/common.js'
import { loadEnv } from '../../../config/load-env.js'

describe('#config', () => {
  describe('#loadEnv', () => {
    it('should not load .env in the test environment', () => {
      const load = sinon.stub()

      assert.isFalse(loadEnv({ SVC_ENV: 'test' }, load))
      assert.isTrue(load.notCalled)
    })

    it('should load .env quietly in other environments', () => {
      const load = sinon.stub()

      assert.isTrue(loadEnv({ SVC_ENV: 'development' }, load))
      assert.isTrue(load.calledOnceWith({ quiet: true }))
    })
  })

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

  describe('#common defaults', () => {
    it('should apply the documented fallbacks when the env vars are unset', () => {
      const config = selectConfig('development')

      assert.equal(config.walletInterface, 'web3')
      assert.equal(config.publicUrl, `http://localhost:${config.port}`)
      assert.equal(config.logLevel, 'info')
      assert.equal(config.logDir, './logs')
      assert.equal(config.mnemonic, '')
      assert.equal(config.treasuryAddress, '')
      assert.equal(config.apiServer, 'https://free-bch.fullstack.cash')
      assert.equal(config.walletWifX402, '')
      assert.equal(config.uploadTmpDir, './tmp/uploads')
      assert.equal(config.levelDbPath, './.leveldb')
      assert.equal(config.ipfsDir, './.ipfsdata')
      assert.isFalse(config.enableCircuitRelay)
      assert.isTrue(config.enableIpfsCoord)
      assert.equal(config.coordName, 'bch-file-hosting')
      assert.equal(config.adminApiKey, '')
      assert.isFalse(config.trustProxy)
      assert.equal(config.lighthouseApiKey, '')
      assert.equal(config.lighthouseApiUrl, 'https://api.lighthouse.storage')
      assert.equal(config.lighthouseGateway, 'https://gateway.lighthouse.storage/ipfs/')
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
