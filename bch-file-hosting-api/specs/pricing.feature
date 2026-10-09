# Pricing - 1, Pricing - 2
Feature: Pricing

  Background:
    Given the hosting rate is 0.01 USD per MB per year
    And the minimum billed size is 100000 bytes
    And the minimum invoice is 2000 satoshis

  Scenario Outline: Pricing - 1 a file smaller than the minimum billed size pays the satoshi floor
    Given one BCH is worth <usd_per_bch> USD
    When I quote a file of <size_bytes> bytes
    Then billed bytes are <billed_bytes>
    And the quoted USD amount is <usd_price>
    And the quoted price is <price_sats> satoshis

    Examples:
      | size_bytes | usd_per_bch | billed_bytes | usd_price | price_sats |
      | 20000      | 400         | 100000       | 0.001     | 2000       |

  Scenario Outline: Pricing - 2 a file large enough to exceed the satoshi floor is priced from billed bytes and the USD price of BCH
    Given one BCH is worth <usd_per_bch> USD
    When I quote a file of <size_bytes> bytes
    Then billed bytes are <billed_bytes>
    And the quoted USD amount is <usd_price>
    And the quoted price is <price_sats> satoshis

    Examples:
      | size_bytes | usd_per_bch | billed_bytes | usd_price | price_sats |
      | 1000000    | 400         | 1000000      | 0.01      | 2500       |
      | 25000000   | 400         | 25000000     | 0.25      | 62500      |
      | 100000000  | 400         | 100000000    | 1         | 250000     |
