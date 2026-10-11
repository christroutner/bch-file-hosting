# CLI Hosting API Transport - 1, CLI Hosting API Transport - 2, CLI Hosting API Transport - 3, CLI Hosting API Transport - 4

Feature: CLI Hosting API Transport

  Background:
    Given a CLI hosting API client whose transport records its receiver

  Scenario Outline: CLI Hosting API Transport - 1 the upload method calls the transport with the global receiver
    When the CLI client uploads the file <upload_name>
    Then the transport used the global receiver for the request <http_method> <sent_url>
    And the uploaded file name is <seen_name>

    Examples:
      | upload_name | http_method | sent_url                    | seen_name   |
      | photo.jpg   | POST        | http://localhost:5050/files | photo.jpg   |
      | archive.tar | POST        | http://localhost:5050/files | archive.tar |

  Scenario Outline: CLI Hosting API Transport - 2 the payment check calls the transport with the global receiver
    Given the payment reply is <api_status>
    When the CLI client checks the payment address <payment_address>
    Then the transport used the global receiver for the request <http_method> <sent_url>
    And the sent payment address is <seen_address>
    And the reported payment state is <reported_status>

    Examples:
      | api_status | payment_address     | http_method | sent_url                                  | seen_address        | reported_status |
      | unpaid     | bitcoincash:qunpaid | POST        | http://localhost:5050/files/check-payment | bitcoincash:qunpaid | unpaid          |
      | paid       | bitcoincash:qpaid   | POST        | http://localhost:5050/files/check-payment | bitcoincash:qpaid   | paid            |

  Scenario Outline: CLI Hosting API Transport - 3 the status lookup calls the transport with the global receiver
    Given the file reply is <api_status>
    When the CLI client looks up the CID <cid>
    Then the transport used the global receiver for the request <http_method> <sent_url>
    And the client's file state is <reported_status>

    Examples:
      | cid                                                          | api_status | http_method | sent_url                                                                                     | reported_status |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | pinned     | GET         | http://localhost:5050/files/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | pinned          |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | pinFailed  | GET         | http://localhost:5050/files/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | pinFailed       |

  Scenario Outline: CLI Hosting API Transport - 4 the feed listing calls the transport with the global receiver
    Given the feed reply carries cursor <next_cursor>
    When the CLI client lists the feed with limit <limit>
    Then the transport used the global receiver for the request <http_method> <sent_url>
    And the reported cursor is <reported_cursor>

    Examples:
      | limit | next_cursor | http_method | sent_url                             | reported_cursor |
      | 5     | cursor-one  | GET         | http://localhost:5050/files?limit=5  | cursor-one      |
      | 20    | cursor-two  | GET         | http://localhost:5050/files?limit=20 | cursor-two      |
