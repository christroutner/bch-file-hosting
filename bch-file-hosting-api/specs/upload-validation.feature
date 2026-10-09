# Upload Validation - 1

Feature: Upload Validation

  Scenario Outline: Upload Validation - 1 rejects a zero-byte file
    When I upload a file of <size_bytes> bytes
    Then the upload is rejected with status <http_status>
    And the rejection response contains no payment address

    Examples:
      | size_bytes | http_status |
      | 0          | 422         |
