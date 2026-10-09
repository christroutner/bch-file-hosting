# Web Upload - 1, Web Upload - 2, Web Upload - 3, Web Upload - 4

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
