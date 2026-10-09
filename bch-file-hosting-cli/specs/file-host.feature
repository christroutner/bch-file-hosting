# File Host - 1, File Host - 2, File Host - 3, File Host - 4, File Host - 5, File Host - 6, File Host - 7, File Host - 8

Feature: File Host

  Background:
    Given a file-host command

  Scenario Outline: File Host - 1 an upload, payment, and retry print the hosted result
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the hosting API reports the payment as unpaid
    And the hosting API reports a paid invoice with CID <paid_cid>
    And the hosting API reports the download URL <paid_download_url>
    And the hosting API reports the gateway URL <paid_gateway_url>
    And the wallet will broadcast the transaction <api_txid>
    And a wallet named payer already exists
    When I run file-host for the file <upload_path> with the wallet payer
    Then the exit code is 0
    And the wallet paid <sent_amount> satoshis to <sent_address>
    And the command prints the CID <printed_cid>
    And the command prints the download URL <printed_download_url>
    And the command prints the gateway URL <printed_gateway_url>

    Examples:
      | upload_path   | api_sats | api_address                                         | paid_cid                                                     | paid_download_url                                                                   | paid_gateway_url                                                                      | api_txid                                                     | sent_amount | sent_address                                        | printed_cid                                                  | printed_download_url                                                               | printed_gateway_url                                                                   |
      | ./photo.jpg   | 2000     | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | 1111111111111111111111111111111111111111111111111111111111111111 | 2000        | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg |
      | ./archive.tar | 62500    | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | 2222222222222222222222222222222222222222222222222222222222222222 | 62500       | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar |

  Scenario Outline: File Host - 2 an unconfirmed payment fails after the retries
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the hosting API reports the payment as unpaid
    And the wallet will broadcast the transaction <api_txid>
    And a wallet named payer already exists
    When I run file-host for the file <upload_path> with the wallet payer
    Then the exit code is 1
    And the wallet paid <sent_amount> satoshis to <sent_address>
    And stderr contains "Payment not confirmed."

    Examples:
      | upload_path | api_sats | api_address                                         | api_txid                                                     | sent_amount | sent_address                                        |
      | ./photo.jpg | 2000     | bitcoincash:qinvoiceaddress00000000000000000000000000 | 3333333333333333333333333333333333333333333333333333333333333333 | 2000        | bitcoincash:qinvoiceaddress00000000000000000000000000 |

  Scenario Outline: File Host - 3 an already hosted file is not paid again
    Given the hosting API reports the file is already hosted at <api_download_url>
    When I run file-host for the file <upload_path> with the wallet payer
    Then the exit code is 0
    And the wallet made no payment
    And the command prints the download URL <printed_download_url>

    Examples:
      | upload_path   | api_download_url                                                                   | printed_download_url                                                               |
      | ./photo.jpg   | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi |
      | ./archive.tar | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |

  Scenario: File Host - 4 a missing file flag is a usage error
    When I run file-host with the wallet payer
    Then the exit code is 2
    And stderr contains "You must specify a file with the -f flag."

  Scenario: File Host - 5 a missing wallet name is a usage error
    When I run file-host for the file ./photo.jpg with no wallet
    Then the exit code is 2
    And stderr contains "You must specify a wallet name with the -n flag."

  Scenario: File Host - 6 a missing local file is a runtime error
    When I try file-host for the missing file ./absent.bin with the wallet payer
    Then the exit code is 1
    And stderr contains "Cannot read file"

  Scenario Outline: File Host - 7 an upload rejection is reported and the command fails
    Given the hosting API rejects the upload with error <api_error>
    When I run file-host for the file <upload_path> with the wallet payer
    Then the exit code is 1
    And the wallet made no payment
    And stderr contains "<printed_error>"

    Examples:
      | upload_path  | api_error               | printed_error           |
      | ./huge.bin   | File is too large       | File is too large       |
      | ./broken.bin | Invalid upload          | Invalid upload          |
      | ./photo.jpg  | Hosting API unavailable | Hosting API unavailable |

  Scenario Outline: File Host - 8 JSON output prints one JSON object
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the hosting API reports a paid invoice with CID <paid_cid>
    And the hosting API reports the download URL <paid_download_url>
    And the wallet will broadcast the transaction <api_txid>
    And a wallet named payer already exists
    When I run file-host with JSON output for the file <upload_path> with the wallet payer
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the CID <json_cid>
    And the JSON output has the download URL <json_download_url>

    Examples:
      | upload_path   | api_sats | api_address                                         | paid_cid                                                     | paid_download_url                                                                   | api_txid                                                     | json_cid                                                     | json_download_url                                                                  |
      | ./photo.jpg   | 2000     | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | 4444444444444444444444444444444444444444444444444444444444444444 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi |
      | ./archive.tar | 62500    | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 5555555555555555555555555555555555555555555555555555555555555555 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
