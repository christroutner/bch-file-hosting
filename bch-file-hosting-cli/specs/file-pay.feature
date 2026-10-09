# File Pay - 1, File Pay - 2, File Pay - 3, File Pay - 4, File Pay - 5, File Pay - 6, File Pay - 7, File Pay - 8

Feature: File Pay

  Background:
    Given a file-pay command

  Scenario Outline: File Pay - 1 paying an unpaid invoice sends the outstanding satoshis
    Given the hosting API reports an unpaid invoice with <api_received> received and <api_required> required
    And the wallet will broadcast the transaction <api_txid>
    And a wallet named payer already exists
    When I run file-pay for the address <request_address> with the wallet payer
    Then the hosting API received the address <received_address>
    And the exit code is 0
    And the wallet paid <sent_amount> satoshis to <sent_address>
    And the command prints the amount <printed_amount> satoshis
    And the command prints the transaction <printed_txid>

    Examples:
      | request_address                                     | received_address                                    | api_received | api_required | api_txid                                                     | sent_amount | sent_address                                        | printed_amount | printed_txid                                                 |
      | bitcoincash:qinvoice0000000000000000000000000000000 | bitcoincash:qinvoice0000000000000000000000000000000 | 0            | 2000         | 1111111111111111111111111111111111111111111111111111111111111111 | 2000        | bitcoincash:qinvoice0000000000000000000000000000000 | 2000           | 1111111111111111111111111111111111111111111111111111111111111111 |
      | bitcoincash:qinvoice2000000000000000000000000000000 | bitcoincash:qinvoice2000000000000000000000000000000 | 1500         | 62500        | 2222222222222222222222222222222222222222222222222222222222222222 | 61000       | bitcoincash:qinvoice2000000000000000000000000000000 | 61000          | 2222222222222222222222222222222222222222222222222222222222222222 |

  Scenario: File Pay - 2 an already paid invoice is not paid again
    Given the hosting API reports an already paid invoice
    When I run file-pay for the address bitcoincash:qinvoiceaddress00000000000000000000000000 with the wallet payer
    Then the exit code is 0
    And the wallet made no payment
    And the command prints already paid

  Scenario: File Pay - 3 an expired invoice is not paid
    Given the hosting API reports an expired invoice
    When I run file-pay for the address bitcoincash:qinvoiceaddress00000000000000000000000000 with the wallet payer
    Then the exit code is 1
    And the wallet made no payment
    And stderr contains "Invoice expired."

  Scenario: File Pay - 4 a missing address is a usage error
    When I run file-pay with the wallet payer
    Then the exit code is 2
    And stderr contains "You must specify a payment address with the -a flag."

  Scenario: File Pay - 5 a missing wallet name is a usage error
    When I run file-pay for the address bitcoincash:qinvoiceaddress00000000000000000000000000 with no wallet
    Then the exit code is 2
    And stderr contains "You must specify a wallet name with the -n flag."

  Scenario Outline: File Pay - 6 an unknown wallet is a runtime error
    Given the hosting API reports an unpaid invoice
    And no wallet named <wallet_name> exists
    When I run file-pay for the address bitcoincash:qinvoiceaddress00000000000000000000000000 with the wallet <wallet_name>
    Then the exit code is 1
    And the wallet made no payment
    And stderr contains "<printed_error>"

    Examples:
      | wallet_name | printed_error                 |
      | missing     | Wallet "missing" not found.   |
      | other       | Wallet "other" not found.     |

  Scenario Outline: File Pay - 7 an API error is reported and the command fails
    Given the hosting API rejects the check with error <api_error>
    When I run file-pay for the address bitcoincash:qinvoiceaddress00000000000000000000000000 with the wallet payer
    Then the exit code is 1
    And the wallet made no payment
    And stderr contains "<printed_error>"

    Examples:
      | api_error               | printed_error           |
      | Invoice not found       | Invoice not found       |
      | Hosting API unavailable | Hosting API unavailable |

  Scenario Outline: File Pay - 8 JSON output prints one JSON object
    Given the hosting API reports an unpaid invoice with <api_received> received and <api_required> required
    And the wallet will broadcast the transaction <api_txid>
    And a wallet named payer already exists
    When I run file-pay with JSON output for the address bitcoincash:qinvoiceaddress00000000000000000000000000 with the wallet payer
    Then the exit code is 0
    And stdout is a single JSON object
    And the JSON output has the transaction <json_txid>
    And the JSON output has the amount <json_amount> satoshis

    Examples:
      | api_received | api_required | api_txid                                                     | json_amount | json_txid                                                    |
      | 0            | 2000         | 3333333333333333333333333333333333333333333333333333333333333333 | 2000        | 3333333333333333333333333333333333333333333333333333333333333333 |
      | 1500         | 62500        | 4444444444444444444444444444444444444444444444444444444444444444 | 61000       | 4444444444444444444444444444444444444444444444444444444444444444 |
