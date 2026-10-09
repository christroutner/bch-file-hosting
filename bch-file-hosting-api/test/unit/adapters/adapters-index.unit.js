/*
  Unit tests for the top-level adapters library.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import Adapters from '../../../src/adapters/index.js'
import { selectConfig } from '../../../config/index.js'

describe('#adapters/index.js', () => {
  let sandbox
  let uut
  let calls

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    calls = []

    uut = new Adapters({ config: selectConfig('test') })

    sandbox.stub(uut.localdb, 'open').callsFake(async () => { calls.push('db') })
    sandbox.stub(uut.localdb, 'close').callsFake(async () => { calls.push('db-close') })
    sandbox.stub(uut.wallet, 'init').callsFake(async () => { calls.push('wallet') })
    sandbox.stub(uut.ipfs, 'start').callsFake(async () => { calls.push('ipfs') })
    sandbox.stub(uut.ipfs, 'stop').callsFake(async () => { calls.push('ipfs-stop') })
    sandbox.stub(uut.ipfs, 'getStatus').returns({ ipfsId: 'peer-id' })
  })

  afterEach(() => sandbox.restore())

  it('should throw if no config is passed in', () => {
    assert.throws(() => new Adapters(), /requires a config object/)
  })

  it('should create every adapter', () => {
    assert.property(uut, 'logger')
    assert.property(uut, 'localdb')
    assert.property(uut, 'wallet')
    assert.property(uut, 'ipfs')
    assert.property(uut, 'announcer')
    assert.isNull(uut.pinning)
  })

  describe('#start', () => {
    it('should start adapters in order and then build the pinning registry', async () => {
      await uut.start()

      assert.deepEqual(calls, ['db', 'wallet', 'ipfs'])
      assert.deepEqual(uut.pinning.getProviders().map(p => p.name), ['local-helia'])
    })

    it('should not start IPFS if the wallet fails to open', async () => {
      uut.wallet.init.restore()
      sandbox.stub(uut.wallet, 'init').rejects(new Error('MNEMONIC is required'))

      try {
        await uut.start()
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'MNEMONIC is required')
      }
      assert.deepEqual(calls, ['db'])
    })
  })

  describe('#stop', () => {
    it('should stop IPFS and then close the database', async () => {
      await uut.stop()

      assert.deepEqual(calls, ['ipfs-stop', 'db-close'])
    })
  })
})
