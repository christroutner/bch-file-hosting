# mutation-stamp: sha256=ba87328b3ba76f66e4d52ccd81a1804c81b1377dedf0a92ade54fbbec27334d6
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T18:20:14.872788568Z","feature_name":"Ipfs Public Node","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-api/specs/ipfs-public-node.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"unknown","scenarios":[{"index":3,"name":"Ipfs Public Node - 4 a failing content-routing provide does not fail the pin","scenario_hash":"5343c9ed33af09a466035f41121b6eee398aa7f3de84474f8eff9272bf5469b5","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T18:20:14.872788568Z"},{"index":4,"name":"Ipfs Public Node - 5 pinning does not wait for the content-routing provide","scenario_hash":"0d7f1c233253e466ec314b466be841bfff9318bc7ef0da575c0fe948f0142fa5","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T18:20:14.872788568Z"},{"index":0,"name":"Ipfs Public Node - 1 the node registers the DHT services","scenario_hash":"dc026f4784fe7cadb0b54c448500a24d10abe48ee39a9aa6189745f7e59d0c8d","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T18:01:58.040043540Z"},{"index":1,"name":"Ipfs Public Node - 2 the node enables NAT traversal","scenario_hash":"0e9192c56b788c6ac2dc7d4edd0677bf9895507087d6031d735cecce6871aad7","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-10-09T18:01:58.040043540Z"},{"index":2,"name":"Ipfs Public Node - 3 pinning a file provides its CID to content routing","scenario_hash":"501cf492a6368141227558286915124ed405f83558cdc8108332f7ca8c3c374c","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T18:01:58.040043540Z"}]}
# acceptance-mutation-manifest-end

# Ipfs Public Node - 1, Ipfs Public Node - 2, Ipfs Public Node - 3, Ipfs Public Node - 4, Ipfs Public Node - 5

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
      | bafybeiaycpklq3l6vfbnm25jbnxsevqn4j6tonzxtgbkm2vnqsrju5tuqi | bafybeiaycpklq3l6vfbnm25jbnxsevqn4j6tonzxtgbkm2vnqsrju5tuqi |

  Scenario Outline: Ipfs Public Node - 4 a failing content-routing provide does not fail the pin
    Given an IPFS adapter whose node provide fails
    When the adapter pins the CID <cid>
    Then the adapter resolves the pin
    And the node pinned the CID <pinned_cid>

    Examples:
      | cid                                                          | pinned_cid                                                   |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi |
      | bafybeiaycpklq3l6vfbnm25jbnxsevqn4j6tonzxtgbkm2vnqsrju5tuqi | bafybeiaycpklq3l6vfbnm25jbnxsevqn4j6tonzxtgbkm2vnqsrju5tuqi |

  Scenario Outline: Ipfs Public Node - 5 pinning does not wait for the content-routing provide
    Given an IPFS adapter whose node provide never settles
    When the adapter pins the CID <cid>
    Then the adapter resolves the pin
    And the node pinned the CID <pinned_cid>

    Examples:
      | cid                                                          | pinned_cid                                                   |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi |
      | bafybeiaycpklq3l6vfbnm25jbnxsevqn4j6tonzxtgbkm2vnqsrju5tuqi | bafybeiaycpklq3l6vfbnm25jbnxsevqn4j6tonzxtgbkm2vnqsrju5tuqi |
