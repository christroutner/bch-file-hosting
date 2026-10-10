# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-10T01:05:07.183838852Z","feature_name":"File Feed","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-api/specs/file-feed.feature","background_hash":"8a2fbe3706e365a62d50510d25298721a7b9c408484b7fcf50062d620ce1cc4b","implementation_hash":"unknown","scenarios":[{"index":1,"name":"File Feed - 2 paginates with a cursor","scenario_hash":"1310375978438a49dd1adc18c7ebb0e6d35db8ff1b5a7b947e22edae1814e410","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-10-10T01:05:07.183838852Z"},{"index":4,"name":"File Feed - 5 reports the public fields of each file","scenario_hash":"a47c625d39806ffb634cd8b41d1d096460861c66939b146c2da4e69176669f1c","mutation_count":40,"result":{"Total":40,"Killed":40,"Survived":0,"Errors":0},"tested_at":"2026-10-10T01:05:07.183838852Z"},{"index":5,"name":"File Feed - 6 reports the public gateway URLs of each file","scenario_hash":"3f2538ca8cdb14cf33b9db67661819913789ef6f8a5e88113c76d3f92aa3c8b3","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-10-10T01:05:07.183838852Z"},{"index":6,"name":"File Feed - 7 reports the provider gateway URLs of each file","scenario_hash":"af9294660b062b246fd6446e8a7c0869b99523d96b526cc810671c91c7a2f780","mutation_count":6,"result":{"Total":6,"Killed":6,"Survived":0,"Errors":0},"tested_at":"2026-10-10T01:05:07.183838852Z"}]}
# acceptance-mutation-manifest-end

# File Feed - 1, File Feed - 2, File Feed - 3, File Feed - 4, File Feed - 5, File Feed - 6, File Feed - 7

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

  Scenario Outline: File Feed - 6 reports the public gateway URLs of each file
    Given the public gateway is <api_gateway>
    And a pinned file <cid> named <filename> paid at 2026-04-01T00:00:00.000Z
    When I request the file feed with limit 1
    Then the feed reports the file <cid> with gateway URL <shown_gateway_url>

    Examples:
      | api_gateway             | cid                                                          | filename     | shown_gateway_url                                                                                   |
      | https://ipfs.io/ipfs/   | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg    | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg             |
      | https://dweb.link/ipfs/ | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | my photo.jpg | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/my%20photo.jpg |

  Scenario Outline: File Feed - 7 reports the provider gateway URLs of each file
    Given the hosting API is configured to pin with Lighthouse
    And the Lighthouse gateway is https://gateway.lighthouse.storage/ipfs/
    And a pinned file <cid> named <filename> paid at 2026-05-01T00:00:00.000Z
    When I request the file feed with limit 1
    Then the feed reports the file <cid> with gateway URL <shown_gateway_url>

    Examples:
      | cid                                                          | filename     | shown_gateway_url                                                                                       |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg    | https://gateway.lighthouse.storage/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg   |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | my file.bin  | https://gateway.lighthouse.storage/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/my%20file.bin |
