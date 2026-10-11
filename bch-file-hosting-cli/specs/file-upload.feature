# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-11T13:44:24.757887162Z","feature_name":"File Upload","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-cli/specs/file-upload.feature","background_hash":"57df058ce5b2389665c0858298e14a944734918f073b7b46d636b82f405169f2","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# File Upload - 1, File Upload - 2, File Upload - 3, File Upload - 4, File Upload - 5, File Upload - 6, File Upload - 7

Feature: File Upload

  Background:
    Given a file-upload command

  Scenario Outline: File Upload - 1 a successful upload prints the quote
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the hosting API reports the file name <api_filename>
    And the hosting API reports the file size <api_size>
    And the hosting API reports the billed size <api_billed>
    And the hosting API reports the quote expiry <api_expiry>
    When I run file-upload for the file <upload_path>
    Then the exit code is 0
    And the command prints the file name <printed_filename>
    And the command prints the size <printed_size> bytes
    And the command prints the billed size <printed_billed> bytes
    And the command prints the price <printed_sats> satoshis
    And the command prints the payment address <printed_address>
    And the command prints the quote expiry <printed_expiry>

    Examples:
      | upload_path   | api_sats | api_address                                            | api_filename | api_size | api_billed | api_expiry               | printed_filename | printed_size | printed_billed | printed_sats | printed_address                                        | printed_expiry           |
      | ./photo.jpg   | 2000     | bitcoincash:qquoteaddress00000000000000000000000000000 | photo.jpg    | 20000    | 100000     | 2026-10-10T00:00:00.000Z | photo.jpg        | 20000        | 100000         | 2000         | bitcoincash:qquoteaddress00000000000000000000000000000 | 2026-10-10T00:00:00.000Z |
      | ./archive.tar | 62500    | bitcoincash:qotheraddress00000000000000000000000000000 | archive.tar  | 500      | 100000     | 2026-11-11T12:00:00.000Z | archive.tar      | 500          | 100000         | 62500        | bitcoincash:qotheraddress00000000000000000000000000000 | 2026-11-11T12:00:00.000Z |

  Scenario Outline: File Upload - 2 an already hosted file prints the links and no payment address
    Given the hosting API reports the file is already hosted at <api_download_url>
    And the hosting API reports the view URL <api_view_url>
    When I run file-upload for the file <upload_path>
    Then the exit code is 0
    And the command prints the download URL <printed_download_url>
    And the command prints the view URL <printed_view_url>
    And the command prints no payment address

    Examples:
      | upload_path   | api_download_url                                                                   | api_view_url                                                                                 | printed_download_url                                                               | printed_view_url                                                                             |
      | ./photo.jpg   | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg |
      | ./archive.tar | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar |

  Scenario: File Upload - 3 a missing file flag is a usage error
    When I run file-upload with no file flag
    Then the exit code is 2
    And stderr contains "You must specify a file with the -f flag."

  Scenario Outline: File Upload - 4 an API rejection is reported and the command fails
    Given the hosting API rejects the upload with error <api_error>
    When I run file-upload for the file <upload_path>
    Then the exit code is 1
    And stderr contains "<printed_error>"

    Examples:
      | upload_path  | api_error               | printed_error           |
      | ./huge.bin   | File is too large       | File is too large       |
      | ./broken.bin | Invalid upload          | Invalid upload          |
      | ./photo.jpg  | Hosting API unavailable | Hosting API unavailable |

  Scenario: File Upload - 5 a missing local file is a runtime error
    When I try file-upload for the missing file ./absent.bin
    Then the exit code is 1
    And stderr contains "Cannot read file"

  Scenario Outline: File Upload - 6 JSON output prints one JSON object with the quote
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    When I run file-upload with JSON output for the file <upload_path>
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the payment address <json_address>
    And the JSON output has the price <json_sats> satoshis

    Examples:
      | upload_path   | api_sats | api_address                                            | json_sats | json_address                                           |
      | ./photo.jpg   | 2000     | bitcoincash:qquoteaddress00000000000000000000000000000 | 2000      | bitcoincash:qquoteaddress00000000000000000000000000000 |
      | ./archive.tar | 62500    | bitcoincash:qotheraddress00000000000000000000000000000 | 62500     | bitcoincash:qotheraddress00000000000000000000000000000 |

  Scenario Outline: File Upload - 7 a file at or above the billing minimum prints no billed size
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the hosting API reports the file name <api_filename>
    And the hosting API reports the file size <api_size>
    And the hosting API reports the billed size <api_billed>
    When I run file-upload for the file <upload_path>
    Then the exit code is 0
    And the command prints the file name <printed_filename>
    And the command prints the size <printed_size> bytes
    And the command prints no billed size
    And the command prints the price <printed_sats> satoshis
    And the command prints the payment address <printed_address>

    Examples:
      | upload_path   | api_sats | api_address                                            | api_filename | api_size | api_billed | printed_filename | printed_size | printed_sats | printed_address                                        |
      | ./photo.jpg   | 2500     | bitcoincash:qquoteaddress00000000000000000000000000000 | photo.jpg    | 1000000  | 1000000    | photo.jpg        | 1000000      | 2500         | bitcoincash:qquoteaddress00000000000000000000000000000 |
      | ./archive.tar | 62500    | bitcoincash:qotheraddress00000000000000000000000000000 | archive.tar  | 25000000 | 25000000   | archive.tar      | 25000000     | 62500        | bitcoincash:qotheraddress00000000000000000000000000000 |
