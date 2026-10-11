# acceptance-mutation-manifest-begin
# {"version":1,"tested_at":"2026-10-11T15:17:25.307756493Z","feature_name":"Web Hosting API URL","feature_path":"/home/trout/work/psf/code/ipfs/bch-file-hosting/.worktrees/architect/bch-file-hosting-web/specs/web-hosting-api-url.feature","background_hash":"89952e43ff4fe7d0795e44745232b3819c72524e854fb655e55177de1b273be1","implementation_hash":"unknown","scenarios":[{"index":0,"name":"Web Hosting API URL - 1 the canonical HOSTING_API_URL sets the API base URL","scenario_hash":"b4a281a326ee7266a44010b800ad9c15ab28ead8d592bcf62608f513d1baaf4c","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-11T15:17:25.307756493Z"},{"index":1,"name":"Web Hosting API URL - 2 the browser build mirror REACT_APP_HOSTING_API_URL sets the API base URL","scenario_hash":"b1988a988481ab23b789695c4344b2a6bde2963f13cb2cdfc3ec5770db5f3ada","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-11T15:17:25.307756493Z"},{"index":2,"name":"Web Hosting API URL - 3 the deprecated fallback REACT_APP_API_URL still sets the API base URL","scenario_hash":"5eb89d5910e819ad72a806fd5f4ee4c988e7b5b948b2c205111141edd4a454cc","mutation_count":4,"result":{"Total":4,"Killed":4,"Survived":0,"Errors":0},"tested_at":"2026-10-11T15:17:25.307756493Z"},{"index":3,"name":"Web Hosting API URL - 4 with no environment variable the API base URL is the documented default","scenario_hash":"aa8333e0c70074b5d8872af75f77662fb212419b2a2cbcf295f9d44daba368b3","mutation_count":1,"result":{"Total":1,"Killed":1,"Survived":0,"Errors":0},"tested_at":"2026-10-11T15:17:25.307756493Z"}]}
# acceptance-mutation-manifest-end

# Web Hosting API URL - 1, Web Hosting API URL - 2, Web Hosting API URL - 3, Web Hosting API URL - 4, Web Hosting API URL - 5, Web Hosting API URL - 6

Feature: Web Hosting API URL

  Background:
    Given a clean hosting environment

  Scenario Outline: Web Hosting API URL - 1 the canonical HOSTING_API_URL sets the API base URL
    Given the canonical HOSTING_API_URL is <canonical>
    When the hosting web app resolves its API base URL
    Then the resolved API base URL is <resolved>

    Examples:
      | canonical                             | resolved                              |
      | https://file-hosting-api.blippost.com | https://file-hosting-api.blippost.com |
      | http://192.168.1.50:5050              | http://192.168.1.50:5050              |

  Scenario Outline: Web Hosting API URL - 2 the browser build mirror REACT_APP_HOSTING_API_URL sets the API base URL
    Given the browser build mirror REACT_APP_HOSTING_API_URL is <mirror>
    When the hosting web app resolves its API base URL
    Then the resolved API base URL is <resolved>

    Examples:
      | mirror                                | resolved                              |
      | https://file-hosting-api.blippost.com | https://file-hosting-api.blippost.com |
      | http://10.0.0.7:5050                  | http://10.0.0.7:5050                  |

  Scenario Outline: Web Hosting API URL - 3 the deprecated fallback REACT_APP_API_URL still sets the API base URL
    Given the deprecated fallback REACT_APP_API_URL is <legacy>
    When the hosting web app resolves its API base URL
    Then the resolved API base URL is <resolved>

    Examples:
      | legacy                                | resolved                              |
      | https://file-hosting-api.blippost.com | https://file-hosting-api.blippost.com |
      | http://localhost:6060                 | http://localhost:6060                 |

  Scenario Outline: Web Hosting API URL - 4 with no environment variable the API base URL is the documented default
    When the hosting web app resolves its API base URL
    Then the resolved API base URL is <resolved>

    Examples:
      | resolved              |
      | http://localhost:5050 |

  Scenario Outline: Web Hosting API URL - 5 HOSTING_API_URL wins over the browser build mirror
    Given the canonical HOSTING_API_URL is <canonical>
    And the browser build mirror REACT_APP_HOSTING_API_URL is <mirror>
    When the hosting web app resolves its API base URL
    Then the resolved API base URL is <resolved>

    Examples:
      | canonical                     | mirror                     | resolved                      |
      | https://canonical.example.com | https://mirror.example.com | https://canonical.example.com |
      | http://canonical.local:5050   | http://mirror.local:5050   | http://canonical.local:5050   |

  Scenario Outline: Web Hosting API URL - 6 the browser build mirror wins over the deprecated fallback
    Given the browser build mirror REACT_APP_HOSTING_API_URL is <mirror>
    And the deprecated fallback REACT_APP_API_URL is <legacy>
    When the hosting web app resolves its API base URL
    Then the resolved API base URL is <resolved>

    Examples:
      | mirror                     | legacy                     | resolved                    |
      | https://mirror.example.com | https://legacy.example.com | https://mirror.example.com |
      | http://mirror.local:5050   | http://legacy.local:5050   | http://mirror.local:5050   |
