# Pin Retry - 1, Pin Retry - 2, Pin Retry - 3

Feature: Pin Retry

  Background:
    Given the hosting API is configured to pin with Lighthouse

  Scenario Outline: Pin Retry - 1 retries a pinFailed file when the provider succeeds
    Given a file with CID <cid> and status <initial_status>
    And the Lighthouse API pins by CID
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
    And the Lighthouse API returns HTTP <http_status>
    When I retry failed pins
    Then the file is <file_status>
    And the Lighthouse provider was asked to pin <pin_attempts> times

    Examples:
      | cid | initial_status | http_status | file_status | pin_attempts |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | pinFailed | 500 | pinFailed | 1 |

  Scenario: Pin Retry - 3 schedules the retry on a timer
    Then the timer retries failed pins on its schedule
