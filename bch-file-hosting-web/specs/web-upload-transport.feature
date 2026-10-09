# Web Upload Transport - 1

Feature: Web Upload Transport

  Background:
    Given a hosting web page whose API adapter uses the browser fetch transport

  Scenario Outline: Web Upload Transport - 1 a selected file is uploaded through the browser fetch transport
    Given the browser transport replies to the upload with <api_sats> satoshis at <api_address>
    When the visitor uploads the file <upload_name>
    Then the browser transport received a POST to <sent_url> with the file <sent_name>
    And the page shows the price <shown_sats> satoshis
    And the page shows the payment address <shown_address>

    Examples:
      | upload_name | api_sats | api_address                                            | sent_name   | sent_url                    | shown_sats | shown_address                                          |
      | photo.jpg   | 2000     | bitcoincash:qquoteaddress00000000000000000000000000000 | photo.jpg   | http://localhost:5050/files | 2000       | bitcoincash:qquoteaddress00000000000000000000000000000 |
      | archive.tar | 62500    | bitcoincash:qotheraddress00000000000000000000000000000 | archive.tar | http://localhost:5050/files | 62500      | bitcoincash:qotheraddress00000000000000000000000000000 |
