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
