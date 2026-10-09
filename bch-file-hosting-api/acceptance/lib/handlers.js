/*
  Project step handlers for the bch-file-hosting-api acceptance pipeline.

  Pricing steps call the real calculatePrice use-case. Example-table values stay
  in the IR example store; patterns capture the placeholder name so Gherkin
  soft mutation can change one cell without rewriting the step text.
*/

import { calculatePrice } from '../../src/use-cases/pricing.js'
import FileUseCases from '../../src/use-cases/file-use-cases.js'

const UPLOAD_FILENAME = 'upload.bin'
const UPLOAD_ADDRESS = 'bitcoincash:qpuploadaddress000000000000000000000000000'

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
    quote: null,
    rejection: null,
    addressIssued: false
  }
}

// Build the real upload use-case with deterministic offline adapters, so the
// acceptance run exercises the production validation path without a network or
// filesystem. `addressIssued` records whether the use-case ever reached the
// point of deriving a payment address for the upload.
function createUploadUseCases (world) {
  const adapters = {
    config: {
      publicUrl: 'http://localhost:5050',
      publicGateways: [],
      maxFileSizeBytes: 100000000,
      usdPerMbYear: 0.01,
      minBilledBytes: 100000,
      minInvoiceSats: 2000,
      quoteTtlHours: 24
    },
    wallet: {
      getUsdPerBch: async () => 400,
      getKeyPair: async (hdIndex) => {
        world.addressIssued = true
        return { cashAddress: UPLOAD_ADDRESS, hdIndex }
      }
    },
    ipfs: { addFile: async () => 'bafy-upload-cid' },
    localdb: {
      invoices: { create: async () => {}, get: async () => null, list: async () => [] },
      files: { put: async () => {}, get: async () => null },
      meta: { nextHdIndex: async () => 1 }
    },
    pinning: { getProviders: () => [] },
    logger: { info: () => {}, error: () => {} }
  }
  const useCases = new FileUseCases({ adapters })
  // The acceptance run never writes a temp file; keep the cleanup a no-op.
  useCases.unlink = async () => {}
  return useCases
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
  },
  {
    pattern: /^I upload a file of <([A-Za-z0-9_]+)> bytes$/,
    async run (match, example, world) {
      const sizeBytes = asInt(exampleValue(example, match[1]), match[1])
      const useCases = createUploadUseCases(world)
      try {
        world.upload = await useCases.uploadAndQuote({
          filePath: '/nonexistent/upload.bin',
          filename: UPLOAD_FILENAME,
          sizeBytes
        })
        world.rejection = null
      } catch (err) {
        world.rejection = { status: err.status, message: err.message }
      }
    }
  },
  {
    pattern: /^the upload is rejected with status <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      if (!world.rejection) {
        throw new Error('expected the upload to be rejected, but it succeeded')
      }
      if (world.rejection.status !== expected) {
        throw new Error(`expected rejection status ${expected}, got ${world.rejection.status}`)
      }
    }
  },
  {
    pattern: /^the rejection response contains no payment address$/,
    run (_match, _example, world) {
      if (world.rejection && 'paymentAddress' in world.rejection) {
        throw new Error('rejection response unexpectedly contains a payment address')
      }
      if (world.addressIssued) {
        throw new Error('a payment address was issued for a rejected upload')
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
