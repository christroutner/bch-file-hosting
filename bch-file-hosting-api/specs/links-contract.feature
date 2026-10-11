# mutation-stamp: sha256=4e1c26891edc4b2f0f21e745e2f9727873f3c57a92b7688bc8b290f05b0a981b
# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-11T15:34:49.160889791Z","feature_name":"Links Contract","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-api/specs/links-contract.feature","background_hash":"418e50546ee212bc1394e75bf05401d52d8213c98b193b7127b86ac05e748fa3","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Links Contract - 1 the paid payment result reports the download, view, and gateway URLs","scenario_hash":"cbd4bfaebc56a53c7c22e1c99f571d7808195a3d0888633a6d5c1aab2c0caecc","mutation_count":10,"result":{"Total":10,"Killed":10,"Survived":0,"Errors":0},"tested_at":"2026-10-11T15:34:49.160889791Z"},{"index":1,"name":"Links Contract - 2 the already-hosted upload result reports the download, view, and gateway URLs","scenario_hash":"f391f897ef8e1282dfd3370d9cb3189126abab1a795f661d43cb3cc7a567c82c","mutation_count":10,"result":{"Total":10,"Killed":10,"Survived":0,"Errors":0},"tested_at":"2026-10-11T15:34:49.160889791Z"}]}
# acceptance-mutation-manifest-end

# Links Contract - 1, Links Contract - 2

Feature: Links Contract

  Background:
    Given the public gateway is https://ipfs.io/ipfs/

  Scenario Outline: Links Contract - 1 the paid payment result reports the download, view, and gateway URLs
    Given a paid file with CID <cid> and filename <filename>
    When I check payment
    Then the payment result reports the download URL <download_url>
    And the payment result reports the view URL <view_url>
    And the payment result reports the gateway URL <gateway_url>

    Examples:
      | cid                                                          | filename  | download_url                                                                                       | view_url                                                                                                    | gateway_url                                                                                          |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi          | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg            | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg            |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | notes.txt | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/notes.txt | https://ipfs.io/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/notes.txt |

  Scenario Outline: Links Contract - 2 the already-hosted upload result reports the download, view, and gateway URLs
    Given an already hosted file with CID <cid> and filename <filename>
    When I upload that hosted file
    Then the upload result reports the download URL <download_url>
    And the upload result reports the view URL <view_url>
    And the upload result reports the gateway URL <gateway_url>

    Examples:
      | cid                                                          | filename  | download_url                                                                                       | view_url                                                                                                    | gateway_url                                                                                          |
      | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | photo.jpg | http://localhost:5050/download/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi          | http://localhost:5050/view/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg            | https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/photo.jpg            |
      | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | notes.txt | http://localhost:5050/download/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | http://localhost:5050/view/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/notes.txt | https://ipfs.io/ipfs/bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/notes.txt |
