# mutation-stamp: sha256=7c2ca08ed37c69a4fce9c36e22795353aa4a63935c6952aaf06c6e1a2cfd5731
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T03:18:52.834317850Z","feature_name":"Admin File Listing","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-api/specs/admin-file-listing.feature","background_hash":"78338b78f3575af904e42235f51ca26359428bfe211082ee5ea915553017806e","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Admin File Listing - 1 lists only files with the requested status","scenario_hash":"5e8cab400166e77810bfcdb19f72e779fd7e1c506f65482b9d9777c41f829aa2","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-10-09T03:18:52.834317850Z"},{"index":1,"name":"Admin File Listing - 2 rejects an unknown file status","scenario_hash":"69a6fbfb276e9b6fbc9d9917fd92040ba80549d8c15073bb3f805f76494c4270","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-10-09T03:18:52.834317850Z"},{"index":2,"name":"Admin File Listing - 3 lists every file when no status is requested","scenario_hash":"b2c0acf00799924a826ee5c2becd01853e974edeb3a2b139d389ee533b8e9ed3","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-09T03:18:52.834317850Z"}]}
# acceptance-mutation-manifest-end

# Admin File Listing - 1, Admin File Listing - 2, Admin File Listing - 3

Feature: Admin File Listing

  Background:
    Given the file store contains a pinned file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    And the file store contains a pinFailed file bafybeibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
    And the file store contains a staged file bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc

  Scenario Outline: Admin File Listing - 1 lists only files with the requested status
    When I list admin files with status <status>
    Then the listed CIDs are <listed_cids>

    Examples:
      | status | listed_cids |
      | pinned | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
      | pinFailed | bafybeibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb |
      | staged | bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc |

  Scenario Outline: Admin File Listing - 2 rejects an unknown file status
    When I list admin files with status <status>
    Then the admin file listing is rejected with status <http_status> and error <error>

    Examples:
      | status | http_status | error |
      | bogus | 422 | Unknown file status 'bogus' |

  Scenario Outline: Admin File Listing - 3 lists every file when no status is requested
    When I list every admin file
    Then <file_count> files are listed

    Examples:
      | file_count |
      | 3 |
