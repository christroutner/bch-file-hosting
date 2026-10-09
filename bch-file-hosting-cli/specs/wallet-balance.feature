# Wallet Balance - 1, Wallet Balance - 2, Wallet Balance - 3, Wallet Balance - 4

Feature: Wallet Balance

  Background:
    Given a wallet-balance command

  Scenario Outline: Wallet Balance - 1 the balance of a named wallet is printed in satoshis
    Given a wallet named <wallet_name> holds <wallet_sats> satoshis
    When I run wallet-balance for the name <request_name>
    Then the exit code is 0
    And the command prints the balance <printed_sats> satoshis

    Examples:
      | wallet_name | request_name | wallet_sats | printed_sats |
      | payer       | payer        | 0           | 0            |
      | savings     | savings      | 100000      | 100000       |

  Scenario: Wallet Balance - 2 a missing name is a usage error
    When I run wallet-balance with no name
    Then the exit code is 2
    And stderr contains "You must specify a wallet name with the -n flag."

  Scenario Outline: Wallet Balance - 3 an unknown wallet is a runtime error
    Given no wallet named <request_name> exists
    When I run wallet-balance for the name <request_name>
    Then the exit code is 1
    And stderr contains "<printed_error>"

    Examples:
      | request_name | printed_error                 |
      | missing      | Wallet "missing" not found.   |
      | other        | Wallet "other" not found.     |

  Scenario Outline: Wallet Balance - 4 the mnemonic is never printed
    Given a wallet named <wallet_name> has the mnemonic <wallet_mnemonic>
    When I run wallet-balance for the name <request_name>
    Then the exit code is 0
    And the command does not print the mnemonic <hidden_mnemonic>

    Examples:
      | wallet_name | request_name | wallet_mnemonic                                                                             | hidden_mnemonic                                                                             |
      | payer       | payer        | abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about | abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about |
      | savings     | savings      | legal winner thank year wave sausage worth useful legal winner thank yellow                 | legal winner thank year wave sausage worth useful legal winner thank yellow                 |
