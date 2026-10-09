# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T19:06:21.528498534Z","feature_name":"Pin Retry","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-api/specs/pin-retry.feature","background_hash":"043d2e5323c3f2720abb0f1bb8ead5212cfe54ba071e2ba026766954cc0a29d0","implementation_hash":"unknown","scenarios":[{"index":3,"name":"Pin Retry - 4 retries a failed local pin without re-uploading","scenario_hash":"e1694e9be7665671443008967a7786f90a089b769b01b58e8cf6c33cb89f5050","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-10-09T19:06:21.528498534Z"},{"index":4,"name":"Pin Retry - 5 keeps the file pinned when the local pin fails again","scenario_hash":"7214f0c7c9fd3436a7b0e084fd53f024d7d435bc58f99eeac7a477080b46a62f","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-10-09T19:06:21.528498534Z"}]}
# acceptance-mutation-manifest-end

# Pin Retry - 1, Pin Retry - 2, Pin Retry - 3, Pin Retry - 4, Pin Retry - 5

Feature: Pin Retry

  Background:
    Given the hosting API is configured to pin with Lighthouse
    And the Lighthouse gateway reports the file is retrievable

  Scenario Outline: Pin Retry - 1 retries a pinFailed file when the provider succeeds
    Given a file with CID <cid> and status <initial_status>
    And the Lighthouse upload reports the file CID
    When I retry failed pins
    Then the file is <file_status>
    And the Lighthouse provider was asked to pin <pin_attempts> times

    Examples:
      | cid | initial_status | file_status | pin_attempts |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | pinFailed | pinned | 1 |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | pinned | pinned | 0 |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | staged | staged | 0 |

  Scenario Outline: Pin Retry - 2 keeps the file pinFailed when the provider still fails
    Given a file with CID <cid> and status <initial_status>
    And the Lighthouse upload returns HTTP <http_status>
    When I retry failed pins
    Then the file is <file_status>
    And the Lighthouse provider was asked to pin <pin_attempts> times

    Examples:
      | cid | initial_status | http_status | file_status | pin_attempts |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | pinFailed | 500 | pinFailed | 1 |

  Scenario: Pin Retry - 3 schedules the retry on a timer
    Then the timer retries failed pins on its schedule

  Scenario Outline: Pin Retry - 4 retries a failed local pin without re-uploading
    Given a pinned file with a failed local pin
    When I retry failed pins
    Then the file is <file_status>
    And the recorded local-helia pin state is <local_pin_state>
    And the Lighthouse provider was asked to pin <pin_attempts> times

    Examples:
      | file_status | local_pin_state | pin_attempts |
      | pinned      | pinned          | 0            |

  Scenario Outline: Pin Retry - 5 keeps the file pinned when the local pin fails again
    Given a pinned file with a failed local pin
    And the local IPFS pin fails
    When I retry failed pins
    Then the file is <file_status>
    And the recorded local-helia pin state is <local_pin_state>

    Examples:
      | file_status | local_pin_state |
      | pinned      | failed          |
