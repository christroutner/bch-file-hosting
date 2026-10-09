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
