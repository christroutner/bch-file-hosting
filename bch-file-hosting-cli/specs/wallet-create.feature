# Wallet Create - 1, Wallet Create - 2, Wallet Create - 3, Wallet Create - 4

Feature: Wallet Create

  Background:
    Given a wallet-create command

  Scenario Outline: Wallet Create - 1 creating a wallet stores it and prints its address
    Given the new wallet has the address <new_address>
    When I run wallet-create for the name <wallet_name>
    Then the exit code is 0
    And the wallet store contains a wallet named <stored_name>
    And the command prints the address <printed_address>

    Examples:
      | wallet_name | stored_name | new_address                                            | printed_address                                        |
      | payer       | payer       | bitcoincash:qpayeraddress0000000000000000000000000000 | bitcoincash:qpayeraddress0000000000000000000000000000 |
      | savings     | savings     | bitcoincash:qsavingsaddress00000000000000000000000000 | bitcoincash:qsavingsaddress00000000000000000000000000 |

  Scenario: Wallet Create - 2 a missing name is a usage error
    When I run wallet-create with no name
    Then the exit code is 2
    And stderr contains "You must specify a wallet name with the -n flag."

  Scenario Outline: Wallet Create - 3 an existing wallet name is rejected
    Given a wallet named <wallet_name> already exists
    When I run wallet-create for the name <wallet_name>
    Then the exit code is 1
    And stderr contains "<printed_error>"

    Examples:
      | wallet_name | printed_error                        |
      | payer       | A wallet named payer already exists. |
      | savings     | A wallet named savings already exists. |

  Scenario Outline: Wallet Create - 4 the mnemonic is never printed
    Given the new wallet has the mnemonic <new_mnemonic>
    When I run wallet-create for the name <wallet_name>
    Then the exit code is 0
    And the command does not print the mnemonic <hidden_mnemonic>

    Examples:
      | wallet_name | new_mnemonic                                                                                | hidden_mnemonic                                                                             |
      | payer       | abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about | abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about |
      | savings     | legal winner thank year wave sausage worth useful legal winner thank yellow                 | legal winner thank year wave sausage worth useful legal winner thank yellow                 |
