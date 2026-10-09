# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T23:52:49.821304592Z","feature_name":"Web Dashboard","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-web/specs/web-dashboard.feature","background_hash":"2e2c4d647fb6d89439b386c85e1e172482bda212c398974385ba02fcd2dd3879","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Web Dashboard - 1 lists the hosted files in a table in feed order","scenario_hash":"dde39758e73153ed0b2f8a826dd6b50f96571e9c4fdff327718df0cfac475617","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-09T23:52:49.821304592Z"},{"index":1,"name":"Web Dashboard - 2 shows the details of each hosted file in its row","scenario_hash":"923053defed6dfb6f0852a4d761d85bfea9e383f85ba9da930c150dcc3e58577","mutation_count":24,"result":{"Total":24,"Killed":24,"Survived":0,"Errors":0},"tested_at":"2026-10-09T23:52:49.821304592Z"},{"index":4,"name":"Web Dashboard - 5 an API error shows the error","scenario_hash":"58b262c0c507f7b6789bc0d4dd238ad5333d1955849342c338a759372c8f6540","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T23:52:49.821304592Z"},{"index":5,"name":"Web Dashboard - 6 loads more files from the next page","scenario_hash":"fde1ac265a340bad5d9cd5c06904e2c55d64b2c9236da024324643ca9b6de694","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-09T23:52:49.821304592Z"},{"index":6,"name":"Web Dashboard - 7 refresh reloads the feed","scenario_hash":"8888bd0f2d3127354543b91d00a15cfbc3e97951b41672d10d285f63099e5645","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-09T23:52:49.821304592Z"}]}
# acceptance-mutation-manifest-end

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
