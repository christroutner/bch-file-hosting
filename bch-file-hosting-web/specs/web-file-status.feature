# mutation-stamp: sha256=b9ad82bbd4c942253f03f6def5c9b46711043085e4ad7c637de4b894adaa2564
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T15:57:19.212475021Z","feature_name":"Web File Status","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-web/specs/web-file-status.feature","background_hash":"2e2c4d647fb6d89439b386c85e1e172482bda212c398974385ba02fcd2dd3879","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Web File Status - 1 a found file shows its details and pins","scenario_hash":"1f82ef23e8dd3c59e58a8f65df52d787d7648bf99d2df1defffda41f224a4f64","mutation_count":28,"result":{"Total":28,"Killed":28,"Survived":0,"Errors":0},"tested_at":"2026-10-09T15:57:19.212475021Z"},{"index":1,"name":"Web File Status - 2 a staged file shows no hosting window","scenario_hash":"8a18f7ba5a170582a2469690b748cab779f824910edc9d93a7160a1433b04bb7","mutation_count":9,"result":{"Total":9,"Killed":9,"Survived":0,"Errors":0},"tested_at":"2026-10-09T15:57:19.212475021Z"},{"index":3,"name":"Web File Status - 4 an API error shows the error","scenario_hash":"4fef5b66b27777ea68ebddeb5e883c8a9eaef47d5f730f1bcc2ac07f0048a38b","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T15:57:19.212475021Z"}]}
# acceptance-mutation-manifest-end

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
