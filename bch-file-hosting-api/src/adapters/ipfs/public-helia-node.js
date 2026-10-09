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
