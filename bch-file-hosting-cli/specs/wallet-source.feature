# Wallet Source - 1, Wallet Source - 2, Wallet Source - 3, Wallet Source - 4

Feature: Wallet Source

  Scenario Outline: Wallet Source - 1 wallet-balance reports the balance of a WIF source
    Given a wallet-balance command
    And the WIF <wif> holds <wif_sats> satoshis
    When I run wallet-balance with the WIF <wif>
    Then the exit code is 0
    And the command prints the balance <printed_sats> satoshis
    And the command does not print the WIF <hidden_wif>

    Examples:
      | wif                                                   | wif_sats | printed_sats | hidden_wif                                            |
      | KwDiBf89QgGbjEhKnhXJuH7SUW1x8fVdqN3d7Z6hK9bY2cP4mRtU  | 0        | 0            | KwDiBf89QgGbjEhKnhXJuH7SUW1x8fVdqN3d7Z6hK9bY2cP4mRtU |
      | L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1   | 100000   | 100000       | L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1  |

  Scenario Outline: Wallet Source - 2 file-pay sends from a WIF source
    Given a file-pay command
    And the hosting API reports an unpaid invoice with <api_received> received and <api_required> required
    And the wallet will broadcast the transaction <api_txid>
    And the WIF <wif> can pay
    When I run file-pay for the address <request_address> with the WIF <wif>
    Then the exit code is 0
    And the wallet paid <sent_amount> satoshis to <sent_address>
    And the command prints the transaction <printed_txid>
    And the command does not print the WIF <hidden_wif>

    Examples:
      | request_address                                     | wif                                                   | api_received | api_required | api_txid                                                     | sent_amount | sent_address                                        | printed_txid                                                 | hidden_wif                                            |
      | bitcoincash:qinvoice0000000000000000000000000000000 | KwDiBf89QgGbjEhKnhXJuH7SUW1x8fVdqN3d7Z6hK9bY2cP4mRtU  | 0            | 2000         | 1111111111111111111111111111111111111111111111111111111111111111 | 2000        | bitcoincash:qinvoice0000000000000000000000000000000 | 1111111111111111111111111111111111111111111111111111111111111111 | KwDiBf89QgGbjEhKnhXJuH7SUW1x8fVdqN3d7Z6hK9bY2cP4mRtU |
      | bitcoincash:qinvoice2000000000000000000000000000000 | L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1   | 1500         | 62500        | 2222222222222222222222222222222222222222222222222222222222222222 | 61000       | bitcoincash:qinvoice2000000000000000000000000000000 | 2222222222222222222222222222222222222222222222222222222222222222 | L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1  |

  Scenario Outline: Wallet Source - 3 file-host pays from a WIF source
    Given a file-host command
    And the hosting API quotes <api_sats> satoshis at <api_address>
    And the hosting API reports a paid invoice with CID <paid_cid>
    And the wallet will broadcast the transaction <api_txid>
    And the WIF <wif> can pay
    When I run file-host for the file <upload_path> with the WIF <wif>
    Then the exit code is 0
    And the wallet paid <sent_amount> satoshis to <sent_address>
    And the command prints the CID <printed_cid>
    And the command does not print the WIF <hidden_wif>

    Examples:
      | upload_path   | api_sats | api_address                                         | paid_cid                                                     | api_txid                                                     | wif                                                   | sent_amount | sent_address                                        | printed_cid                                                  | hidden_wif                                            |
      | ./photo.jpg   | 2000     | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | 3333333333333333333333333333333333333333333333333333333333333333 | KwDiBf89QgGbjEhKnhXJuH7SUW1x8fVdqN3d7Z6hK9bY2cP4mRtU  | 2000        | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | KwDiBf89QgGbjEhKnhXJuH7SUW1x8fVdqN3d7Z6hK9bY2cP4mRtU |
      | ./archive.tar | 62500    | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 4444444444444444444444444444444444444444444444444444444444444444 | L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1   | 62500       | bitcoincash:qinvoiceaddress00000000000000000000000000 | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1  |

  Scenario Outline: Wallet Source - 4 a name and a WIF together are rejected
    Given a wallet-balance command
    When I run wallet-balance with the name <request_name> and the WIF <wif>
    Then the exit code is 2
    And stderr contains "Specify either a wallet name (-n) or a WIF (--wif), not both."

    Examples:
      | request_name | wif                                                   |
      | payer        | KwDiBf89QgGbjEhKnhXJuH7SUW1x8fVdqN3d7Z6hK9bY2cP4mRtU  |
      | savings      | L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1   |
