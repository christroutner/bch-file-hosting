/*
  Project-owned Helia node factory.

  Extends helia-coord's node factory (persistent identity, transports, private
  PSF DHT) and joins the public IPFS network: the public Amino DHT, NAT
  traversal services, and the public bootstrap peers are added to the libp2p
  configuration. Reusing the base factory keeps the rest of the node
  configuration in one place.
*/

import CreateHeliaNode from 'helia-coord/create-helia-node'

import { withPublicNetworkServices, PUBLIC_BOOTSTRAP_PEERS } from './public-network.js'

class PublicHeliaNode extends CreateHeliaNode {
  constructor (options = {}) {
    super(options)
    // The base factory sets either the supplied peers or the PSF defaults;
    // append the public IPFS bootstrap peers so the Amino DHT is reachable.
    this.bootstrapPeers = [...this.bootstrapPeers, ...PUBLIC_BOOTSTRAP_PEERS]
  }

  async createNode () {
    const originalCreateLibp2p = this.createLibp2p
    this.createLibp2p = (libp2pOptions = {}) => originalCreateLibp2p({
      ...libp2pOptions,
      services: withPublicNetworkServices(libp2pOptions.services)
    })
    try {
      return await super.createNode()
    } finally {
      this.createLibp2p = originalCreateLibp2p
    }
  }
}

export default PublicHeliaNode

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T18:00:42.446Z","module_hash":"8269a05c148f2a405a6898c37914667b6a6f23e749cb585a98ee4381aeb3cfc4","functions":[{"id":"func/PublicHeliaNode.constructor","name":"PublicHeliaNode.constructor","line":16,"end_line":21,"hash":"9eaa87c936ba53c45e1b2e0119b39d712478e30570b789d70fb3dbb8f05099ff"},{"id":"func/PublicHeliaNode.createNode","name":"PublicHeliaNode.createNode","line":23,"end_line":34,"hash":"03c190e47ac66a709dcaa53bed543244fc01a64ce6c43b10cc011050bb1aeb18"}]}
// mutate4javascript-manifest-end
