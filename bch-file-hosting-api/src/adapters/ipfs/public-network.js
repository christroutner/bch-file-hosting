/*
  Public IPFS network service configuration.

  The base Helia node (helia-coord's factory) joins the private PSF network: it
  runs a DHT on the custom `/psf/kad/1.0.0` protocol and never contacts the
  public Amino DHT. Public pinning services (Lighthouse) fetch content by CID
  through the public network, so this node must also register the Amino DHT and
  NAT traversal, and announce the CIDs it hosts.

  This module is the project-owned source of truth for those services. It is a
  pure configuration: building it only creates libp2p service factories, it
  does not start a node, so tests can inspect it offline.
*/

import { kadDHT, removePrivateAddressesMapper } from '@libp2p/kad-dht'
import { uPnPNAT } from '@libp2p/upnp-nat'
import { dcutr } from '@libp2p/dcutr'

// The public IPFS Amino DHT and the private PSF DHT protocols.
export const PUBLIC_DHT_PROTOCOL = '/ipfs/kad/1.0.0'
export const PSF_DHT_PROTOCOL = '/psf/kad/1.0.0'

// Public IPFS bootstrap peers, so the node can find the Amino DHT.
export const PUBLIC_BOOTSTRAP_PEERS = [
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
]

const NAT_SERVICES = ['upnpNAT', 'dcutr']

// The public-network service factories plus the metadata a reviewer or test
// can inspect without starting a node.
export function buildPublicNetworkServices () {
  return {
    services: {
      aminoDHT: kadDHT({
        protocol: PUBLIC_DHT_PROTOCOL,
        clientMode: false,
        peerInfoMapper: removePrivateAddressesMapper,
        logPrefix: 'libp2p:dht-amino',
        datastorePrefix: '/dht-amino',
        metricsPrefix: 'libp2p_dht_amino'
      }),
      dht: kadDHT({
        protocol: PSF_DHT_PROTOCOL,
        clientMode: false
      }),
      upnpNAT: uPnPNAT(),
      dcutr: dcutr()
    },
    dhtProtocols: {
      aminoDHT: PUBLIC_DHT_PROTOCOL,
      dht: PSF_DHT_PROTOCOL
    },
    natServices: [...NAT_SERVICES]
  }
}

// Merge the public-network services over a base libp2p service map. Public
// services win, so the base `dht` (if any) is replaced by the PSF DHT.
export function withPublicNetworkServices (baseServices = {}) {
  const { services } = buildPublicNetworkServices()
  return { ...baseServices, ...services }
}

export default { buildPublicNetworkServices, withPublicNetworkServices }
