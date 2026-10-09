# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T16:26:16.500030310Z","feature_name":"Web Upload","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-web/specs/web-upload.feature","background_hash":"2e2c4d647fb6d89439b386c85e1e172482bda212c398974385ba02fcd2dd3879","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Web Upload - 1 a selected file shows the hosting quote","scenario_hash":"3fe54620fa5254eac1ec60fb8dc613fd924737539ad439427cc004b098b8b741","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-10-09T15:57:19.609058838Z"},{"index":1,"name":"Web Upload - 2 an already hosted file shows the download link","scenario_hash":"001a319f9347324a97441bbc173886cef9e2b587c6524ef43800cd184176c2d8","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-10-09T15:57:19.609058838Z"},{"index":3,"name":"Web Upload - 4 an API rejection shows the error","scenario_hash":"3f3b642e3f7eae2182417c0bb0d90aec15b1a7c8b4fbf4caf16fb78b86c3a2e7","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-10-09T15:57:19.609058838Z"}]}
# acceptance-mutation-manifest-end

# Web Upload - 1, Web Upload - 2, Web Upload - 3, Web Upload - 4, Web Upload - 5, Web Upload - 6

Feature: Web Upload

  Background:
    Given a fresh file hosting web page

  Scenario Outline: Web Upload - 1 a selected file shows the hosting quote
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    When the visitor uploads the file <upload_name>
    Then the page shows the file name <shown_name>
    And the page shows the price <shown_sats> satoshis
    And the page shows the payment address <shown_address>

    Examples:
      | upload_name | api_sats | api_address                                            | shown_name  | shown_sats | shown_address                                          |
      | photo.jpg   | 2000     | bitcoincash:qquoteaddress00000000000000000000000000000 | photo.jpg   | 2000       | bitcoincash:qquoteaddress00000000000000000000000000000 |
      | archive.tar | 62500    | bitcoincash:qotheraddress00000000000000000000000000000 | archive.tar | 62500      | bitcoincash:qotheraddress00000000000000000000000000000 |

  Scenario Outline: Web Upload - 2 an already hosted file shows the download link
    Given the hosting API reports the file is already hosted at <api_download_url>
    When the visitor uploads the file <upload_name>
    Then the page shows the file name <shown_name>
    And the page shows the download URL <shown_download_url>

    Examples:
      | upload_name | api_download_url                                                                   | shown_name  | shown_download_url                                                                 |
      | photo.jpg   | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg   | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi |
      | archive.tar | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | archive.tar | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |

  Scenario: Web Upload - 3 uploading without a file shows a prompt
    When the visitor uploads no file
    Then the page shows "Choose a file to upload."

  Scenario Outline: Web Upload - 4 an API rejection shows the error
    Given the hosting API rejects the upload with error <api_error>
    When the visitor uploads the file <upload_name>
    Then the page shows the file name <shown_name>
    And the page shows "<shown_error>"

    Examples:
      | upload_name | api_error               | shown_name  | shown_error             |
      | huge.bin    | File is too large       | huge.bin    | File is too large       |
      | broken.bin  | Invalid upload          | broken.bin  | Invalid upload          |
      | photo.jpg   | Hosting API unavailable | photo.jpg   | Hosting API unavailable |

  Scenario Outline: Web Upload - 5 the quote shows the file size and a separate billed size
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the file is <api_size> bytes
    And the billed size is <api_billed> bytes
    When the visitor uploads the file <upload_name>
    Then the page shows the size <shown_size> bytes
    And the page shows the billed size <shown_billed> bytes

    Examples:
      | upload_name | api_sats | api_address                                            | api_size | api_billed | shown_size | shown_billed |
      | photo.jpg   | 2000     | bitcoincash:qquoteaddress00000000000000000000000000000 | 20000    | 100000     | 20000      | 100000       |
      | small.txt   | 2000     | bitcoincash:qotheraddress00000000000000000000000000000 | 500      | 100000     | 500        | 100000       |

  Scenario Outline: Web Upload - 6 a file at or above the billing minimum shows no separate billed size
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the file is <api_size> bytes
    And the billed size is <api_billed> bytes
    When the visitor uploads the file <upload_name>
    Then the page shows the size <shown_size> bytes
    And the page shows no billed size

    Examples:
      | upload_name | api_sats | api_address                                            | api_size | api_billed | shown_size |
      | photo.jpg   | 2500     | bitcoincash:qquoteaddress00000000000000000000000000000 | 1000000  | 1000000    | 1000000    |
      | archive.tar | 62500    | bitcoincash:qotheraddress00000000000000000000000000000 | 25000000 | 25000000   | 25000000   |
