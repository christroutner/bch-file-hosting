# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T02:57:52.143147700Z","feature_name":"Lighthouse Pinning","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-api/specs/lighthouse-pinning.feature","background_hash":"3ebd639048d37c3c548c4344253842c83d06f57574066cebeeec9c971151828a","implementation_hash":"unknown","scenarios":[{"index":2,"name":"Lighthouse Pinning - 3 exposes the Lighthouse gateway URL for a CID","scenario_hash":"230bbb0d607f8a9c20afcbbac8024ed8d0c88e3911369da5c4fec11f81792206","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-10-09T02:57:52.143147700Z"},{"index":3,"name":"Lighthouse Pinning - 4 registers the Lighthouse provider from configuration","scenario_hash":"4238172079c822be0316f60f19d8ab757062a2e476d9a878b3b5730fb57c8911","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-09T02:57:52.143147700Z"}]}
# acceptance-mutation-manifest-end

# Lighthouse Pinning - 1, Lighthouse Pinning - 2, Lighthouse Pinning - 3, Lighthouse Pinning - 4

Feature: Lighthouse Pinning

  Background:
    Given the hosting API is configured to pin with Lighthouse
    And the Lighthouse gateway is https://gateway.lighthouse.storage/ipfs/
    And a file with CID bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi and filename photo.jpg

  Scenario Outline: Lighthouse Pinning - 1 records the Lighthouse pin for the CID the API reports
    Given the Lighthouse API reports CID <api_cid>
    When I ask Lighthouse to pin the file
    Then the file status is <file_status>
    And the recorded Lighthouse pin state is <pin_status>

    Examples:
      | api_cid | file_status | pin_status |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | pinned | pinned |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | pinFailed | failed |

  Scenario Outline: Lighthouse Pinning - 2 fails the Lighthouse pin when the API errors
    Given the Lighthouse API returns HTTP <http_status>
    When I ask Lighthouse to pin the file
    Then the file status is <file_status>
    And the recorded Lighthouse pin state is <pin_status>

    Examples:
      | http_status | file_status | pin_status |
      | 500 | pinFailed | failed |

  Scenario Outline: Lighthouse Pinning - 3 exposes the Lighthouse gateway URL for a CID
    Then the Lighthouse gateway URL for CID <cid> is <gateway_url>

    Examples:
      | cid | gateway_url |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | https://gateway.lighthouse.storage/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi |

  Scenario Outline: Lighthouse Pinning - 4 registers the Lighthouse provider from configuration
    Then the configured pinning providers include <provider_name>

    Examples:
      | provider_name |
      | lighthouse |
