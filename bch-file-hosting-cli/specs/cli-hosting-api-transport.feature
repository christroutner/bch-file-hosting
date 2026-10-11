# mutation-stamp: sha256=ae8cf0cb8d41e8d7261cca73701ec626f6980f3c02a0095c07c2c9d2ef7e5a88
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-11T15:28:24.205888213Z","feature_name":"CLI Hosting API Transport","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-cli/specs/cli-hosting-api-transport.feature","background_hash":"0f0677152b887f9c17d88abae666630d25c1fe0d4c43e69ab62a84a4420ca02c","implementation_hash":"unknown","scenarios":[{"index":0,"name":"CLI Hosting API Transport - 1 the upload method calls the transport with the global receiver","scenario_hash":"048fb3d5f143b98aec1148021d177b10bd3bcf295ee0f6238c1959af8b6dd1fa","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-10-11T15:28:24.205888213Z"},{"index":1,"name":"CLI Hosting API Transport - 2 the payment check calls the transport with the global receiver","scenario_hash":"600fa2c35383e137752546f4d8c0a3a2775a52b9c945371ace3ec940ef7516b8","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-10-11T15:28:24.205888213Z"},{"index":2,"name":"CLI Hosting API Transport - 3 the status lookup calls the transport with the global receiver","scenario_hash":"0fc7bea13ed28d95dea038a391d53c9081c5f9402efc18350d73d6868b50bb8c","mutation_count":10,"result":{"Total":10,"Killed":10,"Survived":0,"Errors":0},"tested_at":"2026-10-11T15:28:24.205888213Z"},{"index":3,"name":"CLI Hosting API Transport - 4 the feed listing calls the transport with the global receiver","scenario_hash":"720594dec0b414d601c6a9702c5d2bddab2abd8b86a1076a7ee037a8dc04d1da","mutation_count":10,"result":{"Total":10,"Killed":10,"Survived":0,"Errors":0},"tested_at":"2026-10-11T15:28:24.205888213Z"}]}
# acceptance-mutation-manifest-end

# CLI Hosting API Transport - 1, CLI Hosting API Transport - 2, CLI Hosting API Transport - 3, CLI Hosting API Transport - 4

Feature: CLI Hosting API Transport

  Background:
    Given a CLI hosting API client whose transport records its receiver

  Scenario Outline: CLI Hosting API Transport - 1 the upload method calls the transport with the global receiver
    When the CLI client uploads the file <upload_name>
    Then the transport used the global receiver for the request <http_method> <sent_url>
    And the uploaded file name is <seen_name>

    Examples:
      | upload_name | http_method | sent_url                    | seen_name   |
      | photo.jpg   | POST        | http://localhost:5050/files | photo.jpg   |
      | archive.tar | POST        | http://localhost:5050/files | archive.tar |

  Scenario Outline: CLI Hosting API Transport - 2 the payment check calls the transport with the global receiver
    Given the payment reply is <api_status>
    When the CLI client checks the payment address <payment_address>
    Then the transport used the global receiver for the request <http_method> <sent_url>
    And the sent payment address is <seen_address>
    And the reported payment state is <reported_status>

    Examples:
      | api_status | payment_address     | http_method | sent_url                                  | seen_address        | reported_status |
      | unpaid     | bitcoincash:qunpaid | POST        | http://localhost:5050/files/check-payment | bitcoincash:qunpaid | unpaid          |
      | paid       | bitcoincash:qpaid   | POST        | http://localhost:5050/files/check-payment | bitcoincash:qpaid   | paid            |

  Scenario Outline: CLI Hosting API Transport - 3 the status lookup calls the transport with the global receiver
    Given the file reply is <api_status>
    When the CLI client looks up the CID <cid>
    Then the transport used the global receiver for the request <http_method> <sent_url>
    And the client's file state is <reported_status>

    Examples:
      | cid                                                          | api_status | http_method | sent_url                                                                                     | reported_status |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | pinned     | GET         | http://localhost:5050/files/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | pinned          |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | pinFailed  | GET         | http://localhost:5050/files/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | pinFailed       |

  Scenario Outline: CLI Hosting API Transport - 4 the feed listing calls the transport with the global receiver
    Given the feed reply carries cursor <next_cursor>
    When the CLI client lists the feed with limit <limit>
    Then the transport used the global receiver for the request <http_method> <sent_url>
    And the reported cursor is <reported_cursor>

    Examples:
      | limit | next_cursor | http_method | sent_url                             | reported_cursor |
      | 5     | cursor-one  | GET         | http://localhost:5050/files?limit=5  | cursor-one      |
      | 20    | cursor-two  | GET         | http://localhost:5050/files?limit=20 | cursor-two      |
