/*
  Unit tests for the pinning provider contract, the local Helia provider, and
  the provider registry.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import PinningProvider from '../../../../src/adapters/pinning/pinning-provider.js'
import LocalHeliaProvider from '../../../../src/adapters/pinning/local-helia.js'
import PinningRegistry from '../../../../src/adapters/pinning/index.js'

describe('#pinning', () => {
  let sandbox
  let ipfs

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    ipfs = {
      pin: sandbox.stub().resolves(true),
      unpin: sandbox.stub().resolves(true),
      isPinned: sandbox.stub().resolves(true)
    }
  })

  afterEach(() => sandbox.restore())

  describe('#PinningProvider', () => {
    class NamedProvider extends PinningProvider {
      get name () { return 'named' }
    }

    it('should require subclasses to implement name and capabilities', () => {
      const base = new PinningProvider()
      assert.throws(() => base.name, /must implement name/)
      assert.throws(() => base.capabilities, /must implement capabilities/)
    })

    it('should reject pin, status, and unpin until implemented', async () => {
      const provider = new NamedProvider()
      for (const call of [() => provider.pin({ cid: 'x' }), () => provider.status('x'), () => provider.unpin('x')]) {
        try {
          await call()
          assert.fail('Unexpected result')
        } catch (err) {
          assert.include(err.message, 'named does not implement')
        }
      }
    })

    it('should have no gateway URL by default', () => {
      assert.isNull(new NamedProvider().gatewayUrl('x'))
    })
  })

  describe('#LocalHeliaProvider', () => {
    let uut

    beforeEach(() => {
      uut = new LocalHeliaProvider({ ipfs })
    })

    it('should throw without the IPFS adapter', () => {
      assert.throws(() => new LocalHeliaProvider(), /requires the IPFS adapter/)
    })

    it('should describe itself', () => {
      assert.equal(uut.name, 'local-helia')
      assert.deepEqual(uut.capabilities, { pinByCid: true, uploadBytes: false, unpin: true })
      assert.isNull(uut.gatewayUrl('x'))
    })

    it('should pin through the IPFS adapter', async () => {
      const result = await uut.pin({ cid: 'bafy-cid' })

      assert.deepEqual(result, { providerCid: 'bafy-cid', providerRef: null })
      assert.isTrue(ipfs.pin.calledWith('bafy-cid'))
    })

    it('should report pinned or unknown status', async () => {
      assert.equal(await uut.status('bafy-cid'), 'pinned')

      ipfs.isPinned.resolves(false)
      assert.equal(await uut.status('bafy-cid'), 'unknown')
    })

    it('should unpin through the IPFS adapter', async () => {
      await uut.unpin('bafy-cid')

      assert.isTrue(ipfs.unpin.calledWith('bafy-cid'))
    })
  })

  describe('#PinningRegistry', () => {
    it('should throw without the IPFS adapter or config', () => {
      assert.throws(() => new PinningRegistry({ config: { pinningProviders: [] } }), /requires the IPFS adapter/)
      assert.throws(() => new PinningRegistry({ ipfs }), /requires a config object/)
    })

    it('should contain only the local node when no providers are configured', () => {
      const uut = new PinningRegistry({ ipfs, config: { pinningProviders: [] } })

      assert.deepEqual(uut.getProviders().map(p => p.name), ['local-helia'])
    })

    it('should add configured third-party providers after the local node', () => {
      const fakeProvider = { name: 'lighthouse' }
      const factories = { lighthouse: sandbox.stub().returns(fakeProvider) }
      const config = { pinningProviders: ['lighthouse'] }

      const uut = new PinningRegistry({ ipfs, config, factories })

      assert.deepEqual(uut.getProviders().map(p => p.name), ['local-helia', 'lighthouse'])
      assert.isTrue(factories.lighthouse.calledWith({ config }))
    })

    it('should throw for an unknown provider and list the known ones', () => {
      assert.throws(
        () => new PinningRegistry({ ipfs, config: { pinningProviders: ['pinata'] }, factories: { lighthouse: () => ({}) } }),
        /Unknown pinning provider 'pinata'. Known providers: lighthouse/
      )
    })

    it('should say when no third-party providers are known', () => {
      assert.throws(
        () => new PinningRegistry({ ipfs, config: { pinningProviders: ['lighthouse'] } }),
        /Known providers: none/
      )
    })

    it('should find a provider by name', () => {
      const uut = new PinningRegistry({ ipfs, config: { pinningProviders: [] } })

      assert.equal(uut.getProvider('local-helia').name, 'local-helia')
      assert.isNull(uut.getProvider('pinata'))
    })

    it('should return a copy of the provider list', () => {
      const uut = new PinningRegistry({ ipfs, config: { pinningProviders: [] } })

      uut.getProviders().push('junk')
      assert.lengthOf(uut.getProviders(), 1)
    })
  })
})
