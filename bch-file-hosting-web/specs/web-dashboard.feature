# Web Dashboard - 1, Web Dashboard - 2, Web Dashboard - 3, Web Dashboard - 4, Web Dashboard - 5, Web Dashboard - 6, Web Dashboard - 7

Feature: Web Dashboard

  Background:
    Given a fresh file hosting web page

  Scenario Outline: Web Dashboard - 1 lists the hosted files in a table in feed order
    Given the hosting API feed lists a pinned file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi named photo.jpg
    And the hosting API feed lists a pinned file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa named notes.txt
    When the visitor opens the dashboard
    Then the dashboard shows a table with the columns File Name, Size, Paid, Hosted Until, CID, Download, View
    And the dashboard lists the file names <names>

    Examples:
      | names |
      | photo.jpg,notes.txt |

  Scenario Outline: Web Dashboard - 2 shows the CID, download, and view of each hosted file in its row
    Given the hosting API feed lists a pinned file <cid> named <filename> with the gateway URL <api_gateway_url>
    When the visitor opens the dashboard
    Then the CID cell of row <cid> holds <shown_cid>
    And row <cid> offers a copy control
    And the download cell of row <cid> links <shown_download>
    And the view cell of row <cid> opens <shown_view_url> in a new tab

    Examples:
      | cid                                                          | filename    | api_gateway_url                                                                                      | shown_cid           | shown_download                                                                          | shown_view_url                                                                                       |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg   | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg           | bafybeig...y55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg           |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | notes.txt   | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/notes.txt     | bafybeia...aaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/notes.txt     |
      | bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc | archive.tar | https://ipfs.io/ipfs/bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc/archive.tar   | bafybeic...cccccccc | http://localhost:5050/download/bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc | https://ipfs.io/ipfs/bafybeicccccccccccccccccccccccccccccccccccccccccccccccccccccccc/archive.tar   |

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
