/*
  Unit tests for the public IPFS network service configuration. Building the
  configuration only creates libp2p service factories, so these tests never
  start a node.
*/

import { assert } from 'chai'

import {
  buildPublicNetworkServices,
  withPublicNetworkServices
} from '../../../../src/adapters/ipfs/public-network.js'

describe('#public-network', () => {
  describe('#buildPublicNetworkServices', () => {
    it('should register the public Amino DHT and the private PSF DHT', () => {
      const config = buildPublicNetworkServices()

      assert.deepEqual(config.dhtProtocols, {
        aminoDHT: '/ipfs/kad/1.0.0',
        dht: '/psf/kad/1.0.0'
      })
    })

    it('should enable the NAT traversal services', () => {
      const config = buildPublicNetworkServices()

      assert.deepEqual(config.natServices, ['upnpNAT', 'dcutr'])
    })

    it('should build a factory for every exposed service', () => {
      const { services } = buildPublicNetworkServices()

      for (const name of ['aminoDHT', 'dht', 'upnpNAT', 'dcutr']) {
        assert.equal(typeof services[name], 'function', `${name} should be a service factory`)
      }
    })
  })

  describe('#withPublicNetworkServices', () => {
    it('should merge the public services over the base services', () => {
      const result = withPublicNetworkServices({ identify: 'base', dht: 'old-dht' })

      assert.equal(result.identify, 'base')
      assert.equal(typeof result.aminoDHT, 'function')
      assert.equal(typeof result.dht, 'function')
      assert.equal(typeof result.upnpNAT, 'function')
      assert.equal(typeof result.dcutr, 'function')
    })

    it('should replace a base dht with the PSF DHT', () => {
      const result = withPublicNetworkServices({ dht: 'old-dht' })

      assert.notEqual(result.dht, 'old-dht')
    })

    it('should default to an empty base service map', () => {
      assert.property(withPublicNetworkServices(), 'aminoDHT')
    })
  })
})
