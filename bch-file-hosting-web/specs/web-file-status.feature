# Web File Status - 1, Web File Status - 2, Web File Status - 3, Web File Status - 4

Feature: Web File Status

  Background:
    Given a fresh file hosting web page

  Scenario Outline: Web File Status - 1 a found file shows its details and pins
    Given the hosting API reports a file with CID <api_cid>
    And the hosting API reports the file name <api_filename>
    And the hosting API reports the file size <api_size>
    And the hosting API reports the file status <api_status>
    And the hosting API reports the hosting window <api_hosted_until>
    And the hosting API reports a pin for provider <api_provider> with status <api_pin_status>
    When the visitor looks up the CID bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
    Then the page shows the CID <shown_cid>
    And the page shows the file name <shown_name>
    And the page shows the size <shown_size> bytes
    And the page shows the file status <shown_status>
    And the page shows the hosting window <shown_hosted_until>
    And the page shows the pin <shown_provider> <shown_pin_status>

    Examples:
      | api_cid                                                      | api_filename | api_size | api_status | api_hosted_until         | api_provider | api_pin_status | shown_cid                                                    | shown_name  | shown_size | shown_status | shown_hosted_until       | shown_provider | shown_pin_status |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg    | 1024     | pinned     | 2027-10-09T00:00:00.000Z | local-helia  | pinned         | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg   | 1024       | pinned       | 2027-10-09T00:00:00.000Z | local-helia    | pinned           |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | archive.tar  | 2048     | pinFailed  | 2027-10-10T00:00:00.000Z | lighthouse   | failed         | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | archive.tar | 2048       | pinFailed    | 2027-10-10T00:00:00.000Z | lighthouse     | failed           |

  Scenario Outline: Web File Status - 2 a staged file shows no hosting window
    Given the hosting API reports a file with CID <api_cid>
    And the hosting API reports the file name <api_filename>
    And the hosting API reports the file size <api_size>
    And the hosting API reports the file status <api_status>
    When the visitor looks up the CID bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc
    Then the page shows the CID <shown_cid>
    And the page shows the file name <shown_name>
    And the page shows the size <shown_size> bytes
    And the page shows the file status <shown_status>
    And the page shows the hosting window <shown_hosted_until>

    Examples:
      | api_cid                                                      | api_filename | api_size | api_status | shown_cid                                                    | shown_name | shown_size | shown_status | shown_hosted_until |
      | bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc | draft.txt    | 500      | staged     | bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc | draft.txt  | 500        | staged       | not paid           |

  Scenario: Web File Status - 3 a blank CID shows a prompt
    When the visitor looks up no CID
    Then the page shows "Enter a CID to look up."

  Scenario Outline: Web File Status - 4 an API error shows the error
    Given the hosting API rejects the status with error <api_error>
    When the visitor looks up the CID bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
    Then the page shows "<shown_error>"

    Examples:
      | api_error        | shown_error      |
      | File not found   | File not found   |
      | Hosting API down | Hosting API down |
