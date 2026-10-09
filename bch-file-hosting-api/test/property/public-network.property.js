/*
  Property tests for the public IPFS network service configuration
  (src/adapters/ipfs/public-network.js).

  Invariants: the built configuration always exposes the same four libp2p
  services and protocol mapping; merging it over any base service map preserves
  every base service that is not a public name, always replaces `dht` with the
  PSF factory, and never mutates the base map.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import {
  buildPublicNetworkServices,
  withPublicNetworkServices,
  PUBLIC_DHT_PROTOCOL,
  PSF_DHT_PROTOCOL
} from '../../src/adapters/ipfs/public-network.js'
import { forAll, integerBetween } from './lib/harness.js'

const PUBLIC_SERVICES = ['aminoDHT', 'dht', 'upnpNAT', 'dcutr']
const BASE_SERVICE_NAMES = ['identify', 'ping', 'relay', 'dht', 'aminoDHT', 'upnpNAT', 'noise']

describe('#public-network.property.js', () => {
  it('should always build exactly the public DHT and NAT services', () => {
    forAll({
      seed: 1,
      runs: 100,
      generate: () => ({}),
      property: () => {
        const config = buildPublicNetworkServices()

        assert.deepEqual(Object.keys(config.services).sort(), [...PUBLIC_SERVICES].sort())
        assert.deepEqual(config.dhtProtocols, {
          aminoDHT: PUBLIC_DHT_PROTOCOL,
          dht: PSF_DHT_PROTOCOL
        })
        assert.deepEqual(config.natServices, ['upnpNAT', 'dcutr'])
        assert.isFalse(config.dhtClientMode)
        for (const name of PUBLIC_SERVICES) {
          assert.equal(typeof config.services[name], 'function', `${name} should be a factory`)
        }
      }
    })
  })

  it('should keep unrelated base services, override public names, and not mutate the base map', () => {
    forAll({
      seed: 2,
      runs: 300,
      generate: (random) => {
        const base = {}
        const count = integerBetween(random, 1, BASE_SERVICE_NAMES.length)
        for (let i = 0; i < count; i++) {
          base[BASE_SERVICE_NAMES[integerBetween(random, 0, BASE_SERVICE_NAMES.length - 1)]] = `base-${i}`
        }
        return { base }
      },
      property: ({ base }) => {
        const snapshot = { ...base }

        const result = withPublicNetworkServices(base)

        // The base map is treated as input, not mutated in place.
        assert.deepEqual(base, snapshot)

        // Every public service wins over the base value.
        for (const name of PUBLIC_SERVICES) {
          assert.equal(typeof result[name], 'function', `${name} should be a factory`)
        }

        // Unrelated base services survive unchanged.
        for (const [name, value] of Object.entries(snapshot)) {
          if (PUBLIC_SERVICES.includes(name)) continue
          assert.equal(result[name], value)
        }

        // A pre-existing base `dht` is replaced by the PSF factory.
        if ('dht' in snapshot) assert.notEqual(result.dht, snapshot.dht)
      }
    })
  })

  it('should default to an empty base service map', () => {
    forAll({
      seed: 3,
      runs: 50,
      generate: () => ({}),
      property: () => {
        assert.property(withPublicNetworkServices(), 'aminoDHT')
      }
    })
  })
})
