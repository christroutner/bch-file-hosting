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

// Both DHTs run as full servers, not clients: the node must store and serve
// provider records so public peers (for example Lighthouse) can find the CIDs
// it hosts.
const DHT_CLIENT_MODE = false

// The public-network service factories plus the metadata a reviewer or test
// can inspect without starting a node.
export function buildPublicNetworkServices () {
  return {
    services: {
      aminoDHT: kadDHT({
        protocol: PUBLIC_DHT_PROTOCOL,
        clientMode: DHT_CLIENT_MODE,
        peerInfoMapper: removePrivateAddressesMapper,
        logPrefix: 'libp2p:dht-amino',
        datastorePrefix: '/dht-amino',
        metricsPrefix: 'libp2p_dht_amino'
      }),
      dht: kadDHT({
        protocol: PSF_DHT_PROTOCOL,
        clientMode: DHT_CLIENT_MODE
      }),
      upnpNAT: uPnPNAT({ autoConfirmAddress: true }),
      dcutr: dcutr()
    },
    dhtProtocols: {
      aminoDHT: PUBLIC_DHT_PROTOCOL,
      dht: PSF_DHT_PROTOCOL
    },
    dhtClientMode: DHT_CLIENT_MODE,
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T18:01:40.720Z","module_hash":"c374665e2999703aee6a42f0a06e9130deba57515179a573ccd42895c799974f","functions":[{"id":"func/buildPublicNetworkServices","name":"buildPublicNetworkServices","line":40,"end_line":65,"hash":"50d6433b810f88f6185b85b7c02a642847621433d3e9abb8282973ad932c92b4"},{"id":"func/withPublicNetworkServices","name":"withPublicNetworkServices","line":69,"end_line":72,"hash":"86578999145ee9a84459bb21883c770dc1d22b94cc8cb2e8631fc947c86c8bfd"}]}
// mutate4javascript-manifest-end
