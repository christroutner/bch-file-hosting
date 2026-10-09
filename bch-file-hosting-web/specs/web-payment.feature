# Web Payment - 1, Web Payment - 2, Web Payment - 3, Web Payment - 4, Web Payment - 5, Web Payment - 6

Feature: Web Payment

  Background:
    Given a fresh file hosting web page

  Scenario Outline: Web Payment - 1 the quote shows a QR code, price, and countdown
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    And the quote expires in <quote_minutes> minutes
    When the visitor uploads a file
    Then the page shows the price <shown_sats> satoshis
    And the page shows the payment address <shown_address>
    And the page shows a payment QR code
    And the page shows a quote countdown of <shown_countdown>

    Examples:
      | api_sats | api_address                                            | quote_minutes | shown_sats | shown_address                                          | shown_countdown |
      | 2000     | bitcoincash:qquoteaddress00000000000000000000000000000 | 1440          | 2000       | bitcoincash:qquoteaddress00000000000000000000000000000 | 24 hours        |
      | 62500    | bitcoincash:qotheraddress00000000000000000000000000000 | 30            | 62500      | bitcoincash:qotheraddress00000000000000000000000000000 | 30 minutes      |
      | 250000   | bitcoincash:qthirdaddress00000000000000000000000000000 | 90            | 250000     | bitcoincash:qthirdaddress00000000000000000000000000000 | 1 hour 30 minutes |

  Scenario Outline: Web Payment - 2 Pay now sends the quote from the browser wallet
    Given the hosting API quotes <api_sats> satoshis at <api_address>
    When the visitor uploads a file
    And the visitor pays the quote from the browser wallet
    Then the wallet paid <sent_amount> satoshis to <sent_address>

    Examples:
      | api_sats | api_address                                            | sent_amount | sent_address                                           |
      | 2000     | bitcoincash:qinvoiceaddress00000000000000000000000000  | 2000        | bitcoincash:qinvoiceaddress00000000000000000000000000  |
      | 62500    | bitcoincash:qinvoiceaddress00000000000000000000000000  | 62500       | bitcoincash:qinvoiceaddress00000000000000000000000000  |

  Scenario Outline: Web Payment - 3 a confirmed payment shows the hosting result
    Given an open hosting quote
    And the wallet will broadcast the transaction <api_txid>
    And the hosting API reports the payment as unpaid
    And the hosting API reports a paid invoice with CID <paid_cid>
    And the hosting API reports the download URL <paid_download_url>
    And the hosting API reports the gateway URL <paid_gateway_url>
    When the visitor pays the quote from the browser wallet
    And the visitor waits for the payment to be confirmed
    Then the page shows the CID <shown_cid>
    And the page shows the download URL <shown_download_url>
    And the page shows the gateway URL <shown_gateway_url>
    And the page shows the payment transaction <shown_txid>

    Examples:
      | api_txid                                                     | paid_cid                                                     | paid_download_url                                                                   | paid_gateway_url                                                                      | shown_cid                                                    | shown_download_url                                                                  | shown_gateway_url                                                                     | shown_txid                                                   |
      | 1111111111111111111111111111111111111111111111111111111111111111 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg  | 1111111111111111111111111111111111111111111111111111111111111111 |
      | 2222222222222222222222222222222222222222222222222222222222222222 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | https://dweb.link/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/archive.tar | 2222222222222222222222222222222222222222222222222222222222222222 |

  Scenario: Web Payment - 4 an expired quote shows the expired message
    Given an open hosting quote
    And the hosting API reports the payment as expired
    When the visitor pays the quote from the browser wallet
    And the visitor waits for the payment to be confirmed
    Then the page shows "This quote has expired."

  Scenario Outline: Web Payment - 5 a wallet payment failure shows the error
    Given an open hosting quote
    And the browser wallet rejects the payment with error <wallet_error>
    When the visitor pays the quote from the browser wallet
    Then the page shows "<shown_error>"

    Examples:
      | wallet_error       | shown_error        |
      | Insufficient funds | Insufficient funds |
      | Wallet locked      | Wallet locked      |

  Scenario: Web Payment - 6 a payment that is never confirmed shows the pending message
    Given an open hosting quote
    And the hosting API reports the payment as unpaid
    When the visitor pays the quote from the browser wallet
    And the visitor waits for the payment to be confirmed
    Then the page shows "Payment not confirmed."
