# mutation-stamp: sha256=ef0eb40f5442988a18bcb5407d056b0ff0cad563c433d9a417dc7082ae452ff9
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T19:06:18.088843730Z","feature_name":"Background Pinning","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-api/specs/background-pinning.feature","background_hash":"0d6ff9735f7a6dfe37dff0da4a44ab03f154880572c1b7e2573e523d518872e9","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Background Pinning - 1 checking payment returns without waiting for the pin","scenario_hash":"9e4daf9253c72f5c7b570d682bc1263ce60529e3afc2173ae97f73f65dc67c26","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-10-09T19:06:18.088843730Z"},{"index":1,"name":"Background Pinning - 2 the background pin uploads, verifies, and pins locally","scenario_hash":"2576cf421a93edb5f7523c833037a8bc410c0f3acea8fb3ac1f96105879dfe6f","mutation_count":3,"result":{"Total":3,"Killed":3,"Survived":0,"Errors":0},"tested_at":"2026-10-09T19:06:18.088843730Z"},{"index":2,"name":"Background Pinning - 3 a failed Lighthouse pin leaves the file pinFailed","scenario_hash":"af96327234998e9b8f6dd6caeb1969ae98dcdd0904f7c7f17341d4c383fbbeac","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-10-09T19:06:18.088843730Z"},{"index":3,"name":"Background Pinning - 4 a failed local pin still reports the file pinned","scenario_hash":"cec2c488076a8f85f2542989095daf31da412983bff862dff040f407635db2d2","mutation_count":2,"result":{"Total":2,"Killed":2,"Survived":0,"Errors":0},"tested_at":"2026-10-09T19:06:18.088843730Z"}]}
# acceptance-mutation-manifest-end

Feature: Background Pinning

  Background:
    Given the hosting API is configured to pin with Lighthouse
    And the Lighthouse gateway reports the file is retrievable
    And a paid file with CID bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi and filename photo.jpg

  Scenario Outline: Background Pinning - 1 checking payment returns without waiting for the pin
    Given the Lighthouse upload is held
    When I check payment
    Then the payment status is <payment_status>
    And the file status is <file_status>

    Examples:
      | payment_status | file_status |
      | paid           | pinning     |

  Scenario Outline: Background Pinning - 2 the background pin uploads, verifies, and pins locally
    Given the Lighthouse upload reports the file CID
    And the local IPFS pin succeeds
    When I check payment
    And the background pin finishes
    Then the file status is <file_status>
    And the recorded Lighthouse pin state is <lighthouse_pin_state>
    And the recorded local-helia pin state is <local_pin_state>

    Examples:
      | file_status | lighthouse_pin_state | local_pin_state |
      | pinned      | pinned               | pinned          |

  Scenario Outline: Background Pinning - 3 a failed Lighthouse pin leaves the file pinFailed
    Given the Lighthouse upload returns HTTP 500
    When I check payment
    And the background pin finishes
    Then the file status is <file_status>
    And the recorded Lighthouse pin state is <lighthouse_pin_state>

    Examples:
      | file_status | lighthouse_pin_state |
      | pinFailed   | failed               |

  Scenario Outline: Background Pinning - 4 a failed local pin still reports the file pinned
    Given the Lighthouse upload reports the file CID
    And the local IPFS pin fails
    When I check payment
    And the background pin finishes
    Then the file status is <file_status>
    And the recorded local-helia pin state is <local_pin_state>

    Examples:
      | file_status | local_pin_state |
      | pinned      | failed          |
