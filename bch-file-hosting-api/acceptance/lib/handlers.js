/*
  Project step handlers for the bch-file-hosting-api acceptance pipeline.

  Pricing steps call the real calculatePrice use-case. Example-table values stay
  in the IR example store; patterns capture the placeholder name so Gherkin
  soft mutation can change one cell without rewriting the step text.
*/

import { calculatePrice } from '../../src/use-cases/pricing.js'
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
    // Lighthouse pinning state. `lighthouseFetch` is the injected HTTP client;
    // each scenario queues the responses the fake API should return.
    pinningConfig: {
      pinningProviders: [],
      lighthouseApiKey: 'test-lighthouse-key',
      lighthouseApiUrl: 'https://api.lighthouse.storage',
      lighthouseGateway: 'https://gateway.lighthouse.storage/ipfs/'
    },
    ipfs: { pin: async () => true, unpin: async () => true, isPinned: async () => true },
    lighthouseResponses: [],
    lighthouseRequests: [],
    file: null,
    files: [],
    adminFiles: null,
    adminError: null,
    retryResult: null
  }
  world.lighthouseFetch = async (url, options) => {
    world.lighthouseRequests.push({ url, options })
    const next = world.lighthouseResponses.shift()
    if (!next) throw new Error('No Lighthouse response configured')
    return next()
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
      lighthouse: ({ config }) => new LighthouseProvider({ config, fetch: world.lighthouseFetch })
    }
  })
}

function buildPinUseCases (world, files) {
  return new PaymentUseCases({
    adapters: {
      config: world.pinningConfig,
      localdb: { files },
      pinning: buildLighthouseRegistry(world),
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
    pattern: /^the Lighthouse API reports CID <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const cid = exampleValue(example, match[1])
      world.lighthouseResponses = [() => jsonResponse({ data: { cid } })]
    }
  },
  {
    pattern: /^the Lighthouse API returns HTTP <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const status = asInt(exampleValue(example, match[1]), match[1])
      world.lighthouseResponses = [() => jsonResponse({ error: 'Lighthouse error' }, status)]
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
    pattern: /^the Lighthouse API pins by CID$/,
    run (_match, _example, world) {
      world.lighthouseResponses = [() => jsonResponse({ data: { cid: world.file.cid } })]
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
      const attempts = world.lighthouseRequests.filter(r => r.url.endsWith('/api/lighthouse/pin')).length
      if (attempts !== expected) {
        throw new Error(`expected ${expected} Lighthouse pin attempts, got ${attempts}`)
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
