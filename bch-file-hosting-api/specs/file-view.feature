# File View - 1, File View - 2, File View - 3, File View - 4

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
