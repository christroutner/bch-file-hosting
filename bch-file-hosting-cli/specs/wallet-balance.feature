# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T13:45:46.476283036Z","feature_name":"Wallet Balance","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-cli/specs/wallet-balance.feature","background_hash":"8b54be4713060c05071c9caea3be9050a462ee484176bb9b7bf3a8e66a64aad4","implementation_hash":"unknown","scenarios":[{"index":4,"name":"Wallet Balance - 5 an unsafe wallet name is a usage error","scenario_hash":"691b20eff2082f3205a871cf1d3c69f7cf5216cded0236a82ac52828df20978c","mutation_count":12,"result":{"Total":12,"Killed":12,"Survived":0,"Errors":0},"tested_at":"2026-10-09T13:22:29.305543749Z"},{"index":0,"name":"Wallet Balance - 1 the balance of a named wallet is printed in satoshis","scenario_hash":"51db86fee1b49dc865ae46276cca3016779424fb874f7a2e1339747daff6bbeb","mutation_count":8,"result":{"Total":8,"Killed":8,"Survived":0,"Errors":0},"tested_at":"2026-10-09T04:09:31.113367712Z"},{"index":2,"name":"Wallet Balance - 3 an unknown wallet is a runtime error","scenario_hash":"b4585f711e35a6054b58ae3b5f974c25a3519678f1ea421b6fcd140f050f66b6","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-09T04:09:31.113367712Z"}]}
# acceptance-mutation-manifest-end

# Wallet Balance - 1, Wallet Balance - 2, Wallet Balance - 3, Wallet Balance - 4, Wallet Balance - 5

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

  Scenario Outline: Wallet Balance - 5 an unsafe wallet name is a usage error
    When I run wallet-balance for the name <request_name>
    Then the exit code is 2
    And stderr contains "<printed_error>"

    Examples:
      | request_name | printed_error                                                                        |
      | ../escape    | Invalid wallet name "../escape". Use only letters, digits, hyphens, and underscores. |
      | dir/name     | Invalid wallet name "dir/name". Use only letters, digits, hyphens, and underscores.  |
      | dir\name     | Invalid wallet name "dir\name". Use only letters, digits, hyphens, and underscores.  |
      | ..           | Invalid wallet name "..". Use only letters, digits, hyphens, and underscores.        |
      | has space    | Invalid wallet name "has space". Use only letters, digits, hyphens, and underscores. |
      | name.ext     | Invalid wallet name "name.ext". Use only letters, digits, hyphens, and underscores.  |
