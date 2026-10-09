# mutation-stamp: sha256=f56a42b357484c0d540ba90a067c66b6be4a389e4f3cbe9a8731440fbb3b40d2
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T20:08:53.335613442Z","feature_name":"Web Dashboard","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-web/specs/web-dashboard.feature","background_hash":"2e2c4d647fb6d89439b386c85e1e172482bda212c398974385ba02fcd2dd3879","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Web Dashboard - 1 lists the hosted files in feed order","scenario_hash":"990e863633c0022c618d627c4afb288ecc1bf0718204024dd641b5fdd960929d","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-09T20:08:53.335613442Z"},{"index":1,"name":"Web Dashboard - 2 shows the details of each hosted file","scenario_hash":"30988ca0dde017be5082d054c0af1710d28817c5a2c2d9a62fe4938f70d43fe7","mutation_count":36,"result":{"Total":36,"Killed":36,"Survived":0,"Errors":0},"tested_at":"2026-10-09T20:08:53.335613442Z"},{"index":3,"name":"Web Dashboard - 4 an API error shows the error","scenario_hash":"7990bc64a60f788a7cfa8f46b5d6810354c1a3a1c8792c66735b6bd5da9edd2d","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T20:08:53.335613442Z"},{"index":4,"name":"Web Dashboard - 5 loads more files from the next page","scenario_hash":"79d6169ef095e5c8881508afd7f697c9c246c459cc2c0f7805d5442e6f9cf1fb","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-09T20:08:53.335613442Z"},{"index":5,"name":"Web Dashboard - 6 refresh reloads the feed","scenario_hash":"9112c3fe7661cf717da409b6366668300cc500d59ff7b7407f47143f3d2d06c4","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-09T20:08:53.335613442Z"}]}
# acceptance-mutation-manifest-end

# Web Dashboard - 1, Web Dashboard - 2, Web Dashboard - 3, Web Dashboard - 4, Web Dashboard - 5, Web Dashboard - 6

Feature: Web Dashboard

  Background:
    Given a fresh file hosting web page

  Scenario Outline: Web Dashboard - 1 lists the hosted files in feed order
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg of 1024 bytes paid at 2026-01-02T00:00:00.000Z until 2027-01-02T00:00:00.000Z at address bitcoincash:qfeedaddress000000000000000000000000000000
    And the hosting API feed lists a pinning file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa named notes.txt of 2048 bytes paid at 2026-01-01T00:00:00.000Z until 2027-01-01T00:00:00.000Z at address bitcoincash:qotherfeedaddress00000000000000000000000000
    When the visitor opens the dashboard
    Then the dashboard lists the file names <names>

    Examples:
      | names |
      | photo.jpg,notes.txt |

  Scenario Outline: Web Dashboard - 2 shows the details of each hosted file
    Given the hosting API feed lists a <api_status> file <api_cid> named <api_name> of <api_size> bytes paid at <api_paid_at> until <api_hosted_until> at address <api_address>
    And the hosting API feed lists a <api_provider> pin <api_pin_status> for the file <api_cid>
    When the visitor opens the dashboard
    Then the dashboard shows the file <shown_cid> named <shown_name>
    And the dashboard shows the file <shown_cid> of <shown_size> bytes
    And the dashboard shows the file <shown_cid> with status <shown_status>
    And the dashboard shows the file <shown_cid> paid at <shown_paid_at>
    And the dashboard shows the file <shown_cid> until <shown_hosted_until>
    And the dashboard shows the file <shown_cid> at address <shown_address>
    And the dashboard shows the pin <shown_provider> <shown_pin_status>

    Examples:
      | api_status | api_cid | api_name | api_size | api_paid_at | api_hosted_until | api_address | api_provider | api_pin_status | shown_cid | shown_name | shown_size | shown_status | shown_paid_at | shown_hosted_until | shown_address | shown_provider | shown_pin_status |
      | pinned | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg | 1024 | 2026-01-02T00:00:00.000Z | 2027-01-02T00:00:00.000Z | bitcoincash:qfeedaddress000000000000000000000000000000 | local-helia | pinned | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg | 1024 | pinned | 2026-01-02T00:00:00.000Z | 2027-01-02T00:00:00.000Z | bitcoincash:qfeedaddress000000000000000000000000000000 | local-helia | pinned |
      | pinFailed | bafybeihhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh | notes.txt | 2048 | 2026-02-02T00:00:00.000Z | 2027-02-02T00:00:00.000Z | bitcoincash:qotherfeedaddress00000000000000000000000000 | lighthouse | failed | bafybeihhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh | notes.txt | 2048 | pinFailed | 2026-02-02T00:00:00.000Z | 2027-02-02T00:00:00.000Z | bitcoincash:qotherfeedaddress00000000000000000000000000 | lighthouse | failed |

  Scenario: Web Dashboard - 3 an empty feed shows a message
    When the visitor opens the dashboard
    Then the page shows "No files are hosted yet."

  Scenario Outline: Web Dashboard - 4 an API error shows the error
    Given the hosting API rejects the feed with error <api_error>
    When the visitor opens the dashboard
    Then the page shows "<shown_error>"

    Examples:
      | api_error        | shown_error      |
      | Hosting API down | Hosting API down |
      | Feed unavailable | Feed unavailable |

  Scenario Outline: Web Dashboard - 5 loads more files from the next page
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg of 1024 bytes paid at 2026-01-02T00:00:00.000Z until 2027-01-02T00:00:00.000Z at address bitcoincash:qfeedaddress000000000000000000000000000000
    And the hosting API feed has a next page
    And the hosting API feed's next page lists a pinned file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa named notes.txt of 2048 bytes paid at 2026-01-01T00:00:00.000Z until 2027-01-01T00:00:00.000Z at address bitcoincash:qotherfeedaddress00000000000000000000000000
    When the visitor opens the dashboard
    And the visitor loads more of the dashboard
    Then the dashboard lists the file names <names>

    Examples:
      | names |
      | photo.jpg,notes.txt |

  Scenario Outline: Web Dashboard - 6 refresh reloads the feed
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg of 1024 bytes paid at 2026-01-02T00:00:00.000Z until 2027-01-02T00:00:00.000Z at address bitcoincash:qfeedaddress000000000000000000000000000000
    When the visitor opens the dashboard
    And the hosting API feed is replaced with a pinned file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa named notes.txt of 2048 bytes paid at 2026-01-01T00:00:00.000Z until 2027-01-01T00:00:00.000Z at address bitcoincash:qotherfeedaddress00000000000000000000000000
    When the visitor refreshes the dashboard
    Then the dashboard lists the file names <names>

    Examples:
      | names |
      | notes.txt |
