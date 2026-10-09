# mutation-stamp: sha256=86a11ddcde1d6aa2f34d82376ecef02e17dedbdf8eeeb05b1144fc1c0ec3b55e
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-09T16:12:32.422079948Z","feature_name":"Web Upload Transport","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-web/specs/web-upload-transport.feature","background_hash":"756a2106d30a1224828a3f5399d3d1df2c7319d6391e6cbd29c03dfb43d00e0b","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Web Upload Transport - 1 a selected file is uploaded through the browser fetch transport","scenario_hash":"f461e597c3867bf533b98486b4be8a1f404e61b529a528b8ca5b554ad37239d6","mutation_count":14,"result":{"Total":14,"Killed":14,"Survived":0,"Errors":0},"tested_at":"2026-10-09T16:12:32.422079948Z"}]}
# acceptance-mutation-manifest-end

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
