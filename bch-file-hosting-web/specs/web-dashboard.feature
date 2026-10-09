# Web Dashboard - 1, Web Dashboard - 2, Web Dashboard - 3, Web Dashboard - 4, Web Dashboard - 5, Web Dashboard - 6, Web Dashboard - 7

Feature: Web Dashboard

  Background:
    Given a fresh file hosting web page

  Scenario Outline: Web Dashboard - 1 lists the hosted files in a table in feed order
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg
    And the hosting API feed lists a pinned file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa named notes.txt
    When the visitor opens the dashboard
    Then the dashboard shows a table with the columns File Name, Size, Status, Pins, Paid, Hosted Until, CID, Download
    And the dashboard lists the file names <names>

    Examples:
      | names |
      | photo.jpg,notes.txt |

  Scenario Outline: Web Dashboard - 2 shows the details of each hosted file in its row
    Given the hosting API feed lists a file <cid> with status <api_status>
    And the hosting API feed lists a <api_provider> pin <api_pin_status> for the file <cid>
    When the visitor opens the dashboard
    Then the status cell of row <cid> reads <shown_status>
    And row <cid> lists the pins <shown_pin>
    And the CID cell of row <cid> holds <shown_cid>
    And row <cid> offers a copy control
    And the download cell of row <cid> links <shown_download>

    Examples:
      | api_status | cid                                                          | api_provider | api_pin_status | shown_status | shown_pin            | shown_cid           | shown_download                                                                          |
      | pinned     | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | local-helia  | pinned         | pinned       | local-helia: pinned  | bafybeig...y55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi |
      | pinning    | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | local-helia  | pinning        | pinning      | local-helia: pinning | bafybeia...aaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
      | pinFailed  | bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc | lighthouse   | failed         | pinFailed    | lighthouse: failed   | bafybeic...cccccccc | http://localhost:5050/download/bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc |

  Scenario Outline: Web Dashboard - 3 formats the size and dates of a hosted file
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg of <api_size> bytes paid at <api_paid_at> until <api_hosted_until>
    When the visitor opens the dashboard
    Then the size cell of row bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi measures <shown_size>
    And row bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi shows the paid time <shown_paid>
    And row bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi shows the hosting end <shown_until>

    Examples:
      | api_size | api_paid_at              | api_hosted_until         | shown_size | shown_paid           | shown_until          |
      | 999      | 2026-01-02T00:00:00.000Z | 2027-01-02T00:00:00.000Z | 999 bytes  | 2026-01-02 00:00 UTC | 2027-01-02 00:00 UTC |
      | 1024     | 2026-02-15T13:45:00.000Z | 2027-02-15T13:45:00.000Z | 1.02 KB    | 2026-02-15 13:45 UTC | 2027-02-15 13:45 UTC |
      | 1000000  | 2026-03-20T06:07:00.000Z | 2027-03-20T06:07:00.000Z | 1.00 MB    | 2026-03-20 06:07 UTC | 2027-03-20 06:07 UTC |

  Scenario: Web Dashboard - 4 an empty feed shows a message
    When the visitor opens the dashboard
    Then the page shows "No files are hosted yet."

  Scenario Outline: Web Dashboard - 5 an API error shows the error
    Given the hosting API rejects the feed with error <api_error>
    When the visitor opens the dashboard
    Then the page shows "<shown_error>"

    Examples:
      | api_error        | shown_error      |
      | Hosting API down | Hosting API down |
      | Feed unavailable | Feed unavailable |

  Scenario Outline: Web Dashboard - 6 loads more files from the next page
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg
    And the hosting API feed has a next page
    And the hosting API feed's next page lists a pinned file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa named notes.txt
    When the visitor opens the dashboard
    And the visitor loads more of the dashboard
    Then the dashboard lists the file names <names>

    Examples:
      | names |
      | photo.jpg,notes.txt |

  Scenario Outline: Web Dashboard - 7 refresh reloads the feed
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg
    When the visitor opens the dashboard
    And the hosting API feed is replaced with a pinned file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa named notes.txt
    When the visitor refreshes the dashboard
    Then the dashboard lists the file names <names>

    Examples:
      | names |
      | notes.txt |
