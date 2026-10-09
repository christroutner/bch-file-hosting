/*
  Unit tests for the logger adapter.
*/

import { assert } from 'chai'

import { createLogger, redactSecrets } from '../../../src/adapters/logger.js'

describe('#logger.js', () => {
  describe('#redactSecrets', () => {
    it('should redact secret-looking fields', () => {
      const format = redactSecrets()
      const info = format.transform({
        level: 'info',
        message: 'swept',
        wif: 'L1secret',
        mnemonic: 'twelve words',
        adminApiKey: 'abc',
        paymentAddress: 'bitcoincash:q123'
      })

      assert.equal(info.wif, '[redacted]')
      assert.equal(info.mnemonic, '[redacted]')
      assert.equal(info.adminApiKey, '[redacted]')
      assert.equal(info.paymentAddress, 'bitcoincash:q123')
      assert.equal(info.message, 'swept')
    })
  })

  describe('#createLogger', () => {
    it('should create a silent console-only logger in the test env', () => {
      const logger = createLogger({ config: { env: 'test', logLevel: 'error', logDir: './tmp/test/logs' } })

      assert.equal(logger.level, 'error')
      assert.lengthOf(logger.transports, 1)
      assert.isTrue(logger.transports[0].silent)
    })

    it('should add a rotating file transport outside the test env', () => {
      const logger = createLogger({ config: { env: 'development', logLevel: 'info', logDir: './tmp/test/logs' } })

      assert.lengthOf(logger.transports, 2)
      assert.equal(logger.transports[1].name, 'dailyRotateFile')
      logger.close()
    })
  })
})
