# File List - 1, File List - 2, File List - 3, File List - 4, File List - 5, File List - 6, File List - 7

Feature: File List

  Background:
    Given a file-list command

  Scenario Outline: File List - 1 lists a hosted file with its details and links
    Given the hosting API feed lists a pinned file <api_cid> named <api_filename>
    And the hosting API feed lists the file size <api_size>
    And the hosting API feed lists the paid time <api_paid_at>
    And the hosting API feed lists the hosting end <api_hosted_until>
    And the hosting API feed lists the download URL <api_download_url>
    And the hosting API feed lists the view URL <api_view_url>
    When I run file-list
    Then the exit code is 0
    And the command prints the CID <printed_cid>
    And the command prints the file name <printed_filename>
    And the command prints the size <printed_size> bytes
    And the command prints the paid time <printed_paid_at>
    And the command prints the hosting end <printed_hosted_until>
    And the command prints the download URL <printed_download_url>
    And the command prints the view URL <printed_view_url>

    Examples:
      | api_cid                                                      | api_filename | api_size | api_paid_at              | api_hosted_until         | api_download_url                                                                                   | api_view_url                                                                                         | printed_cid                                                  | printed_filename | printed_size | printed_paid_at          | printed_hosted_until     | printed_download_url                                                                               | printed_view_url                                                                                     |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg    | 1024     | 2026-10-10T00:00:00.000Z | 2027-10-10T00:00:00.000Z | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi       | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg       | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg        | 1024         | 2026-10-10T00:00:00.000Z | 2027-10-10T00:00:00.000Z | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi       | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg       |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | notes.txt    | 2048     | 2026-11-11T12:00:00.000Z | 2027-11-11T12:00:00.000Z | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/notes.txt | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | notes.txt        | 2048         | 2026-11-11T12:00:00.000Z | 2027-11-11T12:00:00.000Z | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/notes.txt |

  Scenario Outline: File List - 2 lists every file of the page in feed order
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg
    And the hosting API feed lists a pinned file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa named notes.txt
    When I run file-list
    Then the exit code is 0
    And the command prints the file names <names>

    Examples:
      | names |
      | photo.jpg,notes.txt |

  Scenario Outline: File List - 3 pages through the feed with the cursor
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg
    And the hosting API feed's next page cursor is <cursor>
    And the hosting API feed's next page lists a pinned file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa named notes.txt
    When I run file-list
    Then the exit code is 0
    And the command prints the next cursor <shown_cursor>
    When I run file-list after the next page
    Then the hosting API received the cursor <cursor>
    And the command prints the file names <names>

    Examples:
      | cursor | shown_cursor | names |
      | next-token | next-token | notes.txt |

  Scenario Outline: File List - 4 requests the feed with the given limit
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg
    When I run file-list with limit <limit>
    Then the exit code is 0
    And the hosting API received the limit <limit>

    Examples:
      | limit |
      | 5     |
      | 100   |

  Scenario: File List - 5 an empty feed prints a message
    When I run file-list
    Then the exit code is 0
    And the command prints "No files are hosted yet."

  Scenario Outline: File List - 6 an API error is reported and the command fails
    Given the hosting API rejects the feed with error <api_error>
    When I run file-list
    Then the exit code is 1
    And stderr contains "<shown_error>"

    Examples:
      | api_error                                        | shown_error                                      |
      | Hosting API unavailable                          | Hosting API unavailable                          |
      | Page limit must be an integer between 1 and 100   | Page limit must be an integer between 1 and 100   |

  Scenario Outline: File List - 7 JSON output prints one JSON object
    Given the hosting API feed lists a pinned file <api_cid> named photo.jpg
    And the hosting API feed's next page cursor is <cursor>
    When I run file-list with JSON output
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output lists the CIDs <json_cids>
    And the JSON output has the next cursor <json_cursor>

    Examples:
      | api_cid                                                      | cursor | json_cids                                                    | json_cursor |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | next-token | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | next-token  |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | end-token  | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | end-token   |
