# Ipfs Public Node - 1, Ipfs Public Node - 2, Ipfs Public Node - 3

Feature: Ipfs Public Node

  Scenario Outline: Ipfs Public Node - 1 the node registers the DHT services
    Given a Helia node service configuration for the public IPFS network
    Then the configuration registers the DHT service <service_name> for protocol <protocol>

    Examples:
      | service_name | protocol        |
      | aminoDHT     | /ipfs/kad/1.0.0 |
      | dht          | /psf/kad/1.0.0  |

  Scenario Outline: Ipfs Public Node - 2 the node enables NAT traversal
    Given a Helia node service configuration for the public IPFS network
    Then the configuration enables the NAT service <service_name>

    Examples:
      | service_name |
      | upnpNAT      |
      | dcutr        |

  Scenario Outline: Ipfs Public Node - 3 pinning a file provides its CID to content routing
    Given an IPFS adapter whose node holds the file as CID <cid>
    When the adapter pins the CID <cid>
    Then the node provides the CID <provided_cid>

    Examples:
      | cid                                                          | provided_cid                                                 |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
