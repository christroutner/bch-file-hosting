# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-10T20:20:26.226595803Z","feature_name":"File View","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-api/specs/file-view.feature","background_hash":"74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b","implementation_hash":"unknown","scenarios":[]}
# acceptance-mutation-manifest-end

# File View - 1, File View - 2, File View - 3, File View - 4, File View - 5

Feature: File View

  Scenario Outline: File View - 1 serves each file with its view content type
    Given a file named <filename>
    Then the view of <filename> uses content type <content_type>
    And the view of <filename> uses disposition <disposition>

    Examples:
      | filename    | content_type             | disposition |
      | photo.jpg   | image/jpeg               | inline      |
      | icon.png    | image/png                | inline      |
      | anim.gif    | image/gif                | inline      |
      | logo.webp   | image/webp               | inline      |
      | clip.mp4    | video/mp4                | inline      |
      | movie.webm  | video/webm               | inline      |
      | archive.tar | application/octet-stream | attachment  |

  Scenario: File View - 2 rejects viewing a file the API server has not pinned
    Given a paid file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi that the API server has not pinned
    When I view the file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
    Then the view is rejected with status 404

  Scenario: File View - 3 rejects downloading a file the API server has not pinned
    Given a paid file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi that the API server has not pinned
    When I download the file bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
    Then the download is rejected with status 404

  Scenario: File View - 4 rejects an unknown file
    When I view the file bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    Then the view is rejected with status 404

  Scenario Outline: File View - 5 serves the stored file name with its view content type
    Given the file store holds a pinned file <cid> named <filename>
    When I view the file <cid>
    Then the served view reports content type <content_type>

    Examples:
      | filename    | cid                                                          | content_type             |
      | photo.jpg   | bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi | image/jpeg               |
      | archive.tar | bafybeiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | application/octet-stream |
