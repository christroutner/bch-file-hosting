/*
  Project step handlers for the bch-file-hosting-api acceptance pipeline.

  Pricing steps call the real calculatePrice use-case. Example-table values stay
  in the IR example store; patterns capture the placeholder name so Gherkin
  soft mutation can change one cell without rewriting the step text.
*/

import { calculatePrice } from '../../src/use-cases/pricing.js'
import { viewType } from '../../src/use-cases/view.js'
import FileUseCases from '../../src/use-cases/file-use-cases.js'
import PaymentUseCases from '../../src/use-cases/payment-use-cases.js'
import AdminUseCases from '../../src/use-cases/admin-use-cases.js'
import PinningRegistry from '../../src/adapters/pinning/index.js'
import LighthouseProvider from '../../src/adapters/pinning/lighthouse.js'
import IpfsAdapter from '../../src/adapters/ipfs/index.js'
import { buildPublicNetworkServices } from '../../src/adapters/ipfs/public-network.js'
import TimerControllers from '../../src/controllers/timer-controllers.js'

const UPLOAD_FILENAME = 'upload.bin'
const UPLOAD_ADDRESS = 'bitcoincash:qpuploadaddress000000000000000000000000000'
const PAID_ADDRESS = 'bitcoincash:qppaidaddress000000000000000000000000000000'

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

function jsonResponse (body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

// A minimal in-memory Helia node for the public-network scenarios. It records
// the CIDs announced to content routing and the CIDs pinned, and can be made
// to fail or never settle a provide.
function makeFakeIpfsNode ({ provideError, provideNeverSettles } = {}) {
  const provided = []
  const pinned = []
  return {
    provided,
    pinned,
    pins: {
      add: async function * (cid) { pinned.push(cid); yield cid },
      rm: async function * (cid) { yield cid },
      isPinned: async () => false
    },
    routing: {
      provide: (cid) => {
        if (provideError) return Promise.reject(provideError)
        if (provideNeverSettles) return new Promise(() => {})
        provided.push(cid)
        return Promise.resolve()
      }
    }
  }
}

// The IPFS '/api/v0/add' response for the file, reporting the CID Lighthouse
// should have produced (the wrapping directory is the entry with no name).
function lighthouseAddResponse (world) {
  const lh = world.lighthouse
  const cid = lh.uploadCid === null ? world.file.cid : lh.uploadCid
  const body = `{"Name":"${world.file.filename}","Hash":"bafyfile","Size":"1024"}\n{"Name":"","Hash":"${cid}","Size":"1096"}\n`
  return new Response(body, { status: 200 })
}

function lighthouseUploadResponse (world) {
  const lh = world.lighthouse
  if (lh.uploadHeld) {
    return new Promise(resolve => { lh.release = () => resolve(lighthouseAddResponse(world)) })
  }
  if (lh.uploadStatus !== 200) return jsonResponse({ error: 'Lighthouse upload error' }, lh.uploadStatus)
  return lighthouseAddResponse(world)
}

function lighthouseHeadResponse (world) {
  if (world.lighthouse.gatewayRetrievable) {
    return new Response(null, { status: 200, headers: { 'content-length': String(world.file.sizeBytes) } })
  }
  return new Response(null, { status: 404 })
}

function createWorld () {
  const world = {
    cfg: {
      usdPerMbYear: 0.01,
      minBilledBytes: 100000,
      minInvoiceSats: 2000
    },
    usdPerBch: null,
    quote: null,
    rejection: null,
    addressIssued: false,
    // The pinning config and the injected Lighthouse HTTP client. Scenarios set
    // `world.lighthouse` to script the upload and gateway behavior.
    pinningConfig: {
      pinningProviders: [],
      lighthouseApiKey: 'test-lighthouse-key',
      lighthouseApiUrl: 'https://api.lighthouse.storage',
      lighthouseUploadUrl: 'https://upload.lighthouse.storage',
      lighthouseGateway: 'https://gateway.lighthouse.storage/ipfs/',
      lighthouseVerifyAttempts: 3,
      lighthouseVerifyDelayMs: 0,
      publicUrl: 'http://localhost:5050',
      publicGateways: [],
      hostingTermDays: 365,
      underpayToleranceSats: 100
    },
    ipfs: {
      pin: async () => true,
      unpin: async () => true,
      isPinned: async () => true,
      cat: () => new Blob([new Uint8Array(1024)])
    },
    lighthouse: {
      uploadCid: null,
      uploadStatus: 200,
      uploadHeld: false,
      gatewayRetrievable: true,
      release: null
    },
    lighthouseRequests: [],
    file: null,
    files: [],
    feedFiles: [],
    feedLimit: null,
    feedCursor: null,
    feed: null,
    feedError: null,
    adminFiles: null,
    adminError: null,
    retryResult: null,
    paymentResult: null,
    payments: null,
    invoice: null,
    wallet: null
  }
  world.lighthouseFetch = async (url, options = {}) => {
    world.lighthouseRequests.push({ url, options })
    if (options.method === 'HEAD') return lighthouseHeadResponse(world)
    if (url.includes('/api/v0/add')) return lighthouseUploadResponse(world)
    throw new Error(`Unexpected Lighthouse request: ${options.method || 'GET'} ${url}`)
  }
  return world
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

// Build the real pinning registry with an injected Lighthouse HTTP client, so
// a scenario can drive the production pin path without a network call.
function buildLighthouseRegistry (world) {
  return new PinningRegistry({
    ipfs: world.ipfs,
    config: world.pinningConfig,
    factories: {
      lighthouse: ({ config }) => new LighthouseProvider({ config, fetch: world.lighthouseFetch, sleep: async () => {} })
    }
  })
}

function buildPinUseCases (world, files) {
  return new PaymentUseCases({
    adapters: {
      config: world.pinningConfig,
      localdb: { files },
      ipfs: world.ipfs,
      pinning: buildLighthouseRegistry(world),
      logger: { info: () => {}, error: () => {} }
    }
  })
}

// A one-file store plus invoice store and wallet, so the background-pinning
// scenarios can run the real check-payment, pin, and retry use-case offline.
function buildPaymentUseCases (world) {
  const files = {
    get: async () => world.file,
    put: async (file) => { world.file = file; return file },
    update: async (cid, changes) => {
      world.file = { ...world.file, ...changes, cid }
      return world.file
    },
    list: async ({ status } = {}) => (!world.file ? [] : (!status || world.file.status === status) ? [world.file] : [])
  }
  const invoices = {
    get: async () => world.invoice,
    update: async (address, changes) => {
      world.invoice = { ...world.invoice, ...changes }
      return world.invoice
    },
    removeCreatedIndex: async () => {}
  }
  return new PaymentUseCases({
    adapters: {
      config: world.pinningConfig,
      localdb: { files, invoices, meta: { nextHdIndex: async () => 1 } },
      wallet: world.wallet,
      ipfs: world.ipfs,
      pinning: buildLighthouseRegistry(world),
      announcer: { announce: async () => {} },
      logger: { info: () => {}, error: () => {} }
    }
  })
}

// A one-file store for the pin-retry scenarios. `retryPins` lists pinFailed
// files and updates them in place.
function inMemoryFileStore (world) {
  return {
    list: async ({ status } = {}) => {
      if (!world.file) return []
      return (!status || world.file.status === status) ? [world.file] : []
    },
    update: async (cid, changes) => {
      world.file = { ...world.file, ...changes }
      return world.file
    }
  }
}

// Exercise the real admin listing use-case against the seeded file store.
// A one-file store used by the view and download rejection scenarios.
function buildContentUseCases (world) {
  return new FileUseCases({
    adapters: {
      config: world.pinningConfig,
      localdb: {
        files: { get: async (cid) => (world.file && world.file.cid === cid ? world.file : null) }
      },
      ipfs: world.ipfs,
      pinning: { getProviders: () => [] },
      logger: { info: () => {}, error: () => {} }
    }
  })
}

async function listAdminFiles (world, status) {
  const files = {
    list: async ({ status: wanted } = {}) => world.files.filter(f => !wanted || f.status === wanted)
  }
  const useCases = new AdminUseCases({
    adapters: {
      config: world.pinningConfig,
      localdb: { files },
      logger: { info: () => {}, error: () => {} }
    }
  })
  try {
    world.adminFiles = await useCases.listFiles({ status })
    world.adminError = null
  } catch (err) {
    world.adminFiles = null
    world.adminError = { status: err.status, message: err.message }
  }
}

// Exercise the real public feed use-case against the seeded file store.
async function listFileFeed (world, { limit, cursor } = {}) {
  const files = { list: async () => world.feedFiles }
  const useCases = new FileUseCases({
    adapters: {
      config: world.pinningConfig,
      localdb: { files },
      pinning: buildLighthouseRegistry(world),
      logger: { info: () => {}, error: () => {} }
    }
  })
  try {
    world.feed = await useCases.listFeed({ limit, cursor })
    world.feedCursor = world.feed.nextCursor
    world.feedError = null
  } catch (err) {
    world.feed = null
    world.feedError = { status: err.status, message: err.message }
  }
}

// Resolve a step value that is a <parameter> placeholder against the example
// store. Literal values pass through.
function resolveValue (raw, example) {
  const match = /^<([A-Za-z0-9_]+)>$/.exec(String(raw).trim())
  if (match) return exampleValue(example, match[1])
  return String(raw).trim()
}

function findFeedFile (world, cid) {
  const file = (world.feed ? world.feed.files : []).find(f => f.cid === cid)
  if (!file) throw new Error(`the feed does not report file ${cid}`)
  return file
}

function assertFeedField (file, field, expected) {
  if (file[field] !== expected) {
    throw new Error(`expected feed file ${file.cid} ${field} '${expected}', got '${file[field]}'`)
  }
}

function asCidList (value) {
  return value.split(',').map(part => part.trim()).filter(Boolean)
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
  },
  {
    pattern: /^the hosting API is configured to pin with Lighthouse$/,
    run (_match, _example, world) {
      world.pinningConfig.pinningProviders = ['lighthouse']
    }
  },
  {
    pattern: /^the Lighthouse gateway is (.+)$/,
    run (match, _example, world) {
      world.pinningConfig.lighthouseGateway = match[1]
    }
  },
  {
    pattern: /^a file with CID ([A-Za-z0-9]+) and filename ([^ ]+)$/,
    run (match, _example, world) {
      world.file = { cid: match[1], filename: match[2], sizeBytes: 1024, status: 'staged', pins: [] }
    }
  },
  {
    pattern: /^the Lighthouse gateway reports the file is retrievable$/,
    run (_match, _example, world) {
      world.lighthouse.gatewayRetrievable = true
    }
  },
  {
    pattern: /^the Lighthouse gateway reports the file is missing$/,
    run (_match, _example, world) {
      world.lighthouse.gatewayRetrievable = false
    }
  },
  {
    pattern: /^the Lighthouse upload is held$/,
    run (_match, _example, world) {
      world.lighthouse.uploadHeld = true
    }
  },
  {
    pattern: /^the Lighthouse upload reports CID <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.lighthouse.uploadCid = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^the Lighthouse upload reports the file CID$/,
    run (_match, _example, world) {
      world.lighthouse.uploadCid = null
    }
  },
  {
    pattern: /^the Lighthouse upload returns HTTP (.+)$/,
    run (match, example, world) {
      const raw = match[1]
      const value = /^<[A-Za-z0-9_]+>$/.test(raw) ? exampleValue(example, raw.slice(1, -1)) : raw
      world.lighthouse.uploadStatus = asInt(value, 'http_status')
    }
  },
  {
    pattern: /^I ask Lighthouse to pin the file$/,
    async run (_match, _example, world) {
      // Exercise the real registry and pinning use-case with an injected
      // Lighthouse HTTP client, so the file status and recorded pins come from
      // production code rather than the test.
      const useCases = buildPinUseCases(world, inMemoryFileStore(world))
      world.file = await useCases.pinFile(world.file)
    }
  },
  {
    pattern: /^the file status is <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.file.status !== expected) {
        throw new Error(`expected file status ${expected}, got ${world.file.status}`)
      }
    }
  },
  {
    pattern: /^the recorded Lighthouse pin state is <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      const pin = (world.file.pins || []).find(p => p.provider === 'lighthouse')
      if (!pin) throw new Error('no Lighthouse pin was recorded')
      if (pin.status !== expected) {
        throw new Error(`expected Lighthouse pin state ${expected}, got ${pin.status}`)
      }
    }
  },
  {
    pattern: /^the Lighthouse gateway URL for CID <([A-Za-z0-9_]+)> and filename <([A-Za-z0-9_]+)> is <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const cid = exampleValue(example, match[1])
      const filename = exampleValue(example, match[2])
      const expected = exampleValue(example, match[3])
      const provider = new LighthouseProvider({ config: world.pinningConfig, fetch: world.lighthouseFetch })
      const actual = provider.gatewayUrl(cid, filename)
      if (actual !== expected) {
        throw new Error(`expected Lighthouse gateway URL ${expected}, got ${actual}`)
      }
    }
  },
  {
    pattern: /^the configured pinning providers include <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const name = exampleValue(example, match[1])
      const registry = new PinningRegistry({ ipfs: world.ipfs, config: world.pinningConfig })
      if (!registry.getProvider(name)) {
        throw new Error(`configured pinning providers do not include ${name}`)
      }
    }
  },
  {
    pattern: /^a file with CID <([A-Za-z0-9_]+)> and status <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.file = {
        cid: exampleValue(example, match[1]),
        filename: 'photo.jpg',
        sizeBytes: 1024,
        status: exampleValue(example, match[2]),
        pins: []
      }
    }
  },
  {
    pattern: /^I retry failed pins$/,
    async run (_match, _example, world) {
      const useCases = buildPinUseCases(world, inMemoryFileStore(world))
      world.retryResult = await useCases.retryPins()
    }
  },
  {
    pattern: /^the file is <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.file.status !== expected) {
        throw new Error(`expected file status ${expected}, got ${world.file.status}`)
      }
    }
  },
  {
    pattern: /^the Lighthouse provider was asked to pin <([A-Za-z0-9_]+)> times$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      const attempts = world.lighthouseRequests.filter(r => r.url.includes('/api/v0/add')).length
      if (attempts !== expected) {
        throw new Error(`expected ${expected} Lighthouse pin attempts, got ${attempts}`)
      }
    }
  },
  {
    pattern: /^a paid file with CID ([A-Za-z0-9]+) and filename ([^ ]+)$/,
    run (match, _example, world) {
      world.file = {
        cid: match[1],
        filename: match[2],
        sizeBytes: 1024,
        status: 'staged',
        paymentAddress: PAID_ADDRESS,
        pins: [],
        paidAt: null,
        hostedUntil: null
      }
      world.invoice = {
        paymentAddress: PAID_ADDRESS,
        status: 'awaitingPayment',
        priceSats: 2000,
        hdIndex: 1,
        cid: match[1],
        filename: match[2],
        sizeBytes: 1024,
        quoteExpiresAt: '2099-01-01T00:00:00.000Z'
      }
      world.wallet = { getBalanceSats: async () => 2000, sweep: async () => 'sweep-txid' }
    }
  },
  {
    pattern: /^the local IPFS pin succeeds$/,
    run (_match, _example, world) {
      world.ipfs.pin = async () => true
    }
  },
  {
    pattern: /^the local IPFS pin fails$/,
    run (_match, _example, world) {
      world.ipfs.pin = async () => { throw new Error('local pin failed') }
    }
  },
  {
    pattern: /^a pinned file with a failed local pin$/,
    run (_match, _example, world) {
      world.file = {
        cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        filename: 'photo.jpg',
        sizeBytes: 1024,
        status: 'pinned',
        pins: [
          { provider: 'local-helia', status: 'failed', providerRef: null, pinnedAt: null, error: 'local pin failed' },
          { provider: 'lighthouse', status: 'pinned', providerRef: null, pinnedAt: '2026-10-09T00:00:00.000Z', error: null }
        ]
      }
    }
  },
  {
    pattern: /^I check payment$/,
    async run (_match, _example, world) {
      world.payments = buildPaymentUseCases(world)
      world.paymentResult = await world.payments.checkPayment({ paymentAddress: world.invoice.paymentAddress })
    }
  },
  {
    pattern: /^the payment status is <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.paymentResult.status !== expected) {
        throw new Error(`expected payment status ${expected}, got ${world.paymentResult.status}`)
      }
    }
  },
  {
    pattern: /^the background pin finishes$/,
    async run (_match, _example, world) {
      if (world.lighthouse.release) world.lighthouse.release()
      await world.payments.whenBackgroundIdle()
    }
  },
  {
    pattern: /^the recorded local-helia pin state is <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      const pin = (world.file.pins || []).find(p => p.provider === 'local-helia')
      if (!pin) throw new Error('no local-helia pin was recorded')
      if (pin.status !== expected) {
        throw new Error(`expected local-helia pin state ${expected}, got ${pin.status}`)
      }
    }
  },
  {
    pattern: /^the public gateway is (.+)$/,
    run (match, example, world) {
      world.pinningConfig.publicGateways = [resolveValue(match[1], example)]
    }
  },
  {
    pattern: /^a pinned file <([A-Za-z0-9_]+)> named (<[A-Za-z0-9_]+>|\S+) paid at (.+)$/,
    run (match, example, world) {
      world.feedFiles.push({
        cid: exampleValue(example, match[1]),
        filename: resolveValue(match[2], example),
        sizeBytes: 1024,
        status: 'pinned',
        pins: [],
        paidAt: match[3],
        createdAt: match[3],
        hostedUntil: null
      })
    }
  },
  {
    pattern: /^a (pinned|pinning|pinFailed) file ([A-Za-z0-9]+) paid at (.+)$/,
    run (match, _example, world) {
      world.feedFiles.push({
        cid: match[2],
        filename: `${match[2]}.bin`,
        sizeBytes: 1024,
        status: match[1],
        pins: [],
        paidAt: match[3],
        createdAt: match[3],
        hostedUntil: null
      })
    }
  },
  {
    pattern: /^a staged file ([A-Za-z0-9]+)$/,
    run (match, _example, world) {
      world.feedFiles.push({ cid: match[1], filename: `${match[1]}.bin`, sizeBytes: 1024, status: 'staged', pins: [], paidAt: null, createdAt: null, hostedUntil: null })
    }
  },
  {
    pattern: /^a deleted file ([A-Za-z0-9]+)$/,
    run (match, _example, world) {
      world.feedFiles.push({ cid: match[1], filename: `${match[1]}.bin`, sizeBytes: 1024, status: 'deleted', pins: [], paidAt: null, createdAt: null, hostedUntil: null })
    }
  },
  {
    pattern: /^a <([A-Za-z0-9_]+)> file <([A-Za-z0-9_]+)> named <([A-Za-z0-9_]+)> of <([A-Za-z0-9_]+)> bytes created at <([A-Za-z0-9_]+)> paid at <([A-Za-z0-9_]+)> until <([A-Za-z0-9_]+)> at address <([A-Za-z0-9_]+)> with a <([A-Za-z0-9_]+)> pin <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.feedFiles.push({
        cid: exampleValue(example, match[2]),
        filename: exampleValue(example, match[3]),
        sizeBytes: asInt(exampleValue(example, match[4]), match[4]),
        status: exampleValue(example, match[1]),
        paymentAddress: exampleValue(example, match[8]),
        createdAt: exampleValue(example, match[5]),
        paidAt: exampleValue(example, match[6]),
        hostedUntil: exampleValue(example, match[7]),
        pins: [{ provider: exampleValue(example, match[9]), status: exampleValue(example, match[10]) }]
      })
    }
  },
  {
    pattern: /^I request the file feed with limit (.+)$/,
    async run (match, example, world) {
      world.feedLimit = resolveValue(match[1], example)
      world.feedCursor = null
      await listFileFeed(world, { limit: world.feedLimit })
    }
  },
  {
    pattern: /^I request the file feed after cursor (.+)$/,
    async run (match, example, world) {
      await listFileFeed(world, { cursor: resolveValue(match[1], example) })
    }
  },
  {
    pattern: /^the feed lists the CIDs <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = asCidList(exampleValue(example, match[1]))
      const actual = (world.feed ? world.feed.files : []).map(f => f.cid)
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`expected feed CIDs ${expected.join(',')}, got ${actual.join(',')}`)
      }
    }
  },
  {
    pattern: /^the first page lists the CIDs <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = asCidList(exampleValue(example, match[1]))
      const actual = (world.feed ? world.feed.files : []).map(f => f.cid)
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`expected first page CIDs ${expected.join(',')}, got ${actual.join(',')}`)
      }
    }
  },
  {
    pattern: /^the feed has a next page$/,
    run (_match, _example, world) {
      if (!world.feed || !world.feed.nextCursor) {
        throw new Error('expected the feed to have a next page')
      }
    }
  },
  {
    pattern: /^I request the next page of the file feed$/,
    async run (_match, _example, world) {
      await listFileFeed(world, { limit: world.feedLimit, cursor: world.feedCursor })
    }
  },
  {
    pattern: /^the next page lists the CIDs <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = asCidList(exampleValue(example, match[1]))
      const actual = (world.feed ? world.feed.files : []).map(f => f.cid)
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`expected next page CIDs ${expected.join(',')}, got ${actual.join(',')}`)
      }
    }
  },
  {
    pattern: /^the feed has no next page$/,
    run (_match, _example, world) {
      if (!world.feed || world.feed.nextCursor) {
        throw new Error('expected the feed to have no next page')
      }
    }
  },
  {
    pattern: /^the file feed is rejected with status <([A-Za-z0-9_]+)> and error <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expectedStatus = asInt(exampleValue(example, match[1]), match[1])
      const expectedError = exampleValue(example, match[2])
      if (!world.feedError) {
        throw new Error('expected the file feed to be rejected')
      }
      if (world.feedError.status !== expectedStatus) {
        throw new Error(`expected rejection status ${expectedStatus}, got ${world.feedError.status}`)
      }
      if (world.feedError.message !== expectedError) {
        throw new Error(`expected error '${expectedError}', got '${world.feedError.message}'`)
      }
    }
  },
  {
    pattern: /^the feed reports the file <([A-Za-z0-9_]+)> with filename <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const file = findFeedFile(world, exampleValue(example, match[1]))
      assertFeedField(file, 'filename', exampleValue(example, match[2]))
    }
  },
  {
    pattern: /^the feed reports the file <([A-Za-z0-9_]+)> with size <([A-Za-z0-9_]+)> bytes$/,
    run (match, example, world) {
      const file = findFeedFile(world, exampleValue(example, match[1]))
      assertFeedField(file, 'sizeBytes', asInt(exampleValue(example, match[2]), match[2]))
    }
  },
  {
    pattern: /^the feed reports the file <([A-Za-z0-9_]+)> with status <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const file = findFeedFile(world, exampleValue(example, match[1]))
      assertFeedField(file, 'status', exampleValue(example, match[2]))
    }
  },
  {
    pattern: /^the feed reports the file <([A-Za-z0-9_]+)> with payment address <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const file = findFeedFile(world, exampleValue(example, match[1]))
      assertFeedField(file, 'paymentAddress', exampleValue(example, match[2]))
    }
  },
  {
    pattern: /^the feed reports the file <([A-Za-z0-9_]+)> with created time <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const file = findFeedFile(world, exampleValue(example, match[1]))
      assertFeedField(file, 'createdAt', exampleValue(example, match[2]))
    }
  },
  {
    pattern: /^the feed reports the file <([A-Za-z0-9_]+)> with paid time <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const file = findFeedFile(world, exampleValue(example, match[1]))
      assertFeedField(file, 'paidAt', exampleValue(example, match[2]))
    }
  },
  {
    pattern: /^the feed reports the file <([A-Za-z0-9_]+)> with hosting window <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const file = findFeedFile(world, exampleValue(example, match[1]))
      assertFeedField(file, 'hostedUntil', exampleValue(example, match[2]))
    }
  },
  {
    pattern: /^the feed reports the file <([A-Za-z0-9_]+)> with the pin <([A-Za-z0-9_]+)> <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const file = findFeedFile(world, exampleValue(example, match[1]))
      const provider = exampleValue(example, match[2])
      const pinStatus = exampleValue(example, match[3])
      if (!(file.pins || []).some(pin => pin.provider === provider && pin.status === pinStatus)) {
        throw new Error(`expected the feed file ${file.cid} to have a ${provider} pin with status ${pinStatus}`)
      }
    }
  },
  {
    pattern: /^the feed reports the file <([A-Za-z0-9_]+)> with gateway URL <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const file = findFeedFile(world, exampleValue(example, match[1]))
      const expected = exampleValue(example, match[2])
      if (!(file.gatewayUrls || []).includes(expected)) {
        throw new Error(`expected the feed file ${file.cid} to report gateway URL ${expected}, got ${(file.gatewayUrls || []).join(', ')}`)
      }
    }
  },
  {
    pattern: /^the timer retries failed pins on its schedule$/,
    async run (_match, _example, world) {
      let calls = 0
      const useCases = {
        cleanup: { deleteUnpaid: async () => {} },
        payments: { retrySweeps: async () => {}, retryPins: async () => { calls++ } }
      }
      const timers = new TimerControllers({ useCases, logger: { info: () => {}, error: () => {} } })
      timers.setInterval = (fn) => { fn(); return { fn } }
      timers.clearInterval = () => {}
      timers.startTimers()
      if (calls !== 1) {
        throw new Error(`expected the timer to retry failed pins, got ${calls} calls`)
      }
    }
  },
  {
    pattern: /^the file store contains a ([A-Za-z0-9_]+) file ([A-Za-z0-9]+)$/,
    run (match, _example, world) {
      world.files.push({ cid: match[2], filename: `${match[2]}.bin`, status: match[1], pins: [] })
    }
  },
  {
    pattern: /^I list admin files with status <([A-Za-z0-9_]+)>$/,
    async run (match, example, world) {
      await listAdminFiles(world, exampleValue(example, match[1]))
    }
  },
  {
    pattern: /^I list every admin file$/,
    async run (_match, _example, world) {
      await listAdminFiles(world)
    }
  },
  {
    pattern: /^the listed CIDs are <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1]).split(',').map(s => s.trim())
      const actual = (world.adminFiles || []).map(f => f.cid)
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`expected listed CIDs ${expected.join(',')}, got ${actual.join(',')}`)
      }
    }
  },
  {
    pattern: /^the admin file listing is rejected with status <([A-Za-z0-9_]+)> and error <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expectedStatus = asInt(exampleValue(example, match[1]), match[1])
      const expectedError = exampleValue(example, match[2])
      if (!world.adminError) {
        throw new Error('expected the admin file listing to be rejected')
      }
      if (world.adminError.status !== expectedStatus) {
        throw new Error(`expected rejection status ${expectedStatus}, got ${world.adminError.status}`)
      }
      if (world.adminError.message !== expectedError) {
        throw new Error(`expected error '${expectedError}', got '${world.adminError.message}'`)
      }
    }
  },
  {
    pattern: /^<([A-Za-z0-9_]+)> files are listed$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      const actual = (world.adminFiles || []).length
      if (actual !== expected) {
        throw new Error(`expected ${expected} files listed, got ${actual}`)
      }
    }
  },
  {
    pattern: /^a Helia node service configuration for the public IPFS network$/,
    run (_match, _example, world) {
      world.publicNodeServices = buildPublicNetworkServices()
    }
  },
  {
    pattern: /^the configuration registers the DHT service <([A-Za-z0-9_]+)> for protocol <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const name = exampleValue(example, match[1])
      const protocol = exampleValue(example, match[2])
      const actual = world.publicNodeServices.dhtProtocols[name]
      if (actual !== protocol) {
        throw new Error(`expected DHT service ${name} to use protocol ${protocol}, got ${actual}`)
      }
    }
  },
  {
    pattern: /^the configuration enables the NAT service <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const name = exampleValue(example, match[1])
      if (!world.publicNodeServices.natServices.includes(name)) {
        throw new Error(`expected the configuration to enable NAT service ${name}`)
      }
    }
  },
  {
    pattern: /^an IPFS adapter whose node holds the file as CID <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.ipfsNode = makeFakeIpfsNode()
      world.ipfsAdapter = new IpfsAdapter({ config: {}, logger: null })
      world.ipfsAdapter.helia = world.ipfsNode
      world.heldCid = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^an IPFS adapter whose node provide fails$/,
    run (_match, _example, world) {
      world.ipfsNode = makeFakeIpfsNode({ provideError: new Error('provide failed') })
      world.ipfsAdapter = new IpfsAdapter({ config: {}, logger: null })
      world.ipfsAdapter.helia = world.ipfsNode
    }
  },
  {
    pattern: /^an IPFS adapter whose node provide never settles$/,
    run (_match, _example, world) {
      world.ipfsNode = makeFakeIpfsNode({ provideNeverSettles: true })
      world.ipfsAdapter = new IpfsAdapter({ config: {}, logger: null })
      world.ipfsAdapter.helia = world.ipfsNode
    }
  },
  {
    pattern: /^the adapter pins the CID <([A-Za-z0-9_]+)>$/,
    async run (match, example, world) {
      await world.ipfsAdapter.pin(exampleValue(example, match[1]))
      world.pinResolved = true
    }
  },
  {
    pattern: /^the adapter resolves the pin$/,
    run (_match, _example, world) {
      if (world.pinResolved !== true) {
        throw new Error('the adapter did not resolve the pin')
      }
    }
  },
  {
    pattern: /^the node pinned the CID <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      const pinned = world.ipfsNode.pinned.map(cid => cid.toString())
      if (!pinned.includes(expected)) {
        throw new Error(`expected the node to pin ${expected}, got [${pinned.join(', ')}]`)
      }
    }
  },
  {
    pattern: /^the node provides the CID <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      const provided = world.ipfsNode.provided.map(cid => cid.toString())
      if (!provided.includes(expected)) {
        throw new Error(`expected the node to provide ${expected}, got [${provided.join(', ')}]`)
      }
    }
  },
  {
    pattern: /^a file named <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.viewFilename = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^the view of <([A-Za-z0-9_]+)> uses content type <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const filename = exampleValue(example, match[1])
      const expected = exampleValue(example, match[2])
      const { contentType } = viewType(filename)
      if (contentType !== expected) {
        throw new Error(`expected the view of ${filename} to use content type ${expected}, got ${contentType}`)
      }
    }
  },
  {
    pattern: /^the view of <([A-Za-z0-9_]+)> uses disposition <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const filename = exampleValue(example, match[1])
      const expected = exampleValue(example, match[2])
      const { disposition } = viewType(filename)
      if (disposition !== expected) {
        throw new Error(`expected the view of ${filename} to use disposition ${expected}, got ${disposition}`)
      }
    }
  },
  {
    pattern: /^a paid file ([A-Za-z0-9]+) that the API server has not pinned$/,
    run (match, _example, world) {
      world.file = { cid: match[1], filename: 'photo.jpg', sizeBytes: 1024, status: 'pinned', pins: [] }
      world.ipfs.isPinned = async () => false
    }
  },
  {
    pattern: /^I view the file ([A-Za-z0-9]+)$/,
    async run (match, _example, world) {
      try {
        world.viewResult = await buildContentUseCases(world).getView({ cid: match[1] })
        world.viewError = null
      } catch (err) {
        world.viewResult = null
        world.viewError = { status: err.status, message: err.message }
      }
    }
  },
  {
    pattern: /^I download the file ([A-Za-z0-9]+)$/,
    async run (match, _example, world) {
      try {
        world.downloadResult = await buildContentUseCases(world).getDownload({ cid: match[1] })
        world.downloadError = null
      } catch (err) {
        world.downloadResult = null
        world.downloadError = { status: err.status, message: err.message }
      }
    }
  },
  {
    pattern: /^the view is rejected with status (\d+)$/,
    run (match, _example, world) {
      const expected = Number(match[1])
      if (!world.viewError) throw new Error('expected the view to be rejected, but it succeeded')
      if (world.viewError.status !== expected) {
        throw new Error(`expected view rejection status ${expected}, got ${world.viewError.status}`)
      }
    }
  },
  {
    pattern: /^the download is rejected with status (\d+)$/,
    run (match, _example, world) {
      const expected = Number(match[1])
      if (!world.downloadError) throw new Error('expected the download to be rejected, but it succeeded')
      if (world.downloadError.status !== expected) {
        throw new Error(`expected download rejection status ${expected}, got ${world.downloadError.status}`)
      }
    }
  },
  {
    pattern: /^the hosting API public URL is <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.pinningConfig.publicUrl = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^the feed reports the file <([A-Za-z0-9_]+)> with download URL <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const file = findFeedFile(world, exampleValue(example, match[1]))
      assertFeedField(file, 'downloadUrl', exampleValue(example, match[2]))
    }
  },
  {
    pattern: /^the feed reports the file <([A-Za-z0-9_]+)> with view URL <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const file = findFeedFile(world, exampleValue(example, match[1]))
      assertFeedField(file, 'viewUrl', exampleValue(example, match[2]))
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
