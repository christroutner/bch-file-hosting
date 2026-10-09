# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T16:52:35.016794641Z","feature_name":"Lighthouse Pinning","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-api/specs/lighthouse-pinning.feature","background_hash":"3ebd639048d37c3c548c4344253842c83d06f57574066cebeeec9c971151828a","implementation_hash":"unknown","scenarios":[{"index":2,"name":"Lighthouse Pinning - 3 exposes the Lighthouse gateway URL for the file","scenario_hash":"d5fccb2a937c42871f9b7b33f972b4043f7354d231744c6298e229c5f664f0ba","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-10-09T16:52:35.016794641Z"},{"index":3,"name":"Lighthouse Pinning - 4 registers the Lighthouse provider from configuration","scenario_hash":"4238172079c822be0316f60f19d8ab757062a2e476d9a878b3b5730fb57c8911","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-09T02:57:52.143147700Z"}]}
# acceptance-mutation-manifest-end

# Lighthouse Pinning - 1, Lighthouse Pinning - 2, Lighthouse Pinning - 3, Lighthouse Pinning - 4, Lighthouse Pinning - 5

Feature: Lighthouse Pinning

  Background:
    Given the hosting API is configured to pin with Lighthouse
    And the Lighthouse gateway is https://gateway.lighthouse.storage/ipfs/
    And the Lighthouse gateway reports the file is retrievable
    And a file with CID bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi and filename photo.jpg

  Scenario Outline: Lighthouse Pinning - 1 uploads the file and records the CID the upload reports
    Given the Lighthouse upload reports CID <upload_cid>
    When I ask Lighthouse to pin the file
    Then the file status is <file_status>
    And the recorded Lighthouse pin state is <pin_status>

    Examples:
      | upload_cid | file_status | pin_status |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | pinned | pinned |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | pinFailed | failed |

  Scenario Outline: Lighthouse Pinning - 2 fails the Lighthouse pin when the upload errors
    Given the Lighthouse upload returns HTTP <http_status>
    When I ask Lighthouse to pin the file
    Then the file status is <file_status>
    And the recorded Lighthouse pin state is <pin_status>

    Examples:
      | http_status | file_status | pin_status |
      | 500 | pinFailed | failed |

  Scenario Outline: Lighthouse Pinning - 3 exposes the Lighthouse gateway URL for the file
    Then the Lighthouse gateway URL for CID <cid> and filename <filename> is <gateway_url>

    Examples:
      | cid | filename | gateway_url |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg    | https://gateway.lighthouse.storage/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | my photo.jpg | https://gateway.lighthouse.storage/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/my%20photo.jpg |

  Scenario Outline: Lighthouse Pinning - 4 registers the Lighthouse provider from configuration
    Then the configured pinning providers include <provider_name>

    Examples:
      | provider_name |
      | lighthouse |

  Scenario Outline: Lighthouse Pinning - 5 fails the Lighthouse pin when the uploaded file is not retrievable
    Given the Lighthouse upload reports CID <upload_cid>
    And the Lighthouse gateway reports the file is missing
    When I ask Lighthouse to pin the file
    Then the file status is <file_status>
    And the recorded Lighthouse pin state is <pin_status>

    Examples:
      | upload_cid | file_status | pin_status |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | pinFailed | failed |
