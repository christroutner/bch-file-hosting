# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T02:02:01.943919055Z","feature_name":"Upload Validation","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-api/specs/upload-validation.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# Upload Validation - 1

Feature: Upload Validation

  Scenario Outline: Upload Validation - 1 rejects a zero-byte file
    When I upload a file of <size_bytes> bytes
    Then the upload is rejected with status <http_status>
    And the rejection response contains no payment address

    Examples:
      | size_bytes | http_status |
      | 0          | 422         |
