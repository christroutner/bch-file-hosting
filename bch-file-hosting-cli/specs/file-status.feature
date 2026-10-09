# File Status - 1, File Status - 2, File Status - 3, File Status - 4, File Status - 5

Feature: File Status

  Background:
    Given a file-status command

  Scenario Outline: File Status - 1 a found file prints its details and pins
    Given the hosting API reports a file with CID <api_cid>
    And the hosting API reports the file name <api_filename>
    And the hosting API reports the file size <api_size>
    And the hosting API reports the file status <api_status>
    And the hosting API reports the hosting window <api_hosted_until>
    And the hosting API reports a pin for provider <api_provider> with status <api_pin_status>
    When I run file-status for the CID <request_cid>
    Then the hosting API received the CID <received_cid>
    And the exit code is 0
    And the command prints the CID <printed_cid>
    And the command prints the file name <printed_filename>
    And the command prints the size <printed_size> bytes
    And the command prints the file status <printed_status>
    And the command prints the hosting window <printed_hosted_until>
    And the command prints the pin <printed_provider> <printed_pin_status>

    Examples:
      | request_cid                                                  | received_cid                                                 | api_cid                                                      | api_filename | api_size | api_status | api_hosted_until         | api_provider | api_pin_status | printed_cid                                                  | printed_filename | printed_size | printed_status | printed_hosted_until     | printed_provider | printed_pin_status |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg    | 1024     | pinned     | 2027-10-09T00:00:00.000Z | local-helia  | pinned         | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg        | 1024         | pinned         | 2027-10-09T00:00:00.000Z | local-helia      | pinned             |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | archive.tar  | 2048     | pinFailed  | 2027-10-10T00:00:00.000Z | lighthouse   | failed         | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | archive.tar      | 2048         | pinFailed      | 2027-10-10T00:00:00.000Z | lighthouse       | failed             |

  Scenario Outline: File Status - 2 a staged file prints its details and no hosting window
    Given the hosting API reports a file with CID <api_cid>
    And the hosting API reports the file name <api_filename>
    And the hosting API reports the file size <api_size>
    And the hosting API reports the file status <api_status>
    When I run file-status for the CID bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc
    Then the exit code is 0
    And the command prints the CID <printed_cid>
    And the command prints the file name <printed_filename>
    And the command prints the size <printed_size> bytes
    And the command prints the file status <printed_status>
    And the command prints the hosting window <printed_hosted_until>

    Examples:
      | api_cid                                                      | api_filename | api_size | api_status | printed_cid                                                  | printed_filename | printed_size | printed_status | printed_hosted_until |
      | bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc | draft.txt    | 500      | staged     | bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc | draft.txt        | 500          | staged         | not paid             |

  Scenario: File Status - 3 a missing CID is a usage error
    When I run file-status with no CID
    Then the exit code is 2
    And stderr contains "You must specify a CID with the -c flag."

  Scenario Outline: File Status - 4 an API error is reported and the command fails
    Given the hosting API rejects the status with error <api_error>
    When I run file-status for the CID bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
    Then the exit code is 1
    And stderr contains "<printed_error>"

    Examples:
      | api_error        | printed_error    |
      | File not found   | File not found   |
      | Hosting API down | Hosting API down |

  Scenario Outline: File Status - 5 JSON output prints one JSON object
    Given the hosting API reports a file with CID <api_cid>
    And the hosting API reports the file status <api_status>
    When I run file-status with JSON output for the CID bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the status <json_status>
    And the JSON output has the CID <json_cid>

    Examples:
      | api_cid                                                      | api_status | json_status | json_cid                                                     |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | pinned     | pinned      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | pinFailed  | pinFailed   | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
