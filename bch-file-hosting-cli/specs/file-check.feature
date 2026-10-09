# mutation-stamp: sha256=28e7806c5d683ede6d3ffd2aee6a9a1d123846f67c56ef33a40bece2cea55e1d
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T13:45:45.185862788Z","feature_name":"File Check","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-cli/specs/file-check.feature","background_hash":"a80d27f0a19990e909bb15deb1441781b2fe827e060af29693a494063e7826b1","implementation_hash":"unknown","scenarios":[{"index":0,"name":"File Check - 1 a paid invoice prints the CID and download links","scenario_hash":"f3c05c31e3db0259142fe129607cb14080ebef5b19d3bca0849263e41a4aaa66","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-10-09T03:53:56.596193532Z"},{"index":1,"name":"File Check - 2 an unpaid invoice prints the amounts received and required","scenario_hash":"4812dda9d75f4095a02fad44c342d409f6d86f67c61e8d30ccc8c2017921533b","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-10-09T03:53:43.076191228Z"},{"index":4,"name":"File Check - 5 an API error is reported and the command fails","scenario_hash":"37cbd4f48d3da296fbb76e57f020f90c1b5f15295fddc38296f73abfc35a7236","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T03:53:43.076191228Z"},{"index":5,"name":"File Check - 6 JSON output prints one JSON object with the status","scenario_hash":"3ad7c396ffb78501c67574124e25a3e3f842a512a918a250173cea574410d60f","mutation_count":10,"result":{"Total":10,"Killed":10,"Survived":0,"Errors":0},"tested_at":"2026-10-09T03:53:43.076191228Z"}]}
# acceptance-mutation-manifest-end

# File Check - 1, File Check - 2, File Check - 3, File Check - 4, File Check - 5, File Check - 6

Feature: File Check

  Background:
    Given a file-check command

  Scenario Outline: File Check - 1 a paid invoice prints the CID and download links
    Given the hosting API reports a paid invoice with CID <api_cid>
    And the hosting API reports the download URL <api_download_url>
    And the hosting API reports the gateway URL <api_gateway_url>
    When I run file-check for the address <request_address>
    Then the hosting API received the address <received_address>
    And the exit code is 0
    And the command prints the CID <printed_cid>
    And the command prints the download URL <printed_download_url>
    And the command prints the gateway URL <printed_gateway_url>

    Examples:
      | request_address                                         | received_address                                        | api_cid                                                      | api_download_url                                                                   | api_gateway_url                                                                       | printed_cid                                                  | printed_download_url                                                               | printed_gateway_url                                                                   |
      | bitcoincash:qrequestaddress1000000000000000000000000000 | bitcoincash:qrequestaddress1000000000000000000000000000 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg |
      | bitcoincash:qrequestaddress2000000000000000000000000000 | bitcoincash:qrequestaddress2000000000000000000000000000 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar |

  Scenario Outline: File Check - 2 an unpaid invoice prints the amounts received and required
    Given the hosting API reports an unpaid invoice with <api_received> received and <api_required> required
    And the hosting API reports the quote expiry <api_expiry>
    When I run file-check for the address bitcoincash:qcheckaddress00000000000000000000000000
    Then the exit code is 0
    And the command prints the received amount <printed_received> satoshis
    And the command prints the required amount <printed_required> satoshis
    And the command prints the quote expiry <printed_expiry>

    Examples:
      | api_received | api_required | api_expiry               | printed_received | printed_required | printed_expiry           |
      | 0            | 2000         | 2026-10-10T00:00:00.000Z | 0                | 2000             | 2026-10-10T00:00:00.000Z |
      | 1500         | 62500        | 2026-10-11T12:00:00.000Z | 1500             | 62500            | 2026-10-11T12:00:00.000Z |

  Scenario: File Check - 3 an expired invoice prints the expired status
    Given the hosting API reports an expired invoice
    When I run file-check for the address bitcoincash:qcheckaddress00000000000000000000000000
    Then the exit code is 0
    And the command prints the expired status

  Scenario: File Check - 4 a missing address is a usage error
    When I run file-check with no address
    Then the exit code is 2
    And stderr contains "You must specify a payment address with the -a flag."

  Scenario Outline: File Check - 5 an API error is reported and the command fails
    Given the hosting API rejects the check with error <api_error>
    When I run file-check for the address bitcoincash:qcheckaddress00000000000000000000000000
    Then the exit code is 1
    And stderr contains "<printed_error>"

    Examples:
      | api_error               | printed_error           |
      | Invoice not found       | Invoice not found       |
      | Hosting API unavailable | Hosting API unavailable |

  Scenario Outline: File Check - 6 JSON output prints one JSON object with the status
    Given the hosting API reports a paid invoice with CID <api_cid>
    And the hosting API reports the download URL <api_download_url>
    When I run file-check with JSON output for the address bitcoincash:qcheckaddress00000000000000000000000000
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the status <json_status>
    And the JSON output has the CID <json_cid>
    And the JSON output has the download URL <json_download_url>

    Examples:
      | api_cid                                                      | api_download_url                                                                   | json_status | json_cid                                                     | json_download_url                                                                  |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | paid        | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | paid        | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
