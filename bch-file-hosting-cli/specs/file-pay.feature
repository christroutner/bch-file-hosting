# mutation-stamp: sha256=ecf146a89f537c26dc347516a234033abff422721b9f899baa797ca9b17bdaca
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T13:45:39.925687595Z","feature_name":"File Pay","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-cli/specs/file-pay.feature","background_hash":"6f13ed01ae78503f4ed08a4a0d4b38d760444214b8b894ca738fe2e58d37ec2d","implementation_hash":"unknown","scenarios":[{"index":0,"name":"File Pay - 1 paying an unpaid invoice sends the outstanding satoshis","scenario_hash":"73c8766994f134ef77069cd138a2d6da96ae97bbea630944174dc33a8c3cadff","mutation_count":18,"result":{"Total":18,"Killed":18,"Survived":0,"Errors":0},"tested_at":"2026-10-09T13:45:39.925687595Z"},{"index":5,"name":"File Pay - 6 an unknown wallet is a runtime error","scenario_hash":"0ed41c26376a2beb75cf4d06b7065ddfc333155c3319752106dcee1047c9f9c8","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T13:45:39.925687595Z"},{"index":6,"name":"File Pay - 7 an API error is reported and the command fails","scenario_hash":"35f825a7f3482c76610138ae490d31a1bea5e31b9249c7284ee71af64adbeb76","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T13:45:39.925687595Z"},{"index":7,"name":"File Pay - 8 JSON output prints one JSON object","scenario_hash":"11293b0ed915fd3a8c23d5399d7f9bf7bc9fc26132e20a771d0b0c77c53e15ef","mutation_count":10,"result":{"Total":10,"Killed":10,"Survived":0,"Errors":0},"tested_at":"2026-10-09T13:45:39.925687595Z"}]}
# acceptance-mutation-manifest-end

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
