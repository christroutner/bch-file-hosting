/*
  Project step handlers for the bch-file-hosting-api acceptance pipeline.

  Pricing steps call the real calculatePrice use-case. Example-table values stay
  in the IR example store; patterns capture the placeholder name so Gherkin
  soft mutation can change one cell without rewriting the step text.
*/

import { calculatePrice } from '../../src/use-cases/pricing.js'

function exampleValue (example, name) {
  if (!(name in example)) {
    throw new Error(`Missing example value for "${name}"`)
  }
  return example[name]
}

function asNumber (value, label) {
  const n = Number(value)
  if (!Number.isFinite(n)) {
    throw new Error(`${label} is not a number: ${value}`)
  }
  return n
}

function asInt (value, label) {
  const n = asNumber(value, label)
  if (!Number.isInteger(n)) {
    throw new Error(`${label} is not an integer: ${value}`)
  }
  return n
}

function sameUsd (actual, expected) {
  return Math.round(actual * 1e8) === Math.round(expected * 1e8)
}

function createWorld () {
  return {
    cfg: {
      usdPerMbYear: 0.01,
      minBilledBytes: 100000,
      minInvoiceSats: 2000
    },
    usdPerBch: null,
    quote: null
  }
}

const handlers = [
  {
    pattern: /^the hosting rate is (.+) USD per MB per year$/,
    run (match, _example, world) {
      world.cfg.usdPerMbYear = asNumber(match[1], 'hosting rate')
    }
  },
  {
    pattern: /^the minimum billed size is (\d+) bytes$/,
    run (match, _example, world) {
      world.cfg.minBilledBytes = asInt(match[1], 'minimum billed size')
    }
  },
  {
    pattern: /^the minimum invoice is (\d+) satoshis$/,
    run (match, _example, world) {
      world.cfg.minInvoiceSats = asInt(match[1], 'minimum invoice')
    }
  },
  {
    pattern: /^one BCH is worth <([A-Za-z0-9_]+)> USD$/,
    run (match, example, world) {
      world.usdPerBch = asNumber(exampleValue(example, match[1]), match[1])
    }
  },
  {
    pattern: /^I quote a file of <([A-Za-z0-9_]+)> bytes$/,
    run (match, example, world) {
      world.quote = calculatePrice({
        sizeBytes: asInt(exampleValue(example, match[1]), match[1]),
        usdPerBch: world.usdPerBch,
        cfg: world.cfg
      })
    }
  },
  {
    pattern: /^billed bytes are <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      if (world.quote.billedBytes !== expected) {
        throw new Error(`expected billed bytes ${expected}, got ${world.quote.billedBytes}`)
      }
    }
  },
  {
    pattern: /^the quoted USD amount is <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = asNumber(exampleValue(example, match[1]), match[1])
      if (!sameUsd(world.quote.usdPrice, expected)) {
        throw new Error(`expected USD price ${expected}, got ${world.quote.usdPrice}`)
      }
    }
  },
  {
    pattern: /^the quoted price is <([A-Za-z0-9_]+)> satoshis$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      if (world.quote.priceSats !== expected) {
        throw new Error(`expected ${expected} sats, got ${world.quote.priceSats}`)
      }
    }
  }
]

async function handleStep (step, example, world) {
  for (const handler of handlers) {
    const match = handler.pattern.exec(step.text)
    if (match) {
      await handler.run(match, example, world, step)
      return
    }
  }
  throw new Error(`Unsupported step: ${step.keyword} ${step.text}`)
}

export { createWorld, handleStep }
