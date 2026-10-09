# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T04:09:30.678672500Z","feature_name":"Wallet Create","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-cli/specs/wallet-create.feature","background_hash":"0d286cc79e537b4d0e285296a1fdeb6624e635117aed4bc9b8bb5934815a86ea","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Wallet Create - 1 creating a wallet stores it and prints its address","scenario_hash":"e87dcb52c8c0a4b9ab6448f8a4da1493ce9264c48543b124f6083d2dcefd64d2","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-10-09T04:09:30.678672500Z"},{"index":2,"name":"Wallet Create - 3 an existing wallet name is rejected","scenario_hash":"f4c1793801a1531ef83266bfc14824d25da84b7fabdc77b02073d42bfd320dcc","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T04:09:30.678672500Z"}]}
# acceptance-mutation-manifest-end

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
