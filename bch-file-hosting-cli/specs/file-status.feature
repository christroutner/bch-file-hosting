# mutation-stamp: sha256=0eeabcbeb4cd5b1470f6c71ac540961efdab897fa80453d6d9575ef89fe5f23c
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T13:58:34.004938137Z","feature_name":"File Status","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-cli/specs/file-status.feature","background_hash":"4532bdc66f992abe5930c0376ccd499521812e4d776e08133cfb0879359263f6","implementation_hash":"unknown","scenarios":[{"index":0,"name":"File Status - 1 a found file prints its details and pins","scenario_hash":"924cc12444c772c8666ea905bc5fb52f38e7e34362b2b2b792dfced964020d11","mutation_count":32,"result":{"Total":32,"Killed":32,"Survived":0,"Errors":0},"tested_at":"2026-10-09T13:33:09.262614284Z"},{"index":1,"name":"File Status - 2 a staged file prints its details and no hosting window","scenario_hash":"443dd5410b5d8945401eb1c0d5715e1706f533e681f430d266d47c42005b9319","mutation_count":9,"result":{"Total":9,"Killed":9,"Survived":0,"Errors":0},"tested_at":"2026-10-09T13:33:09.262614284Z"},{"index":3,"name":"File Status - 4 an API error is reported and the command fails","scenario_hash":"7dc27044e31d6155cfeb0167a6ce79cd97545fbfcef9b980af35699650d22dd5","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T13:33:09.262614284Z"},{"index":4,"name":"File Status - 5 JSON output prints one JSON object","scenario_hash":"a2f56fbde24232a5fb35833235208de3a6a48eed2cb5668ee88be2c4e7d72da6","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-10-09T13:33:09.262614284Z"}]}
# acceptance-mutation-manifest-end

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
