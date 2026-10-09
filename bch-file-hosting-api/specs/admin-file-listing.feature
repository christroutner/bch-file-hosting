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
