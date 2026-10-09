# File Feed - 1, File Feed - 2, File Feed - 3, File Feed - 4, File Feed - 5

Feature: File Feed

  Background:
    Given a pinned file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa paid at 2026-01-01T00:00:00.000Z
    And a pinning file bafybeibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb paid at 2026-01-02T00:00:00.000Z
    And a pinFailed file bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc paid at 2026-01-03T00:00:00.000Z
    And a staged file bafybeiddddddddddddddddddddddddddddddddddddddddddddddddddddddd
    And a deleted file bafybeieeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

  Scenario Outline: File Feed - 1 lists only paid files, newest paid first
    When I request the file feed with limit <limit>
    Then the feed lists the CIDs <listed_cids>

    Examples:
      | limit | listed_cids |
      | 10    | bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc,bafybeibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
      | 2     | bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc,bafybeibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb |

  Scenario Outline: File Feed - 2 paginates with a cursor
    When I request the file feed with limit <limit>
    Then the first page lists the CIDs <first_page_cids>
    And the feed has a next page
    When I request the next page of the file feed
    Then the next page lists the CIDs <second_page_cids>
    And the feed has no next page

    Examples:
      | limit | first_page_cids | second_page_cids |
      | 2         | bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc,bafybeibbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |

  Scenario Outline: File Feed - 3 rejects an invalid page limit
    When I request the file feed with limit <limit>
    Then the file feed is rejected with status <http_status> and error <error>

    Examples:
      | limit | http_status | error |
      | 0         | 422 | Page limit must be an integer between 1 and 100 |
      | 101       | 422 | Page limit must be an integer between 1 and 100 |
      | abc       | 422 | Page limit must be an integer between 1 and 100 |

  Scenario Outline: File Feed - 4 rejects an unknown cursor
    When I request the file feed after cursor <bad_cursor>
    Then the file feed is rejected with status <http_status> and error <error>

    Examples:
      | bad_cursor | http_status | error |
      | not-a-cursor | 422 | Cursor is not valid |

  Scenario Outline: File Feed - 5 reports the public fields of each file
    Given a <seed_status> file <seed_cid> named <seed_filename> of <seed_size> bytes created at <seed_created_at> paid at <seed_paid_at> until <seed_hosted_until> at address <seed_address> with a <seed_provider> pin <seed_pin_status>
    When I request the file feed with limit 1
    Then the feed reports the file <shown_cid> with filename <shown_filename>
    And the feed reports the file <shown_cid> with size <shown_size> bytes
    And the feed reports the file <shown_cid> with status <shown_status>
    And the feed reports the file <shown_cid> with payment address <shown_address>
    And the feed reports the file <shown_cid> with created time <shown_created_at>
    And the feed reports the file <shown_cid> with paid time <shown_paid_at>
    And the feed reports the file <shown_cid> with hosting window <shown_hosted_until>
    And the feed reports the file <shown_cid> with the pin <shown_provider> <shown_pin_status>

    Examples:
      | seed_status | seed_cid | seed_filename | seed_size | seed_created_at | seed_paid_at | seed_hosted_until | seed_address | seed_provider | seed_pin_status | shown_cid | shown_filename | shown_size | shown_status | shown_address | shown_created_at | shown_paid_at | shown_hosted_until | shown_provider | shown_pin_status |
      | pinned | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg | 1024 | 2026-02-01T00:00:00.000Z | 2026-02-02T00:00:00.000Z | 2027-02-02T00:00:00.000Z | bitcoincash:qfeedaddress000000000000000000000000000000 | local-helia | pinned | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg | 1024 | pinned | bitcoincash:qfeedaddress000000000000000000000000000000 | 2026-02-01T00:00:00.000Z | 2026-02-02T00:00:00.000Z | 2027-02-02T00:00:00.000Z | local-helia | pinned |
      | pinFailed | bafybeihhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh | notes.txt | 2048 | 2026-03-01T00:00:00.000Z | 2026-03-02T00:00:00.000Z | 2027-03-02T00:00:00.000Z | bitcoincash:qotherfeedaddress00000000000000000000000000 | lighthouse | failed | bafybeihhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh | notes.txt | 2048 | pinFailed | bitcoincash:qotherfeedaddress00000000000000000000000000 | 2026-03-01T00:00:00.000Z | 2026-03-02T00:00:00.000Z | 2027-03-02T00:00:00.000Z | lighthouse | failed |
