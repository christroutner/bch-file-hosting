/*
  Unit tests for the project-owned public Helia node factory. The parent
  factory is patched so the tests verify the libp2p service merge without
  building a real node.
*/

import { assert } from 'chai'
import sinon from 'sinon'
import CreateHeliaNode from 'helia-coord/create-helia-node'

import PublicHeliaNode from '../../../../src/adapters/ipfs/public-helia-node.js'
import { PUBLIC_BOOTSTRAP_PEERS } from '../../../../src/adapters/ipfs/public-network.js'

describe('#public-helia-node', () => {
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => sandbox.restore())

  describe('#constructor', () => {
    it('should append the public IPFS bootstrap peers to the base peers', () => {
      const node = new PublicHeliaNode({ bootstrapPeers: ['/ip4/1.2.3.4/tcp/4001/p2p/peer'] })

      assert.include(node.bootstrapPeers, '/ip4/1.2.3.4/tcp/4001/p2p/peer')
      for (const peer of PUBLIC_BOOTSTRAP_PEERS) {
        assert.include(node.bootstrapPeers, peer)
      }
    })

    it('should keep the base factory defaults when no peers are supplied', () => {
      const node = new PublicHeliaNode({})

      assert.isAbove(node.bootstrapPeers.length, PUBLIC_BOOTSTRAP_PEERS.length)
    })
  })

  describe('#createNode', () => {
    it('should add the public DHT and NAT services to the libp2p options', async () => {
      const node = new PublicHeliaNode({})
      let captured
      node.createLibp2p = async (options) => {
        captured = options
        return 'libp2p-node'
      }
      sandbox.stub(CreateHeliaNode.prototype, 'createNode').callsFake(function () {
        return this.createLibp2p({ services: { identify: 'base-service' } })
      })

      const result = await node.createNode()

      assert.equal(result, 'libp2p-node')
      assert.equal(captured.services.identify, 'base-service')
      assert.equal(typeof captured.services.aminoDHT, 'function')
      assert.equal(typeof captured.services.dht, 'function')
      assert.equal(typeof captured.services.upnpNAT, 'function')
      assert.equal(typeof captured.services.dcutr, 'function')
    })

    it('should restore the original createLibp2p after building the node', async () => {
      const node = new PublicHeliaNode({})
      const original = node.createLibp2p
      sandbox.stub(CreateHeliaNode.prototype, 'createNode').resolves('node')

      await node.createNode()

      assert.equal(node.createLibp2p, original)
    })
  })
})
