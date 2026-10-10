# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T16:52:46.711982558Z","feature_name":"Web Payment","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-web/specs/web-payment.feature","background_hash":"2e2c4d647fb6d89439b386c85e1e172482bda212c398974385ba02fcd2dd3879","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Web Payment - 1 the quote shows a QR code, price, and countdown","scenario_hash":"2a03f9c17cb3ed7f0c386b6642c845851de2b8c9dfa3b8343a11a17477fd4fc6","mutation_count":18,"result":{"Total":18,"Killed":18,"Survived":0,"Errors":0},"tested_at":"2026-10-09T15:57:19.420344220Z"},{"index":1,"name":"Web Payment - 2 Pay now sends the quote from the browser wallet","scenario_hash":"a4cbc97f5b1c461c6a3856e115b6fcfe2354f364b15aa4dd35f027fb24bea585","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-10-09T15:57:19.420344220Z"},{"index":2,"name":"Web Payment - 3 a confirmed payment shows the hosting result","scenario_hash":"6fceef9f0cdde098e8a3896742ba1c82b090c3396ca213ef08fc4cad1e0d8cf4","mutation_count":16,"result":{"Total":16,"Killed":16,"Survived":0,"Errors":0},"tested_at":"2026-10-09T15:57:19.420344220Z"},{"index":4,"name":"Web Payment - 5 a wallet payment failure shows the error","scenario_hash":"cebc67d231f4fee12f466e11a3deddca17bf28b4fd6dc4481e5526c27fa33c30","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T15:57:19.420344220Z"},{"index":6,"name":"Web Payment - 7 a check-payment failure shows the error","scenario_hash":"b78acaf33c425e765878b21bb9e6105c43f8fb84b6d688eb64795904012c9e03","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T15:57:19.420344220Z"}]}
# acceptance-mutation-manifest-end

# Web Payment - 1, Web Payment - 2, Web Payment - 3, Web Payment - 4, Web Payment - 5, Web Payment - 6, Web Payment - 7, Web Payment - 8

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
    And the hosting API reports the view URL <paid_view_url>
    When the visitor pays the quote from the browser wallet
    And the visitor waits for the payment to be confirmed
    Then the page shows the CID <shown_cid>
    And the page shows the view URL <shown_view_url>
    And the page shows the payment transaction <shown_txid>

    Examples:
      | api_txid                                                     | paid_cid                                                     | paid_view_url                                                                     | shown_cid                                                    | shown_view_url                                                                    | shown_txid                                                   |
      | 1111111111111111111111111111111111111111111111111111111111111111 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | 1111111111111111111111111111111111111111111111111111111111111111 |
      | 2222222222222222222222222222222222222222222222222222222222222222 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 2222222222222222222222222222222222222222222222222222222222222222 |

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

  Scenario Outline: Web Payment - 7 a check-payment failure shows the error
    Given an open hosting quote
    And the hosting API rejects the payment check with error <check_error>
    When the visitor pays the quote from the browser wallet
    And the visitor waits for the payment to be confirmed
    Then the page shows "<shown_error>"

    Examples:
      | check_error             | shown_error             |
      | Hosting API unavailable | Hosting API unavailable |
      | Payment check failed    | Payment check failed    |

  Scenario Outline: Web Payment - 8 an image view link opens in a new tab
    Given an open hosting quote
    And the hosting API reports the payment as unpaid
    And the hosting API reports a paid invoice with CID <paid_cid>
    And the hosting API reports the paid file name <paid_name>
    And the hosting API reports the view URL <paid_view_url>
    When the visitor pays the quote from the browser wallet
    And the visitor waits for the payment to be confirmed
    Then the view URL <shown_view_url> has link target <shown_target>

    Examples:
      | paid_name   | paid_cid                                                     | paid_view_url                                                                                       | shown_view_url                                                                                      | shown_target |
      | photo.jpg   | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | _blank       |
      | archive.tar | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | none         |
