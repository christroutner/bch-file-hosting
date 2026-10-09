Feature: Background Pinning

  Background:
    Given the hosting API is configured to pin with Lighthouse
    And the Lighthouse gateway reports the file is retrievable
    And a paid file with CID bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi and filename photo.jpg

  Scenario Outline: Background Pinning - 1 checking payment returns without waiting for the pin
    Given the Lighthouse upload is held
    When I check payment
    Then the payment status is <payment_status>
    And the file status is <file_status>

    Examples:
      | payment_status | file_status |
      | paid           | pinning     |

  Scenario Outline: Background Pinning - 2 the background pin uploads, verifies, and pins locally
    Given the Lighthouse upload reports the file CID
    And the local IPFS pin succeeds
    When I check payment
    And the background pin finishes
    Then the file status is <file_status>
    And the recorded Lighthouse pin state is <lighthouse_pin_state>
    And the recorded local-helia pin state is <local_pin_state>

    Examples:
      | file_status | lighthouse_pin_state | local_pin_state |
      | pinned      | pinned               | pinned          |

  Scenario Outline: Background Pinning - 3 a failed Lighthouse pin leaves the file pinFailed
    Given the Lighthouse upload returns HTTP 500
    When I check payment
    And the background pin finishes
    Then the file status is <file_status>
    And the recorded Lighthouse pin state is <lighthouse_pin_state>

    Examples:
      | file_status | lighthouse_pin_state |
      | pinFailed   | failed               |

  Scenario Outline: Background Pinning - 4 a failed local pin still reports the file pinned
    Given the Lighthouse upload reports the file CID
    And the local IPFS pin fails
    When I check payment
    And the background pin finishes
    Then the file status is <file_status>
    And the recorded local-helia pin state is <local_pin_state>

    Examples:
      | file_status | local_pin_state |
      | pinned      | failed          |
